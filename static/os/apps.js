// PRASAD DESKTOP — application views, window content, and games.
import { PROFILE, ABOUT, EXPERIENCES, SKILLS, PROJECTS, SEARCH_ENTRIES, RESUME_CV } from './data.js';
import { wallpaperStudioView } from './wallpaper-studio.js';

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const makeView = (html, extra = {}) => ({ html, mount() {}, cleanup() {}, ...extra });

function bullets(items) {
    return '<ul class="bullet-list">' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>';
}

/* --------------------------- local high scores --------------------------- */
const SCORE_KEY = 'prasad-desktop-hiscores';
const DEFAULT_HISCORES = { snake: 0, minesweeper: 0, memory: null };
let scoreStorageWarned = false;

function loadHiScores() {
    try {
        const raw = JSON.parse(localStorage.getItem(SCORE_KEY) || '{}');
        const safeNumber = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
        return {
            snake: safeNumber(raw.snake),
            minesweeper: safeNumber(raw.minesweeper),
            memory: Number.isFinite(Number(raw.memory)) && Number(raw.memory) > 0
                ? Math.max(1, Math.floor(Number(raw.memory)))
                : null,
        };
    } catch (error) {
        return { ...DEFAULT_HISCORES };
    }
}

function persistHiScores(scores, ctx) {
    try {
        localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
    } catch (error) {
        if (!scoreStorageWarned) {
            scoreStorageWarned = true;
            if (ctx && typeof ctx.toast === 'function') ctx.toast('High scores cannot be saved in this browser.');
        }
    }
}

function recordHiScore(game, value, ctx) {
    const scores = loadHiScores();
    const candidate = Math.max(0, Math.floor(Number(value) || 0));
    if (game === 'memory') {
        if (candidate <= 0 || (scores.memory !== null && candidate >= scores.memory)) return scores;
        scores.memory = candidate;
    } else {
        if (candidate <= scores[game]) return scores;
        scores[game] = candidate;
    }
    persistHiScores(scores, ctx);
    return scores;
}

function resetHiScores(ctx) {
    try {
        localStorage.removeItem(SCORE_KEY);
        return { ...DEFAULT_HISCORES };
    } catch (error) {
        if (ctx && typeof ctx.toast === 'function') ctx.toast('High scores cannot be reset in this browser.');
        return null;
    }
}

/* ------------------------------ ABOUT ------------------------------ */
function computerView() {
    return makeView(`
        <h2 class="app-section-title">ABOUT ME</h2>
        <div class="about-hero">
            <div class="about-copy">
                <h1>${escapeHtml(PROFILE.name)}</h1>
                <p class="about-role">${escapeHtml(PROFILE.title)}</p>
                <p>${escapeHtml(ABOUT.intro)}</p>
                <p>${escapeHtml(ABOUT.work)}</p>
                <p class="about-closing">${escapeHtml(ABOUT.closing)} 🚀</p>
                <div class="btn-row">
                    <a class="btn primary" href="${PROFILE.linkedin}" target="_blank" rel="noopener">Open LinkedIn ↗</a>
                    <a class="btn" href="${PROFILE.github}" target="_blank" rel="noopener">Open GitHub ↗</a>
                </div>
            </div>
            <div class="then-now" aria-label="Then versus now photos">
                <figure class="photo-frame">
                    <img src="${ABOUT.babyPhoto}" alt="Prakash as a child" />
                    <figcaption>THEN</figcaption>
                </figure>
                <figure class="photo-frame">
                    <img class="pixel" src="${ABOUT.todayPhoto}" alt="Prakash Prasad today" />
                    <figcaption>NOW</figcaption>
                </figure>
            </div>
        </div>
        <div class="retro-note" style="margin-top:18px">
            C:\\USERS\\PRAKASH\\README.TXT — Little me dreamed. Today's me is building.
        </div>
    `);
}

/* --------------------------- EXPERIENCE --------------------------- */
function experienceCard(job, index) {
    const visible = job.bullets.slice(0, 4);
    const rest = job.bullets.slice(4);
    const extraId = 'job-extra-' + index;
    return `
        <div class="timeline-item">
            <span class="timeline-dot" aria-hidden="true"></span>
            <article class="job-card">
                <div class="job-head">
                    <h3>${escapeHtml(job.title)}</h3>
                    ${job.current ? '<span class="current-badge">CURRENT</span>' : ''}
                </div>
                <div class="job-meta">
                    <strong>${escapeHtml(job.company)}</strong> &nbsp;•&nbsp; ${escapeHtml(job.dates)} &nbsp;•&nbsp; ${escapeHtml(job.location)}
                </div>
                ${bullets(visible)}
                ${rest.length ? `<div class="job-extra" id="${extraId}" hidden>${bullets(rest)}</div>` : ''}
                <div class="btn-row" style="margin-top:9px">
                    ${rest.length ? `<button type="button" class="link-btn expand-job" data-target="${extraId}">VIEW FULL EXPERIENCE ▾</button>` : ''}
                    <button type="button" class="link-btn open-job" data-index="${index}">OPEN FULL DESCRIPTION ↗</button>
                </div>
            </article>
        </div>
    `;
}

function experienceView(ctx) {
    return makeView(`
        <h2 class="app-section-title">EXPERIENCE.EXE</h2>
        <p class="app-subtitle">Career timeline — newest to oldest</p>
        <div class="timeline">${EXPERIENCES.map(experienceCard).join('')}</div>
    `, {
        mount(root) {
            const onClick = (event) => {
                const expand = event.target.closest('.expand-job');
                if (expand) {
                    const target = root.querySelector('#' + expand.dataset.target);
                    if (target) {
                        target.hidden = !target.hidden;
                        expand.textContent = target.hidden ? 'VIEW FULL EXPERIENCE ▾' : 'SHOW LESS ▴';
                    }
                    return;
                }
                const open = event.target.closest('.open-job');
                if (open) {
                    ctx.openWindow('job', { job: EXPERIENCES[Number(open.dataset.index)] });
                }
            };
            root.addEventListener('click', onClick);
            this._onClick = onClick;
        },
        cleanup(root) {
            if (this._onClick) root.removeEventListener('click', this._onClick);
        },
    });
}

