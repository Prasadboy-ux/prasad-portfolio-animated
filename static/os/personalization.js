// PRASAD DESKTOP — retro pixel personalization, wallpaper rendering, and storage.
// This module owns #wallpaper only. Chrome, taskbar, and CRT overlay styling stay untouched.

const SETTINGS_KEY = 'prasad-desktop-personalization';
const WALLPAPER_DATA_KEY = 'prasad-desktop-wallpaper-data';
const DRAWINGS_KEY = 'prasad-desktop-pixel-drawings';
const WALL_W = 192;
const WALL_H = 120;
const MAX_DRAWING_BYTES = 700000;

const clamp = (value, min, max) => Math.min(Math.max(Number(value) || min, min), max);

export const PALETTES = {
    retro: ['#0b1a2e', '#123e5e', '#1d6f78', '#008080', '#63b89a', '#c8e6a0', '#ffd76a', '#f28f5b', '#ffffff'],
    sunset: ['#24113b', '#5b2a6d', '#a8467a', '#e46f6b', '#ff9d5c', '#ffcf6b', '#fff0a8', '#ffffff'],
    cyber: ['#090616', '#20124a', '#4b1d7a', '#9b2fae', '#e13ca5', '#38d6d6', '#8bffef', '#ffffff'],
    mono: ['#101010', '#3b3b3b', '#6e6e6e', '#a8a8a8', '#d8d8d8', '#ffffff'],
};

const DEFAULT_SETTINGS = {
    wallpaperId: 'classic',
    wallpaperData: null,
    wallpaperLabel: 'Classic Teal',
    pixelSize: 4,
    brightness: 100,
    contrast: 100,
    colorReduction: 16,
    palette: 'retro',
    crtEffect: false,
    scanlines: false,
    dither: false,
    position: 'cover',
    dog: {
        visible: true,
        walking: true,
        idleOnly: false,
        speech: true,
        speed: 1,
        size: 1,
        skin: 'classic',
        customAvatar: null,
    },
};

const PRESET_DEFS = [
    { id: 'sunset', label: 'Pixel Sunset', glyph: '▣', seed: 11, draw: drawSunset },
    { id: 'mountains', label: 'Pixel Mountains', glyph: '▲', seed: 23, draw: drawMountains },
    { id: 'city', label: 'Pixel City', glyph: '▦', seed: 37, draw: drawCity },
    { id: 'forest', label: 'Pixel Forest', glyph: '♣', seed: 41, draw: drawForest },
    { id: 'stars', label: 'Pixel Starry Sky', glyph: '✦', seed: 59, draw: drawStars },
    { id: 'beach', label: 'Pixel Beach', glyph: '≈', seed: 67, draw: drawBeach },
    { id: 'computer-room', label: 'Retro Computer Room', glyph: '▤', seed: 73, draw: drawComputerRoom },
    { id: 'cyberpunk', label: 'Pixel Cyberpunk City', glyph: '◈', seed: 89, draw: drawCyberpunk },
    { id: 'clouds', label: 'Pixel Clouds', glyph: '☁', seed: 97, draw: drawClouds },
    { id: 'countryside', label: 'Pixel Countryside', glyph: '⌂', seed: 103, draw: drawCountryside },
];

export const WALLPAPER_PRESETS = PRESET_DEFS.map(({ id, label, glyph, seed }) => ({ id, label, glyph, seed }));
export const DOG_SKINS = [
    { id: 'classic', label: 'Classic Brown', fur: '#c8793f', ear: '#8a4a24', cheek: '#ffb59d' },
    { id: 'cream', label: 'Cream Pup', fur: '#e8c98a', ear: '#b98b4e', cheek: '#ffc7ad' },
    { id: 'ash', label: 'Ash Gray', fur: '#9aa8b5', ear: '#5d6b7a', cheek: '#e8a5a5' },
    { id: 'rose', label: 'Rose Pup', fur: '#e8a0ad', ear: '#a95c73', cheek: '#ffd1c5' },
];

let settings = loadSettings();
const listeners = new Set();
let applyToken = 0;
let initialized = false;

