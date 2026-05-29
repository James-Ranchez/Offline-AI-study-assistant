/* Topic Explainer Renderer Logic */

document.addEventListener('DOMContentLoaded', () => {
  const topicInput = document.getElementById('explainer-input');
  const generateBtn = document.getElementById('explainer-generate-btn');
  const copyBtn = document.getElementById('explainer-copy-btn');
  
  const resultsCard = document.getElementById('explainer-results-card');
  const resultsTitle = document.getElementById('explainer-results-title');
  const resultsContent = document.getElementById('explainer-results-content');
  
  // Difficulty Level Buttons
  const btnSimple = document.getElementById('diff-simple');
  const btnStandard = document.getElementById('diff-standard');
  const btnAdvanced = document.getElementById('diff-advanced');
  
  let selectedLevel = 'Simple'; // Default
  let currentExplanationText = '';
  let isGenerating = false;

  // --- Difficulty Selectors UI Toggles ---
  const diffButtons = [btnSimple, btnStandard, btnAdvanced];
  
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedLevel = btn.getAttribute('data-level');
    });
  });

  // --- Generation Logic ---
  generateBtn.addEventListener('click', async () => {
    if (isGenerating) return;

    const topic = topicInput.value.trim();
    if (!topic) {
      window.showToast('Please type a topic first (e.g. quantum computing)', 'error');
      return;
    }

    isGenerating = true;
    generateBtn.textContent = 'Explaining...';
    generateBtn.disabled = true;
    
    // Reset view
    resultsCard.style.display = 'none';
    resultsContent.textContent = '';
    currentExplanationText = '';

    // Choose prompt based on difficulty levels
    let prompt = '';
    if (selectedLevel === 'Simple') {
      prompt = `Explain the concept of "${topic}" at a simple level, as if explaining to a 10-year-old child. 
Use very basic vocabulary, a highly engaging and friendly tone, relatable everyday analogies, and clear simple examples.`;
      resultsTitle.textContent = `Simple Explanation: ${topic} 🟢`;
    } 
    else if (selectedLevel === 'Standard') {
      prompt = `Explain the concept of "${topic}" at a standard high school student level. 
Use clear accessible language, interesting analogies, structured explanations, and practical real-world applications.`;
      resultsTitle.textContent = `Standard Explanation: ${topic} 🟡`;
    } 
    else {
      prompt = `Provide an advanced, highly academic, and technically detailed explanation of the concept of "${topic}" appropriate for college level. 
Use precise scientific terminology, describe the underlying mechanisms, trace equations or key frameworks if applicable, and analyze technical implications.`;
      resultsTitle.textContent = `Advanced Explanation: ${topic} 🔴`;
    }

    // Reveal output card
    resultsCard.style.display = 'block';
    resultsContent.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 16px; width: 100%;">
        <div class="dot-loader" style="display: flex; gap: 6px;">
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.2s;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.4s;"></span>
        </div>
        <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-secondary);">AI is drafting your explanation...</span>
      </div>
    `;

    // Stream generation
    Ollama.generate(
      prompt,
      // Chunk listener
      (chunk) => {
        // Clear loader on first token arrival
        if (currentExplanationText === '') {
          resultsContent.innerHTML = '';
        }
        
        currentExplanationText += chunk;
        resultsContent.innerHTML = formatAIResponseText(currentExplanationText);
      },
      // Completion listener
      () => {
        isGenerating = false;
        generateBtn.textContent = 'Explain Concept';
        generateBtn.disabled = false;
        window.showToast('Concept explained successfully!');
      },
      // Error listener
      (err) => {
        isGenerating = false;
        generateBtn.textContent = 'Explain Concept';
        generateBtn.disabled = false;
        resultsCard.style.display = 'none';
        
        const errMsg = Ollama.isMockMode 
          ? 'Failed generating mock explanation.'
          : 'Could not communicate with Ollama. Ensure service is active.';
          
        window.showToast(errMsg, 'error');
      }
    );
  });

  // --- Copy Actions ---
  copyBtn.addEventListener('click', () => {
    if (!currentExplanationText) return;
    
    navigator.clipboard.writeText(currentExplanationText)
      .then(() => {
        window.showToast('Copied explanation to clipboard!');
      })
      .catch(err => {
        window.showToast('Failed to copy text', 'error');
      });
  });

  // Helper: Escapes raw HTML
  function escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Simplistic markdown formatting converter (Bold, Lists, Headers)
  function formatAIResponseText(text) {
    let escaped = escapeHTML(text);
    
    // Bold matching: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Bullet points: \n* or \n•
    escaped = escaped.replace(/\n[•\*]\s*(.*?)(?=\n|$)/g, '<br>• $1');
    
    // Numbered listings
    escaped = escaped.replace(/\n(\d+)\.\s*(.*?)(?=\n|$)/g, '<br>$1. $2');

    // Headers
    escaped = escaped.replace(/\n###\s*(.*?)(?=\n|$)/g, '<h4 style="margin-top:14px; margin-bottom:6px; color: var(--color-primary); font-size:1.1rem;">$1</h4>');
    
    return escaped;
  }
});