function jobView(options) {
    const job = options.job || EXPERIENCES[0];
    return makeView(`
        <h2 class="app-section-title">${escapeHtml(job.title)}</h2>
        <div class="job-meta">
            <strong>${escapeHtml(job.company)}</strong> &nbsp;•&nbsp; ${escapeHtml(job.dates)} &nbsp;•&nbsp; ${escapeHtml(job.location)}
            ${job.current ? '<br /><span class="current-badge">CURRENT</span>' : ''}
        </div>
        ${bullets(job.bullets)}
        <div class="btn-row"><button type="button" class="btn" data-close-self>CLOSE WINDOW</button></div>
    `);
}

/* ------------------------------ SKILLS ------------------------------ */
function skillsView() {
    const groups = [...new Set(SKILLS.map((skill) => skill.group))];
    const html = groups.map((group) => `
        <div class="folder-group">${escapeHtml(group.toUpperCase())}</div>
        <div class="folder-grid">
            ${SKILLS.filter((skill) => skill.group === group).map((skill) => `
                <div class="folder skill-folder" title="${escapeHtml(skill.name)}">
                    <div class="folder-icon">${escapeHtml(skill.icon)}</div>
                    <div class="folder-name">${escapeHtml(skill.name)}</div>
                </div>
            `).join('')}
        </div>
    `).join('');
    return makeView(`
        <h2 class="app-section-title">SKILLS FOLDERS</h2>
        <p class="app-subtitle">Quality engineering, standards, tools, and development</p>
        ${html}
    `);
}

/* ----------------------------- PROJECTS ----------------------------- */
function projectsView(ctx) {
    return makeView(`
        <h2 class="app-section-title">PROJECTS FOLDER</h2>
        <p class="app-subtitle">Double-click a folder to open its details</p>
        <div class="folder-grid">
            ${PROJECTS.map((project) => `
                <button type="button" class="folder" data-project="${escapeHtml(project.id)}">
                    <span class="folder-icon">${escapeHtml(project.icon)}</span>
                    <span class="folder-name">${escapeHtml(project.name)}</span>
                </button>
            `).join('')}
        </div>
        <div class="retro-note" style="margin-top:16px">
            Links are only shown for projects with a verified public URL.
        </div>
    `, {
        mount(root) {
            const onClick = (event) => {
                const folder = event.target.closest('[data-project]');
                if (!folder) return;
                const project = PROJECTS.find((item) => item.id === folder.dataset.project);
                if (project) ctx.openWindow('project', { project });
            };
            root.addEventListener('click', onClick);
            this._onClick = onClick;
        },
        cleanup(root) {
            if (this._onClick) root.removeEventListener('click', this._onClick);
        },
    });
}

function projectView(options) {
    const project = options.project || PROJECTS[0];
    const link = project.url
        ? `<a class="btn primary" href="${escapeHtml(project.url)}" target="_blank" rel="noopener">OPEN REPOSITORY ↗</a>`
        : '<span class="retro-note">No public repository or demo link provided.</span>';
    const screenshot = project.screenshot
        ? `<img src="${escapeHtml(project.screenshot)}" alt="${escapeHtml(project.name)} screenshot" />`
        : 'No screenshots added yet.';
    return makeView(`
        <div class="detail-head">
            <div class="detail-icon">${escapeHtml(project.icon)}</div>
            <div><h2>${escapeHtml(project.name)}</h2><div class="app-subtitle" style="margin:0">PROJECT FOLDER</div></div>
        </div>
        <div class="detail-row"><span class="detail-label">DESCRIPTION:</span><span>${escapeHtml(project.description)}</span></div>
        <div class="detail-row"><span class="detail-label">STATUS:</span><span>${escapeHtml(project.note)}</span></div>
        <div class="detail-row"><span class="detail-label">LINK:</span><span>${link}</span></div>
        <div class="screenshot-box">${screenshot}</div>
    `);
}

/* ------------------------------ INTERNET ------------------------------ */
function internetView() {
    const href = PROFILE.github;
    return makeView(`
        <h2 class="app-section-title">INTERNET EXPLORER</h2>
        <div class="browser-bar">
            <div class="address-bar"><span>ADDRESS</span><input class="address-input" type="text" value="${escapeHtml(href)}" aria-label="Address" /></div>
            <button type="button" class="btn go-address">GO</button>
        </div>
        <div class="browser-page">
            <h2>Prasad's Web Links</h2>
            <p class="app-subtitle">Professional profiles and portfolio destinations</p>
            <a class="link-row" href="${PROFILE.linkedin}" target="_blank" rel="noopener">
                <span class="link-glyph">in</span><span><strong>LinkedIn</strong><small>${escapeHtml(PROFILE.linkedin)}</small></span>
            </a>
            <a class="link-row" href="${PROFILE.github}" target="_blank" rel="noopener">
                <span class="link-glyph">&gt;_</span><span><strong>GitHub</strong><small>${escapeHtml(PROFILE.github)}</small></span>
            </a>
            <a class="link-row" href="${PROFILE.portfolio}" target="_blank" rel="noopener">
                <span class="link-glyph">◎</span><span><strong>Portfolio (3D site)</strong><small>${escapeHtml(PROFILE.portfolio)}</small></span>
            </a>
            <a class="link-row" href="/os/index.html" target="_blank" rel="noopener">
                <span class="link-glyph">▣</span><span><strong>This Desktop</strong><small>/os/index.html</small></span>
            </a>
        </div>
    `, {
        mount(root, win, ctx) {
            const go = () => {
                const value = root.querySelector('.address-input').value.trim();
                let valid = false;
                try {
                    const url = new URL(value);
                    valid = ['http:', 'https:'].includes(url.protocol) && !!url.hostname;
                } catch (error) { /* invalid address */ }
                if (valid) {
                    window.open(value, '_blank', 'noopener');
                } else if (value) {
                    if (ctx && typeof ctx.playSound === 'function') ctx.playSound('error');
                    ctx.toast('Please enter a full http:// or https:// address.');
                }
            };
            const onClick = (event) => {
                if (event.target.closest('.go-address')) go();
            };
            const onKeydown = (event) => {
                if (event.key === 'Enter' && win.active) go();
            };
            root.addEventListener('click', onClick);
            root.addEventListener('keydown', onKeydown);
            this._handlers = { onClick, onKeydown };
        },
        cleanup(root) {
            if (this._handlers) {
                root.removeEventListener('click', this._handlers.onClick);
                root.removeEventListener('keydown', this._handlers.onKeydown);
            }
        },
    });
}

