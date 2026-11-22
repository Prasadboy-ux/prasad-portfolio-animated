// PRASAD DESKTOP — retro pixel personalization app: gallery, editor, importer, and Cute Dog Paint.
import {
    PALETTES,
    WALLPAPER_PRESETS,
    DOG_SKINS,
    getSettings,
    subscribe,
    updateSettings,
    resetSettings,
    setWallpaperData,
    renderPreset,
    processImageForWallpaper,
    loadImage,
    loadDrawings,
    saveDrawing,
} from './personalization.js';

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const CREATOR_COLORS = [
    '#111111', '#ffffff', '#c0c0c0', '#008080', '#008000', '#75ad5c',
    '#ffb000', '#f28f5b', '#e46f6b', '#ffb59d', '#4b1d7a', '#38d6d6',
];

const CANVAS_SIZES = [
    { id: 'small', label: '16 × 10', width: 16, height: 10 },
    { id: 'medium', label: '32 × 20', width: 32, height: 20 },
    { id: 'large', label: '48 × 30', width: 48, height: 30 },
];

function makeView(html, extra = {}) {
    return { html, mount() {}, cleanup() {}, ...extra };
}

function hexToRgba(hex) {
    const value = String(hex).replace('#', '');
    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
        255,
    ];
}

function makePixelEditor(canvas) {
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    let tool = 'pencil';
    let color = '#111111';
    let undo = [];
    let redo = [];
    let painting = false;
    let before = null;
    let lastPoint = null;

    const snapshot = () => context.getImageData(0, 0, canvas.width, canvas.height);
    const restore = (image) => context.putImageData(image, 0, 0);
    const record = (image) => {
        undo.push(image);
        if (undo.length > 30) undo.shift();
        redo = [];
    };

    function pointFromEvent(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width),
            y: Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height),
        };
    }

    function floodFill(sx, sy, replacement) {
        if (sx < 0 || sy < 0 || sx >= canvas.width || sy >= canvas.height) return;
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;
        const start = (sy * canvas.width + sx) * 4;
        const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
        if (target.every((value, index) => value === replacement[index])) return;
        const matches = (index) => data[index] === target[0] && data[index + 1] === target[1]
            && data[index + 2] === target[2] && data[index + 3] === target[3];
        const stack = [[sx, sy]];
        const seen = new Uint8Array(canvas.width * canvas.height);
        while (stack.length) {
            const [x, y] = stack.pop();
            if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
            const cell = y * canvas.width + x;
            if (seen[cell]) continue;
            seen[cell] = 1;
            const index = cell * 4;
            if (!matches(index)) continue;
            data[index] = replacement[0];
            data[index + 1] = replacement[1];
            data[index + 2] = replacement[2];
            data[index + 3] = replacement[3];
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        context.putImageData(image, 0, 0);
    }

    function paintPixel(x, y) {
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
        if (tool === 'eraser') {
            context.clearRect(x, y, 1, 1);
            return;
        }
        context.fillStyle = color;
        context.fillRect(x, y, 1, 1);
    }

    function paintLine(from, to) {
        const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
        if (!steps) {
            paintPixel(to.x, to.y);
            return;
        }
        for (let step = 0; step <= steps; step += 1) {
            paintPixel(
                Math.round(from.x + ((to.x - from.x) * step) / steps),
                Math.round(from.y + ((to.y - from.y) * step) / steps),
            );
        }
    }

    function onPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        const point = pointFromEvent(event);
        const current = snapshot();
        if (tool === 'fill') {
            floodFill(point.x, point.y, hexToRgba(color));
            record(current);
            return;
        }
        painting = true;
        before = current;
        lastPoint = point;
        canvas.setPointerCapture?.(event.pointerId);
        paintPixel(point.x, point.y);
    }

    function onPointerMove(event) {
        if (!painting) return;
        event.preventDefault();
        const point = pointFromEvent(event);
        paintLine(lastPoint, point);
        lastPoint = point;
    }

    function onPointerUp(event) {
        if (!painting) return;
        painting = false;
        if (before) record(before);
        before = null;
        lastPoint = null;
        if (event?.pointerId !== undefined && canvas.hasPointerCapture?.(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return {
        canvas,
        setTool(next) { tool = next; },
        setColor(next) { color = next; },
        getColor() { return color; },
        undo() {
            if (!undo.length) return false;
            redo.push(snapshot());
            restore(undo.pop());
            return true;
        },
        redo() {
            if (!redo.length) return false;
            undo.push(snapshot());
            restore(redo.pop());
            return true;
        },
        clear() {
            record(snapshot());
            context.clearRect(0, 0, canvas.width, canvas.height);
        },
        apply(fn) {
            const current = snapshot();
            fn(context);
            record(current);
        },
        resize(width, height) {
            if (width === canvas.width && height === canvas.height) return;
            const copy = document.createElement('canvas');
            copy.width = canvas.width;
            copy.height = canvas.height;
            copy.getContext('2d').drawImage(canvas, 0, 0);
            canvas.width = width;
            canvas.height = height;
            context.imageSmoothingEnabled = false;
            context.drawImage(copy, 0, 0, width, height);
            undo = [];
            redo = [];
        },
        getDataURL() { return canvas.toDataURL('image/png'); },
        destroy() {
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
        },
    };
}

function drawClassicSwatch(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#008080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 0; y < canvas.height; y += 4) {
        for (let x = 0; x < canvas.width; x += 4) ctx.fillRect(x, y, 2, 2);
    }
}

function stampDecoration(editor, type, color) {
    editor.apply((ctx) => {
        const box = (x, y, w, h, fill) => {
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, w, h);
        };
        if (type === 'bow') {
            box(5, 3, 3, 2, color);
            box(9, 3, 3, 2, color);
            box(7, 4, 3, 2, color);
            box(8, 5, 1, 2, '#2b1d16');
        }
        if (type === 'heart') {
            box(5, 5, 2, 1, color);
            box(9, 5, 2, 1, color);
            box(5, 6, 6, 2, color);
            box(6, 8, 4, 1, color);
            box(7, 9, 2, 1, color);
        }
        if (type === 'star') {
            box(11, 2, 1, 5, color);
            box(9, 4, 5, 1, color);
            box(10, 3, 1, 1, color);
            box(12, 3, 1, 1, color);
        }
        if (type === 'hat') {
            box(10, 0, 4, 1, color);
            box(9, 1, 6, 1, color);
            box(8, 2, 8, 1, color);
            box(12, 0, 1, 1, '#ffb000');
        }
        if (type === 'collar') {
            box(7, 12, 10, 2, color);
            box(11, 14, 2, 2, '#ffb000');
        }
    });
}