function rng(seed) {
    let value = seed >>> 0;
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

function hexToRgb(hex) {
    const value = String(hex).replace('#', '');
    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
    ];
}

function loadSettings() {
    const loaded = { ...DEFAULT_SETTINGS, dog: { ...DEFAULT_SETTINGS.dog } };
    try {
        const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        Object.assign(loaded, raw);
        loaded.dog = { ...DEFAULT_SETTINGS.dog, ...(raw.dog || {}) };
    } catch (error) { /* storage unavailable */ }
    try {
        loaded.wallpaperData = localStorage.getItem(WALLPAPER_DATA_KEY);
        if (loaded.dog && loaded.dog.customAvatar === undefined) loaded.dog.customAvatar = null;
    } catch (error) { /* storage unavailable */ }
    loaded.pixelSize = clamp(loaded.pixelSize, 1, 12);
    loaded.brightness = clamp(loaded.brightness, 50, 150);
    loaded.contrast = clamp(loaded.contrast, 50, 150);
    loaded.colorReduction = clamp(loaded.colorReduction, 2, 32);
    loaded.dog.speed = clamp(loaded.dog.speed, 0.25, 2.5);
    loaded.dog.size = clamp(loaded.dog.size, 0.7, 1.6);
    loaded.dog.speech = loaded.dog.speech !== false;
    return loaded;
}

function persist(next) {
    const { wallpaperData, ...plain } = next;
    let settingsSaved = false;
    let dataSaved = true;
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(plain));
        settingsSaved = true;
    } catch (error) { /* storage unavailable */ }

    try {
        if (wallpaperData) localStorage.setItem(WALLPAPER_DATA_KEY, wallpaperData);
        else localStorage.removeItem(WALLPAPER_DATA_KEY);
    } catch (error) {
        dataSaved = false;
        try { localStorage.removeItem(WALLPAPER_DATA_KEY); } catch (ignored) { /* storage unavailable */ }
    }
    return { settingsSaved, dataSaved };
}

function notify() {
    listeners.forEach((listener) => {
        try { listener(getSettings()); } catch (error) { /* listener failed */ }
    });
}

