// PRASAD DESKTOP — lightweight animated pixel dog companion.
// The pet lives below desktop icons and windows, so it never blocks the workspace.
import { DOG_SKINS, getSettings, subscribe } from './personalization.js';

const SPRITE_W = 24;
const SPRITE_H = 20;
const BASE_PIXEL = 3;
const MIN_X = 4;
const EDGE_GAP = 4;

const STATES = ['idle', 'walking', 'waving', 'sitting', 'sleeping', 'happy'];
const GREETINGS = ['Hi! 👋', "Welcome to Prasad's Desktop!"];
const FRIENDLY = [
    'Hi! 👋',
    "Welcome to Prasad's Desktop!",
    'Nice to meet you!',
    'Woof! 🐾',
    'Ready to explore?',
    'Happy to see you!',
];

const DARK = '#2b1d16';
const CREAM = '#fff3de';
const NOSE = '#3c2a28';
const WHITE = '#ffffff';

// Pose descriptors are compiled once into tiny canvases: a real frame-based sprite
// system with no asset downloads and no per-frame pixel loops.
const POSES = {
    idle: [
        { tail: 'mid' },
        { tail: 'high' },
        { tail: 'high', bob: 1, eyes: 'blink' },
        { tail: 'mid', bob: 1, eyes: 'blink' },
        { tail: 'low' },
        { tail: 'mid' },
    ],
    walking: [
        { tail: 'low', legs: 'walk0' },
        { tail: 'mid', bob: 1, legs: 'walk1' },
        { tail: 'high', legs: 'walk2' },
        { tail: 'mid', bob: 1, legs: 'walk3' },
        { tail: 'low', legs: 'walk4' },
        { tail: 'mid', legs: 'walk5' },
    ],
    waving: [
        { tail: 'high', paw: 'up', mouth: 'smile' },
        { tail: 'high', paw: 'mid', mouth: 'smile' },
    ],
    sitting: [
        { sit: true, tail: 'low' },
        { sit: true, tail: 'mid' },
        { sit: true, tail: 'high', bob: 1, eyes: 'blink' },
        { sit: true, tail: 'mid' },
    ],
    sleeping: [
        { sit: true, tail: 'low', eyes: 'closed', mouth: 'sleep' },
        { sit: true, tail: 'low', bob: 1, eyes: 'closed', mouth: 'sleep' },
    ],
    happy: [
        { tail: 'high', eyes: 'happy', paw: 'up', mouth: 'open' },
        { tail: 'high', bob: 1, eyes: 'happy', paw: 'mid', mouth: 'open' },
    ],
};

const DURATIONS = {
    idle: 4200,
    walking: 5400,
    waving: 1680,
    sitting: 3800,
    sleeping: 4600,
    happy: 1900,
};

const FRAME_MS = {
    idle: 180,
    walking: 110,
    waving: 210,
    sitting: 240,
    sleeping: 520,
    happy: 160,
};

let root = null;
let hitButton = null;
let spriteWrap = null;
let canvas = null;
let ctx = null;
let bubble = null;
let zzz = null;
let desktop = null;
let state = 'idle';
let stateStart = 0;
let stateDuration = 0;
let frameIndex = 0;
let lastDrawnState = '';
let bubbleToken = 0;
let direction = 1;
let x = 0;
let y = 0;
let jumpY = 0;
let lastFrameTime = 0;
let lastTime = 0;
let raf = 0;
let settings = getSettings().dog;
let customImage = null;
let customSource = null;
let unsubscribe = null;
let initialized = false;
let visitorX = null;
let lastTransform = '';
let lastFaceTransform = '';
const frameCache = new Map();
let cachedSkin = '';

const reducedMotionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {}, removeEventListener() {} };

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

function rect(target, px, py, w, h, color) {
    target.fillStyle = color;
    target.fillRect(px, py, w, h);
}

function skinFor(id) {
    return DOG_SKINS.find((skin) => skin.id === id) || DOG_SKINS[0];
}

function drawTail(target, position, skin) {
    if (position === 'high') {
        rect(target, 18, 9, 3, 3, skin.fur);
        rect(target, 20, 8, 2, 2, skin.ear);
    } else if (position === 'low') {
        rect(target, 18, 13, 3, 2, skin.fur);
        rect(target, 20, 12, 2, 2, skin.ear);
    } else {
        rect(target, 18, 11, 3, 3, skin.fur);
        rect(target, 20, 10, 2, 2, skin.ear);
    }
}

