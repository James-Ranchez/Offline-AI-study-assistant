## StudyMind - Tech Stack

- **Electron**: Desktop shell used to build the app (main process in `main.js`, renderer UI in `index.html` and `renderer/*`). Dev dependency shows Electron v42 in `package.json`.
- **Node.js**: Runtime for the main process and packaging scripts. `package.json` defines scripts `start` and `dist`.
- **JavaScript (ES6)**: App code is plain JS across the project: `main.js`, `preload.js`, and files in `renderer/` implement UI logic.
- **HTML & CSS**: UI is built with `index.html` and styles in the `styles/` folder.
- **electron-builder**: Packaging and distribution tool (devDependency) used to produce installers for Windows, macOS, and Linux.
- **IPC / contextBridge**: Secure renderer ↔ main communication implemented via `ipcRenderer.invoke` and `contextBridge.exposeInMainWorld` (see `preload.js`).
- **Local AI tooling (Ollama)**: The repo includes `renderer/ollama.js` which suggests integration with a local LLM (Ollama) or similar local inference tooling — separate system/service required to run locally.

Notes
- Packaging configuration is in `package.json` under `build` (targets: nsis, dmg, AppImage).
- The app uses the filesystem and native dialogs via the main process — be mindful of sandboxing and safe IPC patterns when adding features.
- Electron v42 is relatively old; consider upgrading Electron and dependencies for security and stability.

Where to look
- Main process: [main.js](main.js#L1)
- Renderer entry: [index.html](index.html#L1) and [renderer/app.js](renderer/app.js#L1)
- Preload and secure API: [preload.js](preload.js#L1)
- Packaging config: [package.json](package.json#L1)

If you want, I can:
- Add JSDoc comments across all `renderer/*.js` and `main.js`.
- Upgrade dependencies and test the build.
