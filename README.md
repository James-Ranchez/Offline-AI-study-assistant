# StudyMind - 100% Offline AI Study Assistant

**StudyMind** is a fully functional offline desktop application built with Electron.js designed to run on low-to-mid end devices. It serves as a local, private academic assistant, communicating with a locally running Ollama instance at `http://localhost:11434`. It uses lightweight quantized AI models (such as `TinyLlama` or `Phi-3 Mini`) to power its features, ensuring **100% offline availability** after the initial setup.

---

## 🚀 Key Features (Expanded & Redesigned)

1. **🏠 Interactive Dashboard**: Welcome greeting changes dynamically by time of day. Displays today's sessions counted, streaks, and total study duration, alongside quick action launchers, recently edited documents, and rotating study tips.
2. **💬 Study Chat**: Ask academic questions to the offline AI and get word-by-word streaming responses. Includes horizontal scrolling prompt suggestion chips for 6 subject areas, expanding textarea auto-sizing, character counters, and saved chat session drawer indexes.
3. **📋 Review Maker**: A 3-step wizard (Input -> Configure -> Results) generating custom review materials:
   * **Interactive MCQ Quiz**: Plays a quiz one question at a time. Displays instant feedback (success-green / error-red), scoring progression, and a results card grading your score with wrong answers review filters.
   * **Open-Ended Cards**: Renders accordion questions with slide-down answers and self-rating study metrics ("Got It", "Still Learning").
   * **Summary Outlines**: Renders bullet summaries with copyable lines.
   * **Mixed Reviews**: Combines MCQs and outline bullets sequentially on a single sheet.
4. **🃏 Flashcards Decks**: Practice active recall using local decks. Design cards manually or generate front/back card sets automatically using the AI note extractor. Play decks inside a 3D perspective flip viewer using Space and arrow keys, and rate your retention.
5. **📝 My Notes**: Split layout with index searching, subject tags, and a markdown notepad. Includes 30-second background auto-saving and an AI Assist toolbar (Summarize, Explain, Find Key Terms, Improve Writing) streaming results into a right-hand drawers sheet.
6. **⏱️ Pomodoro Focus Timer**: Concentrated focus clocks utilizing Pomodoro presets, Custom work/break timings, or simple Countdowns. Draws SVG circular progress ring offsets and triggers desktop alarms and notification alerts on completion.
7. **📊 Progress Tracker**: Inspect streak histories, 30-day activity calendars, SVG-based MCQ score line graphs, flashcard deck mastery bars, and unlock milestone badges for study accomplishments.
8. **💡 Topic Explainer**: Explain topics at simple, standard, or advanced levels. Supports explanations, step-by-step lists, comparisons, misconceptions, and real-world examples, alongside a related questions explorer sidebar.
9. **⚙️ Settings Panel**: Model tags selectors, response detail sliders, theme toggles (dark, light, system system), font scaling (small, medium, large), sidebar collapsed overrides, default subjects, 6 preset accent colors, JSON data backup exports/imports, and clearing logs.

---

## ⌨️ Keyboard Shortcuts Reference

StudyMind supports global keyboard bindings to accelerate study sessions:

| Shortcut | Action |
|---|---|
| **Ctrl + 1** | Go to Dashboard |
| **Ctrl + 2** | Go to Study Chat |
| **Ctrl + 3** | Go to Review Maker |
| **Ctrl + 4** | Go to Flashcards Decks |
| **Ctrl + 5** | Go to My Notes Notebook |
| **Ctrl + 6** | Go to Focus Study Timer |
| **Ctrl + N** | Context-aware Create New Item (note, chat, deck) |
| **Ctrl + S** | Save Current Session or Note |
| **Ctrl + ,** | Open Settings Panel |
| **Ctrl + K** | Focus Global Search Bar |
| **Escape** | Close open modal, search overlay, or AI drawer sheet |
| **Space** | Flip active flashcard (in Study mode overlay) |
| **← / →** | Navigate back/next flashcard (in Study mode overlay) |

---

## 🛠️ Step-by-Step Setup Guide

### 1. Install local Ollama Engine
* Download and run the installer for your operating system:
  * **Windows**: [Ollama Windows Installer](https://ollama.com/download/windows)
  * **macOS**: [Ollama macOS Installer](https://ollama.com/download/mac)
  * **Linux**: Run the following in your terminal:
    ```bash
    curl -fsSL https://ollama.com/install.sh | sh
    ```
* Ensure the Ollama application is active in your system background.

### 2. Pull the AI Study Model
* Open your Terminal or Command Prompt and download the default model (~600MB):
  ```bash
  ollama pull tinyllama
  ```
* *(Optional)* Pull the advanced model (~2.2GB):
  ```bash
  ollama pull phi3:mini
  ```

---

## 🚀 Running the App in Development

1. Open your terminal in the project directory:
   ```bash
   cd "c:\Users\ranch\Desktop\Adet Proj"
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

---

## 📦 Packaging & Building Standalone Installers

StudyMind uses `electron-builder` to package the app. To pack the installer for your current platform, run:
```bash
npm run dist
```

### Generated Executable Formats
* **Windows**: NSIS Installer `.exe` (saved under `dist/`)
* **macOS**: Standalone `.dmg` disk image
* **Linux**: Self-contained `.AppImage` executable
