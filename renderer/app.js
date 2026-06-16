/* StudyMind Main Application Orchestrator & View Router */

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view-container');

  // --- Theme, Fonts, Accents, and Sidebar Startup Initialization ---
  function applyInitialAppearance() {
    const settings = window.StudyStorage.getSettings();

    // 1. Theme
    let themeToApply = settings.theme;
    if (themeToApply === 'system') {
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      themeToApply = darkQuery.matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', themeToApply);

    // 2. Font Size
    document.body.className = '';
    document.body.classList.add(`font-${settings.fontSize || 'medium'}`);

    // 3. Accent Color
    document.documentElement.setAttribute('data-accent', settings.accentColor || 'blue-violet');

    // 4. Sidebar Collapsed/Expanded state
    if (sidebar) {
      if (settings.sidebar === 'Always Collapsed') {
        sidebar.classList.add('collapsed');
      } else {
        sidebar.classList.remove('collapsed');
      }
    }

    // Update active model label in sidebar footer
    const activeModelLabel = document.getElementById('sidebar-active-model-name');
    if (activeModelLabel) {
      activeModelLabel.textContent = settings.model || 'tinyllama';
    }
  }

  // --- View Switcher & Navigation Routing ---
  function initNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        window.navigateToView(targetView);
      });
    });

    // Make global navigate hook
    window.navigateToView = function(viewId) {
      // Find active button
      navItems.forEach(nav => {
        if (nav.getAttribute('data-view') === viewId) {
          nav.classList.add('active');
        } else {
          nav.classList.remove('active');
        }
      });

      // Show container
      views.forEach(view => {
        if (view.id === viewId) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });

      // Specific view callback refreshers
      if (viewId === 'dashboard-view' && window.refreshDashboard) {
        window.refreshDashboard();
      }
      if (viewId === 'progress-view' && window.refreshProgressTracker) {
        window.refreshProgressTracker();
      }
    };
  }

  // --- Collapsible Sidebar Controller ---
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      
      // Save setting based on toggled class
      const settings = window.StudyStorage.getSettings();
      settings.sidebar = sidebar.classList.contains('collapsed') ? 'Always Collapsed' : 'Always Expanded';
      window.StudyStorage.saveSettings(settings);
      
      // Sync settings page select if currently active
      const settingsSidebarSelect = document.getElementById('settings-sidebar-mode');
      if (settingsSidebarSelect) {
        settingsSidebarSelect.value = settings.sidebar;
      }
    });
  }

  // --- Connection Diagnostics & Onboarding Toggler ---
  const onboardingView = document.getElementById('onboarding-view');
  const checkBtn = document.getElementById('onboarding-check-btn');
  const bypassBtn = document.getElementById('onboarding-bypass-btn');
  const connectionDot = document.getElementById('connection-dot');
  const connectionText = document.getElementById('connection-text');
  
  // Settings Diagnostic elements
  const diagDot = document.getElementById('diag-dot');
  const diagText = document.getElementById('diag-text');
  const diagInstructions = document.getElementById('diag-instructions');
  const pingBtn = document.getElementById('settings-ping-btn');

  async function checkOllamaConnection() {
    const isOnline = await Ollama.ping();
    
    // Update UI elements based on connectivity status
    if (isOnline) {
      // Set to live mode
      Ollama.isMockMode = false;
      
      // Update sidebar status
      if (connectionDot) {
        connectionDot.className = 'status-dot online';
        connectionDot.style.backgroundColor = ''; // Reset mock overrides
        connectionDot.style.boxShadow = '';
      }
      if (connectionText) connectionText.textContent = 'Ollama Connected';
      
      // Update settings diagnostic
      if (diagDot) {
        diagDot.className = 'status-dot online';
        diagText.textContent = 'Online & Active';
        diagInstructions.innerHTML = `<div style="color: var(--success);">StudyMind has established a direct link to the local AI engine. Ready to process.</div>`;
      }
      
      // Hide onboarding if visible
      if (onboardingView) onboardingView.classList.remove('active');
      
      // Load actual local models
      if (window.initializeSettings) {
        window.initializeSettings();
      }
    } else {
      // Auto-enable mock mode if offline
      Ollama.isMockMode = true;

      // Update sidebar status
      if (connectionDot) {
        connectionDot.className = 'status-dot offline';
        connectionDot.style.backgroundColor = '';
        connectionDot.style.boxShadow = '';
      }
      if (connectionText) connectionText.textContent = 'Ollama Offline';
      
      // Update settings diagnostic
      if (diagDot) {
        diagDot.className = 'status-dot offline';
        diagText.textContent = 'Disconnected';
        diagInstructions.innerHTML = `
          <div>Ollama is not running. To start studying offline:</div>
          <div style="padding-left:12px;">1. Launch the **Ollama** app on your computer.</div>
          <div style="padding-left:12px;">2. Open a terminal and download a model: <code>ollama pull tinyllama</code></div>
          <div style="padding-left:12px;">3. Ensure the service is hosting on <code>http://localhost:11434</code></div>
        `;
      }

      // If NOT bypassed, show onboarding overlay
      const wasBypassed = sessionStorage.getItem('mock-bypass') === 'true';
      if (!wasBypassed) {
        if (onboardingView) onboardingView.classList.add('active');
      }
    }
  }

  // Onboarding action listeners
  if (checkBtn) {
    checkBtn.addEventListener('click', async () => {
      checkBtn.textContent = 'Checking...';
      checkBtn.disabled = true;
      
      const success = await Ollama.ping();
      if (success) {
        await checkOllamaConnection();
        window.showToast('Successfully connected to Ollama!');
        
        // Trigger onboarding tour if not completed
        const isTourDone = window.StudyStorage.isTourCompleted();
        if (!isTourDone && window.startOnboardingTour) {
          window.startOnboardingTour();
        }
      } else {
        window.showToast('Could not connect. Ensure Ollama is running.', 'error');
      }
      
      checkBtn.textContent = 'Check Connection';
      checkBtn.disabled = false;
    });
  }

  if (bypassBtn) {
    bypassBtn.addEventListener('click', () => {
      Ollama.isMockMode = true;
      sessionStorage.setItem('mock-bypass', 'true');
      if (onboardingView) onboardingView.classList.remove('active');
      
      // Update sidebar indicator to showcase mock mode
      if (connectionDot) {
        connectionDot.className = 'status-dot';
        connectionDot.style.backgroundColor = 'var(--warning)';
        connectionDot.style.boxShadow = '0 0 10px var(--warning)';
      }
      if (connectionText) connectionText.textContent = 'Mock Engine (Demo)';
      
      window.showToast('Demo Mock Mode activated!', 'success');
      
      // Trigger onboarding tour
      const isTourDone = window.StudyStorage.isTourCompleted();
      if (!isTourDone && window.startOnboardingTour) {
        window.startOnboardingTour();
      }

      // Load mock settings
      if (window.initializeSettings) {
        window.initializeSettings();
      }
    });
  }

  // Settings Diagnostic Check Button
  if (pingBtn) {
    pingBtn.addEventListener('click', async () => {
      pingBtn.textContent = 'Checking...';
      const success = await Ollama.ping();
      if (success) {
        Ollama.isMockMode = false;
        await checkOllamaConnection();
        window.showToast('Connected to local Ollama successfully!');
      } else {
        window.showToast('Local Ollama was not found.', 'error');
        await checkOllamaConnection();
      }
      pingBtn.textContent = 'Check Connection';
    });
  }

  // --- Global Confirmation Modal Utility ---
  const confirmModal = document.getElementById('confirm-modal');
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  const okBtn = document.getElementById('confirm-ok-btn');
  let currentOnOk = null;

  window.showConfirmModal = function(title, body, onOk) {
    if (!confirmModal) return;
    
    confirmModal.querySelector('.modal-title').textContent = title;
    confirmModal.querySelector('.modal-body').textContent = body;
    currentOnOk = onOk;
    
    confirmModal.classList.add('active');
  };

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      confirmModal.classList.remove('active');
      currentOnOk = null;
    });
  }

  if (okBtn) {
    okBtn.addEventListener('click', () => {
      if (currentOnOk) currentOnOk();
      confirmModal.classList.remove('active');
      currentOnOk = null;
    });
  }

  // Run Startup Checks
  applyInitialAppearance();
  initNavigation();
  checkOllamaConnection();
});

