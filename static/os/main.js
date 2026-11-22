// PRASAD DESKTOP — desktop shell, window manager, menus, search, and command palette.
import { APPS, COMMANDS, PROFILE } from './data.js';
import { getView } from './apps.js';
import { createSfxEngine, createMusicEngine } from './audio.js';
import { initPersonalization } from './personalization.js';
import { initDogCompanion } from './dog-companion.js';

const $ = (selector) => document.querySelector(selector);
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const desktop = $('#desktop');
const wallpaper = $('#wallpaper');
const iconLayer = $('#icon-layer');
const windowLayer = $('#window-layer');
const taskButtons = $('#task-buttons');
const startButton = $('#start-button');
const startMenu = $('#start-menu');
const contextMenu = $('#context-menu');
const commandOverlay = $('#command-overlay');
const commandInput = $('#command-input');
const commandResults = $('#command-results');
const commandClose = $('#command-close');
const shutdownOverlay = $('#shutdown-overlay');
const shutdownBack = $('#shutdown-back');
const soundToggle = $('#sound-toggle');
const musicToggle = $('#music-toggle');
const musicEq = $('#music-eq');
const musicVolume = $('#music-volume');
const musicMute = $('#music-mute');
const crtToggle = $('#crt-toggle');
const snapPreview = $('#snap-preview');
const screen = $('.screen');
const clock = $('#clock');

const ICON_W = 84;
const ICON_H = 88;
const X_STEP = 96;
const Y_STEP = 102;
const POSITIONS_KEY = 'prasad-desktop-icon-positions';
const ICON_LAYOUT_KEY = 'prasad-desktop-icon-layout';
const SOUND_KEY = 'prasad-desktop-ui-sounds';
const MUSIC_ENABLED_KEY = 'prasad-desktop-music-enabled';
const MUSIC_VOLUME_KEY = 'prasad-desktop-music-volume';
const MUSIC_MUTE_KEY = 'prasad-desktop-music-muted';
const CRT_KEY = 'prasad-desktop-crt';
const RESIZE_DIRS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

const windows = new Map();
const appWindows = new Map();
let zCounter = 20;
let iconSequence = 0;
let soundsEnabled = false;
let musicEnabled = true;
let crtEnabled = true;
let storedVolume = 35;
let storedMusicMuted = false;
try { soundsEnabled = localStorage.getItem(SOUND_KEY) === '1'; } catch (error) { /* storage unavailable */ }
try { musicEnabled = localStorage.getItem(MUSIC_ENABLED_KEY) !== '0'; } catch (error) { /* storage unavailable */ }
try { crtEnabled = localStorage.getItem(CRT_KEY) !== '0'; } catch (error) { /* storage unavailable */ }
try {
    const savedVolume = localStorage.getItem(MUSIC_VOLUME_KEY);
    storedVolume = savedVolume === null ? 35 : clamp(Number(savedVolume) || 0, 0, 100);
} catch (error) { /* storage unavailable */ }
try { storedMusicMuted = localStorage.getItem(MUSIC_MUTE_KEY) === '1'; } catch (error) { /* storage unavailable */ }

const sfx = createSfxEngine(() => soundsEnabled);
const music = createMusicEngine({ onStateChange: renderMusicControls });

