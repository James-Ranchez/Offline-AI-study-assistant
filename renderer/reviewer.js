/* Review Generator Renderer Logic */

document.addEventListener('DOMContentLoaded', () => {
  const notesTextarea = document.getElementById('reviewer-notes');
  const countSelect = document.getElementById('reviewer-count');
  const generateBtn = document.getElementById('reviewer-generate-btn');
  
  const tabButtons = document.querySelectorAll('.reviewer-tab');
  const resultsCard = document.getElementById('reviewer-results-card');
  const resultsTitleText = document.getElementById('results-title-text');
  const resultsContent = document.getElementById('reviewer-results-content');
  
  const copyBtn = document.getElementById('reviewer-copy-btn');
  const saveBtn = document.getElementById('reviewer-save-btn');

  let currentMode = 'mcq'; // 'mcq', 'open', or 'summary'
  let rawGeneratedText = ''; // Stores the exact AI output for copies/saves
  let isGenerating = false;

  // --- View Mode Tabs Switchers ---
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.getAttribute('data-mode');
    });
  });

  // --- Submissions Handler ---
  generateBtn.addEventListener('click', async () => {
    if (isGenerating) return;

    const notes = notesTextarea.value.trim();
    if (!notes) {
      window.showToast('Please paste some lesson notes first', 'error');
      return;
    }

    isGenerating = true;
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;
    
    // Reset view
    resultsCard.style.display = 'none';
    resultsContent.innerHTML = '';
    rawGeneratedText = '';

    // Choose prompt template based on mode selection
    let prompt = '';
    const num = countSelect.value;
    
    if (currentMode === 'mcq') {
      prompt = `Based on the following lesson notes, generate exactly ${num} multiple choice questions. 
Format each question exactly as:
Question [Number]: [Question text]
A) [Choice A]
B) [Choice B]
C) [Choice C]
D) [Choice D]
Answer: [Correct Letter, e.g. A]

Do not write any extra introduction or conclusion text. Only output the questions, choices, and answers in that exact structure.

Notes:
${notes}`;
      resultsTitleText.textContent = 'Interactive Study Quiz';
    } 
    else if (currentMode === 'open') {
      prompt = `Based on these notes, generate exactly 5 open-ended review questions with concise model answers. 
Format each question exactly as:
Q: [Question text]
A: [Model answer text]

Do not write any extra introduction or conclusion text.

Notes:
${notes}`;
      resultsTitleText.textContent = 'Open-Ended Review Accordions';
    } 
    else {
      prompt = `Summarize the following notes into 5 to 8 concise key points in bullet form. Be extremely brief, student-friendly, and use bullet points starting with the '•' character. 
Do not write any extra introduction or conclusion text.

Notes:
${notes}`;
      resultsTitleText.textContent = 'Key Points Bullet Summary';
    }

    // Temporary streaming bubble inside the results card
    resultsCard.style.display = 'block';
    resultsContent.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 16px; width: 100%;">
        <div class="dot-loader" style="display: flex; gap: 6px;">
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.2s;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.4s;"></span>
        </div>
        <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-secondary);" id="review-status-label">AI is building your study cards...</span>
      </div>
    `;

    // Trigger Generation stream
    Ollama.generate(
      prompt,
      // Chunk listener
      (chunk) => {
        rawGeneratedText += chunk;
      },
      // Completion listener
      () => {
        isGenerating = false;
        generateBtn.textContent = 'Generate Review';
        generateBtn.disabled = false;
        
        // Parse and render the completed raw string interactively
        renderReviewResults();
        window.showToast('Study cards generated successfully!');
      },
      // Error listener
      (err) => {
        isGenerating = false;
        generateBtn.textContent = 'Generate Review';
        generateBtn.disabled = false;
        resultsCard.style.display = 'none';
        
        const errMsg = Ollama.isMockMode 
          ? 'Failed generating mock reviews.'
          : 'Could not communicate with Ollama. Make sure the service is running.';
        
        window.showToast(errMsg, 'error');
      }
    );
  });

  // --- Interactive Parsers and Renderers ---

  function renderReviewResults() {
    resultsContent.innerHTML = '';

    if (currentMode === 'mcq') {
      const mcqs = parseMCQText(rawGeneratedText);
      
      if (mcqs.length === 0) {
        // Fallback: render raw text if formatting failed to parse
        resultsContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: var(--font-sans); color: var(--text-primary); line-height: 1.6;">${escapeHTML(rawGeneratedText)}</pre>`;
        return;
      }

      renderMCQQuiz(mcqs);
    } 
    else if (currentMode === 'open') {
      const questions = parseOpenQuestionsText(rawGeneratedText);
      
      if (questions.length === 0) {
        resultsContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: var(--font-sans); color: var(--text-primary); line-height: 1.6;">${escapeHTML(rawGeneratedText)}</pre>`;
        return;
      }

      renderOpenAccordions(questions);
    } 
    else {
      const bullets = parseSummaryBulletsText(rawGeneratedText);
      
      if (bullets.length === 0) {
        resultsContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: var(--font-sans); color: var(--text-primary); line-height: 1.6;">${escapeHTML(rawGeneratedText)}</pre>`;
        return;
      }

      renderSummaryBullets(bullets);
    }
  }

  // A. MCQ Parsing Engine
  function parseMCQText(text) {
    const mcqs = [];
    // Split text into question blocks based on Double Newlines or "Question [Num]:" markers
    const blocks = text.split(/(?=Question\s*\d+\s*:|\b\d+\.\s+Question:|\b\d+\.\s+)/i);

    blocks.forEach(block => {
      if (!block.trim()) return;

      // Extract Question Text
      const qMatch = block.match(/(?:Question\s*\d*\s*:|\b\d+\.\s+Question:|\b\d+\.\s+)?(.*?)(?=\b[A-D]\b[\)\.\:\-]\s*|$)/si);
      if (!qMatch) return;
      const question = qMatch[1].replace(/^\d+[\.\s]*/, '').trim();

      // Extract choices A, B, C, D
      const aMatch = block.match(/\bA\b[\)\.\:\-]\s*(.*?)(?=\bB\b[\)\.\:\-]\s*|$)/si);
      const bMatch = block.match(/\bB\b[\)\.\:\-]\s*(.*?)(?=\bC\b[\)\.\:\-]\s*|$)/si);
      const cMatch = block.match(/\bC\b[\)\.\:\-]\s*(.*?)(?=\bD\b[\)\.\:\-]\s*|$)/si);
      const dMatch = block.match(/\bD\b[\)\.\:\-]\s*(.*?)(?=\bAnswer\b|\bCorrect\b|$)/si);

      if (!aMatch || !bMatch || !cMatch || !dMatch) return;

      // Extract correct answer letter
      const ansMatch = block.match(/(?:Answer|Correct\s*Answer)[\s*\:\-]*\s*([A-D])\b/si);
      if (!ansMatch) return;

      mcqs.push({
        question: question,
        options: {
          A: aMatch[1].trim(),
          B: bMatch[1].trim(),
          C: cMatch[1].trim(),
          D: dMatch[1].trim()
        },
        correctAnswer: ansMatch[1].toUpperCase().trim()
      });
    });

    return mcqs;
  }

  // Renders interactive quiz
  function renderMCQQuiz(mcqs) {
    const quizArea = document.createElement('div');
    quizArea.className = 'mcq-quiz-area';

    let totalScore = 0;
    let questionsAnswered = 0;

    // Scorecard Banner Placeholder
    const scoreBanner = document.createElement('div');
    scoreBanner.className = 'mcq-score-banner';
    scoreBanner.innerHTML = `
      <span>Quiz Score Progress:</span>
      <span class="mcq-score-value"><span id="score-correct">0</span> / <span id="score-total">${mcqs.length}</span></span>
    `;
    quizArea.appendChild(scoreBanner);

    mcqs.forEach((mcq, qIdx) => {
      const card = document.createElement('div');
      card.className = 'mcq-card';
      
      card.innerHTML = `
        <div class="mcq-question">${qIdx + 1}. ${escapeHTML(mcq.question)}</div>
        <div class="mcq-options">
          <button class="mcq-option" data-letter="A"><span class="option-letter">A</span>${escapeHTML(mcq.options.A)}</button>
          <button class="mcq-option" data-letter="B"><span class="option-letter">B</span>${escapeHTML(mcq.options.B)}</button>
          <button class="mcq-option" data-letter="C"><span class="option-letter">C</span>${escapeHTML(mcq.options.C)}</button>
          <button class="mcq-option" data-letter="D"><span class="option-letter">D</span>${escapeHTML(mcq.options.D)}</button>
        </div>
      `;

      // Handle Option Selection
      const optionButtons = card.querySelectorAll('.mcq-option');
      optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.classList.contains('locked')) return;

          const chosenLetter = btn.getAttribute('data-letter');
          const isCorrect = chosenLetter === mcq.correctAnswer;
          
          questionsAnswered++;

          // Visual styles feedback
          optionButtons.forEach(b => {
            b.classList.add('locked'); // Lock further choices
            
            const bLetter = b.getAttribute('data-letter');
            if (bLetter === mcq.correctAnswer) {
              b.classList.add('correct'); // Show correct in green
            } else if (bLetter === chosenLetter && !isCorrect) {
              b.classList.add('selected-wrong'); // Show user selection in red if wrong
            }
          });

          // Tally score updates
          if (isCorrect) {
            totalScore++;
            document.getElementById('score-correct').textContent = totalScore;
            window.showToast(`Question ${qIdx + 1}: Correct!`);
          } else {
            window.showToast(`Question ${qIdx + 1}: Incorrect. Correct is ${mcq.correctAnswer}`, 'error');
          }

          // Full completion check
          if (questionsAnswered === mcqs.length) {
            setTimeout(() => {
              window.showToast(`Quiz completed! Final Score: ${totalScore} / ${mcqs.length}`, totalScore >= mcqs.length / 2 ? 'success' : 'error');
            }, 800);
          }
        });
      });

      quizArea.appendChild(card);
    });

    resultsContent.appendChild(quizArea);
  }

  // B. Open-Ended Questions Parsing Engine
  function parseOpenQuestionsText(text) {
    const qaPairs = [];
    // Split by lines and search for Q: and A:
    const lines = text.split('\n');
    let currentPair = null;

    lines.forEach(line => {
      const qMatch = line.match(/^\s*Q\s*[\:\-]\s*(.*)/i);
      const aMatch = line.match(/^\s*A\s*[\:\-]\s*(.*)/i);

      if (qMatch) {
        if (currentPair) qaPairs.push(currentPair);
        currentPair = { question: qMatch[1].trim(), answer: '' };
      } 
      else if (aMatch && currentPair) {
        currentPair.answer = aMatch[1].trim();
      } 
      else if (currentPair && line.trim() && !line.includes('Question')) {
        // Append extra multi-line text to answer
        currentPair.answer += ' ' + line.trim();
      }
    });

    if (currentPair) qaPairs.push(currentPair);
    return qaPairs;
  }

  // Renders expandable accordions
  function renderOpenAccordions(questions) {
    const area = document.createElement('div');
    area.className = 'open-questions-area';

    questions.forEach((pair, idx) => {
      const item = document.createElement('div');
      item.className = 'accordion-item';

      item.innerHTML = `
        <button class="accordion-trigger">
          <span class="accordion-question">${idx + 1}. ${escapeHTML(pair.question)}</span>
          <svg class="accordion-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="accordion-content">
          <div class="accordion-answer">${escapeHTML(pair.answer || 'No suggested answer generated')}</div>
        </div>
      `;

      // Expand accordion on click
      const trigger = item.querySelector('.accordion-trigger');
      trigger.addEventListener('click', () => {
        item.classList.toggle('active');
      });

      area.appendChild(item);
    });

    resultsContent.appendChild(area);
  }

  // C. Summarization Parser
  function parseSummaryBulletsText(text) {
    const bullets = [];
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Matches bullet marks like •, -, *, or numbered lists
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+[\.\)]/.test(trimmed)) {
        const clean = trimmed.replace(/^[\•\-\*\d+\.\)\s]*/, '').trim();
        if (clean) bullets.push(clean);
      }
    });

    // Fallback: if no bullet chars matches, slice text into single paragraphs
    if (bullets.length === 0) {
      lines.forEach(line => {
        if (line.trim().length > 15) bullets.push(line.trim());
      });
    }

    return bullets;
  }

  // Renders summaries as blocks
  function renderSummaryBullets(bullets) {
    const area = document.createElement('div');
    area.className = 'summary-area';

    bullets.forEach(bullet => {
      const div = document.createElement('div');
      div.className = 'summary-bullet';
      div.innerHTML = `
        <svg class="bullet-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>${escapeHTML(bullet)}</span>
      `;
      area.appendChild(div);
    });

    resultsContent.appendChild(area);
  }

  // Helper: Escapes raw HTML
  function escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Exports Actions ---

  // Copy to Clipboard
  copyBtn.addEventListener('click', () => {
    if (!rawGeneratedText) return;
    
    navigator.clipboard.writeText(rawGeneratedText)
      .then(() => {
        window.showToast('Copied raw review materials to clipboard!');
      })
      .catch(err => {
        window.showToast('Failed to copy to clipboard', 'error');
      });
  });

  // Save to text file in local documents directory
  saveBtn.addEventListener('click', async () => {
    if (!rawGeneratedText || !window.api) return;

    const defaultName = `StudyMind-Review-${Date.now()}.txt`;
    const result = await window.api.saveToFile(defaultName, rawGeneratedText);

    if (result.success) {
      window.showToast(`Review saved successfully!`);
    } else if (result.message !== 'Save cancelled') {
      window.showToast(`Failed to save: ${result.message}`, 'error');
    }
  });
});
