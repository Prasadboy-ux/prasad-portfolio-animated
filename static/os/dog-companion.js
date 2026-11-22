// PRASAD DESKTOP — lightweight animated pixel dog companion.
// The pet lives below desktop icons and windows, so it never blocks the workspace.
import { DOG_SKINS, getSettings, subscribe } from './personalization.js';

const BUBBLES = [
    'Hi! 👋',
    'Welcome to Prasad\'s Desktop!',
    'Nice to meet you!',
    'Woof! 🐾',
    'Ready to explore?',
];

const SLEEP_BUBBLES = ['Zzz...', 'Dreaming of pixels...'];
const SPRITE_W = 24;
const SPRITE_H = 20;
const BASE_PIXEL = 3;

let root = null;
let spriteWrap = null;
let canvas = null;
let ctx = null;
let bubble = null;
let desktop = null;
let state = 'idle';
let stateUntil = 0;
let bubbleUntil = 0;
let bubbleToken = 0;
let direction = 1;
let x = 0;
let y = 0;
let frame = 0;
let lastFrame = 0;
let lastTime = 0;
let raf = 0;
let settings = getSettings().dog;
let customImage = null;
let customSource = null;
let unsubscribe = null;
let initialized = false;

const reducedMotionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {}, removeEventListener() {} };

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

function rect(ctxTarget, px, py, w, h, color) {
    ctxTarget.fillStyle = color;
    ctxTarget.fillRect(px, py, w, h);
}

function skinFor(id) {
    return DOG_SKINS.find((skin) => skin.id === id) || DOG_SKINS[0];
}

function drawBuiltInDog(target, currentState, step) {
    const skin = skinFor(settings.skin);
    const fur = skin.fur;
    const ear = skin.ear;
    const cheek = skin.cheek;
    const dark = '#2b1d16';
    const cream = '#fff3de';
    const nose = '#3c2a28';
    const sleeping = currentState === 'sleep';
    const sitting = currentState === 'sit';
    const waving = currentState === 'wave' || currentState === 'click';
    const bodyY = sitting ? 9 : 8;
    const headY = sitting ? 5 : 4;

    rect(target, 19, 10 + (step ? -1 : 1), 3, 3, fur);
    rect(target, 21, 9 + (step ? -2 : 0), 2, 2, ear);
    rect(target, 6, bodyY, 12, 7, fur);
    rect(target, 8, bodyY + 4, 7, 3, cream);
    rect(target, 5, headY, 3, 6, ear);
    rect(target, 16, headY, 3, 6, ear);
    rect(target, 7, headY, 10, 8, fur);
    rect(target, 8, headY + 7, 8, 2, cream);
    rect(target, 7, headY + 6, 2, 2, cheek);
    rect(target, 15, headY + 6, 2, 2, cheek);

    if (sleeping) {
        rect(target, 9, headY + 4, 3, 1, dark);
        rect(target, 14, headY + 4, 3, 1, dark);
    } else {
        const blink = step === 2;
        rect(target, 9, headY + 3, blink ? 3 : 1, blink ? 1 : 2, dark);
        rect(target, 14, headY + 3, blink ? 3 : 1, blink ? 1 : 2, dark);
    }
    rect(target, 11, headY + 6, 2, 2, nose);

    if (currentState === 'walk' && !sitting) {
        rect(target, step ? 6 : 7, 15, 3, 3, ear);
        rect(target, step ? 15 : 14, 15, 3, 3, ear);
    } else if (sitting || sleeping) {
        rect(target, 6, 16, 5, 2, ear);
        rect(target, 13, 16, 5, 2, ear);
    } else {
        rect(target, 7, 15, 3, 3, ear);
        rect(target, 14, 15, 3, 3, ear);
    }

    if (waving) {
        const lift = step ? 2 : 0;
        rect(target, 17, 10 - lift, 3, 5, fur);
        rect(target, 17, 9 - lift, 3, 2, cream);
    }
}