/* ------------------------------- utility ------------------------------- */
function loadPositions() {
    try {
        return JSON.parse(localStorage.getItem(POSITIONS_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function savePositions() {
    try {
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(iconPositions));
    } catch (error) { /* storage unavailable */ }
}

function loadIconLayout() {
    try {
        return localStorage.getItem(ICON_LAYOUT_KEY) || '';
    } catch (error) {
        return '';
    }
}

function saveIconLayout(signature) {
    try {
        localStorage.setItem(ICON_LAYOUT_KEY, signature);
    } catch (error) { /* storage unavailable */ }
}

function iconLayout() {
    const width = iconLayer.clientWidth;
    const height = iconLayer.clientHeight;
    const columns = Math.max(1, Math.floor((width - 12) / X_STEP));
    const rows = Math.max(1, Math.floor((height - 12) / Y_STEP));
    return {
        columns,
        rows,
        signature: `${columns}x${rows}`,
        maxLeft: Math.max(0, width - ICON_W - 4),
        maxTop: Math.max(0, height - ICON_H - 4),
    };
}

let iconPositions = loadPositions();

function playSound(type = 'click') {
    sfx.play(type);
}

function toast(message) {
    const element = document.createElement('div');
    element.className = 'toast';
    element.setAttribute('role', 'status');
    element.textContent = message;
    $('.screen').appendChild(element);
    setTimeout(() => element.remove(), 2800);
}

function appMeta(appId, options = {}) {
    if (appId === 'project' && options.project) {
        return { title: options.project.name + ' — Project Folder', icon: options.project.icon, width: 570, height: 430 };
    }
    if (appId === 'job' && options.job) {
        return { title: options.job.title + ' — Full Description', icon: '▤', width: 620, height: 480 };
    }
    return APPS.find((app) => app.id === appId) || {
        title: appId.charAt(0).toUpperCase() + appId.slice(1), icon: '▣', width: 600, height: 440,
    };
}

/* ---------------------------- desktop icons ---------------------------- */
function selectIcon(element) {
    iconLayer.querySelectorAll('.desktop-icon').forEach((icon) => icon.classList.remove('selected'));
    element.classList.add('selected');
    playSound('click');
}

function positionIcon(element, left, top, bounds) {
    const maxLeft = bounds ? bounds.maxLeft : Math.max(0, iconLayer.clientWidth - ICON_W - 4);
    const maxTop = bounds ? bounds.maxTop : Math.max(0, iconLayer.clientHeight - ICON_H - 4);
    const safeLeft = clamp(Math.round(left), 4, maxLeft);
    const safeTop = clamp(Math.round(top), 4, maxTop);
    element.style.left = safeLeft + 'px';
    element.style.top = safeTop + 'px';
    return { left: safeLeft, top: safeTop };
}

function layoutIcons(save = true) {
    const { columns, signature, maxLeft, maxTop } = iconLayout();
    const bounds = { maxLeft, maxTop };
    const layoutChanged = loadIconLayout() !== signature;

    // Saved coordinates only make sense for the grid they were created in.
    // A breakpoint/orientation change starts from a clean grid instead of
    // clamping every desktop icon into the same corner.
    if (layoutChanged) iconPositions = {};

    iconLayer.querySelectorAll('.desktop-icon').forEach((element, index) => {
        const id = element.dataset.app;
        const saved = iconPositions[id];
        const position = saved
            ? positionIcon(element, saved.left, saved.top, bounds)
            : positionIcon(element, 18 + (index % columns) * X_STEP, 14 + Math.floor(index / columns) * Y_STEP, bounds);
        iconPositions[id] = position;
    });

    if (save || layoutChanged) {
        savePositions();
        saveIconLayout(signature);
    }
}

function makeDesktopIcon(app) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'desktop-icon';
    element.dataset.app = app.id;
    element.setAttribute('aria-label', app.label + ' — double-click, press Enter, or tap twice to open');
    element.innerHTML = `
        <span class="icon-art ${app.id}" aria-hidden="true">${app.icon}</span>
        <span class="icon-label"><span>${app.label}</span></span>
    `;

    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let moved = false;
    let suppressClickUntil = 0;
    let lastTap = 0;
    let lastOpenAt = 0;

    // One guarded entry point prevents double-opening from mouse, touch and keyboard.
    const openIcon = () => {
        const now = Date.now();
        if (now - lastOpenAt < 350) return;
        lastOpenAt = now;
        suppressClickUntil = now + 350;
        openWindow(app.id);
    };

    const finishPointer = (event, cancelled = false) => {
        if (activePointerId !== null && event.pointerId !== activePointerId) return;
        const pointerId = event.pointerId;
        activePointerId = null;
        try {
            if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
        } catch (error) { /* capture unavailable */ }
        element.classList.remove('dragging');

        if (moved) {
            suppressClickUntil = Date.now() + 350;
            const position = positionIcon(element, parseFloat(element.style.left), parseFloat(element.style.top));
            iconPositions[app.id] = position;
            savePositions();
            return;
        }

        if (cancelled || event.pointerType === 'mouse') return;

        // Touch / pen: single tap selects, second quick tap opens.
        const now = Date.now();
        if (now - lastTap < 450) openIcon();
        lastTap = now;
    };

    element.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (activePointerId !== null) return;
        activePointerId = event.pointerId;
        try { element.setPointerCapture(event.pointerId); } catch (error) { /* capture unavailable */ }
        selectIcon(element);
        moved = false;
        startX = event.clientX;
        startY = event.clientY;
        originLeft = parseFloat(element.style.left) || 0;
        originTop = parseFloat(element.style.top) || 0;
    });

    element.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activePointerId) return;
        if (!moved && Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return;
        moved = true;
        element.classList.add('dragging');
        positionIcon(element, originLeft + event.clientX - startX, originTop + event.clientY - startY);
    });

    element.addEventListener('pointerup', (event) => finishPointer(event, false));
    element.addEventListener('pointercancel', (event) => finishPointer(event, true));
    element.addEventListener('lostpointercapture', (event) => {
        if (activePointerId === event.pointerId) finishPointer(event, true);
    });

    element.addEventListener('click', (event) => {
        event.stopPropagation();
        if (Date.now() < suppressClickUntil) return;
        selectIcon(element);
    });

    element.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openIcon();
    });

    element.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.repeat) return;
        event.preventDefault();
        event.stopPropagation();
        selectIcon(element);
        openIcon();
    });

    return element;
}