function drawLegs(target, legs, skin) {
    if (legs === 'sit') {
        rect(target, 7, 17, 5, 2, skin.ear);
        rect(target, 13, 17, 5, 2, skin.ear);
        rect(target, 8, 18, 3, 1, CREAM);
        rect(target, 14, 18, 3, 1, CREAM);
        return;
    }
    const patterns = {
        stand: [[7, 16], [14, 16]],
        walk0: [[6, 16], [15, 16]],
        walk1: [[7, 15], [14, 17]],
        walk2: [[8, 16], [13, 16]],
        walk3: [[7, 17], [14, 15]],
        walk4: [[6, 16], [15, 16]],
        walk5: [[8, 15], [13, 17]],
    };
    const pair = patterns[legs] || patterns.stand;
    pair.forEach(([px, py]) => {
        rect(target, px, py, 3, 3, skin.ear);
        rect(target, px, py + 2, 3, 1, CREAM);
    });
}

function drawEyes(target, eyes, headY) {
    if (eyes === 'blink' || eyes === 'closed') {
        rect(target, 9, headY + 4, 3, 1, DARK);
        rect(target, 13, headY + 4, 3, 1, DARK);
        if (eyes === 'closed') {
            rect(target, 9, headY + 3, 1, 1, DARK);
            rect(target, 15, headY + 3, 1, 1, DARK);
        }
        return;
    }
    if (eyes === 'happy') {
        rect(target, 9, headY + 4, 1, 1, DARK);
        rect(target, 10, headY + 3, 1, 1, DARK);
        rect(target, 11, headY + 4, 1, 1, DARK);
        rect(target, 13, headY + 4, 1, 1, DARK);
        rect(target, 14, headY + 3, 1, 1, DARK);
        rect(target, 15, headY + 4, 1, 1, DARK);
        return;
    }
    rect(target, 9, headY + 3, 2, 2, DARK);
    rect(target, 13, headY + 3, 2, 2, DARK);
    rect(target, 9, headY + 3, 1, 1, WHITE);
    rect(target, 13, headY + 3, 1, 1, WHITE);
}

function drawMouth(target, mouth, headY, cheek) {
    if (mouth === 'open') {
        rect(target, 10, headY + 8, 4, 2, DARK);
        rect(target, 11, headY + 9, 2, 1, cheek);
    } else if (mouth === 'sleep') {
        rect(target, 11, headY + 8, 2, 1, DARK);
    } else {
        rect(target, 11, headY + 8, 2, 1, DARK);
        rect(target, 10, headY + 7, 1, 1, DARK);
        rect(target, 13, headY + 7, 1, 1, DARK);
    }
}

function drawPaw(target, paw, headY, skin) {
    if (paw === 'up') {
        rect(target, 17, headY + 2, 3, 5, skin.fur);
        rect(target, 17, headY + 1, 3, 2, CREAM);
    } else if (paw === 'mid') {
        rect(target, 17, headY + 4, 3, 4, skin.fur);
        rect(target, 17, headY + 3, 3, 2, CREAM);
    }
}

function drawPose(target, pose, skin) {
    const bob = pose.bob || 0;
    const sitting = Boolean(pose.sit);
    const bodyY = (sitting ? 10 : 8) + bob;
    const headY = (sitting ? 4 : 3) + bob;

    drawTail(target, pose.tail || 'mid', skin);

    if (sitting) {
        rect(target, 7, bodyY, 11, 8, skin.fur);
        rect(target, 9, bodyY + 4, 7, 3, CREAM);
    } else {
        rect(target, 6, bodyY, 12, 8, skin.fur);
        rect(target, 8, bodyY + 4, 8, 3, CREAM);
    }

    rect(target, 5, headY, 3, 7, skin.ear);
    rect(target, 16, headY, 3, 7, skin.ear);
    rect(target, 6, headY + 4, 1, 2, NOSE);
    rect(target, 17, headY + 4, 1, 2, NOSE);

    rect(target, 7, headY, 10, 9, skin.fur);
    rect(target, 8, headY + 6, 8, 3, CREAM);
    rect(target, 7, headY + 7, 2, 2, skin.cheek);
    rect(target, 15, headY + 7, 2, 2, skin.cheek);

    drawEyes(target, pose.eyes || 'open', headY);
    rect(target, 11, headY + 6, 2, 1, NOSE);
    drawMouth(target, pose.mouth || 'smile', headY, skin.cheek);
    drawLegs(target, sitting ? 'sit' : (pose.legs || 'stand'), skin);
    if (pose.paw) drawPaw(target, pose.paw, headY, skin);
}