/* ------------------------------- EMAIL ------------------------------- */
function emailView() {
    return makeView(`
        <h2 class="app-section-title">CONTACT.EXE</h2>
        <p class="app-subtitle">Let's build something together? 💚</p>
        <div class="contact-line">
            <span class="folder-icon">✉</span>
            <div><div style="color:#555;font-size:11px">EMAIL ADDRESS</div><strong>${escapeHtml(PROFILE.email)}</strong></div>
        </div>
        <p style="line-height:1.6;margin-top:14px">Got an idea, a role, or just want to say hi? My inbox is open.</p>
        <div class="btn-row">
            <a class="btn primary" href="mailto:${PROFILE.email}?subject=Hello%20from%20your%20portfolio">SEND MESSAGE ✉</a>
            <a class="btn" href="${PROFILE.linkedin}" target="_blank" rel="noopener">LINKEDIN ↗</a>
            <a class="btn" href="${PROFILE.github}" target="_blank" rel="noopener">GITHUB ↗</a>
        </div>
    `);
}

/* ------------------------------ RESUME ------------------------------ */
function resumeHtmlPreview() {
    const bulletList = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    const experience = RESUME_CV.experience.map((job) => `
        <div class="resume-entry">
            <div class="resume-entry-title">${escapeHtml(job.title)}</div>
            <div class="resume-entry-meta">${escapeHtml(job.company)} | ${escapeHtml(job.location)} | ${escapeHtml(job.dates)}</div>
            ${bulletList(job.bullets)}
        </div>
    `).join('');
    const skills = RESUME_CV.skills.map((group) => `
        <p class="resume-skill-line"><strong>${escapeHtml(group.label)}:</strong> ${escapeHtml(group.value)}</p>
    `).join('');
    const projects = RESUME_CV.projects.map((project) => `
        <p class="resume-skill-line"><strong>${escapeHtml(project.name)}:</strong> ${escapeHtml(project.detail)}</p>
    `).join('');
    const education = RESUME_CV.education;
    const certifications = RESUME_CV.certifications.map((cert) => `
        <div class="resume-entry">
            <div class="resume-entry-title">${escapeHtml(cert.name)}</div>
            <div class="resume-entry-meta">${escapeHtml(cert.issuer)} | ${escapeHtml(cert.issued)}${cert.expires ? ` | Expires: ${escapeHtml(cert.expires)}` : ''}</div>
            ${cert.skills ? `<p class="resume-skill-line">${escapeHtml(cert.skills)}</p>` : ''}
            <div class="resume-credential-id">Credential ID: ${escapeHtml(cert.credentialId)}</div>
        </div>
    `).join('');
    return `
        <div class="resume-paper">
            <h1>${escapeHtml(PROFILE.name)}</h1>
            <p class="resume-headline">${escapeHtml(RESUME_CV.headline)}</p>
            <p class="resume-contact">${escapeHtml(RESUME_CV.location)} | ${escapeHtml(PROFILE.email)} | ${escapeHtml(PROFILE.github.replace(/^https?:\/\//, ''))} | ${escapeHtml(PROFILE.linkedin.replace(/^https?:\/\//, ''))}</p>
            <h2 class="resume-section-title">Professional Summary</h2>
            ${RESUME_CV.summary.map((sentence) => `<p>${escapeHtml(sentence)}</p>`).join('')}
            <h2 class="resume-section-title">Core Competencies</h2>
            <p>${escapeHtml(RESUME_CV.competencies.join(' | '))}</p>
            <h2 class="resume-section-title">Professional Experience</h2>
            ${experience}
            <h2 class="resume-section-title">Technical Skills</h2>
            ${skills}
            <h2 class="resume-section-title">Education</h2>
            <div class="resume-entry">
                <div class="resume-entry-title">${escapeHtml(education.qualification)}</div>
                <div class="resume-entry-meta">${escapeHtml(education.institution)} | ${escapeHtml(education.field)} | ${escapeHtml(education.dates)} | Grade: ${escapeHtml(education.grade)}</div>
            </div>
            <h2 class="resume-section-title">Projects</h2>
            ${projects}
            <h2 class="resume-section-title">Certifications & Training</h2>
            ${certifications}
        </div>
    `;
}