function drawStarterDog(editor, color) {
    editor.apply((ctx) => {
        const box = (x, y, w, h, fill) => {
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, w, h);
        };
        box(4, 8, 16, 9, color);
        box(6, 12, 11, 3, '#fff3de');
        box(2, 5, 4, 6, '#8a4a24');
        box(18, 5, 4, 6, '#8a4a24');
        box(5, 4, 14, 9, color);
        box(6, 13, 4, 2, '#8a4a24');
        box(15, 13, 4, 2, '#8a4a24');
        box(8, 8, 2, 2, '#2b1d16');
        box(14, 8, 2, 2, '#2b1d16');
        box(11, 10, 2, 2, '#3c2a28');
        box(6, 10, 2, 2, '#ffb59d');
        box(16, 10, 2, 2, '#ffb59d');
    });
}

function setStatus(root, message) {
    const status = root.querySelector('.ws-status');
    if (status) status.textContent = message;
}

function syncControls(root, current = getSettings()) {
    root.querySelectorAll('[data-setting]').forEach((input) => {
        const key = input.dataset.setting;
        const value = current[key];
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else input.value = String(value);
        const output = root.querySelector(`[data-output="${key}"]`);
        if (output) output.textContent = String(value);
    });
    root.querySelectorAll('[data-dog-setting]').forEach((input) => {
        const value = current.dog[input.dataset.dogSetting];
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else input.value = String(value);
        const output = root.querySelector(`[data-dog-output="${input.dataset.dogSetting}"]`);
        if (output) output.textContent = String(value);
    });
}

function renderGallery(root) {
    const grid = root.querySelector('.ws-gallery');
    const classic = `
        <button type="button" class="ws-wall-card" data-wallpaper="classic">
            <span class="ws-wall-preview"><canvas width="96" height="60" data-classic-preview></canvas></span>
            <span class="ws-wall-label">Classic Teal</span>
        </button>`;
    const presets = WALLPAPER_PRESETS.map((preset) => `
        <button type="button" class="ws-wall-card" data-wallpaper="${preset.id}">
            <span class="ws-wall-preview"><canvas width="96" height="60" data-preset-preview="${preset.id}"></canvas></span>
            <span class="ws-wall-label">${escapeHtml(preset.label)}</span>
        </button>`).join('');
    grid.innerHTML = classic + presets;
    const classicCanvas = grid.querySelector('[data-classic-preview]');
    if (classicCanvas) drawClassicSwatch(classicCanvas);
    grid.querySelectorAll('[data-preset-preview]').forEach((canvas) => {
        renderPreset(canvas, canvas.dataset.presetPreview, getSettings());
    });
}

