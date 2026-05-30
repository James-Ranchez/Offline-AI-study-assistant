# StudyMind Code Architecture Documentation

This document describes the role, purpose, and function of each code module in the **StudyMind** application. It serves as a study guide for understanding how the codebase operates under the hood.

---

## 📂 File Map & Purpose

```
c:\Users\ranch\Desktop\Adet Proj\
├── main.js             # Electron Main Process (Lifecycle, Window setup, OS Native Dialogs)
├── preload.js          # Electron Preload Script (Safe context bridge for renderer access)
├── index.html          # Core View Layout (Sidebar, view containers, overlays, modal sheets)
│
├── renderer/           # Javascript Logic Layer
│   ├── storage.js      # Unified LocalStorage Manager (CRUD operations, streak counting, achievements)
│   ├── toast.js        # Toast Notifications Factory (Popup notifications utility)
│   ├── shortcuts.js    # Keyboard Shortcuts Handler (Event listener for global hotkeys)
│   ├── search.js       # Global Index Scanner (Scans notes/chats/decks with debouncing)
│   ├── tour.js         # Onboarding Interactive Tour (Step-by-step tooltip overlay wizard)
│   ├── ollama.js       # Ollama API Client & Mock Generator (Handles stream completions)
│   ├── app.js          # Application Orchestrator (Initializations, view switches, connection checks)
│   ├── dashboard.js    # Dashboard Controller (Greets, tracks duration, maps quick actions)
│   ├── chat.js         # Study Chat Controller (Subjects suggestions, prompt expansion, history tabs)
│   ├── reviewer.js     # Review Maker Wizard (3-step configurations, MCQ scoring, text exports)
│   ├── flashcards.js   # Flashcards deck manager (3D rotates CSS, rates cards, parses notes)
│   ├── notes.js        # Note editor (Autosave intervals, AI drawers sheet, exports)
│   ├── timer.js        # Pomodoro timer (Circular dasharrays, bells, desktop alerts)
│   ├── progress.js     # Stats & Charts drawer (Streak calculations, SVG line chart renderers)
│   ├── explainer.js    # Topic Explainer logic (Difficulty selectors, comparisons, deepeners)
│   └── settings.js     # Settings panels (Wipes categories, backup export JSONs, theme pings)
│
└── styles/             # Vanilla CSS Styling Layer
    ├── themes.css      # Core Design Variables (Themes, fonts, custom accent color preset tokens)
    ├── main.css        # Global Layout rules (Sidebar collapses, cards, buttons, scrollbars)
    ├── animations.css  # Transition keyframes (Slide in drawers, 3D card flips, bouncing loaders)
    ├── modal.css       # Modals overlays (Alert boxes, tooltip highlights)
    ├── toast.css       # Toast styles (Types Success/Error/Warning/Info, dismissals)
    ├── dashboard.css   # Dashboard grids (Greeting banner, quick launch buttons, stats cards)
    ├── chat.css        # Study chat style (Aligns speech bubbles, blinking cursors, suggestion chips)
    ├── reviewer.css    # Review maker grids (Step nodes, choice card hovers, grade badge bounces)
    ├── flashcards.css  # Card stacks (3D card perspective faces, rate buttons)
    ├── notes.css       # split editors layout (Note list, AI assist, outcome side sheets)
    ├── timer.css       # Clock rings (SVG rings, work/break tabs, completed session dots)
    └── progress.css    # Charts displays (GitHub heatmap strip, SVG lines, unlocked badges)
```

---

## ⚙️ Module Explanations

### 1. Main Electron Setup (`main.js` & `preload.js`)
* **`main.js`**: Runs in the Electron Main process. It sets up the system browser window parameters (size constraints, loading `index.html`, hiding window menus) and implements native IPC handlers. It facilitates native saving dialogues (`dialog.showSaveDialog`) to write files safely to the user's hard drive without giving renderer scripts direct shell system access.
* **`preload.js`**: Operates in a secure isolated context before the renderer loads. It reveals white-listed APIs to the window context (`window.api.saveToFile`) via the `contextBridge`, keeping the main window safe from un-sandboxed shell script executions.