function renderIcons() {
    iconLayer.innerHTML = '';
    APPS.forEach((app) => iconLayer.appendChild(makeDesktopIcon(app)));
    layoutIcons();
}

/* ---------------------------- window manager ---------------------------- */
function renderTaskbar() {
    const existing = new Map([...taskButtons.children].map((button) => [button.dataset.winId, button]));
    windows.forEach((win) => {
        let button = existing.get(win.id);
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'task-button';
            button.dataset.winId = win.id;
            button.addEventListener('click', () => {
                if (win.minimized) restoreWindow(win);
                else if (win.active) minimizeWindow(win);
                else {
                    focusWindow(win);
                    focusWindowElement(win);
                }
                playSound('click');
            });
            taskButtons.appendChild(button);
        } else {
            existing.delete(win.id);
        }
        button.className = 'task-button' + (win.active ? ' active' : '');
        button.setAttribute('aria-label', 'Switch to ' + win.meta.title);
        button.innerHTML = `<span class="dot ${win.active ? 'active-dot' : ''}"></span><span>${win.meta.title}</span>`;
    });
    existing.forEach((button) => button.remove());
}

function focusWindowElement(win) {
    try {
        win.element.focus({ preventScroll: true });
    } catch (error) {
        win.element.focus();
    }
}

function focusWindow(win) {
    windows.forEach((item) => {
        item.active = false;
        item.element.classList.remove('active');
    });
    win.active = true;
    win.minimized = false;
    win.element.classList.remove('minimized');
    win.element.classList.add('active');
    zCounter += 1;
    win.element.style.zIndex = String(zCounter);
    renderTaskbar();
}

function focusTopWindow(focusElement = false) {
    const candidates = [...windows.values()].filter((win) => !win.minimized);
    if (!candidates.length) {
        renderTaskbar();
        return;
    }
    candidates.sort((a, b) => Number(a.element.style.zIndex || 0) - Number(b.element.style.zIndex || 0));
    const top = candidates[candidates.length - 1];
    focusWindow(top);
    if (focusElement) focusWindowElement(top);
}

function minimizeWindow(win) {
    win.minimized = true;
    win.active = false;
    win.element.classList.add('minimized');
    win.element.classList.remove('active');
    playSound('close');
    focusTopWindow();
}

function restoreWindow(win) {
    focusWindow(win);
    focusWindowElement(win);
}

/* --------------------- window geometry + snap helpers --------------------- */
function currentRect(win) {
    return {
        left: win.element.style.left,
        top: win.element.style.top,
        width: win.element.style.width,
        height: win.element.style.height,
    };
}

function applyRect(win, rect) {
    const px = (value) => typeof value === 'number' ? value + 'px' : value;
    Object.assign(win.element.style, {
        left: px(rect.left),
        top: px(rect.top),
        width: px(rect.width),
        height: px(rect.height),
    });
}

function minWindowSize() {
    return desktop.clientWidth <= 760
        ? { width: 260, height: 180 }
        : { width: 300, height: 200 };
}

function saveRestoreRect(win) {
    if (!win.previousRect) win.previousRect = currentRect(win);
}

function snapGeometry(side) {
    if (side === 'maximize') {
        return { left: 0, top: 0, width: desktop.clientWidth, height: desktop.clientHeight };
    }
    const half = Math.floor(desktop.clientWidth / 2);
    return {
        left: side === 'left' ? 0 : half,
        top: 0,
        width: side === 'left' ? half : desktop.clientWidth - half,
        height: desktop.clientHeight,
    };
}

function snapTargetFor(clientX, clientY) {
    const rect = desktop.getBoundingClientRect();
    const edge = Math.max(8, Math.min(14, rect.width * 0.02));
    if (clientY - rect.top <= edge) return 'maximize';
    if (clientX - rect.left <= edge) return 'left';
    if (rect.right - clientX <= edge) return 'right';
    return null;
}

function showSnapPreview(side) {
    if (!side) {
        snapPreview.hidden = true;
        return;
    }
    const geometry = snapGeometry(side);
    Object.assign(snapPreview.style, {
        left: geometry.left + 'px',
        top: geometry.top + 'px',
        width: geometry.width + 'px',
        height: geometry.height + 'px',
    });
    snapPreview.hidden = false;
}

function hideSnapPreview() {
    snapPreview.hidden = true;
}

function maximizeWindow(win, save = true) {
    if (save) saveRestoreRect(win);
    applyRect(win, snapGeometry('maximize'));
    win.maximized = true;
    win.snapped = 'maximize';
    win.element.classList.add('maximized');
}

function snapWindow(win, side, save = true) {
    if (save) saveRestoreRect(win);
    if (side === 'maximize' || snapGeometry(side).width < minWindowSize().width) {
        maximizeWindow(win, false);
        return;
    }
    applyRect(win, snapGeometry(side));
    win.maximized = false;
    win.snapped = side;
    win.element.classList.remove('maximized');
}