function frameFor(stateName, index) {
    const skin = skinFor(settings.skin);
    const key = `${skin.id}:${stateName}:${index}`;
    let frame = frameCache.get(key);
    if (!frame) {
        frame = document.createElement('canvas');
        frame.width = SPRITE_W;
        frame.height = SPRITE_H;
        const frameCtx = frame.getContext('2d');
        frameCtx.imageSmoothingEnabled = false;
        drawPose(frameCtx, (POSES[stateName] || POSES.idle)[index], skin);
        frameCache.set(key, frame);
    }
    return frame;
}

function drawCustomDog(target, currentState, index) {
    if (!customImage) {
        target.drawImage(frameFor(currentState, index), 0, 0);
        return;
    }
    const size = Math.min(customImage.width, customImage.height);
    target.imageSmoothingEnabled = false;
    target.drawImage(
        customImage,
        (customImage.width - size) / 2,
        (customImage.height - size) / 2,
        size,
        size,
        0,
        0,
        SPRITE_W,
        SPRITE_H,
    );
    if (currentState === 'waving' || currentState === 'happy') {
        const skin = skinFor(settings.skin);
        const headY = index % 2 === 0 ? 3 : 4;
        drawPaw(target, index % 2 === 0 ? 'up' : 'mid', headY, skin);
    }
}

function drawDog() {
    if (!ctx) return;
    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
    if (settings.customAvatar) drawCustomDog(ctx, state, frameIndex);
    else ctx.drawImage(frameFor(state, frameIndex), 0, 0);
    lastDrawnState = state;
}

function effectiveSize() {
    const cap = desktop && desktop.clientWidth < 760 ? 1.15 : 1.6;
    const scale = clamp(settings.size, 0.7, cap);
    return { scale, w: SPRITE_W * BASE_PIXEL * scale, h: SPRITE_H * BASE_PIXEL * scale };
}

function overlapsDesktopUi(left, top, width, height) {
    if (!desktop) return false;
    const box = { left, top, right: left + width, bottom: top + height };
    const elements = desktop.querySelectorAll('.desktop-icon, .window:not([hidden])');
    for (const element of elements) {
        if (!element.offsetParent && element !== document.activeElement) continue;
        const elementRect = element.getBoundingClientRect();
        const deskRect = desktop.getBoundingClientRect();
        const item = {
            left: elementRect.left - deskRect.left,
            top: elementRect.top - deskRect.top,
            right: elementRect.right - deskRect.left,
            bottom: elementRect.bottom - deskRect.top,
        };
        if (box.left < item.right && box.right > item.left && box.top < item.bottom && box.bottom > item.top) return true;
    }
    return false;
}

function reposition() {
    if (!desktop || !root) return;
    const { w, h, scale } = effectiveSize();
    root.style.setProperty('--dog-scale', String(scale));
    const maxX = Math.max(MIN_X, desktop.clientWidth - w - EDGE_GAP);
    const maxY = Math.max(MIN_X, desktop.clientHeight - h - EDGE_GAP);
    x = clamp(x || desktop.clientWidth * 0.28, MIN_X, maxX);
    y = clamp(y || (maxY - 8), MIN_X, maxY);
    renderPosition();
}

function renderPosition() {
    if (!root) return;
    const transform = `translate3d(${x}px, ${y + jumpY}px, 0)`;
    if (transform === lastTransform) return;
    root.style.transform = transform;
    lastTransform = transform;
}

function renderFace(customBob = 0) {
    if (!spriteWrap) return;
    const transform = `scaleX(${direction})${customBob ? ` translateY(${customBob}px)` : ''}`;
    if (transform === lastFaceTransform) return;
    spriteWrap.style.transform = transform;
    lastFaceTransform = transform;
}

function hideBubble() {
    if (bubble) bubble.hidden = true;
}

function showBubble(message, duration) {
    if (!bubble) return;
    const token = ++bubbleToken;
    if (!settings.speech) {
        hideBubble();
        return;
    }
    bubble.textContent = message;
    bubble.hidden = false;
    window.setTimeout(() => {
        if (token === bubbleToken) hideBubble();
    }, duration);
}