export function getSettings() {
    return {
        ...settings,
        dog: { ...settings.dog },
    };
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function updateSettings(patch = {}) {
    const dogPatch = patch.dog ? { ...settings.dog, ...patch.dog } : settings.dog;
    settings = { ...settings, ...patch, dog: { ...dogPatch } };
    settings.pixelSize = clamp(settings.pixelSize, 1, 12);
    settings.brightness = clamp(settings.brightness, 50, 150);
    settings.contrast = clamp(settings.contrast, 50, 150);
    settings.colorReduction = clamp(settings.colorReduction, 2, 32);
    settings.dog.speed = clamp(settings.dog.speed, 0.25, 2.5);
    settings.dog.size = clamp(settings.dog.size, 0.7, 1.6);
    settings.dog.speech = settings.dog.speech !== false;
    const saved = persist(settings);
    notify();
    if ((!saved.dataSaved || !saved.settingsSaved) && typeof window !== 'undefined' && window.__prasadStorageNotice !== true) {
        window.__prasadStorageNotice = true;
        const status = document.createElement('div');
        status.className = 'toast';
        status.setAttribute('role', 'status');
        status.textContent = 'Storage is full — changes apply for this session only.';
        document.querySelector('.screen')?.appendChild(status);
        setTimeout(() => status.remove(), 2800);
    }
    return saved;
}

export function resetSettings() {
    settings = { ...DEFAULT_SETTINGS, dog: { ...DEFAULT_SETTINGS.dog } };
    persist(settings);
    notify();
    return getSettings();
}

export function setWallpaperData(dataUrl, label = 'Custom wallpaper', id = 'custom') {
    return updateSettings({ wallpaperId: id, wallpaperData: dataUrl, wallpaperLabel: label });
}

/* ------------------------- pixel wallpaper presets ------------------------- */

function bands(ctx, w, h, colors, split = 0.7) {
    colors.forEach((color, index) => {
        const top = Math.round(h * split * (index / colors.length));
        const bottom = Math.round(h * split * ((index + 1) / colors.length)) + 1;
        ctx.fillStyle = color;
        ctx.fillRect(0, top, w, bottom - top);
    });
}

function pixelCircle(ctx, cx, cy, radius, color, block = 2) {
    ctx.fillStyle = color;
    for (let y = -radius; y <= radius; y += block) {
        for (let x = -radius; x <= radius; x += block) {
            if (x * x + y * y <= radius * radius) ctx.fillRect(cx + x, cy + y, block, block);
        }
    }
}

function drawSunset(ctx, w, h) {
    bands(ctx, w, h, ['#4b2b6b', '#a8467a', '#e46f6b', '#ff9d5c', '#ffcf6b'], 0.78);
    pixelCircle(ctx, w * 0.64, h * 0.43, 22, '#ffe9a8', 2);
    ctx.fillStyle = '#252149';
    for (let x = 0; x < w; x += 8) {
        const height = 16 + ((x * 7) % 26);
        ctx.fillRect(x, h - height, 8, height);
    }
    ctx.fillStyle = '#151331';
    ctx.fillRect(0, h - 16, w, 16);
}

function drawMountains(ctx, w, h) {
    bands(ctx, w, h, ['#8fd3e8', '#b9e6f0', '#d8f2f2'], 0.72);
    const layers = [
        { color: '#4b7285', base: h * 0.75, peaks: [18, 54, 38, 70, 26] },
        { color: '#31566b', base: h * 0.88, peaks: [40, 24, 62, 32, 52] },
    ];
    layers.forEach((layer) => {
        ctx.fillStyle = layer.color;
        const step = w / layer.peaks.length;
        layer.peaks.forEach((peak, index) => {
            const left = index * step;
            const top = h - peak - 18;
            for (let y = top; y < layer.base; y += 3) {
                const inset = Math.round((y - top) * 0.45);
                ctx.fillRect(left + inset, y, step - inset * 2 + 1, 3);
            }
        });
    });
    ctx.fillStyle = '#e8f4f2';
    ctx.fillRect(34, 38, 12, 4);
    ctx.fillRect(36, 34, 8, 4);
    ctx.fillStyle = '#2f4a3d';
    ctx.fillRect(0, h - 14, w, 14);
}

function drawCity(ctx, w, h) {
    bands(ctx, w, h, ['#101a3a', '#1d2c5a', '#33457a'], 0.82);
    pixelCircle(ctx, w - 28, 24, 11, '#ffe9a8', 2);
    const rand = rng(37);
    for (let x = 0; x < w; x += 12) {
        const height = 34 + Math.floor(rand() * 54);
        const top = h - 18 - height;
        ctx.fillStyle = rand() > 0.5 ? '#26345e' : '#31406d';
        ctx.fillRect(x, top, 11, height);
        ctx.fillStyle = '#ffd76a';
        for (let wy = top + 5; wy < h - 20; wy += 8) {
            for (let wx = x + 2; wx < x + 10; wx += 4) {
                if (rand() > 0.45) ctx.fillRect(wx, wy, 2, 3);
            }
        }
    }
    ctx.fillStyle = '#0b1029';
    ctx.fillRect(0, h - 18, w, 18);
}

function drawForest(ctx, w, h) {
    bands(ctx, w, h, ['#8ecfa4', '#b8e3b5', '#d8efc9'], 0.7);
    const rand = rng(41);
    for (let x = -4; x < w + 8; x += 20) {
        const top = 18 + Math.floor(rand() * 18);
        ctx.fillStyle = '#6a4a2f';
        ctx.fillRect(x + 8, h - 34, 5, 18);
        ctx.fillStyle = '#1f6b46';
        for (let y = top; y < h - 30; y += 6) {
            const inset = Math.round((y - top) * 0.36);
            ctx.fillRect(x + inset, y, 20 - inset * 2, 6);
        }
        ctx.fillStyle = '#2f8a58';
        ctx.fillRect(x + 5, top + 12, 10, 6);
    }
    ctx.fillStyle = '#174b35';
    ctx.fillRect(0, h - 16, w, 16);
}

function drawStars(ctx, w, h) {
    bands(ctx, w, h, ['#080d2a', '#141d4a', '#26346e'], 0.84);
    const rand = rng(59);
    ctx.fillStyle = '#fff3bd';
    for (let i = 0; i < 110; i += 1) {
        const size = rand() > 0.9 ? 2 : 1;
        ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h * 0.78), size, size);
    }
    pixelCircle(ctx, w - 34, 26, 13, '#fff0b8', 2);
    ctx.fillStyle = '#0a1631';
    for (let x = 0; x < w; x += 6) {
        const height = 8 + Math.floor(rand() * 14);
        ctx.fillRect(x, h - height, 6, height);
    }
}