function restorePreviousRect(win) {
    if (win.previousRect) applyRect(win, win.previousRect);
    win.previousRect = null;
    win.maximized = false;
    win.snapped = null;
    win.element.classList.remove('maximized');
}

function toggleMaximize(win) {
    if (win.maximized) restorePreviousRect(win);
    else maximizeWindow(win);
    playSound('click');
    focusWindow(win);
}

function closeWindow(win) {
    const returnFocus = win.returnFocus;
    try {
        if (win.view.cleanup) win.view.cleanup(win.body, win);
    } catch (error) { /* cleanup is best effort */ }
    hideSnapPreview();
    win.element.remove();
    windows.delete(win.id);
    if (appWindows.get(win.appId) === win.id) appWindows.delete(win.appId);
    playSound('close');
    const remaining = [...windows.values()].filter((item) => !item.minimized);
    if (remaining.length) {
        focusTopWindow(true);
    } else if (returnFocus && returnFocus.isConnected) {
        returnFocus.focus({ preventScroll: true });
    } else {
        renderTaskbar();
    }
}

function attachWindowDrag(win) {
    const bar = win.element.querySelector('.titlebar');
    bar.addEventListener('pointerdown', (event) => {
        focusWindow(win);
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (win.maximized || event.target.closest('.window-control')) return;
        event.preventDefault();

        const pointerId = event.pointerId;
        try { bar.setPointerCapture(pointerId); } catch (error) { /* capture unavailable */ }
        const desktopRect = desktop.getBoundingClientRect();
        const rect = win.element.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        const startX = event.clientX;
        const startY = event.clientY;
        let finished = false;
        let moved = false;
        let snapSide = null;

        const move = (moveEvent) => {
            if (moveEvent.pointerId !== pointerId) return;
            if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 3) moved = true;
            const maxLeft = Math.max(0, desktop.clientWidth - win.element.offsetWidth);
            const maxTop = Math.max(0, desktop.clientHeight - 30);
            win.element.style.left = clamp(moveEvent.clientX - desktopRect.left - offsetX, 0, maxLeft) + 'px';
            win.element.style.top = clamp(moveEvent.clientY - desktopRect.top - offsetY, 0, maxTop) + 'px';
            snapSide = snapTargetFor(moveEvent.clientX, moveEvent.clientY);
            showSnapPreview(snapSide);
        };

        const stop = (stopEvent, cancelled = false) => {
            if (finished || stopEvent.pointerId !== pointerId) return;
            finished = true;
            hideSnapPreview();
            if (!cancelled && snapSide) {
                snapWindow(win, snapSide);
                playSound('click');
            } else if (!cancelled && moved && win.snapped && !win.maximized) {
                restorePreviousRect(win);
            }
            bar.removeEventListener('pointermove', move);
            bar.removeEventListener('pointerup', onUp);
            bar.removeEventListener('pointercancel', onCancel);
            bar.removeEventListener('lostpointercapture', onCaptureLoss);
            try {
                if (bar.hasPointerCapture(pointerId)) bar.releasePointerCapture(pointerId);
            } catch (error) { /* capture unavailable */ }
        };
        const onUp = (stopEvent) => stop(stopEvent, false);
        const onCancel = (stopEvent) => stop(stopEvent, true);
        const onCaptureLoss = (stopEvent) => stop(stopEvent, true);

        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', onUp);
        bar.addEventListener('pointercancel', onCancel);
        bar.addEventListener('lostpointercapture', onCaptureLoss);
    });
}