function resumeView(ctx) {
    const fallback = resumeHtmlPreview();
    return makeView(`
        <h2 class="app-section-title">RESUME — ATS CV</h2>
        <p class="resume-note">ATS-compatible single-column CV with selectable text. Verified education and credentials are included; use Download CV or Print CV for the complete PDF.</p>
        <div class="btn-row" style="margin-bottom:10px">
            <a class="btn primary" href="${escapeHtml(PROFILE.resume)}" download="${escapeHtml(RESUME_CV.fileName)}">DOWNLOAD CV ⬇</a>
            <button type="button" class="btn print-resume">PRINT CV 🖨</button>
            <a class="btn" href="${escapeHtml(PROFILE.resume)}" target="_blank" rel="noopener">OPEN PDF ↗</a>
        </div>
        <object class="resume-frame" data="${escapeHtml(PROFILE.resume)}#toolbar=1" type="application/pdf" aria-label="ATS CV PDF preview">
            <div class="resume-fallback">${fallback}</div>
        </object>
        <details class="resume-text-toggle">
            <summary>TEXT PREVIEW (mobile-friendly / ATS)</summary>
            <div class="resume-fallback">${fallback}</div>
        </details>
    `, {
        mount(root) {
            const onPrint = () => {
                const frame = document.createElement('iframe');
                frame.src = PROFILE.resume;
                frame.setAttribute('aria-hidden', 'true');
                frame.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;border:0;';
                document.body.appendChild(frame);
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    try { frame.remove(); } catch (error) { /* ignore */ }
                };
                frame.addEventListener('load', () => {
                    try {
                        frame.contentWindow.focus();
                        frame.contentWindow.print();
                    } catch (error) {
                        if (ctx && typeof ctx.toast === 'function') ctx.toast('Printing is unavailable; use Download instead.');
                    }
                    setTimeout(finish, 1500);
                });
                setTimeout(finish, 8000);
            };
            const button = root.querySelector('.print-resume');
            if (button) button.addEventListener('click', onPrint);
            this._onPrint = onPrint;
        },
        cleanup(root) {
            if (this._onPrint) {
                const button = root.querySelector('.print-resume');
                if (button) button.removeEventListener('click', this._onPrint);
            }
        },
    });
}

/* ------------------------------ NOTEPAD ------------------------------ */
const DEFAULT_NOTE = `PRASAD'S NOTES
===============

STORY
From a little kid with big dreams to an engineer who loves solving problems, learning new things, and building cool stuff.

CAREER GOALS
Keep growing in quality engineering, auditing, and process improvement. Keep learning, keep asking questions, and keep turning ideas into real projects.

DEVELOPER JOURNEY
Exploring coding, AI, and software development outside work. Small experiments count. Every bug is a lesson.

REMINDER
Still learning. Still growing. Still dreaming.`;

function notepadView(ctx) {
    return makeView(`
        <h2 class="app-section-title">NOTEPAD</h2>
        <div class="notepad-toolbar">
            <button type="button" class="btn save-note">SAVE NOTE</button>
            <button type="button" class="btn reset-note">RESET</button>
        </div>
        <textarea class="notepad-area" spellcheck="false" aria-label="Personal notes">${escapeHtml(DEFAULT_NOTE)}</textarea>
        <div class="notepad-status">Saved locally in this browser</div>
    `, {
        mount(root) {
            const area = root.querySelector('.notepad-area');
            const status = root.querySelector('.notepad-status');
            try {
                const saved = localStorage.getItem('prasad-desktop-note');
                if (saved) area.value = saved;
            } catch (error) { /* storage unavailable */ }

            const onClick = (event) => {
                if (event.target.closest('.save-note')) {
                    try {
                        localStorage.setItem('prasad-desktop-note', area.value);
                        status.textContent = 'Saved ✓';
                        ctx.toast('Note saved in this browser.');
                    } catch (error) {
                        status.textContent = 'Storage unavailable';
                    }
                }
                if (event.target.closest('.reset-note')) {
                    area.value = DEFAULT_NOTE;
                    try { localStorage.removeItem('prasad-desktop-note'); } catch (error) { /* ignore */ }
                    status.textContent = 'Reset to original note';
                }
            };
            root.addEventListener('click', onClick);
            this._onClick = onClick;
        },
        cleanup(root) {
            if (this._onClick) root.removeEventListener('click', this._onClick);
        },
    });
}

/* ---------------------------- RECYCLE BIN ---------------------------- */
function recycleView(ctx) {
    return makeView(`
        <div class="empty-state">
            <div class="big-icon">♲</div>
            <h2>RECYCLE BIN</h2>
            <div class="joke-box">Nothing deleted. Just old bugs and bad code 😂</div>
            <p>Deleted items: <strong>0</strong><br />Lessons learned from old bugs: <strong>too many to count</strong></p>
            <p style="color:#666">Tip: real files are safe. Probably.</p>
        </div>
    `, {
        mount(root) {
            let clicks = 0;
            const onClick = (event) => {
                if (!event.target.closest('.big-icon')) return;
                clicks += 1;
                if (clicks >= 5) {
                    clicks = 0;
                    if (ctx && typeof ctx.playSound === 'function') ctx.playSound('easter');
                    if (ctx && typeof ctx.toast === 'function') ctx.toast('Easter egg: 404 motivation not found 😄');
                }
            };
            root.addEventListener('click', onClick);
            this._onClick = onClick;
        },
        cleanup(root) {
            if (this._onClick) root.removeEventListener('click', this._onClick);
        },
    });
}

