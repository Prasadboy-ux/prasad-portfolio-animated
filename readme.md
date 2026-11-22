# Prakash Prasad — Interactive 3D & Retro Desktop Portfolio

An interactive portfolio that opens with a retro **BIOS boot sequence**, drops you into a **3D desk scene** built with Three.js, and lets you click the monitor to enter **PRASAD DESKTOP** — a Windows 95/98-inspired desktop with draggable windows, a taskbar, a Start menu, apps, games, and a pixel dog companion.

It is a personal portfolio for **Prakash Prasad**, a Quality Assurance Engineer, designed to present his professional journey, skills, projects, and resume in a way that is memorable, playful, and technically meaningful.

---

## 🎯 Purpose — Why I Built This

I built this project for three reasons:

1. **A portfolio that proves the work, not just lists it.** Instead of a static résumé page, visitors explore a working desktop environment. Every app, window interaction, game, and responsive layout is a small demonstration of front-end development, usability thinking, testing discipline, and attention to detail — the same qualities I bring to QA engineering.

2. **A bridge between my two worlds.** My career is in **Quality Assurance Engineering** (ISO/IATF standards, auditing, RCA/8D/CAPA, manufacturing quality). Outside of work I've been learning **software development, automation, and AI**. This project lets me bring both sides together: the profile, experience, skills, and CV are real QA content, while the code behind them is my software-development practice.

3. **A playground to learn by building.** The retro desktop gave me a fun reason to practise 3D graphics (Three.js), component UI (React + TypeScript), animation (GSAP, Framer Motion), bundling (Webpack), and back-end basics (Node/Express + a working contact form). It doubles as a live test bed for accessibility, performance, responsiveness, and regression testing.

The guiding idea: *"Little me dreamed. Today's me is building."* The whole experience — boot screen, 3D desk, and pixel desktop — is built around that story.

---

## ✨ Features

- **3D Environment** — Interactive desk scene powered by Three.js.
- **Retro BIOS Boot Screen** — A nostalgic computer startup experience.
- **PRASAD DESKTOP** — Windows 95/98-inspired desktop environment.
- **Window Manager** — Draggable, resizable windows with multitasking support.
- **Start Menu & Taskbar** — Classic desktop navigation.
- **12 Interactive Applications** — About me, experience, skills, projects, links, email, resume preview, notepad, games, wallpaper studio, search, and recycle bin.
- **Global Search** — Search portfolio content and applications.
- **Command Palette** — Quick navigation using `Ctrl + K` or `Cmd + K`.
- **4 Playable Games** — Snake, Minesweeper, Tic-Tac-Toe, and Memory.
- **Pixel Personalization** — Wallpaper studio, pixel creator, CRT effects, and a **Cute Dog Paint** companion you can draw and set as wallpaper.
- **Interactive Resume** — Preview the CV and download the ATS-friendly PDF.
- **Contact Form** — Working Gmail SMTP endpoint (`/api/send-email`).
- **Retro Effects** — Optional CRT display effects and desktop audio.
- **Responsive & Accessible** — Adapted for desktop and mobile, with keyboard support, focus management, and reduced-motion support.
- **SEO Ready** — Metadata, Open Graph/Twitter tags, and semantic markup.

---

## 👨‍💻 About This Project

PRASAD DESKTOP is my personal portfolio project, built to reflect my professional journey, QA engineering experience, personal projects, and growing interest in software development.

My development work includes portfolio content, UI enhancements, application development, interactive features, debugging, testing, and AI-assisted coding.

### Development

**Prakash Prasad**

- Portfolio content, personal branding, and professional profile
- QA Engineering experience, projects, and resume integration
- Desktop UI customization and interactive features
- Applications, mini-games, and desktop functionality
- Responsive design and usability improvements
- Testing, debugging, and quality verification
- AI-assisted development, with project direction, implementation review, and customization

---

## 🛠️ Tools & Technologies

### Stack overview

| Technology | Version | Why I used it |
|---|---|---|
| React | 17.0.2 | Component-based UI for the landing experience |
| TypeScript | 4.6.2 | Type-safe application code |
| Three.js | 0.137.5 | 3D desk scene and interactive objects |
| Webpack | 5.68 | Dev server, bundling, and production builds |
| Babel | 7.16 | Transpiling modern JavaScript/JSX |
| GSAP | 3.9.1 | Scene and UI animation timelines |
| Framer Motion | 6.3.1 | React component animation |
| Tween.js | 18.6.4 | Smooth value interpolation in the 3D scene |
| camera-controls | 1.34.2 | Orbit and camera interaction in Three.js |
| glslify | 7.1.1 | GLSL shader imports for custom graphics |
| Express | 4.17.3 | Back-end server and contact form API |
| Nodemailer | 6.7.3 | Sending email through Gmail SMTP |
| Vanilla JavaScript (ES modules) | — | The `/os` desktop shell, apps, and games |
| HTML5 & CSS3 | — | UI structure, retro styling, responsive layout |
| Node.js | — | Runtime for the dev server and back end |
| Git & GitHub | — | Version control and project hosting |

