/* StudyMind Upgraded Settings Logic */

document.addEventListener('DOMContentLoaded', () => {
  // Elements: AI Engine
  const modelSelect = document.getElementById('settings-model');
  const refreshModelsBtn = document.getElementById('refresh-models-btn');
  const responseLengthSelect = document.getElementById('settings-length');
  const temperatureSlider = document.getElementById('settings-temp');
  const temperatureVal = document.getElementById('settings-temp-val');
  const testConnBtn = document.getElementById('settings-test-conn');
  const testConnResult = document.getElementById('settings-test-result');
  const checkOllamaBtn = document.getElementById('settings-check-ollama');

  // Elements: Appearance
  const themeSelect = document.getElementById('settings-theme');
  const fontSizeSelect = document.getElementById('settings-font-size');
  const sidebarSelect = document.getElementById('settings-sidebar-mode');
  const accentColorOptions = document.querySelectorAll('.accent-picker-color');

  // Elements: Study Preferences
  const defaultSubjectSelect = document.getElementById('settings-subject');
  const defaultQuestionsInput = document.getElementById('settings-review-q-count');
  const pomoFocusInput = document.getElementById('settings-pomo-focus');
  const pomoShortInput = document.getElementById('settings-pomo-short');
  const pomoLongInput = document.getElementById('settings-pomo-long');
  const notificationsToggle = document.getElementById('settings-notifications');

  // Elements: Data & Privacy
  const exportDataBtn = document.getElementById('settings-export-btn');
  const importDataBtn = document.getElementById('settings-import-btn');
  const importDataFile = document.getElementById('settings-import-file');
  const wipeChatsBtn = document.getElementById('wipe-chats-btn');
  const wipeNotesBtn = document.getElementById('wipe-notes-btn');
  const wipeSetsBtn = document.getElementById('wipe-sets-btn');
  const wipeProgressBtn = document.getElementById('wipe-progress-btn');

  // Elements: Shortcuts Modal
  const openShortcutsBtn = document.getElementById('settings-shortcuts-btn');
  const shortcutsModal = document.getElementById('shortcuts-modal');
  const shortcutsCloseBtn = document.getElementById('shortcuts-close-btn');

  function initSettingsPanel() {
    loadSettingsIntoUI();
    initializeModelList();

    // Attach Save Listeners for UI Changes
    themeSelect.addEventListener('change', saveUIAccordance);
    fontSizeSelect.addEventListener('change', saveUIAccordance);
    sidebarSelect.addEventListener('change', saveUIAccordance);
    
    defaultSubjectSelect.addEventListener('change', saveUIAccordance);
    defaultQuestionsInput.addEventListener('input', saveUIAccordance);
    pomoFocusInput.addEventListener('input', saveUIAccordance);
    pomoShortInput.addEventListener('input', saveUIAccordance);
    pomoLongInput.addEventListener('input', saveUIAccordance);
    notificationsToggle.addEventListener('change', saveUIAccordance);

    // Temperature slider readout
    temperatureSlider.addEventListener('input', () => {
      temperatureVal.textContent = parseFloat(temperatureSlider.value).toFixed(1);
      saveUIAccordance();
    });

    responseLengthSelect.addEventListener('change', saveUIAccordance);

    // Model select (registered once here, not in initializeModelList which refreshes)
    modelSelect.addEventListener('change', () => {
      saveUIAccordance();
      window.showToast(`Selected model updated: ${modelSelect.value}`);
    });

    // Accent picker
    accentColorOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        accentColorOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        saveUIAccordance();
      });
    });

    // Test Connection
    testConnBtn.addEventListener('click', testConnection);
    checkOllamaBtn.addEventListener('click', testConnection);
    refreshModelsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      initializeModelList();
    });

    // Backups
    exportDataBtn.addEventListener('click', exportJSONBackup);
    importDataBtn.addEventListener('click', () => importDataFile.click());
    importDataFile.addEventListener('change', importJSONBackup);

    // Wipes
    wipeChatsBtn.addEventListener('click', () => wipeDataCategory('chats'));
    wipeNotesBtn.addEventListener('click', () => wipeDataCategory('notes'));
    wipeSetsBtn.addEventListener('click', () => wipeDataCategory('sets'));
    wipeProgressBtn.addEventListener('click', () => wipeDataCategory('progress'));

    // Shortcuts Modal
    if (openShortcutsBtn) {
      openShortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.add('active');
      });
    }
    if (shortcutsCloseBtn) {
      shortcutsCloseBtn.addEventListener('click', () => {
        shortcutsModal.classList.remove('active');
      });
    }
  }

  // Populate UI values from window.StudyStorage
  function loadSettingsIntoUI() {
    const settings = window.StudyStorage.getSettings();

    themeSelect.value = settings.theme || 'dark';
    fontSizeSelect.value = settings.fontSize || 'medium';
    sidebarSelect.value = settings.sidebar || 'Always Expanded';
    
    // Response Detail
    responseLengthSelect.value = settings.responseLength || 600;
    Ollama.maxTokens = parseInt(responseLengthSelect.value, 10);
    
    // Temp
    temperatureSlider.value = settings.temperature || 0.7;
    temperatureVal.textContent = parseFloat(settings.temperature || 0.7).toFixed(1);

    // Study Preferences
    defaultSubjectSelect.value = settings.defaultSubject || 'Science';
    defaultQuestionsInput.value = settings.defaultReviewQuestions || 5;
    pomoFocusInput.value = settings.pomodoro.focus || 25;
    pomoShortInput.value = settings.pomodoro.short || 5;
    pomoLongInput.value = settings.pomodoro.long || 15;
    notificationsToggle.checked = settings.notifications !== false;

    // Accent Colors
    accentColorOptions.forEach(opt => {
      const color = opt.getAttribute('data-accent');
      if (color === settings.accentColor) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    applyVisualAppearance();
  }

  // Commit UI changes to storage
  function saveUIAccordance() {
    const activeAccentOpt = document.querySelector('.accent-picker-color.active');
    const accent = activeAccentOpt ? activeAccentOpt.getAttribute('data-accent') : 'blue-violet';

    const settings = {
      theme: themeSelect.value,
      fontSize: fontSizeSelect.value,
      sidebar: sidebarSelect.value,
      model: modelSelect.value || Ollama.selectedModel || 'tinyllama',
      responseLength: parseInt(responseLengthSelect.value, 10),
      temperature: parseFloat(temperatureSlider.value),
      defaultSubject: defaultSubjectSelect.value,
      defaultReviewQuestions: parseInt(defaultQuestionsInput.value, 10) || 5,
      pomodoro: {
        focus: parseInt(pomoFocusInput.value, 10) || 25,
        short: parseInt(pomoShortInput.value, 10) || 5,
        long: parseInt(pomoLongInput.value, 10) || 15
      },
      notifications: notificationsToggle.checked,
      accentColor: accent
    };

    window.StudyStorage.saveSettings(settings);
    Ollama.selectedModel = settings.model;
    Ollama.maxTokens = settings.responseLength;

    applyVisualAppearance();
  }

  // Apply styles dynamically
  function applyVisualAppearance() {
    const settings = window.StudyStorage.getSettings();

    // 1. Theme
    let themeToApply = settings.theme;
    if (themeToApply === 'system') {
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      themeToApply = darkQuery.matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', themeToApply);

    // 2. Font Size
    document.body.classList.forEach(c => {
      if (c.startsWith('font-')) document.body.classList.remove(c);
    });
    document.body.classList.add(`font-${settings.fontSize}`);

    // 3. Accent Preset
    document.documentElement.setAttribute('data-accent', settings.accentColor);

    // 4. Sidebar configuration
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      if (settings.sidebar === 'Always Collapsed') {
        sidebar.classList.add('collapsed');
      } else if (settings.sidebar === 'Always Expanded') {
        sidebar.classList.remove('collapsed');
      }
      // "Auto" will let small screen CSS media queries resize it
    }

    // Refresh model text indicator in sidebar footer
    const modelTextNode = document.getElementById('sidebar-active-model-name');
    if (modelTextNode) {
      modelTextNode.textContent = settings.model;
    }
  }

  // Note: window.navigateToView is defined in app.js and handles all view routing
  // Including specific view callback refreshers for dashboard and progress views

  // Populate models list
  async function initializeModelList() {
    modelSelect.innerHTML = '';
    const models = await Ollama.getModels();
    const settings = window.StudyStorage.getSettings();

    if (models.length === 0) {
      modelSelect.innerHTML = `
        <option value="tinyllama">No models found - Pull tinyllama in terminal!</option>
        <option value="tinyllama" selected>tinyllama:latest (Fallback)</option>
      `;
      Ollama.selectedModel = 'tinyllama';
      return;
    }

    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model.name;
      
      const size = model.details && model.details.parameter_size ? ` (${model.details.parameter_size})` : '';
      opt.textContent = `${model.name}${size}`;
      
      if (model.name === settings.model || model.name.split(':')[0] === settings.model) {
        opt.selected = true;
      }

      modelSelect.appendChild(opt);
    });
  }

  // Connection Ping diagnostic checks
  async function testConnection() {
    testConnResult.textContent = 'Testing connection...';
    testConnResult.style.color = 'var(--text-secondary)';
    
    const startTime = Date.now();
    const isOnline = await Ollama.ping();
    const duration = Date.now() - startTime;

    if (isOnline) {
      testConnResult.textContent = `Connected successfully! Response time: ${duration}ms`;
      testConnResult.style.color = 'var(--success)';
      window.showToast('Ollama engine is responding!');
    } else {
      testConnResult.textContent = 'Could not establish connection to http://localhost:11434';
      testConnResult.style.color = 'var(--danger)';
      window.showToast('Ollama offline.', 'error');
    }
  }

  // --- Backup Functions ---
  
  function exportJSONBackup() {
    if (!window.api) return;

    const data = {
      settings: window.StudyStorage.getSettings(),
      chatSessions: window.StudyStorage.getChatSessions(),
      reviewSessions: window.StudyStorage.getReviewSessions(),
      flashcardSets: window.StudyStorage.getFlashcardSets(),
      notes: window.StudyStorage.getNotes(),
      progress: window.StudyStorage.getProgress()
    };

    const str = JSON.stringify(data, null, 2);
    const defaultName = `StudyMind-Backup-${Date.now()}.json`;

    window.api.saveToFile(defaultName, str).then(res => {
      if (res.success) {
        window.showToast('✓ Backup file saved successfully!');
      } else if (res.message !== 'Save cancelled') {
        window.showToast(`Backup failed: ${res.message}`, 'error');
      }
    });
  }

  function importJSONBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Prevent importing excessively large files (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      window.showToast('Backup file is too large (max 10MB).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Validate structure before importing
        if (typeof data !== 'object' || data === null) {
          throw new Error('Invalid backup structure');
        }
        
        if (data.settings && typeof data.settings === 'object') window.StudyStorage.saveSettings(data.settings);
        if (data.chatSessions && Array.isArray(data.chatSessions)) localStorage.setItem(window.StudyStorage.KEYS.CHAT_SESSIONS, JSON.stringify(data.chatSessions));
        if (data.reviewSessions && Array.isArray(data.reviewSessions)) localStorage.setItem(window.StudyStorage.KEYS.REVIEW_SESSIONS, JSON.stringify(data.reviewSessions));
        if (data.flashcardSets && Array.isArray(data.flashcardSets)) localStorage.setItem(window.StudyStorage.KEYS.FLASHCARD_SETS, JSON.stringify(data.flashcardSets));
        if (data.notes && Array.isArray(data.notes)) localStorage.setItem(window.StudyStorage.KEYS.NOTES, JSON.stringify(data.notes));
        if (data.progress && typeof data.progress === 'object') window.StudyStorage.saveProgress(data.progress);

        window.showToast('✓ JSON backup data imported successfully!', 'success');
        loadSettingsIntoUI();
        
        // redirect to home
        window.navigateToView('dashboard-view');
      } catch (err) {
        window.showToast('Invalid backup file formatting.', 'error');
      }
    };
    reader.readAsText(file);
  }

  // Wipe selected category
  function wipeDataCategory(category) {
    let title = '';
    let msg = '';
    let action = null;

    if (category === 'chats') {
      title = 'Wipe Study Chat logs?';
      msg = 'Are you sure you want to delete all saved AI study conversations? This action cannot be undone.';
      action = () => {
        window.StudyStorage.clearChatSessions();
        // Clear chat DOM
        const chatHist = document.getElementById('chat-history');
        if (chatHist) {
          chatHist.querySelectorAll('.chat-message-row').forEach(b => b.remove());
          document.getElementById('chat-welcome-state').style.display = 'flex';
        }
      };
    } else if (category === 'notes') {
      title = 'Delete all Notes?';
      msg = 'Are you sure you want to delete all notes? This will wipe your notebook completely.';
      action = () => {
        localStorage.setItem(window.StudyStorage.KEYS.NOTES, '[]');
        // Reload notes view
        const notesList = document.getElementById('notes-list');
        if (notesList) {
          notesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 20px;">No notes found</div>`;
          document.getElementById('notes-title-input').value = 'Untitled Note';
          document.getElementById('notes-content-textarea').value = '';
        }
      };
    } else if (category === 'sets') {
      title = 'Clear Flashcard Sets?';
      msg = 'Are you sure you want to delete all flashcard decks? All cards will be lost.';
      action = () => {
        localStorage.setItem(window.StudyStorage.KEYS.FLASHCARD_SETS, '[]');
      };
    } else { // progress
      title = 'Reset Study Progress?';
      msg = 'Are you sure you want to reset your streaks, stats, durations, and achievement badges?';
      action = () => {
        localStorage.setItem(window.StudyStorage.KEYS.PROGRESS, JSON.stringify(window.StudyStorage.DEFAULTS.PROGRESS));
      };
    }

    window.showConfirmModal(title, msg, () => {
      action();
      window.showToast('✓ Selected category cleared!');
      if (window.refreshDashboard) window.refreshDashboard();
      if (window.refreshProgressTracker) window.refreshProgressTracker();
    });
  }

  // Expose globally for connection status changes (called from app.js)
  window.initializeSettings = function() {
    loadSettingsIntoUI();
    initializeModelList();
  };

  initSettingsPanel();
  applyVisualAppearance(); // Call once on start to load theme
});