/* ------------------------------ SEARCH ------------------------------ */
function searchView(ctx) {
    const resultHtml = (entry, index = 0, selected = false) => `
        <button type="button" class="result-item ${selected ? 'active' : ''}" data-index="${index}" data-app="${escapeHtml(entry.app)}" data-project="${escapeHtml(entry.projectId || '')}">
            <span class="result-glyph">▣</span>
            <span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.detail)}</small></span>
        </button>
    `;
    return makeView(`
        <h2 class="app-section-title">SEARCH</h2>
        <div class="search-box">
            <input class="search-input" type="search" placeholder="Search Prasad, QA, ISO, Games..." aria-label="Search desktop" />
            <button type="button" class="btn search-clear">CLEAR</button>
        </div>
        <p class="search-hint">Try: Prasad · QA Engineer · Experience · Rubber · ISO · IATF · Auditor · SPC · Python · AI · MOKA POS · Projects · GitHub · LinkedIn · Contact · Resume · Notepad · Recycle Bin · Skills · About · Games</p>
        <div class="result-list">${SEARCH_ENTRIES.map((entry, index) => resultHtml(entry, index, index === 0)).join('')}</div>
    `, {
        mount(root, win) {
            const input = root.querySelector('.search-input');
            const list = root.querySelector('.result-list');
            const empty = '<div class="no-results">No matching files found.</div>';
            let results = [...SEARCH_ENTRIES];
            let selectedIndex = 0;
            let lastBlipAt = 0;

            const paintSelection = () => {
                const items = [...list.querySelectorAll('.result-item')];
                items.forEach((item, index) => item.classList.toggle('active', index === selectedIndex));
                items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
            };
            const render = (query) => {
                const term = query.trim().toLowerCase();
                results = SEARCH_ENTRIES.filter((entry) => !term ||
                    (entry.term + ' ' + entry.title + ' ' + entry.detail).toLowerCase().includes(term));
                selectedIndex = 0;
                list.innerHTML = results.length
                    ? results.map((entry, index) => resultHtml(entry, index, index === 0)).join('')
                    : empty;
            };
            const openResult = (entry) => {
                if (!entry) return;
                if (entry.projectId) {
                    const project = PROJECTS.find((item) => item.id === entry.projectId);
                    if (project) ctx.openWindow('project', { project });
                    else ctx.openWindow('projects');
                    return;
                }
                ctx.openWindow(entry.app);
            };
            const moveSelection = (delta) => {
                if (!results.length) return;
                selectedIndex = (selectedIndex + delta + results.length) % results.length;
                paintSelection();
            };
            const onInput = () => {
                render(input.value);
                const now = Date.now();
                if (input.value.trim() && now - lastBlipAt > 240) {
                    if (ctx && typeof ctx.playSound === 'function') ctx.playSound('search');
                    lastBlipAt = now;
                }
            };
            const onClick = (event) => {
                if (event.target.closest('.search-clear')) {
                    input.value = '';
                    render('');
                    return;
                }
                const result = event.target.closest('[data-index]');
                if (!result) return;
                selectedIndex = Number(result.dataset.index);
                openResult(results[selectedIndex]);
            };
            const onKeydown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    ctx.closeWindow(win);
                    return;
                }
                // Preserve native activation for focused CLEAR/result buttons.
                if (event.target !== input) return;
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    event.stopPropagation();
                    moveSelection(event.key === 'ArrowDown' ? 1 : -1);
                    return;
                }
                if (event.key === 'Enter') {
                    event.preventDefault();
                    event.stopPropagation();
                    openResult(results[selectedIndex]);
                }
            };

            input.addEventListener('input', onInput);
            root.addEventListener('click', onClick);
            root.addEventListener('keydown', onKeydown);
            this._handlers = { input, onInput, onClick, onKeydown };
            input.focus();
        },
        cleanup(root) {
            if (this._handlers) {
                this._handlers.input.removeEventListener('input', this._handlers.onInput);
                root.removeEventListener('click', this._handlers.onClick);
                root.removeEventListener('keydown', this._handlers.onKeydown);
            }
        },
    });
}

/* ------------------------------- GAMES ------------------------------- */
const GAMES = [
    { id: 'snake', label: 'SNAKE' },
    { id: 'minesweeper', label: 'MINESWEEPER' },
    { id: 'tictactoe', label: 'TIC-TAC-TOE' },
    { id: 'memory', label: 'MEMORY' },
];

function gamesView(ctx) {
    let scores = loadHiScores();
    const panelHtml = () => `
        <div class="hi-score-panel">
            <span class="hi-score-chip">SNAKE <strong>${scores.snake}</strong></span>
            <span class="hi-score-chip">MINES <strong>${scores.minesweeper}</strong></span>
            <span class="hi-score-chip">MEMORY <strong>${scores.memory === null ? '—' : scores.memory + ' MOVES'}</strong></span>
            <button type="button" class="btn reset-hiscores">RESET HI-SCORES</button>
        </div>
    `;

    return makeView(`
        <h2 class="app-section-title">GAMES FOLDER</h2>
        <p class="app-subtitle">Four playable retro games — no installs, no downloads</p>
        <div class="app-subtitle">HI-SCORE PANEL — saved in this browser</div>
        <div class="hi-score-values">${panelHtml()}</div>
        <div class="game-tabs" role="tablist">
            ${GAMES.map((game, index) => `<button type="button" class="btn game-tab ${index === 0 ? 'primary' : ''}" data-game="${game.id}">${game.label}</button>`).join('')}
        </div>
        <div class="game-stage"></div>
    `, {
        mount(root, win) {
            const stage = root.querySelector('.game-stage');
            const values = root.querySelector('.hi-score-values');
            const refresh = () => { values.innerHTML = panelHtml(); };
            const onScore = (game, value) => {
                scores = recordHiScore(game, value, ctx);
                refresh();
            };
            let cleanupGame = null;
            let current = 'snake';

            const activate = (id) => {
                if (cleanupGame) { cleanupGame(); cleanupGame = null; }
                current = id;
                root.querySelectorAll('.game-tab').forEach((tab) => {
                    tab.classList.toggle('primary', tab.dataset.game === id);
                });
                if (id === 'snake') cleanupGame = mountSnake(stage, win, ctx, onScore);
                if (id === 'minesweeper') cleanupGame = mountMinesweeper(stage, ctx, onScore);
                if (id === 'tictactoe') cleanupGame = mountTicTacToe(stage, ctx);
                if (id === 'memory') cleanupGame = mountMemory(stage, ctx, onScore);
            };
            const onClick = (event) => {
                if (event.target.closest('.reset-hiscores')) {
                    if (!window.confirm('Reset all high scores?')) return;
                    const cleared = resetHiScores(ctx);
                    if (!cleared) return;
                    scores = cleared;
                    refresh();
                    if (ctx && typeof ctx.toast === 'function') ctx.toast('High scores reset.');
                    return;
                }
                const tab = event.target.closest('[data-game]');
                if (tab) activate(tab.dataset.game);
            };
            root.addEventListener('click', onClick);
            activate(current);

            this._handlers = { onClick, stop: () => {
                root.removeEventListener('click', onClick);
                if (cleanupGame) cleanupGame();
            } };
        },
        cleanup(root) {
            if (this._handlers) this._handlers.stop();
        },
    });
}