### How the pieces fit together

- **Front-end UI:** React + TypeScript render the boot/intro experience, bundled by Webpack with Babel loaders.
- **3D layer:** Three.js drives the desk scene, supported by `camera-controls`, `@tweenjs/tween.js`, `glslify` shaders, `stats.js`, and `lil-gui`.
- **Animation:** GSAP handles scene/UI timelines; Framer Motion handles React component transitions; `bezier-easing` fine-tunes motion curves.
- **The desktop OS (`static/os`):** Built with plain ES-module JavaScript and CSS — a window manager, Start menu, taskbar, global search, command palette, 12 apps, 4 games, and personalization. This is the **source of truth** for the desktop experience.
- **Back end:** Express + Nodemailer power the contact form; `body-parser`, `cors`, and `compression` support the API.
- **Build tooling:** Webpack 5 with `ts-loader`, `babel-loader`, HTML/CSS loaders, `mini-css-extract-plugin`, `clean-webpack-plugin`, and `copy-webpack-plugin`. `public/` is a generated build output and is gitignored.

### Verification & quality tools

- **Playwright** — Browser automation and UI regression checks.
- **Chrome DevTools** — Interaction, layout, and console debugging.
- **Lighthouse** — Performance, accessibility, best-practices, and SEO audits (scored 100/100/100/100 on the main pages in Chromium).
- **Python (PIL)** — Image comparisons for visual verification.

> Browser verification was performed in Chromium only; Firefox and WebKit were not tested.

---

## 📂 Project Structure

```text
prasad-portfolio-animated/
├── bundler/                 # Webpack dev + production configs
├── server/                  # Express server and contact API
├── src/
│   ├── Application/         # React/TypeScript 3D experience + UI components
│   └── index.html           # Landing page (metadata, Open Graph, Twitter tags)
├── static/
│   ├── os/                  # PRASAD DESKTOP (source of truth)
│   │   ├── index.html
│   │   ├── main.js          # Desktop shell, windows, menus, taskbar
│   │   ├── apps.js          # Apps, games, and resume content
│   │   ├── data.js          # Profile, experience, skills, projects, search
│   │   ├── personalization.js
│   │   ├── wallpaper-studio.js
│   │   ├── dog-companion.js
│   │   └── style.css        # Retro 95/98 visual system
│   ├── audio/
│   ├── images/
│   └── Prakash_Prasad_QA_Engineer_CV.pdf
├── public/                  # Generated by `npm run build` (gitignored)
├── .env.example
├── LICENSE.md
├── package.json
└── readme.md
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js
- npm

### Installation

```bash
git clone https://github.com/Prasadboy-ux/prasad-portfolio-animated.git
cd prasad-portfolio-animated
npm install
```

### Run the development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

The production build is generated in `public/`.

### Start the production server

```bash
npm start
```

The server runs at:

```text
http://localhost:8080
```

---

## 📧 Contact Form Configuration

The contact form uses Gmail SMTP through the back-end `/api/send-email` endpoint.

Create your environment file:

```bash
cp .env.example .env
```

Configure the following variables:

```env
FOLIO_EMAIL=your-account@gmail.com
FOLIO_PASSWORD=your-gmail-app-password
```

Use a Gmail **App Password** instead of your regular Gmail password.

> **Never commit your `.env` file or expose credentials publicly.**

---

## 🎨 Customization

| File / Directory | Description |
|---|---|
| `static/os/data.js` | Profile, experience, skills, projects, search entries, commands, and resume content |
| `static/os/main.js` | Desktop shell, window manager, menus, and interactions |
| `static/os/apps.js` | Applications and mini-games |
| `static/os/personalization.js` | Wallpaper, dog companion, and CRT settings |
| `static/os/wallpaper-studio.js` | Wallpaper studio and Cute Dog Paint |
| `static/os/style.css` | Desktop styling and responsive layout |
| `src/Application/` | 3D scene and React UI components |
| `static/images/` | Profile photos, icons, favicons, and preview images |
| `static/Prakash_Prasad_QA_Engineer_CV.pdf` | Professional resume |

Edit the `static/os` files directly — `public/` is generated from them and should not be edited by hand. Project links are included only when a verified public URL is available.

---

## 🌐 Deployment

Repository:

[Prasadboy-ux/prasad-portfolio-animated](https://github.com/Prasadboy-ux/prasad-portfolio-animated)

The Open Graph and Twitter preview images currently use the GitHub Pages URL configured in `src/index.html`. If deploying to another hosting provider or custom domain, update those metadata URLs accordingly.

---

## 📜 License & Credits

This project is licensed under the MIT License. Portfolio content, development, customizations, and extensions are credited to **Prakash Prasad**.

See [`LICENSE.md`](LICENSE.md) for the complete license.

---

<p align="center">
  <b>PRASAD DESKTOP</b><br>
  <i>Little me dreamed. Today's me is building.</i>
</p>