function presentBubbles(messages, total) {
    if (!bubble) return;
    const token = ++bubbleToken;
    hideBubble();
    const slice = total / messages.length;
    messages.forEach((message, index) => {
        window.setTimeout(() => {
            if (token !== bubbleToken || !settings.speech || !settings.visible) return;
            bubble.textContent = message;
            bubble.hidden = false;
        }, index * slice);
    });
    window.setTimeout(() => {
        if (token === bubbleToken) hideBubble();
    }, total + 160);
}

function randomOf(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function durationFor(nextState) {
    const base = DURATIONS[nextState] || DURATIONS.idle;
    const jitter = nextState === 'walking' ? 0.8 + Math.random() * 0.5 : 1;
    return (base * jitter) / clamp(settings.speed, 0.25, 2.5);
}

function visitorDirection() {
    if (!root || !desktop) return 1;
    const dogRect = root.getBoundingClientRect();
    const dogCenter = dogRect ? dogRect.left + dogRect.width / 2 : x;
    const target = visitorX === null
        ? desktop.getBoundingClientRect().left + desktop.clientWidth / 2
        : visitorX;
    return target < dogCenter ? -1 : 1;
}

function enter(nextState, now = performance.now()) {
    if (!STATES.includes(nextState)) return;
    state = nextState;
    stateStart = now;
    stateDuration = durationFor(nextState);
    frameIndex = 0;
    jumpY = 0;
    if (nextState === 'waving') {
        direction = visitorDirection();
        presentBubbles(GREETINGS, stateDuration);
    } else if (nextState === 'happy') {
        direction = visitorDirection();
        showBubble(randomOf(FRIENDLY), stateDuration);
    }
    if (zzz) zzz.hidden = nextState !== 'sleeping';
    drawDog();
    renderFace();
    renderPosition();
}

function pickNextState(now) {
    const roll = Math.random();
    if (reducedMotionQuery.matches) {
        enter(randomOf(['idle', 'idle', 'sitting', 'waving', 'sleeping']), now);
        return;
    }
    if (!settings.walking || settings.idleOnly) {
        if (roll < 0.42) enter('idle', now);
        else if (roll < 0.66) enter('waving', now);
        else if (roll < 0.86) enter('sitting', now);
        else enter('sleeping', now);
        return;
    }
    if (roll < 0.42) enter('walking', now);
    else if (roll < 0.6) enter('idle', now);
    else if (roll < 0.76) enter('waving', now);
    else if (roll < 0.9) enter('sitting', now);
    else enter('sleeping', now);
}

function frameIndexFor(now) {
    const delay = (FRAME_MS[state] || FRAME_MS.idle) / clamp(settings.speed, 0.25, 2.5);
    const elapsed = Math.max(0, now - stateStart);
    if (state === 'waving') {
        return Math.min(7, Math.floor(elapsed / delay)) % POSES.waving.length;
    }
    return Math.floor(elapsed / delay) % (POSES[state] || POSES.idle).length;
}

function tick(time) {
    if (!settings.visible || document.hidden) {
        raf = 0;
        return;
    }
    raf = requestAnimationFrame(tick);
    const speed = clamp(settings.speed, 0.25, 2.5);
    const frameDelay = Math.max(60, (FRAME_MS[state] || FRAME_MS.idle) / speed);
    if (time - lastFrameTime < Math.min(50, frameDelay / 2)) return;
    const dt = lastTime ? Math.min(90, time - lastTime) : 16;
    lastFrameTime = time;
    lastTime = time;

    if (time - stateStart >= stateDuration) pickNextState(time);

    const { w, h, scale } = effectiveSize();
    if (state === 'walking') {
        const step = direction * 24 * speed * (dt / 1000);
        const maxX = Math.max(MIN_X, desktop.clientWidth - w - EDGE_GAP);
        let nextX = x + step;
        if (nextX <= MIN_X || nextX >= maxX) {
            direction *= -1;
            nextX = clamp(nextX, MIN_X, maxX);
        }
        if (overlapsDesktopUi(nextX, y, w, h)) direction *= -1;
        else x = nextX;
    }

    if (state === 'happy') {
        const progress = clamp((time - stateStart) / stateDuration, 0, 1);
        jumpY = -Math.round(Math.sin(progress * Math.PI) * 9 * scale);
    } else {
        jumpY = 0;
    }

    const nextFrame = frameIndexFor(time);
    const needsDraw = nextFrame !== frameIndex || state !== lastDrawnState;
    frameIndex = nextFrame;

    let customBob = 0;
    if (settings.customAvatar && (state === 'idle' || state === 'sitting' || state === 'sleeping')) {
        customBob = Math.round(Math.sin(time / 420) * (state === 'sleeping' ? 0.6 : 1));
    }
    if (needsDraw) drawDog();
    renderFace(customBob);
    renderPosition();
}

function stopLoop() {
    if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
    }
}