function gameFrame(title, body, help) {
    return `
        <div class="game-heading"><span>▶ ${title}</span><span class="game-score"></span></div>
        <div class="game-message"></div>
        ${body}
        <p class="game-help">${help}</p>
    `;
}

function mountSnake(stage, win, ctx, onScore) {
    const CELL = 16;
    const COLS = 20;
    const ROWS = 14;
    const TARGET = 40;
    stage.innerHTML = gameFrame(
        'SNAKE.EXE',
        `<canvas class="game-canvas" width="${COLS * CELL}" height="${ROWS * CELL}"></canvas>
         <div class="btn-row" style="justify-content:center">
            <button type="button" class="btn restart-snake">RESTART</button>
            <button type="button" class="btn dpad" data-dir="up">▲</button>
            <button type="button" class="btn dpad" data-dir="left">◀</button>
            <button type="button" class="btn dpad" data-dir="down">▼</button>
            <button type="button" class="btn dpad" data-dir="right">▶</button>
         </div>`,
        'Arrow keys / WASD to steer • or tap the arrow buttons'
    );
    const canvas = stage.querySelector('canvas');
    const ctx2d = canvas.getContext('2d');
    const scoreEl = stage.querySelector('.game-score');
    const messageEl = stage.querySelector('.game-message');
    let snake, dir, nextDir, food, score, timer, over;

    const placeFood = () => {
        let spot;
        do {
            spot = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        } while (snake.some((part) => part.x === spot.x && part.y === spot.y));
        return spot;
    };
    const setDirection = (x, y) => {
        if (over) return;
        if (dir.x + x === 0 && dir.y + y === 0) return;
        nextDir = { x, y };
    };
    const draw = () => {
        ctx2d.fillStyle = '#06120d';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        ctx2d.strokeStyle = 'rgba(80, 160, 110, 0.12)';
        ctx2d.lineWidth = 1;
        for (let x = 0; x <= COLS; x++) {
            ctx2d.beginPath(); ctx2d.moveTo(x * CELL, 0); ctx2d.lineTo(x * CELL, canvas.height); ctx2d.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx2d.beginPath(); ctx2d.moveTo(0, y * CELL); ctx2d.lineTo(canvas.width, y * CELL); ctx2d.stroke();
        }
        ctx2d.fillStyle = '#ff5b6e';
        ctx2d.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
        snake.forEach((part, index) => {
            ctx2d.fillStyle = index === 0 ? '#b6ffce' : '#28b873';
            ctx2d.fillRect(part.x * CELL + 1, part.y * CELL + 1, CELL - 2, CELL - 2);
            ctx2d.strokeStyle = '#0b5d3a';
            ctx2d.strokeRect(part.x * CELL + 1, part.y * CELL + 1, CELL - 2, CELL - 2);
        });
    };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const step = () => {
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
        const hitSelf = snake.slice(0, -1).some((part) => part.x === head.x && part.y === head.y);
        if (hitWall || hitSelf) {
            stop(); over = true;
            if (onScore) onScore('snake', score);
            messageEl.className = 'game-message lose';
            messageEl.textContent = 'GAME OVER! Score: ' + score;
            return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score += 1;
            if (onScore) onScore('snake', score);
            scoreEl.textContent = 'SCORE: ' + score + ' / ' + TARGET;
            if (score >= TARGET) {
                stop(); over = true;
                if (ctx && typeof ctx.playSound === 'function') ctx.playSound('victory');
                messageEl.className = 'game-message win';
                messageEl.textContent = 'YOU WIN! Perfect run 🎉';
                draw();
                return;
            }
            food = placeFood();
        } else {
            snake.pop();
        }
        draw();
    };
    const start = () => {
        stop();
        snake = [{ x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }];
        dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
        score = 0; over = false; food = placeFood();
        scoreEl.textContent = 'SCORE: 0 / ' + TARGET;
        messageEl.className = 'game-message';
        messageEl.textContent = '';
        draw();
        timer = setInterval(step, 130);
    };
    const keydown = (event) => {
        if (win && !win.active) return;
        if (ctx && typeof ctx.isGameInputBlocked === 'function' && ctx.isGameInputBlocked(event)) return;
        const key = event.key.toLowerCase();
        const map = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
        if (!map[key]) return;
        event.preventDefault();
        setDirection(map[key][0], map[key][1]);
    };
    const click = (event) => {
        if (event.target.closest('.restart-snake')) { start(); return; }
        const dpad = event.target.closest('[data-dir]');
        if (dpad) {
            const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
            setDirection(dirs[dpad.dataset.dir][0], dirs[dpad.dataset.dir][1]);
        }
    };
    document.addEventListener('keydown', keydown);
    stage.addEventListener('click', click);
    start();
    return () => {
        stop();
        document.removeEventListener('keydown', keydown);
        stage.removeEventListener('click', click);
    };
}