function drawBeach(ctx, w, h) {
    bands(ctx, w, h, ['#8fd8ef', '#bce9f3', '#ffe0a8'], 0.5);
    pixelCircle(ctx, 34, 24, 14, '#ffe27a', 2);
    ctx.fillStyle = '#1d8fae';
    ctx.fillRect(0, h * 0.5, w, h * 0.22);
    ctx.fillStyle = '#45b7c4';
    for (let y = h * 0.52; y < h * 0.72; y += 8) {
        for (let x = (y % 16); x < w; x += 22) ctx.fillRect(x, y, 12, 3);
    }
    ctx.fillStyle = '#f0d09a';
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.fillStyle = '#8a5b32';
    ctx.fillRect(w - 38, h - 44, 4, 34);
    ctx.fillStyle = '#2f8a58';
    ctx.fillRect(w - 62, h - 52, 30, 4);
    ctx.fillRect(w - 68, h - 48, 40, 4);
}

function drawComputerRoom(ctx, w, h) {
    ctx.fillStyle = '#123b4c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0a2734';
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 2, h);
    ctx.fillStyle = '#1d6070';
    ctx.fillRect(0, h - 44, w, 44);
    ctx.fillStyle = '#6a4a2f';
    ctx.fillRect(16, h - 40, w - 32, 8);
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(58, 30, 76, 56);
    ctx.fillStyle = '#000080';
    ctx.fillRect(64, 36, 64, 40);
    ctx.fillStyle = '#39d6c8';
    for (let y = 42; y < 72; y += 6) ctx.fillRect(68, y, 54 - (y % 12), 2);
    ctx.fillStyle = '#808080';
    ctx.fillRect(52, 86, 88, 6);
    ctx.fillRect(72, 92, 48, 10);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(150, 62, 14, 18);
    ctx.fillRect(164, 66, 5, 10);
}

function drawCyberpunk(ctx, w, h) {
    bands(ctx, w, h, ['#090616', '#20124a', '#4b1d7a'], 0.85);
    const rand = rng(89);
    for (let x = 0; x < w; x += 14) {
        const height = 46 + Math.floor(rand() * 48);
        const top = h - 22 - height;
        ctx.fillStyle = rand() > 0.5 ? '#1b1038' : '#25104a';
        ctx.fillRect(x, top, 13, height);
        ctx.fillStyle = rand() > 0.5 ? '#e13ca5' : '#38d6d6';
        for (let wy = top + 5; wy < h - 24; wy += 9) {
            if (rand() > 0.35) ctx.fillRect(x + 2, wy, 8, 2);
        }
    }
    ctx.fillStyle = '#090616';
    ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = '#e13ca5';
    for (let x = 4; x < w; x += 28) ctx.fillRect(x, h - 12, 14, 3);
}

function drawClouds(ctx, w, h) {
    bands(ctx, w, h, ['#4ba3e8', '#83c8f0', '#bce9f7'], 1);
    pixelCircle(ctx, w - 26, 24, 12, '#ffe27a', 2);
    const rand = rng(97);
    for (let i = 0; i < 9; i += 1) {
        const x = Math.floor(rand() * (w - 40));
        const y = 18 + Math.floor(rand() * (h * 0.6));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y + 5, 36, 9);
        ctx.fillRect(x + 8, y, 20, 8);
        ctx.fillStyle = '#d8eef7';
        ctx.fillRect(x, y + 13, 36, 3);
    }
    ctx.fillStyle = '#2f8a58';
    ctx.fillRect(0, h - 14, w, 14);
}