function attachWindowResize(win) {
    const handles = win.element.querySelectorAll('.resize-handle');
    handles.forEach((handle) => {
        handle.addEventListener('pointerdown', (event) => {
            if (win.maximized || event.target !== handle) return;
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            focusWindow(win);

            const pointerId = event.pointerId;
            try { handle.setPointerCapture(pointerId); } catch (error) { /* capture unavailable */ }
            const direction = handle.dataset.resize;
            const desktopRect = desktop.getBoundingClientRect();
            const rect = win.element.getBoundingClientRect();
            const startClientX = event.clientX;
            const startClientY = event.clientY;
            const start = {
                left: rect.left - desktopRect.left,
                top: rect.top - desktopRect.top,
                width: rect.width,
                height: rect.height,
            };
            const min = minWindowSize();
            let finished = false;
            let changed = false;
            win.element.classList.add('resizing');

            const move = (moveEvent) => {
                if (moveEvent.pointerId !== pointerId) return;
                const dx = moveEvent.clientX - startClientX;
                const dy = moveEvent.clientY - startClientY;
                const next = { ...start };

                if (direction.includes('e')) {
                    next.width = clamp(start.width + dx, min.width, desktop.clientWidth - start.left);
                }
                if (direction.includes('s')) {
                    next.height = clamp(start.height + dy, min.height, desktop.clientHeight - start.top);
                }
                if (direction.includes('w')) {
                    const limitedDx = clamp(dx, -start.left, start.width - min.width);
                    next.left = start.left + limitedDx;
                    next.width = start.width - limitedDx;
                }
                if (direction.includes('n')) {
                    const limitedDy = clamp(dy, -start.top, start.height - min.height);
                    next.top = start.top + limitedDy;
                    next.height = start.height - limitedDy;
                }

                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) changed = true;
                applyRect(win, next);
            };

            const stop = (stopEvent) => {
                if (finished || stopEvent.pointerId !== pointerId) return;
                finished = true;
                if (changed) {
                    win.snapped = null;
                    win.previousRect = null;
                }
                win.element.classList.remove('resizing');
                handle.removeEventListener('pointermove', move);
                handle.removeEventListener('pointerup', stop);
                handle.removeEventListener('pointercancel', stop);
                handle.removeEventListener('lostpointercapture', stop);
                try {
                    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
                } catch (error) { /* capture unavailable */ }
            };

            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', stop);
            handle.addEventListener('pointercancel', stop);
            handle.addEventListener('lostpointercapture', stop);
        });
    });
}