// Global Subject Auto-Detection Helper based on keyword matching
window.detectSubject = function(text) {
  if (!text) return null;
  const clean = text.toLowerCase();
  
  // Tagalog check first
  const filipinoCount = (clean.match(/\b(mga|ng|ang|sa|na|para|at|ngunit|subalit|pilipinas|wika|panitikan|o|ay|si|sino|ano|ilan|dahil)\b/g) || []).length;
  if (filipinoCount >= 3) {
    return 'Filipino';
  }

  // Subject Keywords
  const keywords = {
    Math: /\b(equation|solve|geometry|calculus|algebra|algebraic|arithmetic|fraction|sum|integral|derivative|graph|variable|theorem|multiply|divide|subtract|add|triangle|matrix|vector|statistics|probability)\b/g,
    History: /\b(war|battle|treaty|revolution|emperor|president|dynasty|century|king|queen|empire|civil|colonial|ancient|historical|world war|reign|archduke|regime|parliament|congress|constitution)\b/g,
    Science: /\b(cell|organism|photosynthesis|chemical|physics|molecule|element|gravity|planet|space|ecosystem|water cycle|mitochondria|mitosis|meiosis|biology|dna|rna|atom|electron|proton|neutron|reaction)\b/g,
    English: /\b(literature|grammar|verb|noun|adjective|pronoun|poetry|shakespeare|spelling|prose|metaphor|simile|clause|paragraph|sentence|comma|adverb|synonym|antonym|essay)\b/g
  };

  let maxCount = 0;
  let detected = null;

  for (const [subj, regex] of Object.entries(keywords)) {
    const count = (clean.match(regex) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detected = subj;
    }
  }

  return maxCount >= 2 ? detected : null;
};
