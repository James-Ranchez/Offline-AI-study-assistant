/* StudyMind Main Application Orchestrator */

document.addEventListener('DOMContentLoaded', () => {
  // --- View Switcher Logic ---
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view-container');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      
      // Update sidebar nav highlights
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Swap views
      views.forEach(view => {
        if (view.id === targetView) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    });
  });

  // --- Theme Toggle Logic ---
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-btn-icon');
  
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update theme icon
    if (theme === 'light') {
      themeIcon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" stroke-linecap="round" stroke-linejoin="round"/>';
    } else {
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke-linecap="round" stroke-linejoin="round"/>';
    }
  }

  // Initial Theme load
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    window.showToast(`Switched to ${newTheme === 'light' ? 'Light' : 'Dark'} Mode`);
  });

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
      connectionDot.className = 'status-dot online';
      connectionText.textContent = 'Ollama Connected';
      
      // Update settings diagnostic
      if (diagDot) {
        diagDot.className = 'status-dot online';
        diagText.textContent = 'Online & Active';
        diagInstructions.innerHTML = `<div style="color: var(--color-simple);">StudyMind has established a direct link to the local AI engine. Ready to process.</div>`;
      }
      
      // Hide onboarding if visible
      onboardingView.classList.remove('active');
      
      // Load actual local models
      if (window.initializeSettings) {
        window.initializeSettings();
      }
    } else {
      // Update sidebar status
      connectionDot.className = 'status-dot offline';
      connectionText.textContent = 'Ollama Offline';
      
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
      if (!wasBypassed && !Ollama.isMockMode) {
        onboardingView.classList.add('active');
      }
    }
  }

  // Trigger diagnostic check on start
  checkOllamaConnection();

  // Onboarding action listeners
  checkBtn.addEventListener('click', async () => {
    checkBtn.textContent = 'Checking...';
    checkBtn.disabled = true;
    
    const success = await Ollama.ping();
    if (success) {
      await checkOllamaConnection();
      window.showToast('Successfully connected to Ollama!');
    } else {
      window.showToast('Could not connect. Ensure Ollama is running.', 'error');
    }
    
    checkBtn.textContent = 'Check Connection';
    checkBtn.disabled = false;
  });

  bypassBtn.addEventListener('click', () => {
    Ollama.isMockMode = true;
    sessionStorage.setItem('mock-bypass', 'true');
    onboardingView.classList.remove('active');
    
    // Update sidebar indicator to showcase mock mode
    connectionDot.className = 'status-dot online';
    connectionDot.style.backgroundColor = 'var(--color-standard)';
    connectionDot.style.boxShadow = '0 0 10px var(--color-standard)';
    connectionText.textContent = 'Mock Engine (Demo)';
    
    window.showToast('Demo Mock Mode activated!', 'success');
    
    // Load mock settings
    if (window.initializeSettings) {
      window.initializeSettings();
    }
  });

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

  // --- Global Toast Notification Utility ---
  window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' 
      ? '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    // Fade out and remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

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
});
