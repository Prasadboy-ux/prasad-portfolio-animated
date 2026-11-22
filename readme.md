# Prakash Prasad - 3D Portfolio

An interactive 3D portfolio built with Three.js, React and webpack. A retro BIOS
boot screen leads into a 3D desk scene; clicking the monitor opens **PRASAD
DESKTOP**, a playable Windows 95/98-style desktop with draggable windows, a
taskbar, Start menu, working apps, global search, a Ctrl/Cmd+K command palette,
and four playable games.

## Credits & Attribution

PRASAD DESKTOP is a customized and extended portfolio project inspired by and built upon the original animated desktop portfolio by Henry Heffernan.

### Original MIT-licensed foundation

- **Original project:** Henry Heffernan — [portfolio-website](https://github.com/henryjeff/portfolio-website)
- **Original license:** MIT License — `Copyright (c) 2024 Henry Heffernan`

### PRASAD DESKTOP customization and development

- **Customization and development:** Prakash Prasad
- **QA engineering portfolio content, resume, applications, features, testing, and customization:** Prakash Prasad
- **Development:** AI-assisted coding and debugging, with project direction, testing, review, and customization by Prakash Prasad

The original project credits and MIT license are preserved in [`LICENSE.md`](LICENSE.md). PRASAD DESKTOP represents my customized portfolio and development work built on top of that foundation.

## Make it yours

- **Name, title, email and social links:** `src/Application/UI/profile.ts`
- **Desktop shell / windows / menus / games:** `static/os/main.js`, `static/os/apps.js`, `static/os/style.css`
- **Desktop content, projects, search terms and commands:** `static/os/data.js`
- **Resume PDF:** `static/Prakash_Prasad_QA_Engineer_CV.pdf` (ATS-compatible CV; replace with an updated PDF using the same filename)
- **Header photo, favicons and social preview:** `static/images/`
- **Contact form credentials:** copy `.env.example` to `.env` and fill in your own values (never commit `.env`)

Project links in `static/os/data.js` are intentionally left empty unless a real
public URL exists. Only MOKA POS has a verified repository link.

## Run locally

```bash
# Install dependencies
npm i

# Dev server (auto-opens the browser)
npm run dev
```

## Serve a production build

```bash
npm run build   # outputs to public/
npm start       # express server on http://localhost:8080
```

## Contact form

The `/api/send-email` endpoint uses Gmail SMTP. Copy `.env.example` to `.env`
and set these values, or configure them as environment variables in your host:

```bash
FOLIO_EMAIL=your-account@gmail.com
FOLIO_PASSWORD=your-gmail-app-password
```

Use a Gmail **app password**, not your normal account password. The server logs
a warning at startup if either variable is missing.

## Deployment

Repo: `https://github.com/Prasadboy-ux/prasad-portfolio-animated.git`

The Open Graph / Twitter image URLs in `src/index.html` are absolute and point at
`https://prasadboy-ux.github.io/prasad-portfolio-animated/images/preview.jpg`.
If you deploy to a custom domain, update those URLs to match.