function openWindow(appId, options = {}) {
    const opener = document.activeElement;
    const returnFocus = opener && opener.isConnected && !opener.closest('.window, #command-overlay, #shutdown-overlay')
        ? opener
        : null;
    const unique = options.unique || appId === 'project' || appId === 'job';
    if (!unique && appWindows.has(appId)) {
        const existing = windows.get(appWindows.get(appId));
        if (existing) {
            focusWindow(existing);
            focusWindowElement(existing);
            playSound('open');
            return existing;
        }
        appWindows.delete(appId);
    }

    const meta = appMeta(appId, options);
    const view = getView(appId, options, appContext);
    const element = document.createElement('section');
    element.className = 'window';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-label', meta.title);
    element.setAttribute('tabindex', '-1');

    const isGrey = ['games', 'recycle', 'projects', 'skills', 'wallpaper'].includes(appId);
    element.innerHTML = `
        <div class="titlebar">
            <span class="title-icon" aria-hidden="true">${meta.icon}</span>
            <span class="title-text">${meta.title}</span>
            <span class="window-controls">
                <button type="button" class="window-control minimize" aria-label="Minimize">_</button>
                <button type="button" class="window-control maximize" aria-label="Maximize">□</button>
                <button type="button" class="window-control close" aria-label="Close">×</button>
            </span>
        </div>
        <div class="menu-strip" aria-hidden="true"><span>File</span><span>Edit</span><span>View</span><span>Help</span></div>
        <div class="window-body ${isGrey ? 'grey' : ''}"></div>
        <div class="status-bar">
            <span class="status-cell grow">C:\\PRASAD\\${appId.toUpperCase()}&gt; READY</span>
            <span class="status-cell">PRASAD DESKTOP</span>
        </div>
        ${RESIZE_DIRS.map((direction) => `<div class="resize-handle" data-resize="${direction}" aria-hidden="true"></div>`).join('')}
    `;

    const win = {
        id: 'win-' + (++iconSequence),
        appId,
        options,
        meta,
        view,
        element,
        body: element.querySelector('.window-body'),
        active: false,
        minimized: false,
        maximized: false,
        snapped: null,
        previousRect: null,
        returnFocus,
    };

    const minSize = minWindowSize();
    const width = Math.min(meta.width, Math.max(minSize.width, desktop.clientWidth - 16));
    const height = Math.min(meta.height, Math.max(minSize.height, desktop.clientHeight - 16));
    const offset = (windows.size % 6) * 24;
    const left = desktop.clientWidth <= 700 ? 8 : clamp(72 + offset, 0, Math.max(0, desktop.clientWidth - width - 8));
    const top = desktop.clientHeight <= 620 ? 8 : clamp(26 + offset, 0, Math.max(0, desktop.clientHeight - height - 8));
    Object.assign(element.style, { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px', zIndex: String(++zCounter) });
    windowLayer.appendChild(element);
    windows.set(win.id, win);
    if (!unique) appWindows.set(appId, win.id);

    element.querySelector('.minimize').addEventListener('click', (event) => { event.stopPropagation(); minimizeWindow(win); });
    element.querySelector('.maximize').addEventListener('click', (event) => { event.stopPropagation(); toggleMaximize(win); });
    element.querySelector('.close').addEventListener('click', (event) => { event.stopPropagation(); closeWindow(win); });
    // Views can close their own window without touching the browser tab.
    element.addEventListener('click', (event) => {
        if (!event.target.closest('[data-close-self]')) return;
        event.stopPropagation();
        closeWindow(win);
    });
    element.addEventListener('pointerdown', () => focusWindow(win));
    attachWindowDrag(win);
    attachWindowResize(win);

    focusWindow(win);
    focusWindowElement(win);
    win.body.innerHTML = view.html;
    if (view.mount) view.mount(win.body, win, appContext);
    playSound('open');
    return win;
}

/* --------------------- input guards shared with apps --------------------- */
function isTypingTarget(target) {
    return !!target && typeof target.closest === 'function' &&
        !!target.closest('input, textarea, select, [contenteditable="true"]');
}

function isModalUiOpen() {
    return !commandOverlay.hidden || !shutdownOverlay.hidden || !startMenu.hidden || !contextMenu.hidden;
}

function trapFocusWithin(event, container) {
    if (event.key !== 'Tab') return;
    const focusable = [...container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hidden && element.getClientRects().length);
    if (!focusable.length) {
        event.preventDefault();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const outside = !container.contains(document.activeElement);
    if (event.shiftKey && (outside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && (outside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
    }
}

function isSearchWindowOpen() {
    const id = appWindows.get('search');
    const win = id ? windows.get(id) : null;
    return !!win && !win.minimized;
}

function isGameInputBlocked(event) {
    return isModalUiOpen() || isSearchWindowOpen() || isTypingTarget(event.target);
}

const appContext = {
    openWindow,
    closeWindow,
    toast,
    playSound,
    isGameInputBlocked,
};

/* ----------------------------- start menu ------------------------------ */
function closeStartMenu(restoreFocus = true) {
    const hadFocus = startMenu.contains(document.activeElement);
    startMenu.hidden = true;
    startButton.classList.remove('open', 'pressed');
    startButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus && hadFocus) startButton.focus();
}

function toggleStartMenu() {
    const opening = startMenu.hidden;
    if (!opening) {
        closeStartMenu();
    } else {
        startMenu.hidden = false;
        startButton.classList.add('open', 'pressed');
        startButton.setAttribute('aria-expanded', 'true');
        startMenu.querySelector('.menu-item')?.focus();
    }
    playSound('click');
}

startButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleStartMenu();
});

startMenu.addEventListener('click', (event) => {
    const item = event.target.closest('[data-app]');
    if (item) {
        closeStartMenu();
        openWindow(item.dataset.app);
        return;
    }
    if (event.target.closest('#shutdown-item')) {
        closeStartMenu();
        showShutdownOverlay();
    }
});

/* -------------------------- shutdown dialog ---------------------------- */
let focusBeforeShutdown = null;

function showShutdownOverlay() {
    focusBeforeShutdown = document.activeElement;
    shutdownOverlay.hidden = false;
    shutdownBack.focus();
    playSound('click');
}

function hideShutdownOverlay(restoreFocus = true) {
    shutdownOverlay.hidden = true;
    if (restoreFocus && focusBeforeShutdown && document.contains(focusBeforeShutdown)) {
        focusBeforeShutdown.focus();
    }
    focusBeforeShutdown = null;
}

shutdownBack.addEventListener('click', () => {
    hideShutdownOverlay();
    playSound('click');
});

/* --------------------------- desktop menu ------------------------------ */
function hideContextMenu() {
    contextMenu.hidden = true;
}

desktop.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.window, .desktop-icon, .taskbar, .start-menu')) return;
    event.preventDefault();
    const x = Math.min(event.clientX, window.innerWidth - 200);
    const y = Math.min(event.clientY, window.innerHeight - 130);
    Object.assign(contextMenu.style, { left: x + 'px', top: y + 'px' });
    contextMenu.hidden = false;
    playSound('click');
});

contextMenu.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    hideContextMenu();
    if (action === 'refresh') {
        renderIcons();
        toast('Desktop refreshed ✓');
    }
    if (action === 'arrange') {
        iconPositions = {};
        savePositions();
        renderIcons();
        toast('Icons arranged neatly.');
    }
    if (action === 'personalize') {
        openWindow('wallpaper');
        toast('Wallpaper Studio opened.');
    }
    playSound('click');
});

document.addEventListener('click', (event) => {
    if (!startMenu.hidden && !startMenu.contains(event.target) && !startButton.contains(event.target)) closeStartMenu();
    if (!contextMenu.hidden && !contextMenu.contains(event.target)) hideContextMenu();
});

desktop.addEventListener('click', (event) => {
    if (!event.target.closest('.desktop-icon')) {
        iconLayer.querySelectorAll('.desktop-icon').forEach((icon) => icon.classList.remove('selected'));
    }
});

/* --------------------------- command palette --------------------------- */
let commandItems = [];
let commandIndex = 0;
let focusBeforeCommand = null;

