# Prakash Prasad — 3D Portfolio

An interactive 3D portfolio built with **Three.js, React, and Webpack**.

The experience begins with a retro BIOS boot sequence and transitions into a 3D desk environment. Clicking the monitor launches **PRASAD DESKTOP** — a Windows 95/98-inspired interactive desktop featuring draggable and resizable windows, a taskbar, Start menu, applications, global search, a command palette, and playable mini-games.

This portfolio combines my professional background in **Quality Assurance Engineering** with my interests in software development, automation, digital tools, and technology.

---

## 🚀 Features

- **3D Environment** — Interactive desk scene powered by Three.js.
- **Retro BIOS Boot Screen** — A nostalgic computer startup experience.
- **PRASAD DESKTOP** — Windows 95/98-inspired desktop environment.
- **Window Manager** — Draggable, resizable windows with multitasking support.
- **Start Menu & Taskbar** — Classic desktop navigation.
- **Interactive Applications** — Explore my profile, experience, skills, projects, resume, and contact information.
- **Global Search** — Search portfolio content and applications.
- **Command Palette** — Quick navigation using `Ctrl + K` or `Cmd + K`.
- **Playable Games** — Snake, Minesweeper, Tic-Tac-Toe, and Memory.
- **Retro Effects** — Optional CRT display effects and desktop audio.
- **Responsive Design** — Adapted for desktop and mobile devices.
- **Interactive Resume** — View and access my professional CV.

---

## 👨‍💻 About This Project

PRASAD DESKTOP is my personal portfolio project, customized and extended from an original MIT-licensed animated desktop portfolio.

I transformed the original foundation into a portfolio that reflects my professional journey, QA engineering experience, personal projects, and growing interest in software development.

My development work includes customization, UI enhancements, application development, interactive features, debugging, testing, and AI-assisted coding.

### Original Project Attribution

The project was originally inspired by and built upon the animated desktop portfolio created by **Henry Heffernan**.

- **Original project:** [portfolio-website](https://github.com/henryjeff/portfolio-website)
- **Original creator:** Henry Heffernan
- **Original license:** MIT License

The original attribution and license are preserved in [`LICENSE.md`](LICENSE.md).

### My Customization & Development

**Prakash Prasad**

- Portfolio content, personal branding, and professional profile
- QA Engineering experience, projects, and resume integration
- Desktop UI customization and interactive features
- Applications, mini-games, and desktop functionality
- Responsive design and usability improvements
- Testing, debugging, and quality verification
- AI-assisted development, with project direction, implementation review, and customization

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Three.js | 3D environment and interactive scene |
| React | UI components |
| Webpack | Bundling and development workflow |
| JavaScript | Desktop environment and interactions |
| HTML5 & CSS3 | UI, styling, responsive layout |
| Node.js & Express | Backend server and contact form API |
| Git & GitHub | Version control and project hosting |

---

## 📂 Project Structure

```text
prasad-portfolio-animated/
├── bundler/
├── server/
├── src/
│   └── Application/
│       └── UI/
│           └── profile.ts
├── static/
│   ├── os/
│   │   ├── main.js
│   │   ├── apps.js
│   │   ├── data.js
│   │   └── style.css
│   ├── audio/
│   ├── images/
│   └── Prakash_Prasad_QA_Engineer_CV.pdf
├── .env.example
├── LICENSE.md
├── package.json
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/Prasadboy-ux/prasad-portfolio-animated.git
```

Navigate to the project directory:

```bash
cd prasad-portfolio-animated
```

Install dependencies:

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

The production build will be generated in the `public/` directory.

### Start Production Server

```bash
npm start
```

The server runs at:

```text
http://localhost:8080
```

---

## 📧 Contact Form Configuration

The contact form uses Gmail SMTP through the backend `/api/send-email` endpoint.

Create your environment file:

```bash
cp .env.example .env
```

Configure the following variables:

```env
FOLIO_EMAIL=your-account@gmail.com
FOLIO_PASSWORD=your-gmail-app-password
```

Use a Gmail App Password instead of your regular Gmail password.

**Never commit your `.env` file or expose credentials publicly.**

---

## 🎨 Customization

| File / Directory | Description |
|---|---|
| `src/Application/UI/profile.ts` | Profile information, name, title, email, and social links |
| `static/os/main.js` | Desktop shell, window manager, menus, and interactions |
| `static/os/apps.js` | Applications and mini-games |
| `static/os/data.js` | Portfolio content, projects, search, and commands |
| `static/os/style.css` | Desktop styling and responsive layout |
| `static/images/` | Profile photos, icons, favicons, and preview images |
| `static/Prakash_Prasad_QA_Engineer_CV.pdf` | Professional resume |

Project links are included only when a verified public URL is available.

---

## 🌐 Deployment

Repository:

[Prasadboy-ux/prasad-portfolio-animated](https://github.com/Prasadboy-ux/prasad-portfolio-animated)

The Open Graph and Twitter preview images currently use the GitHub Pages URL configured in `src/index.html`.

If deploying to another hosting provider or custom domain, update the metadata URLs accordingly.

---

## 📜 License & Credits

This project retains the original **MIT License** and attribution for the original foundation.

The original work is credited to Henry Heffernan, while my customizations, portfolio content, development, and extensions are credited to **Prakash Prasad**.

See [`LICENSE.md`](LICENSE.md) for the complete license.

---

<p align="center">
  <b>PRASAD DESKTOP</b><br>
  <i>Little me dreamed. Today's me is building.</i>
</p>