function drawCustomDog(target, currentState, step) {
    if (!customImage) {
        drawBuiltInDog(target, currentState, step);
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
    if (currentState === 'wave' || currentState === 'click') {
        rect(target, 18, step ? 7 : 9, 4, 5, '#fff3de');
        rect(target, 18, step ? 6 : 8, 4, 2, skinFor(settings.skin).fur);
    }
}

function drawDog() {
    if (!ctx) return;
    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
    if (settings.customAvatar) drawCustomDog(ctx, state, frame);
    else drawBuiltInDog(ctx, state, frame);
}

function dimensions() {
    const scale = clamp(settings.size, 0.7, 1.6);
    return { w: SPRITE_W * BASE_PIXEL * scale, h: SPRITE_H * BASE_PIXEL * scale };
}

function overlapsDesktopUi(left, top, width, height) {
    if (!desktop) return false;
    const box = { left, top, right: left + width, bottom: top + height };
    const elements = desktop.querySelectorAll('.desktop-icon, .window:not([hidden])');
    for (const element of elements) {
        if (!element.offsetParent && element !== document.activeElement) continue;
        const rect = element.getBoundingClientRect();
        const deskRect = desktop.getBoundingClientRect();
        const item = {
            left: rect.left - deskRect.left,
            top: rect.top - deskRect.top,
            right: rect.right - deskRect.left,
            bottom: rect.bottom - deskRect.top,
        };
        if (box.left < item.right && box.right > item.left && box.top < item.bottom && box.bottom > item.top) return true;
    }
    return false;
}

function reposition() {
    if (!desktop || !root) return;
    const size = dimensions();
    const maxX = Math.max(4, desktop.clientWidth - size.w - 4);
    const maxY = Math.max(4, desktop.clientHeight - size.h - 4);
    x = clamp(x || desktop.clientWidth * 0.28, 4, maxX);
    y = clamp(y || (maxY - 8), 4, maxY);
    root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function showBubble(message, duration = 2200) {
    if (!bubble) return;
    const token = ++bubbleToken;
    bubble.textContent = message;
    bubble.hidden = false;
    bubbleUntil = performance.now() + duration;
    window.setTimeout(() => {
        if (token === bubbleToken) bubble.hidden = true;
    }, duration + 80);
}

function randomOf(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function enter(nextState, now = performance.now()) {
    state = nextState;
    frame = 0;
    const speed = clamp(settings.speed, 0.25, 2.5);
    const base = {
        walk: 6200,
        idle: 4800,
        wave: 2100,
        sit: 3600,
        sleep: 5200,
        click: 1900,
    }[nextState] || 4000;
    stateUntil = now + base / speed;
    if (nextState === 'wave') showBubble(randomOf(BUBBLES), Math.min(2600, base / speed));
    if (nextState === 'sleep') showBubble(randomOf(SLEEP_BUBBLES), Math.min(2200, base / speed));
    drawDog();
}

function pickNextState() {
    if (settings.idleOnly || !settings.walking || reducedMotionQuery.matches) {
        const list = ['idle', 'idle', 'sit', 'wave', 'idle', 'sleep'];
        enter(randomOf(list));
        return;
    }
    const roll = Math.random();
    if (roll < 0.48) enter('walk');
    else if (roll < 0.68) enter('idle');
    else if (roll < 0.8) enter('wave');
    else if (roll < 0.91) enter('sit');
    else enter('sleep');
}

function tick(time) {
    if (!settings.visible || document.hidden) {
        raf = 0;
        return;
    }
    const dt = lastTime ? Math.min(64, time - lastTime) : 16;
    lastTime = time;
    if (time >= stateUntil) pickNextState();

    const size = dimensions();
    if (state === 'walk' && settings.walking && !settings.idleOnly) {
        const speed = clamp(settings.speed, 0.25, 2.5);
        const step = direction * 24 * speed * (dt / 1000);
        let nextX = x + step;
        const maxX = Math.max(4, desktop.clientWidth - size.w - 4);
        if (nextX <= 4 || nextX >= maxX) {
            direction *= -1;
            nextX = clamp(nextX, 4, maxX);
        }
        if (overlapsDesktopUi(nextX, y, size.w, size.h)) {
            direction *= -1;
        } else {
            x = nextX;
        }
        spriteWrap.style.transform = `scaleX(${direction})`;
    }

    const frameDelay = Math.max(70, 165 / clamp(settings.speed, 0.25, 2.5));
    if (time - lastFrame > frameDelay) {
        frame = (frame + 1) % 3;
        lastFrame = time;
        drawDog();
    }
    if (bubbleUntil && time > bubbleUntil) bubbleUntil = 0;
    root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = requestAnimationFrame(tick);
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
    raf = requestAnimationFrame(tick);
}

function reactToClick() {
    if (!settings.visible) return;
    enter('click');
    showBubble(randomOf(BUBBLES), 2400);
    window.dispatchEvent(new CustomEvent('prasad-dog-click'));
    if (reducedMotionQuery.matches) window.setTimeout(drawDog, 1200);
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
    settings = { ...settings, ...next.dog };
    if (!root) return;
    root.hidden = !settings.visible;
    root.style.setProperty('--dog-scale', String(clamp(settings.size, 0.7, 1.6)));
    loadCustomAvatar(settings.customAvatar);
    reposition();
    drawDog();
    if (settings.visible && !reducedMotionQuery.matches) startLoop();
    else stopLoop();
}

function onReducedMotionChange() {
    if (reducedMotionQuery.matches) {
        stopLoop();
        enter('idle');
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
    root.setAttribute('role', 'button');
    root.setAttribute('tabindex', '0');
    root.setAttribute('aria-label', 'Pixel dog companion — click to greet');
    root.innerHTML = `
        <div class="dog-bubble" hidden></div>
        <div class="dog-sprite-wrap"><canvas class="dog-sprite" width="${SPRITE_W}" height="${SPRITE_H}" aria-hidden="true"></canvas></div>
    `;
    desktop.insertBefore(root, desktop.firstChild);
    bubble = root.querySelector('.dog-bubble');
    spriteWrap = root.querySelector('.dog-sprite-wrap');
    canvas = root.querySelector('.dog-sprite');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    root.addEventListener('click', reactToClick);
    root.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            reactToClick();
        }
    });

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
    initialized = false;
}