function renderCommands(query = '') {
    const term = query.trim().toLowerCase();
    commandItems = COMMANDS.filter((command) => command.label.toLowerCase().includes(term));
    commandIndex = 0;
    if (!commandItems.length) {
        commandResults.innerHTML = '<div class="no-results">No commands found.</div>';
        return;
    }
    commandResults.innerHTML = commandItems.map((command, index) => `
        <button type="button" class="command-result ${index === 0 ? 'active' : ''}" data-index="${index}">
            <span class="cmd-arrow">▶</span><span>${command.label}</span>
        </button>
    `).join('');
}

function openCommandPalette() {
    focusBeforeCommand = document.activeElement;
    commandOverlay.hidden = false;
    commandInput.value = '';
    renderCommands();
    commandInput.focus();
    playSound('click');
}

function closeCommandPalette() {
    commandOverlay.hidden = true;
    if (focusBeforeCommand && document.contains(focusBeforeCommand)) {
        focusBeforeCommand.focus();
    }
    focusBeforeCommand = null;
    playSound('close');
}

function executeCommand(command) {
    if (!command) return;
    closeCommandPalette();
    if (command.action === 'github') {
        window.open(PROFILE.github, '_blank', 'noopener');
        return;
    }
    if (command.action === 'resume-download') {
        const link = document.createElement('a');
        link.href = PROFILE.resume;
        link.download = 'Prakash_Prasad_QA_Engineer_CV.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
    }
    if (command.app) openWindow(command.app);
}

commandInput.addEventListener('input', () => renderCommands(commandInput.value));
commandResults.addEventListener('click', (event) => {
    const result = event.target.closest('[data-index]');
    if (result) executeCommand(commandItems[Number(result.dataset.index)]);
});
commandClose.addEventListener('click', closeCommandPalette);
commandOverlay.addEventListener('click', (event) => {
    if (event.target === commandOverlay) closeCommandPalette();
});

$('#search-button').addEventListener('click', () => {
    openWindow('search');
    playSound('click');
});

document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        if (commandOverlay.hidden) openCommandPalette(); else closeCommandPalette();
        return;
    }

    if (!commandOverlay.hidden) {
        trapFocusWithin(event, commandOverlay);
        if (event.key === 'Escape') { event.preventDefault(); closeCommandPalette(); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!commandItems.length) return;
            commandIndex = (commandIndex + (event.key === 'ArrowDown' ? 1 : -1) + commandItems.length) % commandItems.length;
            commandResults.querySelectorAll('.command-result').forEach((element, index) => element.classList.toggle('active', index === commandIndex));
            commandResults.querySelectorAll('.command-result')[commandIndex]?.scrollIntoView({ block: 'nearest' });
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            executeCommand(commandItems[commandIndex]);
            return;
        }
    }

    if (!shutdownOverlay.hidden) trapFocusWithin(event, shutdownOverlay);

    if (event.key === 'Escape') {
        if (!shutdownOverlay.hidden) hideShutdownOverlay();
        else if (!startMenu.hidden) closeStartMenu();
        else if (!contextMenu.hidden) hideContextMenu();
        else {
            const searchId = appWindows.get('search');
            const searchWin = searchId ? windows.get(searchId) : null;
            if (searchWin && !searchWin.minimized && searchWin.active) closeWindow(searchWin);
        }
    }
});

/* -------------------------------- tray -------------------------------- */
function persistSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* storage unavailable */ }
}

function renderSoundToggle() {
    soundToggle.textContent = soundsEnabled ? '🔈' : '🔇';
    soundToggle.setAttribute('aria-pressed', String(soundsEnabled));
    soundToggle.setAttribute('aria-label', soundsEnabled ? 'Disable UI sounds' : 'Enable UI sounds');
    soundToggle.title = soundsEnabled ? 'Disable UI sounds' : 'Enable UI sounds';
}

soundToggle.addEventListener('click', () => {
    soundsEnabled = !soundsEnabled;
    persistSetting(SOUND_KEY, soundsEnabled ? '1' : '0');
    renderSoundToggle();
    playSound('click');
});

const TRACK_NAME = 'Guitar Lofi';

function renderMusicControls() {
    const playing = music.isPlaying();
    const mutedNow = music.isMuted();
    musicToggle.textContent = playing ? '❚❚' : '▶';
    musicToggle.setAttribute('aria-pressed', String(playing));
    musicToggle.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    musicToggle.title = playing ? `Pause ${TRACK_NAME}` : `Play ${TRACK_NAME}`;
    musicEq.classList.toggle('playing', playing && !mutedNow);
    musicEq.classList.toggle('muted', mutedNow);
    musicMute.textContent = mutedNow ? '🔇' : '🔊';
    musicMute.setAttribute('aria-label', mutedNow ? 'Unmute music' : 'Mute music');
    musicMute.title = mutedNow ? 'Unmute music' : 'Mute music';
    musicVolume.value = String(Math.round(music.getVolume() * 100));
}

