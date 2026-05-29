/* StudyMind Settings Renderer Logic */

document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('settings-model');
  const refreshModelsBtn = document.getElementById('refresh-models-btn');
  const responseLengthRadios = document.querySelectorAll('input[name="response-length"]');
  const clearAllBtn = document.getElementById('clear-all-sessions-btn');

  // --- Dynamic Model Loader ---
  
  async function initializeSettings() {
    // 1. Fetch available models from Ollama Client
    const models = await Ollama.getModels();
    
    // Clear select
    modelSelect.innerHTML = '';

    if (models.length === 0) {
      modelSelect.innerHTML = `
        <option value="tinyllama">No models found - Pull tinyllama in terminal!</option>
        <option value="tinyllama" selected>tinyllama:latest (Fallback)</option>
      `;
      Ollama.selectedModel = 'tinyllama';
      return;
    }

    // Populate dropdown
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model.name.split(':')[0]; // Use base name
      
      const sizeStr = model.details && model.details.parameter_size 
        ? ` (${model.details.parameter_size})` 
        : '';
        
      opt.textContent = `${model.name}${sizeStr}`;
      
      // Select tinyllama or first by default
      if (model.name.includes('tinyllama') || model.name.includes('tinyllama:latest')) {
        opt.selected = true;
        Ollama.selectedModel = model.name;
      }

      modelSelect.appendChild(opt);
    });

    // If no tinyllama matched, select first
    if (!Ollama.selectedModel && modelSelect.options.length > 0) {
      Ollama.selectedModel = modelSelect.options[0].value;
    }
  }

  // Set global handler so app.js can call it on connection
  window.initializeSettings = initializeSettings;

  // Listen to select model adjustments
  modelSelect.addEventListener('change', () => {
    Ollama.selectedModel = modelSelect.value;
    window.showToast(`Selected model updated: ${Ollama.selectedModel}`);
  });

  // Refresh trigger
  refreshModelsBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await initializeSettings();
    window.showToast('AI local model tags list updated!');
  });

  // --- Response Length Tokens ---
  responseLengthRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        Ollama.maxTokens = parseInt(radio.value, 10);
        window.showToast(`AI Response details set to: ${radio.value === '300' ? 'Short' : radio.value === '600' ? 'Medium' : 'Detailed'}`);
      }
    });
  });

  // --- Clear All Saved Sessions Database Wipes ---
  clearAllBtn.addEventListener('click', () => {
    window.showConfirmModal(
      'Irreversibly Delete ALL Sessions?',
      'Caution! You are about to clear all study sessions from your offline database. This will delete all conversation logs forever. Are you sure you want to proceed?',
      async () => {
        if (window.api) {
          await window.api.clearAllSessions();
        }
        
        // Wipe renderer states
        const chatHistory = document.getElementById('chat-history');
        const welcomeState = document.getElementById('chat-welcome-state');
        if (chatHistory) {
          const bubbles = chatHistory.querySelectorAll('.message-bubble');
          bubbles.forEach(b => b.remove());
          welcomeState.style.display = 'flex';
        }
        
        // Refresh sidebar lists
        const sessionsList = document.getElementById('sessions-list');
        if (sessionsList) {
          sessionsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px 10px;">No saved study chats</div>`;
        }
        
        window.showToast('All offline database study logs wiped!', 'success');
      }
    );
  });

  // Run initial load
  initializeSettings();
});