function mountMinesweeper(stage, ctx, onScore) {
    const SIZE = 9;
    const MINES = 10;
    stage.innerHTML = gameFrame(
        'MINESWEEPER.EXE',
        `<div class="mine-grid"></div>
         <div class="btn-row" style="justify-content:center"><button type="button" class="btn restart-mines">RESTART</button></div>`,
        'Left-click to reveal • Right-click to place a flag'
    );
    const grid = stage.querySelector('.mine-grid');
    const scoreEl = stage.querySelector('.game-score');
    const messageEl = stage.querySelector('.game-message');
    let board, started, revealedCount, flags, over;

    const indexOf = (x, y) => y * SIZE + x;
    const neighbors = (index) => {
        const x = index % SIZE;
        const y = Math.floor(index / SIZE);
        const result = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = x + dx; const ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) result.push(indexOf(nx, ny));
            }
        }
        return result;
    };
    const newBoard = () => Array.from({ length: SIZE * SIZE }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }));
    const plantMines = (safeIndex) => {
        const excluded = new Set([safeIndex, ...neighbors(safeIndex)]);
        let placed = 0;
        while (placed < MINES) {
            const index = Math.floor(Math.random() * board.length);
            if (excluded.has(index) || board[index].mine) continue;
            board[index].mine = true;
            placed += 1;
        }
        board.forEach((cell, index) => {
            if (!cell.mine) cell.adjacent = neighbors(index).filter((n) => board[n].mine).length;
        });
    };
    const updateScore = () => {
        scoreEl.textContent = 'CLEARED: ' + revealedCount + ' / ' + (board.length - MINES) + '  •  FLAGS: ' + flags + ' / ' + MINES;
    };
    const render = () => {
        grid.innerHTML = board.map((cell, index) => {
            const classes = ['mine-cell'];
            if (cell.revealed) classes.push('revealed');
            if (cell.flagged) classes.push('flag');
            if (cell.mine && cell.revealed) classes.push('mine');
            if (cell.adjacent && cell.revealed) classes.push('n' + cell.adjacent);
            const text = cell.flagged ? '⚑' : (cell.revealed ? (cell.mine ? '●' : (cell.adjacent || '')) : '');
            return `<button type="button" class="${classes.join(' ')}" data-index="${index}" aria-label="Cell ${index + 1}">${text}</button>`;
        }).join('');
    };
    const reveal = (index) => {
        if (over) return;
        const cell = board[index];
        if (cell.revealed || cell.flagged) return;
        if (!started) { plantMines(index); started = true; }
        if (cell.mine) {
            over = true;
            if (onScore) onScore('minesweeper', revealedCount);
            board.forEach((item) => { if (item.mine) item.revealed = true; });
            messageEl.className = 'game-message lose';
            messageEl.textContent = 'BOOM! GAME OVER';
            render();
            return;
        }
        const queue = [index];
        while (queue.length) {
            const current = queue.pop();
            const target = board[current];
            if (target.revealed || target.flagged) continue;
            target.revealed = true;
            revealedCount += 1;
            if (target.adjacent === 0) neighbors(current).forEach((n) => { if (!board[n].revealed && !board[n].mine) queue.push(n); });
        }
        if (onScore) onScore('minesweeper', revealedCount);
        if (revealedCount === board.length - MINES) {
            over = true;
            if (ctx && typeof ctx.playSound === 'function') ctx.playSound('victory');
            messageEl.className = 'game-message win';
            messageEl.textContent = 'YOU WIN! Field cleared 🎉';
        }
        updateScore();
        render();
    };
    const start = () => {
        board = newBoard(); started = false; revealedCount = 0; flags = 0; over = false;
        messageEl.className = 'game-message'; messageEl.textContent = '';
        updateScore(); render();
    };
    const onClick = (event) => {
        const cell = event.target.closest('[data-index]');
        if (cell) reveal(Number(cell.dataset.index));
        if (event.target.closest('.restart-mines')) start();
    };
    const onContext = (event) => {
        const cell = event.target.closest('[data-index]');
        if (!cell || over) return;
        event.preventDefault();
        const target = board[Number(cell.dataset.index)];
        if (target.revealed) return;
        if (!target.flagged && flags >= MINES) return;
        target.flagged = !target.flagged;
        flags += target.flagged ? 1 : -1;
        updateScore(); render();
    };
    grid.addEventListener('click', onClick);
    grid.addEventListener('contextmenu', onContext);
    stage.querySelector('.restart-mines').addEventListener('click', start);
    start();
    return () => {
        grid.removeEventListener('click', onClick);
        grid.removeEventListener('contextmenu', onContext);
    };
}