function drawCountryside(ctx, w, h) {
    bands(ctx, w, h, ['#8fd3e8', '#c8eaf2', '#e8f5d8'], 0.62);
    ctx.fillStyle = '#75ad5c';
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    ctx.fillStyle = '#4f8e46';
    for (let x = 0; x < w; x += 10) ctx.fillRect(x, h * 0.62, 5, h * 0.16);
    ctx.fillStyle = '#b44d3c';
    ctx.fillRect(38, h - 56, 44, 34);
    ctx.fillStyle = '#7a2f28';
    for (let y = h - 54; y < h - 22; y += 7) ctx.fillRect(38, y, 44, 3);
    ctx.fillStyle = '#e8c98a';
    ctx.fillRect(58, h - 42, 10, 20);
    ctx.fillStyle = '#8a5b32';
    for (let x = 96; x < w; x += 18) {
        ctx.fillRect(x, h - 38, 3, 22);
        ctx.fillRect(x, h - 34, 15, 3);
    }
}

function drawPreset(canvas, preset, current = getSettings()) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(w / WALL_W, h / WALL_H);
    preset.draw(ctx, WALL_W, WALL_H);
    ctx.restore();
    applyPixelEffects(ctx, w, h, current);
    return canvas;
}

/* ---------------------------- image processing ---------------------------- */

function applyPixelEffects(ctx, w, h, current) {
    const image = ctx.getImageData(0, 0, w, h);
    const data = image.data;
    const levels = clamp(current.colorReduction, 2, 32);
    const step = 255 / (levels - 1);
    const contrast = clamp(current.contrast, 50, 150) / 100;
    const brightness = (clamp(current.brightness, 50, 150) - 100) * 1.1;
    const palette = PALETTES[current.palette] ? PALETTES[current.palette].map(hexToRgb) : null;
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            const index = (y * w + x) * 4;
            if (data[index + 3] === 0) continue;
            let r = data[index];
            let g = data[index + 1];
            let b = data[index + 2];
            r = clamp((r - 128) * contrast + 128 + brightness, 0, 255);
            g = clamp((g - 128) * contrast + 128 + brightness, 0, 255);
            b = clamp((b - 128) * contrast + 128 + brightness, 0, 255);
            const threshold = current.dither ? (bayer[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * step * 0.8 : 0;
            r = clamp(Math.round((r + threshold) / step) * step, 0, 255);
            g = clamp(Math.round((g + threshold) / step) * step, 0, 255);
            b = clamp(Math.round((b + threshold) / step) * step, 0, 255);
            if (palette) {
                let nearest = palette[0];
                let best = Infinity;
                palette.forEach((candidate) => {
                    const distance = (r - candidate[0]) ** 2 + (g - candidate[1]) ** 2 + (b - candidate[2]) ** 2;
                    if (distance < best) { best = distance; nearest = candidate; }
                });
                data[index] = nearest[0];
                data[index + 1] = nearest[1];
                data[index + 2] = nearest[2];
            } else {
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
            }
        }
    }
    ctx.putImageData(image, 0, 0);
}

