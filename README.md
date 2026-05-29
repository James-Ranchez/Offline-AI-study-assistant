# StudyMind - 100% Offline AI Study Assistant

**StudyMind** is a fully functional offline desktop application designed to run on low-to-mid end devices. It serves as a local, private academic assistant, communicating with a locally running Ollama instance. It uses lightweight quantized AI models (such as `TinyLlama` or `Phi-3 Mini`) to power its features, ensuring **100% offline availability** after the initial setup.

---

## Key Features

1. **💬 Study Chat:** A conversational chat interface for asking academic questions with full word-by-word response streaming, automatic input growth, and session logs stored in a secure local JSON database.
2. **📋 Review Maker:** An interactive card-based generator with three study modes:
   * **MCQ Quiz**: Parses notes into multiple-choice questions with clickable choices, success-green / error-red instant feedback, corrected highlights, and live scoring.
   * **Open-Ended Accordions**: Builds collapsible accordion questions with slide-down model answer reveals.
   * **Key Summaries**: Creates highly readable bullet outlines styled with student-friendly structures.
3. **📖 Topic Explainer:** Explains any concept at three customized difficulty levels: **Simple 🟢** (grade-school level with everyday analogies), **Standard 🟡** (high-school level), or **Advanced 🔴** (technical college level).
4. **⚙️ Settings Panel:** Dynamic local model selector pings Ollama tags directly, custom max token response lengths, light/dark mode triggers, connection diagnostics guides, and double-confirmation local database clears.
5. **✨ Onboarding & Mock Mode Fallback:** If Ollama isn't running on launch, StudyMind reveals a gorgeous step-by-step diagnostic installer screen. Students can also bypass to **Mock Demo Mode**, which utilizes a highly sophisticated simulated streaming engine to test features.

---

## System Requirements
* **OS**: Windows 10/11, macOS 11+, or Ubuntu 20.04+
* **CPU**: Intel Core i3–i5 (7th–10th gen) or AMD equivalent
* **RAM**: 4GB minimum, 8GB recommended
* **Storage**: At least 2GB free
* **Network**: None required at runtime (completely offline after setup)

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
* Once installed, ensure the Ollama application is active in your system background (verify the llama icon is visible in your system tray).

### 2. Pull the AI Study Model
* Open your Terminal or Command Prompt and download the default lightweight AI model (~600MB):
  ```bash
  ollama pull tinyllama
  ```
* *(Optional)* If your system has at least 8GB of RAM, you can pull a larger, more advanced model (~2.2GB):
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

StudyMind uses `electron-builder` to package the app. This bundles all HTML, JS, CSS, offline vector icons, and local typography into a self-contained installation package under 200MB in installer size (excluding the user's local AI model).

To pack the installer for your current platform, run:
```bash
npm run dist
```

### Generated Executable Formats
* **Windows**: NSIS Installer `.exe` (saved under `dist/`)
* **macOS**: Standalone `.dmg` disk image
* **Linux**: Self-contained `.AppImage` executable

---

## 🔒 Security & Privacy Architecture
* **Context Isolation**: The renderer is fully isolated (`contextIsolation: true`) from the Node.js environment.
* **Disabled Node Integration**: `nodeIntegration: false` prevents malicious injection attacks.
* **Preload API Bridge**: Interactive renderer views utilize a secured `preload.js` bridge exposing strictly white-listed IPC channels to prevent un-sandboxed shell command executions.
* **No Telemetry**: No tracking cookies, external API calls, or analytics endpoints. Your study history stays strictly private on your computer.
"# Offline-AI-study-assistant" 