// Autoplay is blocked until a real gesture in modern browsers. Retry on the
// first interaction, but never restart music the user explicitly switched off.
let autoplayRetry = null;
let musicStartFailed = false;

function clearAutoplayRetry() {
    if (!autoplayRetry) return;
    window.removeEventListener('pointerdown', autoplayRetry);
    window.removeEventListener('keydown', autoplayRetry);
    autoplayRetry = null;
}

const isMusicControl = (target) =>
    target instanceof Element && !!target.closest('#music-toggle, #music-mute, #music-volume');

async function resumeMusic() {
    if (!musicEnabled) return false;
    try {
        await music.start();
        const playing = music.isPlaying();
        if (playing) {
            clearAutoplayRetry();
            musicStartFailed = false;
        }
        return playing;
    } catch (error) {
        return false;
    }
}

function watchForFirstInteraction() {
    if (autoplayRetry || !musicEnabled || music.isPlaying()) return;
    autoplayRetry = (event) => {
        if (isMusicControl(event.target)) return;
        resumeMusic();
    };
    window.addEventListener('pointerdown', autoplayRetry);
    window.addEventListener('keydown', autoplayRetry);
}

async function startMusicOnLoad() {
    if (!musicEnabled) return;
    await resumeMusic();
    watchForFirstInteraction();
}

musicToggle.addEventListener('click', async () => {
    clearAutoplayRetry();
    if (music.isPlaying()) {
        musicEnabled = false;
        persistSetting(MUSIC_ENABLED_KEY, '0');
        music.pause();
        musicStartFailed = false;
        return;
    }
    // A failed explicit start needs a second click to turn music off cleanly.
    if (musicStartFailed && musicEnabled) {
        musicEnabled = false;
        persistSetting(MUSIC_ENABLED_KEY, '0');
        musicStartFailed = false;
        renderMusicControls();
        return;
    }
    if (!musicEnabled) {
        musicEnabled = true;
        persistSetting(MUSIC_ENABLED_KEY, '1');
    }
    const started = await resumeMusic();
    musicStartFailed = !started && !music.isPlaying();
    if (musicStartFailed) toast('Music is unavailable in this browser.');
});

musicVolume.addEventListener('input', () => {
    const value = Number(musicVolume.value) || 0;
    music.setVolume(value / 100);
    persistSetting(MUSIC_VOLUME_KEY, String(value));
});

musicMute.addEventListener('click', () => {
    const nextMuted = !music.isMuted();
    music.setMuted(nextMuted);
    persistSetting(MUSIC_MUTE_KEY, nextMuted ? '1' : '0');
});

function renderCrt() {
    screen.classList.toggle('crt-off', !crtEnabled);
    crtToggle.setAttribute('aria-pressed', String(crtEnabled));
    crtToggle.title = crtEnabled ? 'Disable CRT effects' : 'Enable CRT effects';
}

crtToggle.addEventListener('click', () => {
    crtEnabled = !crtEnabled;
    persistSetting(CRT_KEY, crtEnabled ? '1' : '0');
    renderCrt();
    playSound('click');
});

function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    clock.title = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/* -------------------------------- boot -------------------------------- */
initPersonalization();
initDogCompanion();
window.addEventListener('prasad-dog-click', () => playSound('open'));
renderIcons();
renderSoundToggle();
music.setVolume(storedVolume / 100);
music.setMuted(storedMusicMuted);
renderMusicControls();
startMusicOnLoad();
renderCrt();
updateClock();
setInterval(updateClock, 1000);
window.addEventListener('resize', () => {
    layoutIcons(false);
    windows.forEach((win) => {
        if (win.maximized || win.snapped === 'maximize') {
            applyRect(win, snapGeometry('maximize'));
            return;
        }
        if (win.snapped === 'left' || win.snapped === 'right') {
            if (snapGeometry(win.snapped).width < minWindowSize().width) maximizeWindow(win, false);
            else applyRect(win, snapGeometry(win.snapped));
            return;
        }
        const min = minWindowSize();
        const rect = currentRect(win);
        const width = clamp(parseFloat(rect.width) || min.width, min.width, Math.max(min.width, desktop.clientWidth));
        const height = clamp(parseFloat(rect.height) || min.height, min.height, Math.max(min.height, desktop.clientHeight));
        applyRect(win, {
            left: clamp(parseFloat(rect.left) || 0, 0, Math.max(0, desktop.clientWidth - width)),
            top: clamp(parseFloat(rect.top) || 0, 0, Math.max(0, desktop.clientHeight - height)),
            width,
            height,
        });
    });
});

// Let the parent 3D scene react to monitor input.
['mousemove', 'mousedown', 'mouseup', 'keydown', 'keyup'].forEach((type) => {
    document.addEventListener(type, (event) => {
        parent.postMessage({ type, clientX: event.clientX, clientY: event.clientY, key: event.key }, '*');
    });
});