function drawImageCover(ctx, image, w, h) {
    const sourceRatio = image.width / image.height;
    const targetRatio = w / h;
    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;
    if (sourceRatio > targetRatio) {
        sw = image.height * targetRatio;
        sx = (image.width - sw) / 2;
    } else {
        sh = image.width / targetRatio;
        sy = (image.height - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
}

export function renderPreset(canvas, presetId, current = getSettings()) {
    const preset = PRESET_DEFS.find((item) => item.id === presetId);
    if (!preset) return canvas;
    return drawPreset(canvas, preset, current);
}

export function processImageForWallpaper(image, current = getSettings()) {
    const lowW = clamp(Math.round(WALL_W / current.pixelSize), 12, WALL_W);
    const lowH = clamp(Math.round(WALL_H / current.pixelSize), 8, WALL_H);
    const low = document.createElement('canvas');
    low.width = lowW;
    low.height = lowH;
    const lowCtx = low.getContext('2d');
    lowCtx.imageSmoothingEnabled = false;
    drawImageCover(lowCtx, image, lowW, lowH);
    applyPixelEffects(lowCtx, lowW, lowH, current);

    const output = document.createElement('canvas');
    output.width = WALL_W;
    output.height = WALL_H;
    const outCtx = output.getContext('2d');
    outCtx.imageSmoothingEnabled = false;
    if (current.position === 'tile') {
        const tileW = Math.max(24, Math.round(WALL_W / 4));
        const tileH = Math.max(16, Math.round(WALL_H / 3));
        for (let y = 0; y < WALL_H; y += tileH) {
            for (let x = 0; x < WALL_W; x += tileW) outCtx.drawImage(low, 0, 0, lowW, lowH, x, y, tileW, tileH);
        }
    } else {
        outCtx.drawImage(low, 0, 0, WALL_W, WALL_H);
    }
    return output;
}

export function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Image could not be loaded.'));
        image.src = dataUrl;
    });
}

/* --------------------------- wallpaper painting --------------------------- */

function prepareWallpaperCanvas() {
    const wallpaper = document.getElementById('wallpaper');
    if (!wallpaper) return null;
    let canvas = document.getElementById('wallpaper-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'wallpaper-canvas';
        canvas.className = 'wallpaper-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.width = WALL_W;
        canvas.height = WALL_H;
        wallpaper.insertBefore(canvas, wallpaper.firstChild);
    }
    return canvas;
}

async function applyWallpaper(current = getSettings()) {
    const wallpaper = document.getElementById('wallpaper');
    const canvas = prepareWallpaperCanvas();
    if (!wallpaper || !canvas) return;
    const token = ++applyToken;
    wallpaper.classList.toggle('fx-crt', !!current.crtEffect);
    wallpaper.classList.toggle('fx-scanlines', !!current.scanlines);
    wallpaper.dataset.position = current.position;
    canvas.dataset.position = current.position;

    if (current.wallpaperId === 'classic' || (!current.wallpaperData && ['custom', 'drawing'].includes(current.wallpaperId))) {
        canvas.hidden = true;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, WALL_W, WALL_H);
        return;
    }

    canvas.hidden = false;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const preset = PRESET_DEFS.find((item) => item.id === current.wallpaperId);
    if (preset) {
        drawPreset(canvas, preset, current);
        return;
    }
    if (!current.wallpaperData) return;
    try {
        const image = await loadImage(current.wallpaperData);
        if (token !== applyToken) return;
        const processed = processImageForWallpaper(image, current);
        if (token !== applyToken) return;
        ctx.clearRect(0, 0, WALL_W, WALL_H);
        ctx.drawImage(processed, 0, 0);
    } catch (error) {
        canvas.hidden = true;
    }
}

export function initPersonalization() {
    if (initialized) return;
    initialized = true;
    subscribe((current) => { applyWallpaper(current); });
    applyWallpaper(settings);
}

/* -------------------------- saved drawing library ------------------------- */

export function loadDrawings() {
    try {
        const parsed = JSON.parse(localStorage.getItem(DRAWINGS_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch (error) {
        return [];
    }
}

export function saveDrawing(dataUrl, label = 'Pixel drawing') {
    const entry = { id: Date.now(), label, dataUrl, saved: new Date().toISOString() };
    const entries = [entry, ...loadDrawings()];
    const fits = () => JSON.stringify(entries).length <= MAX_DRAWING_BYTES;
    while (entries.length > 1 && !fits()) entries.pop();
    if (!fits()) return false;
    try {
        localStorage.setItem(DRAWINGS_KEY, JSON.stringify(entries));
        return true;
    } catch (error) {
        try {
            localStorage.setItem(DRAWINGS_KEY, JSON.stringify([entry]));
            return true;
        } catch (secondError) {
            return false;
        }
    }
}