### 2. Local Data Layer (`renderer/storage.js`)
* **`storage.js`**: The central data layer. It provides unified helper functions to get/set/update/delete objects stored in the browser's `localStorage` (like `sm_settings`, `sm_notes`, `sm_chat_sessions`, `sm_flashcard_sets`, `sm_progress`). It also houses the background calculation algorithms for:
  - Daily Study Streaks: Checks the `lastDate` logged against today/yesterday to increment or reset streak counters.
  - Achievement Badges validation: Automatically unlocks milestones (e.g. "On Fire", "Bookworm") whenever reviews are completed or Pomodoros are finished.

### 3. Shared Helpers (`renderer/toast.js`, `shortcuts.js`, `search.js`, `tour.js`)
* **`toast.js`**: Binds a global function `window.showToast(message, type)` to spawn sliding alert notification boxes in the bottom-right corner of the window.
* **`shortcuts.js`**: Listens for window-level key events. Intercepts `Ctrl+1` through `Ctrl+6` to swap tabs, `Ctrl+N` to start a new document relative to the active view context, `Ctrl+S` to save, and `Space`/`Arrow Keys` to flip/navigate flashcard decks.
* **`search.js`**: Scans user notes title/content, chat headers, and flashcard sets in a single debounced (300ms) index query, rendering results grouped by category. Clicking a result navigates to the view and opens the matched item.
* **`tour.js`**: Calculates navigation buttons client bounding rectangles and positions onboarding tip tooltips next to sidebar items to show a step-by-step introduction tour.

### 4. Client Endpoint Integrations (`renderer/ollama.js`)
* **`ollama.js`**: Handles local HTTP calls to the background Ollama service. Connects to `POST /api/generate` using JavaScript `fetch` and processes the incoming streaming NDJSON line-by-line using a `TextDecoder` stream reader, feeding tokens back to the caller chunks listener. If Ollama is offline, it activates the fallback **Mock Academic Generation Engine** to simulate realistic academic answers.

### 5. Views Logic Controllers
* **`app.js`**: Listens for sidebar nav clicks to show/hide view containers. Reads storage settings on launch to set the current theme, font scale, sidebar configuration, and accent color preset, and pings Ollama on start.
* **`dashboard.js`**: Computes time-based headings, sums study time durations logged for today, lists the last 5 recently modified documents, and selects a rotating tip of the day from a hardcoded array of 20 items.
* **`chat.js`**: Renders streaming chat logs, auto-expands inputs, renders subject-focused suggestion chips, and updates history.
* **`reviewer.js`**: Controls the Review Maker 3-step wizard panel swaps. Parses AI markdown blocks into lists of questions, renders interactive single MCQ card slide animations with red/green feedback, tracks self-graded open-ended counts, and writes result scorecards.
* **`flashcards.js`**: Handles manual card creation fields, triggers AI text vocab pair generators, runs the 3D card deck viewport flips, updates card ratings inside storage, and generates CSV text tables.
* **`notes.js`**: Operates the text editor layout, word counters, and a 30-second background auto-save interval. Contains the AI assist toolbar commands (Summarize, Explain, Find Key Terms, Improve Writing) that stream outcomes into the side sheet.
* **`timer.js`**: Tracks work focus. Animates SVG dashoffsets by scaling values down to empty rings as seconds tick down. Plays Web Audio synthesizer sounds and sends HTML5 local Notification alerts when Pomodoros finish.
* **`progress.js`**: Logs streaks, lists heatmap calendar boxes, draws SVG line graph polyline vectors from past scores, displays Mastery bars, and unlocks achievements.
* **`explainer.js`**: Directs difficulty and formatting selector requests, generates follow-up question nodes, and saves breakdowns directly to My Notes.
* **`settings.js`**: Commits settings options, triggers backup JSON downloads, pings diagnostic speeds, and processes database wipes.