function renderSaved(root) {
    const lists = root.querySelectorAll('[data-saved-list]');
    const drawings = loadDrawings();
    lists.forEach((list) => {
        if (!drawings.length) {
            list.innerHTML = '<p class="ws-empty">No saved drawings yet. Make one and press SAVE DRAWING.</p>';
            return;
        }
        list.innerHTML = drawings.map((entry) => `
            <button type="button" class="ws-saved-card" data-saved-wallpaper="${escapeHtml(entry.dataUrl)}" data-saved-label="${escapeHtml(entry.label)}">
                <img src="${escapeHtml(entry.dataUrl)}" alt="${escapeHtml(entry.label)}" />
                <span>${escapeHtml(entry.label)}</span>
            </button>`).join('');
    });
}

function colorPaletteHtml(prefix, selected = '#111111') {
    return CREATOR_COLORS.map((color) => `
        <button type="button" class="ws-swatch ${color === selected ? 'active' : ''}" data-${prefix}-color="${color}" style="background:${color}" aria-label="Use color ${color}" title="${color}"></button>
    `).join('');
}

export function wallpaperStudioView() {
    const settings = getSettings();
    const paletteOptions = Object.keys(PALETTES).map((key) => `<option value="${key}">${key.toUpperCase()}</option>`).join('');
    const skinOptions = DOG_SKINS.map((skin) => `<option value="${skin.id}">${escapeHtml(skin.label)}</option>`).join('');
    const sizeOptions = CANVAS_SIZES.map((size) => `<option value="${size.id}">${size.label}</option>`).join('');

    const html = `
        <h2 class="app-section-title">WALLPAPER STUDIO</h2>
        <p class="app-subtitle">Pixel wallpapers, paint tools, and desktop personalization — all with that old-computer charm.</p>
        <div class="ws-tabs" role="tablist" aria-label="Wallpaper Studio sections">
            <button type="button" class="ws-tab active" data-ws-tab="gallery" role="tab" aria-selected="true">GALLERY</button>
            <button type="button" class="ws-tab" data-ws-tab="creator" role="tab" aria-selected="false">PIXEL CREATOR</button>
            <button type="button" class="ws-tab" data-ws-tab="image" role="tab" aria-selected="false">IMPORT IMAGE</button>
            <button type="button" class="ws-tab" data-ws-tab="dog" role="tab" aria-selected="false">CUTE DOG</button>
            <button type="button" class="ws-tab" data-ws-tab="effects" role="tab" aria-selected="false">EFFECTS</button>
        </div>

        <div class="ws-panel" data-ws-panel="gallery">
            <div class="ws-panel-head">
                <h3>WALLPAPER GALLERY</h3>
                <span>Ten hand-drawn pixel scenes + your classics</span>
            </div>
            <div class="ws-gallery"></div>
            <div class="ws-panel-head"><h3>MY SAVED ART</h3><span>Click art to use it as wallpaper</span></div>
            <div class="ws-saved-list" data-saved-list></div>
        </div>

        <div class="ws-panel" data-ws-panel="creator" hidden>
            <div class="ws-panel-head">
                <h3>PIXEL CREATOR</h3>
                <span>Draw tiny pixels, then hang them on the desktop</span>
            </div>
            <div class="ws-editor-layout">
                <div class="ws-editor-side">
                    <div class="ws-field-row">
                        <label for="ws-creator-size">CANVAS</label>
                        <select id="ws-creator-size" class="ws-select" data-creator-size>${sizeOptions}</select>
                    </div>
                    <div class="ws-tool-row" aria-label="Drawing tools">
                        <button type="button" class="ws-tool active" data-creator-tool="pencil">✎ PENCIL</button>
                        <button type="button" class="ws-tool" data-creator-tool="eraser">▧ ERASER</button>
                        <button type="button" class="ws-tool" data-creator-tool="fill">▣ FILL</button>
                    </div>
                    <div class="ws-field-row">
                        <label>COLORS</label>
                        <div class="ws-swatches">${colorPaletteHtml('creator')}</div>
                    </div>
                    <div class="ws-button-grid">
                        <button type="button" class="btn" data-creator-action="undo">UNDO</button>
                        <button type="button" class="btn" data-creator-action="redo">REDO</button>
                        <button type="button" class="btn" data-creator-action="clear">CLEAR</button>
                        <button type="button" class="btn primary" data-creator-action="save">SAVE DRAWING</button>
                        <button type="button" class="btn primary" data-creator-action="wallpaper">SET WALLPAPER</button>
                        <button type="button" class="btn" data-creator-action="avatar">USE AS DOG</button>
                    </div>
                </div>
                <div class="ws-canvas-wrap">
                    <canvas class="ws-canvas ws-creator-canvas" width="32" height="20" aria-label="Pixel drawing canvas"></canvas>
                    <div class="ws-canvas-caption">32 × 20 PIXELS — MOUSE OR TOUCH TO DRAW</div>
                </div>
            </div>
            <div class="ws-panel-head"><h3>SAVED DRAWINGS</h3><span>Kept locally when storage allows</span></div>
            <div class="ws-saved-list" data-saved-list></div>
        </div>

        <div class="ws-panel" data-ws-panel="image" hidden>
            <div class="ws-panel-head">
                <h3>IMPORT IMAGE</h3>
                <span>JPG, PNG, or WebP — turned into chunky pixel art</span>
            </div>
            <div class="ws-editor-layout">
                <div class="ws-editor-side">
                    <div class="ws-field-row">
                        <label for="ws-image-file">IMAGE FILE</label>
                        <input id="ws-image-file" class="ws-file" type="file" accept="image/jpeg,image/png,image/webp" />
                    </div>
                    <div class="ws-field-row">
                        <label for="ws-pixel-size">PIXEL SIZE <span data-output="pixelSize">${settings.pixelSize}</span></label>
                        <input id="ws-pixel-size" type="range" min="1" max="12" step="1" data-setting="pixelSize" />
                    </div>
                    <div class="ws-field-row">
                        <label for="ws-image-brightness">BRIGHTNESS <span data-output="brightness">${settings.brightness}</span></label>
                        <input id="ws-image-brightness" type="range" min="50" max="150" step="1" data-setting="brightness" />
                    </div>
                    <div class="ws-field-row">
                        <label for="ws-image-contrast">CONTRAST <span data-output="contrast">${settings.contrast}</span></label>
                        <input id="ws-image-contrast" type="range" min="50" max="150" step="1" data-setting="contrast" />
                    </div>
                    <div class="ws-field-row">
                        <label for="ws-image-reduction">COLOR REDUCTION <span data-output="colorReduction">${settings.colorReduction}</span></label>
                        <input id="ws-image-reduction" type="range" min="2" max="32" step="1" data-setting="colorReduction" />
                    </div>
                    <div class="ws-field-row">
                        <label for="ws-image-palette">PALETTE</label>
                        <select id="ws-image-palette" class="ws-select" data-setting="palette">${paletteOptions}</select>
                    </div>
                    <div class="ws-button-grid">
                        <button type="button" class="btn primary" data-image-action="apply">SET WALLPAPER</button>
                        <button type="button" class="btn" data-image-action="avatar">USE AS DOG</button>
                    </div>
                </div>
                <div class="ws-canvas-wrap">
                    <canvas class="ws-canvas ws-preview-canvas" width="192" height="120" aria-label="Wallpaper preview"></canvas>
                    <div class="ws-canvas-caption" data-image-caption>IMPORT AN IMAGE TO PREVIEW</div>
                </div>
            </div>
        </div>

        <div class="ws-panel" data-ws-panel="dog" hidden>
            <div class="ws-panel-head">
                <h3>CUTE DOG PAINT</h3>
                <span>Draw a tiny pup, add decorations, then adopt it</span>
            </div>
            <div class="ws-editor-layout">
                <div class="ws-editor-side">
                    <div class="ws-tool-row" aria-label="Cute Dog tools">
                        <button type="button" class="ws-tool active" data-dog-tool="pencil">✎ PENCIL</button>
                        <button type="button" class="ws-tool" data-dog-tool="eraser">▧ ERASER</button>
                        <button type="button" class="ws-tool" data-dog-tool="fill">▣ FILL</button>
                    </div>
                    <div class="ws-field-row">
                        <label>FUR COLORS</label>
                        <div class="ws-swatches">${colorPaletteHtml('dog', '#c8793f')}</div>
                    </div>
                    <div class="ws-field-row">
                        <label>DECORATIONS</label>
                        <div class="ws-tool-row ws-decoration-row">
                            <button type="button" class="ws-tool" data-decoration="bow">BOW</button>
                            <button type="button" class="ws-tool" data-decoration="heart">HEART</button>
                            <button type="button" class="ws-tool" data-decoration="star">STAR</button>
                            <button type="button" class="ws-tool" data-decoration="hat">HAT</button>
                            <button type="button" class="ws-tool" data-decoration="collar">COLLAR</button>
                        </div>
                    </div>
                    <div class="ws-button-grid">
                        <button type="button" class="btn" data-dog-action="template">START DOG</button>
                        <button type="button" class="btn" data-dog-action="undo">UNDO</button>
                        <button type="button" class="btn" data-dog-action="redo">REDO</button>
                        <button type="button" class="btn" data-dog-action="clear">CLEAR</button>
                        <button type="button" class="btn primary" data-dog-action="save">SAVE DRAWING</button>
                        <button type="button" class="btn primary" data-dog-action="wallpaper">SET WALLPAPER</button>
                        <button type="button" class="btn primary" data-dog-action="avatar">SET AS DESKTOP DOG</button>
                    </div>
                    <p class="ws-note">Built-in dog skins keep the full walk / wave / sit / sleep animation set. Painted pups become a desktop avatar with a gentle bob and wave — arbitrary pixels cannot be automatically rigged with separate legs.</p>
                </div>
                <div class="ws-canvas-wrap">
                    <canvas class="ws-canvas ws-dog-canvas" width="24" height="20" aria-label="Cute Dog drawing canvas"></canvas>
                    <div class="ws-canvas-caption">24 × 20 PIXELS — YOUR CUTE PUP</div>
                </div>
            </div>
            <div class="ws-panel-head"><h3>COMPANION SETTINGS</h3><span>The little dog lives on your desktop</span></div>
            <div class="ws-companion-settings">
                <label class="ws-check"><input type="checkbox" data-dog-setting="visible" ${settings.dog.visible ? 'checked' : ''} /> SHOW DESKTOP DOG</label>
                <label class="ws-check"><input type="checkbox" data-dog-setting="walking" ${settings.dog.walking ? 'checked' : ''} /> ALLOW WALKING</label>
                <label class="ws-check"><input type="checkbox" data-dog-setting="idleOnly" ${settings.dog.idleOnly ? 'checked' : ''} /> IDLE-ONLY MODE</label>
                <div class="ws-field-row">
                    <label for="ws-dog-speed">ANIMATION SPEED <span data-dog-output="speed">${settings.dog.speed}</span></label>
                    <input id="ws-dog-speed" type="range" min="0.25" max="2.5" step="0.05" data-dog-setting="speed" />
                </div>
                <div class="ws-field-row">
                    <label for="ws-dog-size">DOG SIZE <span data-dog-output="size">${settings.dog.size}</span></label>
                    <input id="ws-dog-size" type="range" min="0.7" max="1.6" step="0.05" data-dog-setting="size" />
                </div>
                <div class="ws-field-row">
                    <label for="ws-dog-skin">DOG SKIN</label>
                    <select id="ws-dog-skin" class="ws-select" data-dog-setting="skin">${skinOptions}</select>
                </div>
                <button type="button" class="btn" data-dog-setting-action="reset">RESET COMPANION</button>
            </div>
            <div class="ws-panel-head"><h3>SAVED PUPS</h3><span>Click to adopt a saved drawing</span></div>
            <div class="ws-saved-list" data-saved-list></div>
        </div>

        <div class="ws-panel" data-ws-panel="effects" hidden>
            <div class="ws-panel-head">
                <h3>PIXEL EFFECTS</h3>
                <span>Lightweight retro filters — nothing fancy, nothing slow</span>
            </div>
            <div class="ws-effects-grid">
                <div class="ws-field-row">
                    <label for="ws-fx-pixel">PIXEL SIZE <span data-output="pixelSize">${settings.pixelSize}</span></label>
                    <input id="ws-fx-pixel" type="range" min="1" max="12" step="1" data-setting="pixelSize" />
                </div>
                <div class="ws-field-row">
                    <label for="ws-fx-brightness">BRIGHTNESS <span data-output="brightness">${settings.brightness}</span></label>
                    <input id="ws-fx-brightness" type="range" min="50" max="150" step="1" data-setting="brightness" />
                </div>
                <div class="ws-field-row">
                    <label for="ws-fx-contrast">CONTRAST <span data-output="contrast">${settings.contrast}</span></label>
                    <input id="ws-fx-contrast" type="range" min="50" max="150" step="1" data-setting="contrast" />
                </div>
                <div class="ws-field-row">
                    <label for="ws-fx-reduction">COLOR REDUCTION <span data-output="colorReduction">${settings.colorReduction}</span></label>
                    <input id="ws-fx-reduction" type="range" min="2" max="32" step="1" data-setting="colorReduction" />
                </div>
                <div class="ws-field-row">
                    <label for="ws-fx-palette">COLOR PALETTE</label>
                    <select id="ws-fx-palette" class="ws-select" data-setting="palette">${paletteOptions}</select>
                </div>
                <div class="ws-field-row">
                    <label for="ws-fx-position">WALLPAPER POSITION</label>
                    <select id="ws-fx-position" class="ws-select" data-setting="position">
                        <option value="cover">CENTER / COVER</option>
                        <option value="stretch">STRETCH</option>
                        <option value="tile">TILE</option>
                    </select>
                </div>
                <label class="ws-check"><input type="checkbox" data-setting="crtEffect" ${settings.crtEffect ? 'checked' : ''} /> RETRO CRT GLOW</label>
                <label class="ws-check"><input type="checkbox" data-setting="scanlines" ${settings.scanlines ? 'checked' : ''} /> SCANLINES</label>
                <label class="ws-check"><input type="checkbox" data-setting="dither" ${settings.dither ? 'checked' : ''} /> DITHERING</label>
                <button type="button" class="btn" data-effects-action="reset">RESET ALL PERSONALIZATION</button>
            </div>
        </div>

        <div class="ws-status bevel-in" role="status">Ready. Pick a wallpaper or paint something tiny.</div>
    `;

    return makeView(html, {
        mount(root) {
            const creator = makePixelEditor(root.querySelector('.ws-creator-canvas'));
            const dogEditor = makePixelEditor(root.querySelector('.ws-dog-canvas'));
            creator.setColor(CREATOR_COLORS[0]);
            dogEditor.setColor('#c8793f');
            drawStarterDog(dogEditor, '#c8793f');
            renderGallery(root);
            renderSaved(root);
            syncControls(root);

            let importedImage = null;
            let reader = null;
            let activeTab = 'gallery';
            root.__wsCreator = creator;
            root.__wsDogEditor = dogEditor;

            const previewCanvas = root.querySelector('.ws-preview-canvas');

            function renderImagePreview() {
                if (!importedImage) return;
                const output = processImageForWallpaper(importedImage, getSettings());
                previewCanvas.getContext('2d').clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                previewCanvas.getContext('2d').drawImage(output, 0, 0);
            }

            function wallpaperFromCanvas(source, label, id) {
                const output = processImageForWallpaper(source, getSettings());
                return setWallpaperData(output.toDataURL('image/png'), label, id);
            }

            function setEditorTool(editor, buttons, tool) {
                editor.setTool(tool);
                buttons.forEach((button) => button.classList.toggle('active', button.dataset.creatorTool === tool || button.dataset.dogTool === tool));
            }

            function chooseColor(editor, buttons, color, attribute) {
                editor.setColor(color);
                buttons.forEach((button) => button.classList.toggle('active', button.getAttribute(attribute) === color));
            }

            root.querySelectorAll('[data-ws-tab]').forEach((tab) => {
                tab.addEventListener('click', () => {
                    activeTab = tab.dataset.wsTab;
                    root.querySelectorAll('[data-ws-tab]').forEach((button) => {
                        const active = button === tab;
                        button.classList.toggle('active', active);
                        button.setAttribute('aria-selected', String(active));
                    });
                    root.querySelectorAll('[data-ws-panel]').forEach((panel) => {
                        panel.hidden = panel.dataset.wsPanel !== activeTab;
                    });
                    if (activeTab === 'image') renderImagePreview();
                    if (activeTab === 'gallery') renderGallery(root);
                    setStatus(root, `${tab.textContent.trim()} ready.`);
                });
            });

            root.querySelector('.ws-gallery').addEventListener('click', (event) => {
                const card = event.target.closest('[data-wallpaper]');
                if (!card) return;
                const id = card.dataset.wallpaper;
                if (id === 'classic') {
                    updateSettings({ wallpaperId: 'classic', wallpaperData: null, wallpaperLabel: 'Classic Teal' });
                    setStatus(root, 'Classic teal wallpaper restored.');
                } else {
                    updateSettings({ wallpaperId: id, wallpaperData: null });
                    setStatus(root, `${card.querySelector('.ws-wall-label').textContent} applied.`);
                }
            });

            root.querySelectorAll('[data-creator-tool]').forEach((button) => {
                button.addEventListener('click', () => setEditorTool(creator, root.querySelectorAll('[data-creator-tool]'), button.dataset.creatorTool));
            });
            root.querySelectorAll('[data-dog-tool]').forEach((button) => {
                button.addEventListener('click', () => setEditorTool(dogEditor, root.querySelectorAll('[data-dog-tool]'), button.dataset.dogTool));
            });
            root.querySelectorAll('[data-creator-color]').forEach((button) => {
                button.addEventListener('click', () => chooseColor(creator, root.querySelectorAll('[data-creator-color]'), button.dataset.creatorColor, 'data-creator-color'));
            });
            root.querySelectorAll('[data-dog-color]').forEach((button) => {
                button.addEventListener('click', () => chooseColor(dogEditor, root.querySelectorAll('[data-dog-color]'), button.dataset.dogColor, 'data-dog-color'));
            });

            root.querySelector('[data-creator-size]').addEventListener('change', (event) => {
                const size = CANVAS_SIZES.find((item) => item.id === event.target.value) || CANVAS_SIZES[1];
                creator.resize(size.width, size.height);
                root.querySelector('.ws-creator-canvas').setAttribute('aria-label', `${size.width} by ${size.height} pixel drawing canvas`);
                root.querySelector('.ws-creator-canvas').nextElementSibling.textContent = `${size.width} × ${size.height} PIXELS — MOUSE OR TOUCH TO DRAW`;
                setStatus(root, `Canvas changed to ${size.label}.`);
            });

            root.querySelector('[data-creator-action="undo"]').addEventListener('click', () => setStatus(root, creator.undo() ? 'Undo done.' : 'Nothing to undo.'));
            root.querySelector('[data-creator-action="redo"]').addEventListener('click', () => setStatus(root, creator.redo() ? 'Redo done.' : 'Nothing to redo.'));
            root.querySelector('[data-creator-action="clear"]').addEventListener('click', () => {
                creator.clear();
                setStatus(root, 'Canvas cleared.');
            });
            root.querySelector('[data-creator-action="save"]').addEventListener('click', () => {
                const saved = saveDrawing(creator.getDataURL(), 'Pixel drawing');
                renderSaved(root);
                setStatus(root, saved ? 'Drawing saved locally.' : 'Storage is full — drawing could not be saved.');
            });
            root.querySelector('[data-creator-action="wallpaper"]').addEventListener('click', () => {
                wallpaperFromCanvas(creator.canvas, 'My pixel drawing', 'drawing');
                setStatus(root, 'Drawing set as desktop wallpaper.');
            });
            root.querySelector('[data-creator-action="avatar"]').addEventListener('click', () => {
                const result = updateSettings({ dog: { customAvatar: creator.getDataURL() } });
                setStatus(root, result.dataSaved ? 'Drawing adopted as desktop dog.' : 'Applied for this session — storage is full.');
            });

            root.querySelector('#ws-image-file').addEventListener('change', (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                    setStatus(root, 'Please choose a JPG, PNG, or WebP image.');
                    return;
                }
                if (reader) reader.abort();
                reader = new FileReader();
                reader.onload = async () => {
                    try {
                        importedImage = await loadImage(String(reader.result));
                        renderImagePreview();
                        root.querySelector('[data-image-caption]').textContent = `${file.name.toUpperCase()} — PIXEL PREVIEW`;
                        setStatus(root, 'Image loaded. Adjust the sliders, then apply it.');
                    } catch (error) {
                        setStatus(root, 'That image could not be opened.');
                    }
                };
                reader.onerror = () => setStatus(root, 'That image could not be read.');
                reader.readAsDataURL(file);
            });
            root.querySelector('[data-image-action="apply"]').addEventListener('click', () => {
                if (!importedImage) {
                    setStatus(root, 'Import an image first.');
                    return;
                }
                setWallpaperData(previewCanvas.toDataURL('image/png'), 'Imported pixel wallpaper', 'custom');
                setStatus(root, 'Pixelated image applied as wallpaper.');
            });
            root.querySelector('[data-image-action="avatar"]').addEventListener('click', () => {
                if (!importedImage) {
                    setStatus(root, 'Import an image first.');
                    return;
                }
                const result = updateSettings({ dog: { customAvatar: previewCanvas.toDataURL('image/png') } });
                setStatus(root, result.dataSaved ? 'Image adopted as desktop dog.' : 'Applied for this session — storage is full.');
            });

            root.querySelectorAll('[data-decoration]').forEach((button) => {
                button.addEventListener('click', () => {
                    const currentColor = dogEditor.getColor();
                    stampDecoration(dogEditor, button.dataset.decoration, currentColor);
                    setStatus(root, `${button.textContent.trim()} added.`);
                });
            });
            root.querySelector('[data-dog-action="template"]').addEventListener('click', () => {
                drawStarterDog(dogEditor, '#c8793f');
                setStatus(root, 'Starter pup drawn. Make it yours!');
            });
            root.querySelector('[data-dog-action="undo"]').addEventListener('click', () => setStatus(root, dogEditor.undo() ? 'Undo done.' : 'Nothing to undo.'));
            root.querySelector('[data-dog-action="redo"]').addEventListener('click', () => setStatus(root, dogEditor.redo() ? 'Redo done.' : 'Nothing to redo.'));
            root.querySelector('[data-dog-action="clear"]').addEventListener('click', () => {
                dogEditor.clear();
                setStatus(root, 'Pup canvas cleared.');
            });
            root.querySelector('[data-dog-action="save"]').addEventListener('click', () => {
                const saved = saveDrawing(dogEditor.getDataURL(), 'Cute Dog');
                renderSaved(root);
                setStatus(root, saved ? 'Cute Dog saved locally.' : 'Storage is full — drawing could not be saved.');
            });
            root.querySelector('[data-dog-action="wallpaper"]').addEventListener('click', () => {
                wallpaperFromCanvas(dogEditor.canvas, 'Cute Dog wallpaper', 'drawing');
                setStatus(root, 'Cute Dog set as wallpaper.');
            });
            root.querySelector('[data-dog-action="avatar"]').addEventListener('click', () => {
                const result = updateSettings({ dog: { customAvatar: dogEditor.getDataURL() } });
                setStatus(root, result.dataSaved ? 'Cute Dog adopted as desktop companion!' : 'Applied for this session — storage is full.');
            });
            root.querySelector('[data-dog-setting-action="reset"]').addEventListener('click', () => {
                resetSettings();
                syncControls(root);
                setStatus(root, 'Companion and personalization settings reset.');
            });

            root.querySelectorAll('[data-setting]').forEach((input) => {
                input.addEventListener('input', () => {
                    const key = input.dataset.setting;
                    const value = input.type === 'checkbox'
                        ? input.checked
                        : (input.type === 'range' ? Number(input.value) : input.value);
                    updateSettings({ [key]: value });
                    syncControls(root);
                    if (importedImage) renderImagePreview();
                    if (activeTab === 'gallery') renderGallery(root);
                });
            });
            root.querySelectorAll('[data-dog-setting]').forEach((input) => {
                input.addEventListener('input', () => {
                    const key = input.dataset.dogSetting;
                    const value = input.type === 'checkbox'
                        ? input.checked
                        : (input.type === 'range' ? Number(input.value) : input.value);
                    updateSettings({ dog: { [key]: value } });
                    syncControls(root);
                });
            });
            root.querySelector('[data-effects-action="reset"]').addEventListener('click', () => {
                resetSettings();
                syncControls(root);
                renderGallery(root);
                setStatus(root, 'All personalization reset to defaults.');
            });

            root.addEventListener('click', (event) => {
                const card = event.target.closest('[data-saved-wallpaper]');
                if (!card) return;
                setWallpaperData(card.dataset.savedWallpaper, card.dataset.savedLabel, 'drawing');
                setStatus(root, `${card.dataset.savedLabel} applied as wallpaper.`);
            });

            const listener = (current) => {
                syncControls(root, current);
                if (importedImage) renderImagePreview();
            };
            // Keep the unsubscribe handle on the root for window cleanup.
            root.__wsUnsubscribe = subscribe(listener);
        },
        cleanup(root) {
            root.__wsUnsubscribe?.();
            root.__wsCreator?.destroy();
            root.__wsDogEditor?.destroy();
        },
    });
}
