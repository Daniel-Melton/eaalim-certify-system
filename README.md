<<<<<<< HEAD
# eaalim-certify-system
certification system fro eaalim institute- developed by Ahmad Ismael
=======
# Elite Certify

Premium certificate design suite built with Next.js 14 (App Router), Fabric.js, and Tailwind CSS.
By Ahmad Ismael.

## Features

- **Splash screen** — red/white/orange gradient with lazy fade-out
- **Particle-web background** (~60 particles, canvas-connected)
- **Fabric.js canvas** with drag/resize/rotate on every element
- **5-step undo / redo** (Ctrl+Z / Ctrl+Shift+Z)
- **Double-click to edit text** inline
- **Context-aware horizontal ribbon** (font/size/color/align for text, fill/stroke for shapes)
- **Vertical ribbon** with 7 panels: Templates, Text, Shapes, Corners, Images, Data, Layers
- **4-corner decoration picker** with 6 built-in SVG decorations + custom SVG import
- **7 premium "Formal Excellence" templates**
- **20+ vector shapes** (seals, ribbons, badges, ornaments, symbols, frames)
- **Drag-and-drop layer panel** via `@dnd-kit`
- **CSV bulk generation** — one certificate per row, packaged as ZIP
- **Global branding settings** (app title + logo, persisted to localStorage)
- **Made by: Ahmad Ismael** signature in the footer

## Run Locally

You need Node.js 18 or newer.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open http://localhost:3000
```

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
elite-certify/
├── app/
│   ├── globals.css        # all styles, fonts, theme tokens
│   ├── layout.js          # root layout
│   └── page.js            # home — splash + studio
├── components/
│   ├── Layout.js                   # branding provider + particle bg
│   ├── ParticleBackground.js       # canvasparticles-js effect
│   ├── SplashScreen.js             # entry splash
│   ├── Studio.js                   # main workspace shell
│   ├── Canvas.js                   # Fabric.js wrapper (undo/redo, dbl-click edit)
│   ├── ContextualToolbar.js        # context-aware horizontal ribbon
│   ├── LayerPanel.js               # drag-and-drop layers
│   ├── CornerDecorationPanel.js    # 4-corner picker
│   ├── SettingsModal.js            # brand title + logo
│   └── ExportModal.js              # single + bulk CSV export
└── lib/
    ├── templates.js       # 7 premium templates
    ├── shapes.js          # 20+ shapes + 6 corner decorations
    ├── brandingContext.js # app title + logo state
    └── csvParser.js       # CSV parser
```

## Keyboard Shortcuts

- `Ctrl/Cmd + Z` — undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` — redo
- `Ctrl/Cmd + D` — duplicate selected element
- Double-click text — enter edit mode
>>>>>>> feca82d (Initial setup from create-next-app)
# eaalim-certify-system-2