function mountTicTacToe(stage, ctx) {
    const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    stage.innerHTML = gameFrame(
        'TIC-TAC-TOE.EXE',
        `<div class="ttt-grid"></div>
         <div class="btn-row" style="justify-content:center">
            <button type="button" class="btn restart-ttt">NEW ROUND</button>
            <button type="button" class="btn reset-score">RESET SCORE</button>
         </div>`,
        'You are X • click a square to play'
    );
    const grid = stage.querySelector('.ttt-grid');
    const scoreEl = stage.querySelector('.game-score');
    const messageEl = stage.querySelector('.game-message');
    let board, turn, over, computerTimer = null, scores = { X: 0, O: 0, D: 0 };

    const cancelComputerMove = () => {
        if (computerTimer !== null) {
            clearTimeout(computerTimer);
            computerTimer = null;
        }
    };
    const winner = (side) => LINES.some((line) => line.every((i) => board[i] === side));
    const isDraw = () => board.every(Boolean);
    const updateScore = () => {
        scoreEl.textContent = 'YOU ' + scores.X + '  •  COMPUTER ' + scores.O + '  •  DRAW ' + scores.D;
    };
    const render = () => {
        grid.innerHTML = board.map((value, index) => `<button type="button" class="ttt-cell ${value ? value.toLowerCase() : ''}" data-index="${index}">${value || ''}</button>`).join('');
    };
    const finish = (result) => {
        over = true;
        if (result === 'X' && ctx && typeof ctx.playSound === 'function') ctx.playSound('victory');
        messageEl.className = 'game-message ' + (result === 'X' ? 'win' : result === 'O' ? 'lose' : 'win');
        messageEl.textContent = result === 'X' ? 'YOU WIN! 🎉' : result === 'O' ? 'COMPUTER WINS!' : "IT'S A DRAW!";
        scores[result] += 1;
        updateScore();
    };
    const computerMove = () => {
        const empties = board.map((v, i) => v ? -1 : i).filter((i) => i >= 0);
        if (!empties.length) return;
        let move = null;
        for (const side of ['O', 'X']) {
            for (const index of empties) {
                board[index] = side;
                if (winner(side)) { move = index; break; }
                board[index] = '';
            }
            if (move !== null) break;
        }
        if (move === null && board[4] === '') move = 4;
        if (move === null) move = empties[Math.floor(Math.random() * empties.length)];
        board[move] = 'O';
        render();
        if (winner('O')) finish('O');
        else if (isDraw()) finish('D');
        else turn = 'X';
    };
    const play = (index) => {
        if (over || board[index] || turn !== 'X') return;
        board[index] = 'X';
        render();
        if (winner('X')) { finish('X'); return; }
        if (isDraw()) { finish('D'); return; }
        turn = 'O';
        computerTimer = setTimeout(() => {
            computerTimer = null;
            computerMove();
        }, 260);
    };
    const start = () => {
        cancelComputerMove();
        board = Array(9).fill(''); turn = 'X'; over = false;
        messageEl.className = 'game-message'; messageEl.textContent = '';
        render();
    };
    const onClick = (event) => {
        const cell = event.target.closest('[data-index]');
        if (cell) play(Number(cell.dataset.index));
        if (event.target.closest('.restart-ttt')) start();
        if (event.target.closest('.reset-score')) { scores = { X: 0, O: 0, D: 0 }; updateScore(); }
    };
    grid.addEventListener('click', onClick);
    stage.querySelector('.btn-row').addEventListener('click', onClick);
    updateScore(); start();
    return () => {
        cancelComputerMove();
        grid.removeEventListener('click', onClick);
        stage.querySelector('.btn-row')?.removeEventListener('click', onClick);
    };
}

function mountMemory(stage, ctx, onScore) {
    const SYMBOLS = ['A','B','C','D','E','F','G','H'];
    stage.innerHTML = gameFrame(
        'MEMORY MATCHING.EXE',
        `<div class="memory-grid"></div>
         <div class="btn-row" style="justify-content:center"><button type="button" class="btn restart-memory">RESTART</button></div>`,
        'Flip two cards to find a match • lower moves win'
    );
    const grid = stage.querySelector('.memory-grid');
    const scoreEl = stage.querySelector('.game-score');
    const messageEl = stage.querySelector('.game-message');
    let deck, flipped, matched, moves, lock, flipBackTimer;

    const shuffle = (items) => {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const updateScore = () => { scoreEl.textContent = 'MOVES: ' + moves + '  •  MATCHED: ' + (matched.size / 2) + ' / 8'; };
    const render = () => {
        grid.innerHTML = deck.map((symbol, index) => {
            const visible = flipped.includes(index) || matched.has(index);
            const classes = ['memory-cell', visible ? 'flipped' : '', matched.has(index) ? 'matched' : ''].join(' ');
            return `<button type="button" class="${classes}" data-index="${index}" aria-label="Card ${index + 1}">${visible ? symbol : '?'}</button>`;
        }).join('');
    };
    const flip = (index) => {
        if (lock || flipped.includes(index) || matched.has(index)) return;
        flipped.push(index);
        render();
        if (flipped.length === 2) {
            moves += 1;
            const [a, b] = flipped;
            if (deck[a] === deck[b]) {
                matched.add(a); matched.add(b); flipped = [];
                messageEl.className = 'game-message win';
                messageEl.textContent = 'MATCH!';
                render();
                if (matched.size === deck.length) {
                    if (onScore) onScore('memory', moves);
                    if (ctx && typeof ctx.playSound === 'function') ctx.playSound('victory');
                    messageEl.textContent = 'YOU WIN! All cards matched in ' + moves + ' moves 🎉';
                }
            } else {
                lock = true;
                messageEl.className = 'game-message';
                messageEl.textContent = 'Not a match...';
                flipBackTimer = setTimeout(() => { flipped = []; lock = false; render(); }, 650);
            }
            updateScore();
        }
    };
    const start = () => {
        if (flipBackTimer) clearTimeout(flipBackTimer);
        deck = shuffle([...SYMBOLS, ...SYMBOLS]);
        flipped = []; matched = new Set(); moves = 0; lock = false;
        messageEl.className = 'game-message'; messageEl.textContent = '';
        updateScore(); render();
    };
    const onClick = (event) => {
        const cell = event.target.closest('[data-index]');
        if (cell) flip(Number(cell.dataset.index));
        if (event.target.closest('.restart-memory')) start();
    };
    grid.addEventListener('click', onClick);
    stage.querySelector('.restart-memory').addEventListener('click', start);
    start();
    return () => {
        if (flipBackTimer) clearTimeout(flipBackTimer);
        grid.removeEventListener('click', onClick);
    };
}

/* ----------------------------- VIEW MAP ----------------------------- */
export function getView(appId, options, ctx) {
    switch (appId) {
        case 'computer': return computerView();
        case 'experience': return experienceView(ctx);
        case 'job': return jobView(options);
        case 'skills': return skillsView();
        case 'projects': return projectsView(ctx);
        case 'project': return projectView(options);
        case 'internet': return internetView();
        case 'email': return emailView();
        case 'resume': return resumeView(ctx);
        case 'notepad': return notepadView(ctx);
        case 'recycle': return recycleView(ctx);
        case 'search': return searchView(ctx);
        case 'games': return gamesView(ctx);
        case 'wallpaper': return wallpaperStudioView();
        default: return makeView('<h2 class="app-section-title">FILE NOT FOUND</h2><p>That application does not exist.</p>');
    }
}

export { loadHiScores, recordHiScore, resetHiScores };