function startLoop() {
    if (raf || !settings.visible || document.hidden || reducedMotionQuery.matches) return;
    lastTime = 0;
    lastFrameTime = 0;
    raf = requestAnimationFrame(tick);
}

function renderStatic() {
    jumpY = 0;
    if (zzz) zzz.hidden = state !== 'sleeping';
    drawDog();
    renderFace();
    renderPosition();
}

function reactToClick() {
    if (!settings.visible) return;
    window.dispatchEvent(new CustomEvent('prasad-dog-click'));
    enter('happy', performance.now());
    if (reducedMotionQuery.matches) {
        renderStatic();
        window.setTimeout(() => {
            if (!reducedMotionQuery.matches || state !== 'happy') return;
            enter('idle', performance.now());
            hideBubble();
            renderStatic();
        }, 1200);
    }
}

function loadCustomAvatar(source) {
    if (!source) {
        customImage = null;
        customSource = null;
        return;
    }
    if (customSource === source && customImage) return;
    customSource = source;
    customImage = null;
    const image = new Image();
    image.onload = () => {
        customImage = image;
        drawDog();
    };
    image.onerror = () => {
        customImage = null;
        customSource = null;
        drawDog();
    };
    image.src = source;
}

function applySettings(next) {
    const previousSettings = settings;
    settings = { ...settings, ...next.dog };
    if (settings.skin !== previousSettings.skin) frameCache.clear();
    if (!root) return;
    root.hidden = !settings.visible;
    if (!settings.speech) {
        bubbleToken += 1;
        hideBubble();
    }
    loadCustomAvatar(settings.customAvatar);
    reposition();
    if (settings.visible && !reducedMotionQuery.matches) startLoop();
    else {
        stopLoop();
        if (settings.visible) renderStatic();
    }
    drawDog();
}

function onReducedMotionChange() {
    if (reducedMotionQuery.matches) {
        stopLoop();
        enter('idle', performance.now());
        renderStatic();
    } else {
        startLoop();
    }
}

export function initDogCompanion() {
    if (initialized || !document.getElementById('desktop')) return;
    initialized = true;
    desktop = document.getElementById('desktop');
    root = document.createElement('aside');
    root.id = 'dog-companion';
    root.className = 'dog-companion';
    root.setAttribute('aria-label', 'Pixel dog companion');
    root.innerHTML = `
        <div class="dog-bubble" hidden></div>
        <button type="button" class="dog-hit" aria-label="Greet the pixel dog companion">
            <span class="dog-sprite-wrap"><canvas class="dog-sprite" width="${SPRITE_W}" height="${SPRITE_H}" aria-hidden="true"></canvas></span>
        </button>
        <span class="dog-zzz" aria-hidden="true" hidden>Zzz</span>
    `;
    desktop.insertBefore(root, desktop.firstChild);
    hitButton = root.querySelector('.dog-hit');
    bubble = root.querySelector('.dog-bubble');
    spriteWrap = root.querySelector('.dog-sprite-wrap');
    canvas = root.querySelector('.dog-sprite');
    zzz = root.querySelector('.dog-zzz');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    hitButton.addEventListener('click', reactToClick);
    window.addEventListener('pointermove', (event) => {
        visitorX = event.clientX;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopLoop();
        else startLoop();
    });
    window.addEventListener('resize', () => {
        reposition();
        drawDog();
    });
    if (typeof reducedMotionQuery.addEventListener === 'function') {
        reducedMotionQuery.addEventListener('change', onReducedMotionChange);
    }

    unsubscribe = subscribe(applySettings);
    applySettings(getSettings());
    enter('idle');
    startLoop();
}

export function destroyDogCompanion() {
    stopLoop();
    if (unsubscribe) unsubscribe();
    if (root) root.remove();
    root = null;
    hitButton = null;
    initialized = false;
}

// Read-only diagnostics, also used by the companion's automated checks.
export function getDogState() {
    return {
        state,
        x,
        y,
        direction,
        frame: frameIndex,
        visible: settings.visible,
        speech: settings.speech,
        bubble: bubble ? bubble.textContent : '',
    };
}
