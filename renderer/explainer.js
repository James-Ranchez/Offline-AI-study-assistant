/* StudyMind Upgraded Topic Explainer Logic */

document.addEventListener('DOMContentLoaded', () => {
  const topicInput = document.getElementById('explainer-input');
  const topicCompareWrapper = document.getElementById('explainer-compare-wrapper');
  const topicCompareInput = document.getElementById('explainer-compare-input');
  const formatSelect = document.getElementById('explainer-format');
  const generateBtn = document.getElementById('explainer-generate-btn');
  const copyBtn = document.getElementById('explainer-copy-btn');
  const saveNoteBtn = document.getElementById('explainer-save-note-btn');

  const resultsCard = document.getElementById('explainer-results-card');
  const resultsTitle = document.getElementById('explainer-results-title');
  const resultsContent = document.getElementById('explainer-results-content');
  const emptyState = document.getElementById('explainer-empty-state');

  // Related questions sidebar
  const relatedQuestionsSidebar = document.getElementById('explainer-related-questions-sidebar');
  const relatedQuestionsList = document.getElementById('explainer-related-questions-list');

  // Go Deeper / Simplify More
  const goDeeperBtn = document.getElementById('explainer-go-deeper-btn');
  const simplifyMoreBtn = document.getElementById('explainer-simplify-btn');

  // Difficulty Level Buttons
  const btnSimple = document.getElementById('diff-simple');
  const btnStandard = document.getElementById('diff-standard');
  const btnAdvanced = document.getElementById('diff-advanced');

  let selectedLevel = 'Simple';
  let currentExplanationText = '';
  let activeTopic = '';
  let isGenerating = false;

  // Toggle difficulty buttons
  const diffButtons = [btnSimple, btnStandard, btnAdvanced];
  diffButtons.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedLevel = btn.getAttribute('data-level');
    });
  });

  // Handle quick start suggestions click
  const suggestionPills = document.querySelectorAll('.suggestion-pill');
  suggestionPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const topic = pill.getAttribute('data-topic');
      if (topicInput) {
        topicInput.value = topic;
        generateExplanation(topic);
      }
    });
  });

  // Toggle comparison second input based on format selection
  if (formatSelect) {
    formatSelect.addEventListener('change', () => {
      if (formatSelect.value === 'compare') {
        topicCompareWrapper.style.display = 'flex';
      } else {
        topicCompareWrapper.style.display = 'none';
      }
    });
  }

  // --- Generation Logic ---
  async function generateExplanation(overrideTopic = null, overridePrompt = null) {
    if (isGenerating) return;

    const topic = (overrideTopic || topicInput.value).trim();
    if (!topic) {
      window.showToast('Please type a topic first (e.g. photosynthesis)', 'warning');
      return;
    }

    activeTopic = topic;
    isGenerating = true;
    generateBtn.textContent = 'Explaining...';
    generateBtn.disabled = true;

    // Reset results views
    if (emptyState) emptyState.style.display = 'none';
    resultsCard.style.display = 'block';
    resultsContent.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; gap: 16px; width: 100%;">
        <div class="dot-loader" style="display: flex; gap: 6px;">
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.2s;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.4s;"></span>
        </div>
        <span style="font-weight: 700; font-size: 13px; color: var(--text-secondary);">AI is drafting your breakdown...</span>
      </div>
    `;
    
    // Hide side structures until done
    if (relatedQuestionsSidebar) relatedQuestionsSidebar.style.display = 'none';
    currentExplanationText = '';

    let prompt = '';
    
    if (overridePrompt) {
      prompt = overridePrompt;
      resultsTitle.textContent = `Explanation: ${topic}`;
    } else {
      const format = formatSelect.value;
      const compareTopic = topicCompareInput.value.trim();

      // Core instructions based on difficulty
      let diffInstruction = '';
      if (selectedLevel === 'Simple') {
        diffInstruction = 'Explain this concept at a basic level appropriate for a 10-year-old child. Use very simple language, relatable everyday analogies, and clear examples.';
      } else if (selectedLevel === 'Standard') {
        diffInstruction = 'Explain this concept at a high school student level. Use clear accessible language, structured details, and practical real-world applications.';
      } else {
        diffInstruction = 'Provide an advanced, technically detailed, and academic explanation appropriate for college level. Use precise terminology and explore underlying mechanisms.';
      }

      // Formatting variations
      if (format === 'explain') {
        prompt = `Explain the concept of "${topic}". ${diffInstruction} Do not write any extra introduction or conclusion.`;
        resultsTitle.textContent = `${selectedLevel} Explanation: ${topic}`;
      } else if (format === 'steps') {
        prompt = `Provide a step-by-step breakdown explaining "${topic}". ${diffInstruction} Break it down into logical sequential steps. Do not write any extra introduction or conclusion.`;
        resultsTitle.textContent = `Step-by-Step Breakdown: ${topic}`;
      } else if (format === 'compare') {
        prompt = `Compare and contrast the concept of "${topic}" with "${compareTopic}". ${diffInstruction} Highlight key similarities and differences clearly. Do not write any extra introduction or conclusion.`;
        resultsTitle.textContent = `Comparison: ${topic} vs ${compareTopic}`;
      } else if (format === 'misconceptions') {
        prompt = `Explain common misconceptions and errors students make about the topic "${topic}", and explain the correct physics or facts. ${diffInstruction} Do not write any extra introduction or conclusion.`;
        resultsTitle.textContent = `Misconceptions: ${topic}`;
      } else if (format === 'examples') {
        prompt = `Explain "${topic}" by providing concrete, practical, real-world examples. ${diffInstruction} Focus on clear cases that make it easy to understand. Do not write any extra introduction or conclusion.`;
        resultsTitle.textContent = `Examples: ${topic}`;
      }
    }

    Ollama.generate(
      prompt,
      // Chunk listener
      (chunk) => {
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

        // Generate related questions in background
        generateRelatedQuestions(activeTopic, currentExplanationText);
        
        // Log study session in progress tracker
        window.StudyStorage.logStudySession({
          date: new Date().toISOString().split('T')[0],
          type: 'chat',
          duration: 180, // Estimate 3 minutes spent reading/generating topic explanations
          score: null
        });
      },
      // Error listener
      () => {
        isGenerating = false;
        generateBtn.textContent = 'Explain Concept';
        generateBtn.disabled = false;
        resultsCard.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        window.showToast('Could not reach Ollama offline engine.', 'error');
      }
    );
  }

  // Related questions generation
  function generateRelatedQuestions(topic, explanation) {
    if (!relatedQuestionsSidebar || !relatedQuestionsList) return;

    relatedQuestionsList.innerHTML = `<span style="font-size:11px; color:var(--text-muted);">Generating related questions...</span>`;
    relatedQuestionsSidebar.style.display = 'block';

    const prompt = `Based on this explanation of "${topic}", generate exactly 3 simple follow-up questions a student might ask to understand it deeper. Return only the questions, each on a new line starting with 'Q:'. Do not write introduction text.
Explanation:
${explanation.substring(0, 300)}`;

    let responseText = '';

    Ollama.generate(
      prompt,
      // Chunk listener
      (chunk) => {
        responseText += chunk;
      },
      // Completion listener
      () => {
        relatedQuestionsList.innerHTML = '';
        const lines = responseText.split('\n');
        let questionsCount = 0;

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;

          const match = trimmed.match(/^Q\s*[\:\-]\s*(.*)/i);
          if (match && questionsCount < 3) {
            questionsCount++;
            const li = document.createElement('li');
            li.className = 'related-question-item';
            li.textContent = match[1].trim();
            li.addEventListener('click', () => {
              topicInput.value = li.textContent;
              generateExplanation(li.textContent);
            });

            relatedQuestionsList.appendChild(li);
          }
        });

        if (questionsCount === 0) {
          relatedQuestionsSidebar.style.display = 'none';
        }
      },
      // Error
      () => {
        relatedQuestionsSidebar.style.display = 'none';
      }
    );
  }

  // --- Go Deeper / Simplify More ---
  goDeeperBtn.addEventListener('click', () => {
    if (!currentExplanationText || isGenerating) return;
    const prompt = `Based on this explanation, explain it in more detail, providing advanced details, mechanics, and technical insights:
${currentExplanationText.substring(0, 800)}`;
    generateExplanation(activeTopic, prompt);
  });

  simplifyMoreBtn.addEventListener('click', () => {
    if (!currentExplanationText || isGenerating) return;
    const prompt = `Based on this explanation, explain it even more simply, using extremely simple analogies and basic vocabulary appropriate for a very young child:
${currentExplanationText.substring(0, 800)}`;
    generateExplanation(activeTopic, prompt);
  });

  // --- Actions ---

  generateBtn.addEventListener('click', () => generateExplanation());

  // Copy to clipboard
  copyBtn.addEventListener('click', () => {
    if (!currentExplanationText) return;
    navigator.clipboard.writeText(currentExplanationText).then(() => {
      window.showToast('Copied explanation to clipboard!');
    });
  });

  // Save directly to notes
  saveNoteBtn.addEventListener('click', () => {
    if (!currentExplanationText) return;
    
    const newNote = {
      id: 'note-' + Date.now(),
      title: `Explanation: ${activeTopic}`,
      content: currentExplanationText,
      subject: selectedLevel === 'Advanced' ? 'Science' : 'Other',
      tags: ['topic-explainer'],
      wordCount: currentExplanationText.split(/\s+/).filter(Boolean).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    window.StudyStorage.saveNote(newNote);
    window.showToast('✓ Saved directly to My Notes!');
  });

  // Formatting helpers
  function escapeHTML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatAIResponseText(text) {
    if (!text) return '';
    let escaped = escapeHTML(text);
    
    // 1. Extract code blocks to prevent formatting inside code
    const codeBlocks = [];
    escaped = escaped.replace(/```([\s\S]*?)```/g, (match, code) => {
      const id = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(`<pre><code>${code}</code></pre>`);
      return id;
    });

    // 2. Extract inline code
    const inlineCodes = [];
    escaped = escaped.replace(/`(.*?)`/g, (match, code) => {
      const id = `__INLINE_CODE_${inlineCodes.length}__`;
      inlineCodes.push(`<code>${code}</code>`);
      return id;
    });

    // 3. Headings
    escaped = escaped.replace(/^(?:###)\s+(.*?)$/gm, '<h5 style="margin-top:12px; margin-bottom:4px; color: var(--text-primary); font-size:1.05rem; font-weight:700;">$1</h5>');
    escaped = escaped.replace(/^(?:##)\s+(.*?)$/gm, '<h4 style="margin-top:14px; margin-bottom:6px; color: var(--accent); font-size:1.15rem; font-weight:700;">$1</h4>');
    escaped = escaped.replace(/^(?:#)\s+(.*?)$/gm, '<h3 style="margin-top:16px; margin-bottom:8px; color: var(--accent); font-size:1.25rem; font-weight:700;">$1</h3>');

    // 4. Bold matching: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 5. Italic matching: *text* or _text_
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>');

    // 6. Bullet lists
    escaped = escaped.replace(/^\s*[-*•]\s+(.*?)$/gm, '<div style="margin-left: 12px; margin-top: 4px; margin-bottom: 4px;">• $1</div>');

    // 7. Numbered lists
    escaped = escaped.replace(/^\s*(\d+)\.\s+(.*?)$/gm, '<div style="margin-left: 12px; margin-top: 4px; margin-bottom: 4px;">$1. $2</div>');

    // 8. Blockquotes: > text
    escaped = escaped.replace(/^\s*>\s+(.*?)$/gm, '<blockquote style="border-left: 3px solid var(--border); padding-left: 10px; margin: 8px 0; color: var(--text-secondary);">$1</blockquote>');

    // 9. Standard line breaks
    escaped = escaped.replace(/\n/g, '<br>');

    // 10. Clean up trailing <br> directly after block formatting tags
    escaped = escaped.replace(/(<\/h[345]>|<div.*?>.*?<\/div>|<blockquote.*?>.*?<\/blockquote>)<br>/g, '$1');

    // 11. Restore code blocks and inline code
    inlineCodes.forEach((html, i) => {
      escaped = escaped.replace(`__INLINE_CODE_${i}__`, html);
    });
    codeBlocks.forEach((html, i) => {
      escaped = escaped.replace(`__CODE_BLOCK_${i}__`, html);
    });

    return escaped;
  }
});
