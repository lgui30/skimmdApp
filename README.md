# skimmd

A native macOS markdown reader and editor. Built with Tauri, React, and TipTap.

**10MB app. No Electron. No browser. Just double-click and go.**

---

## What is this?

skimmd is a lightweight desktop app for reading and editing markdown files. Think Notion-style editing, but for your local `.md` and `.txt` files.

Add multiple workspace folders, browse your files in a directory tree, open them in tabs, and edit with live rendering. Everything auto-saves.

---

## Features

### Multi-Workspace
Add multiple folders as workspaces. Each shows a collapsible directory tree — browse folder by folder, not a flat dump of every file.

### Notion-Style Editing
The rendered markdown IS the editor. Click and type. Bold, italic, headings, code blocks, tables, task lists — all rendered live as you write.

### Tabs
Open multiple files across workspaces simultaneously. Click to switch, middle-click to close.

### Auto-Save
Changes save automatically after you stop typing. No save button needed.

### Dark / Light Mode
Follows your macOS system preference by default. Toggle manually with the Sun/System/Moon switcher in the sidebar.

### Zoom
Zoom in and out of your documents with the sidebar zoom controls. Click the percentage to reset.

### File Watching
Edit a file externally (VS Code, Vim, etc.) and skimmd picks up the change automatically.

### Directory Tree
Files are organized by folder structure — not flattened. All folders start collapsed so you expand only what you need.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Native shell | [Tauri v2](https://v2.tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript |
| Editor | [TipTap](https://tiptap.dev/) with markdown round-tripping via `tiptap-markdown` |
| Syntax highlighting | [lowlight](https://github.com/wooorm/lowlight) (highlight.js) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Icons | [Lucide](https://lucide.dev/) |
| Styling | Vanilla CSS with Notion-inspired design tokens |

---

## Getting Started

### Prerequisites

- **macOS** 10.15+
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) toolchain

### Install & Build

```bash
git clone https://github.com/lil-Zlang/skimmdApp.git
cd skimmdApp
npm install
npm run tauri build
```

The `.app` bundle will be at:
```
src-tauri/target/release/bundle/macos/skimmd.app
```

Copy it to `/Applications/` and double-click to launch.

### Development

```bash
npm run tauri dev
```

This starts Vite HMR + Tauri dev window with hot reload.

---

## Project Structure

```
skimmdApp/
├── src/                        # React frontend
│   ├── components/
│   │   ├── Editor/             # TipTap editor + extensions
│   │   ├── Sidebar/            # Workspace tree, folders, files
│   │   ├── Tabs/               # Tab bar
│   │   ├── ThemeToggle/        # Dark/light/system toggle
│   │   └── WelcomeScreen/      # First-launch screen
│   ├── stores/                 # Zustand state (workspaces, tabs, theme, zoom)
│   ├── hooks/                  # Auto-save, file watcher
│   ├── lib/                    # Filesystem helpers (tree builder)
│   ├── styles/                 # Global CSS + editor styles
│   └── types/                  # TypeScript interfaces
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── lib.rs              # Plugin registration
│   │   └── main.rs             # Entry point
│   ├── capabilities/           # Tauri permissions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## How It Works

1. **First launch** — Welcome screen prompts you to add a folder via native macOS picker
2. **Workspace persistence** — Folders are saved via Tauri Store plugin, survives restarts
3. **File tree** — `readDir` recursively builds a tree, filtering for `.md`/`.txt`, skipping `node_modules`/`.git`
4. **Editor** — TipTap loads markdown via `tiptap-markdown`, renders as rich text, converts back to markdown on save
5. **Auto-save** — Debounced 800ms writes via Tauri filesystem plugin
6. **File watching** — `notify` crate (via Tauri fs plugin) watches workspace directories, reloads open tabs on external changes

---

## License

MIT
