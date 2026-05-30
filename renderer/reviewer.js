/* StudyMind Upgraded Review Maker Wizard Logic */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Nodes
  const stepNodes = document.querySelectorAll('.wizard-step-node');
  const stepLines = document.querySelectorAll('.wizard-line');
  const stepPanels = document.querySelectorAll('.wizard-step-panel');

  // Step 1: Input elements
  const notesTextarea = document.getElementById('reviewer-notes');
  const wordCountDisplay = document.getElementById('reviewer-word-count');
  const subjectPills = document.querySelectorAll('.subject-pill');
  const modePills = document.querySelectorAll('.config-pill[data-mode]');
  const nextToStep2Btn = document.getElementById('reviewer-step1-next');

  // Step 2: Configure elements
  const countSlider = document.getElementById('reviewer-count');
  const countDisplay = document.getElementById('reviewer-count-val');
  const diffPills = document.querySelectorAll('.config-pill[data-diff]');
  const langPills = document.querySelectorAll('.config-pill[data-lang]');
  const backToStep1Btn = document.getElementById('reviewer-step2-back');
  const generateBtn = document.getElementById('reviewer-generate-btn');

  // Step 3: Results Elements
  const resultsCard = document.getElementById('reviewer-results-card');
  const resultsTitleText = document.getElementById('results-title-text');
  const resultsContent = document.getElementById('reviewer-results-content');
  const copyBtn = document.getElementById('reviewer-copy-btn');
  const saveBtn = document.getElementById('reviewer-save-btn');
  const restartBtn = document.getElementById('reviewer-restart-btn');

  // State Management
  let currentStep = 1;
  let selectedSubject = 'Science';
  let selectedMode = 'mcq'; // mcq | open | summary | mixed
  let selectedDifficulty = 'Medium'; // Easy | Medium | Hard
  let selectedLanguage = 'English'; // English | Filipino | Taglish
  
  let rawGeneratedText = '';
  let parsedQuestions = [];
  let currentQuizIndex = 0;
  let userScore = 0;
  let wrongAnswersLog = []; // Stores questions got wrong for review
  let selfRatedKnownCount = 0;
  let selfRatedLearningCount = 0;
  let isGenerating = false;

  // --- 1. Step Navigation Mechanics ---
  function goToStep(step) {
    currentStep = step;
    
    // Update step node classes
    stepNodes.forEach((node, idx) => {
      node.className = 'wizard-step-node';
      if (idx + 1 === step) {
        node.classList.add('active');
      } else if (idx + 1 < step) {
        node.classList.add('completed');
      }
    });

    // Update progress lines
    stepLines.forEach((line, idx) => {
      line.className = 'wizard-line';
      if (idx + 1 < step) {
        line.classList.add('active');
      }
    });

    // Swap panels
    stepPanels.forEach((panel, idx) => {
      panel.className = 'wizard-step-panel';
      if (idx + 1 === step) {
        panel.classList.add('active');
      }
    });
  }

  // --- Step 1: Input Handlers ---
  
  // Track notes textarea word count
  notesTextarea.addEventListener('input', () => {
    const text = notesTextarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    wordCountDisplay.textContent = `${words} words`;
  });

  // Subject Tag Pill Selector
  subjectPills.forEach(pill => {
    pill.addEventListener('click', () => {
      subjectPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedSubject = pill.getAttribute('data-subject');
    });
  });

  // Mode Selector Tabs
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedMode = pill.getAttribute('data-mode');
    });
  });

  // Next Step 1 Button
  nextToStep2Btn.addEventListener('click', () => {
    const notes = notesTextarea.value.trim();
    if (!notes) {
      window.showToast('Please paste or write some study notes first.', 'warning');
      return;
    }
    goToStep(2);
  });

  // --- Step 2: Configure Handlers ---

  // Questions count slider indicator
  countSlider.addEventListener('input', () => {
    countDisplay.textContent = countSlider.value;
  });

  // Difficulty Selector pills
  diffPills.forEach(pill => {
    pill.addEventListener('click', () => {
      diffPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedDifficulty = pill.getAttribute('data-diff');
    });
  });

  // Language Selector pills
  langPills.forEach(pill => {
    pill.addEventListener('click', () => {
      langPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedLanguage = pill.getAttribute('data-lang');
    });
  });

  // Back button in Step 2
  backToStep1Btn.addEventListener('click', () => {
    goToStep(1);
  });

  // --- Step 3: Run Generation and Display Results ---
  generateBtn.addEventListener('click', async () => {
    if (isGenerating) return;

    const notes = notesTextarea.value.trim();
    
    // Set UI Loading state
    isGenerating = true;
    generateBtn.textContent = 'Generating review...';
    generateBtn.disabled = true;
    goToStep(3);

    // Reset results structures
    resultsTitleText.textContent = `Generating review for ${selectedSubject}`;
    resultsContent.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; gap: 16px; width: 100%;">
        <div class="dot-loader" style="display: flex; gap: 6px;">
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.2s;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.4s;"></span>
        </div>
        <span style="font-weight: 700; font-size: 13px; color: var(--text-secondary);">StudyMind is reading your notes and creating material...</span>
      </div>
    `;

    // Construct detailed prompt based on mode, count, difficulty, and language
    const numQ = countSlider.value;
    let diffPrompt = '';
    if (selectedDifficulty === 'Easy') diffPrompt = 'Use simple, straightforward questions.';
    if (selectedDifficulty === 'Medium') diffPrompt = 'Include some application and reasoning questions.';
    if (selectedDifficulty === 'Hard') diffPrompt = 'Prioritize analysis, comparison, and critical thinking questions.';

    let langPrompt = `Output should be written in ${selectedLanguage}.`;
    if (selectedLanguage === 'Taglish') langPrompt = 'Output should be written in conversational Taglish (a blend of English and Filipino).';

    let prompt = '';
    
    if (selectedMode === 'mcq') {
      prompt = `Based on the following notes, generate exactly ${numQ} multiple choice questions. ${diffPrompt} ${langPrompt}
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
    } 
    else if (selectedMode === 'open') {
      prompt = `Based on these notes, generate exactly ${numQ} open-ended review questions with concise answers. ${diffPrompt} ${langPrompt}
Format each question exactly as:
Q: [Question text]
A: [Model answer text]

Do not write any extra introduction or conclusion text.

Notes:
${notes}`;
    } 
    else if (selectedMode === 'summary') {
      prompt = `Based on these notes, summarize the contents into exactly ${numQ} key points in bullet form. Make them concise, student-friendly, and start each line with the '•' character. ${langPrompt}
Do not write any extra introduction or conclusion text.

Notes:
${notes}`;
    }
    else if (selectedMode === 'mixed') {
      const halfCount = Math.max(3, Math.round(numQ / 2));
      prompt = `Based on these notes, compile a Mixed Review Sheet containing exactly ${halfCount} Multiple Choice Questions and ${halfCount} Key Outline Bullet Points. ${diffPrompt} ${langPrompt}
Format the MCQs exactly as:
Question [Number]: [Question text]
A) [Choice A]
B) [Choice B]
C) [Choice C]
D) [Choice D]
Answer: [Correct Letter, e.g. A]

Format the Bullet Points exactly as lines starting with the '•' character.
Do not write any extra introduction or conclusion text.

Notes:
${notes}`;
    }

    rawGeneratedText = '';

    // Invoke stream
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
        
        // Parse and render results
        renderResults();
        window.showToast('✓ Review materials generated!');
      },
      // Error listener
      (err) => {
        isGenerating = false;
        generateBtn.textContent = 'Generate Review';
        generateBtn.disabled = false;
        goToStep(2);
        
        const errMsg = Ollama.isMockMode
          ? 'Demo Mock reviews generation failed.'
          : 'Could not communicate with Ollama. Make sure the service is active.';
        window.showToast(errMsg, 'error');
      }
    );
  });

  // Parse raw text and render the proper mode view
  function renderResults() {
    resultsContent.innerHTML = '';
    parsedQuestions = [];
    currentQuizIndex = 0;
    userScore = 0;
    wrongAnswersLog = [];
    selfRatedKnownCount = 0;
    selfRatedLearningCount = 0;

    if (selectedMode === 'mcq') {
      resultsTitleText.textContent = `Multiple Choice Quiz: ${selectedSubject}`;
      parsedQuestions = parseMCQText(rawGeneratedText);
      if (parsedQuestions.length === 0) {
        renderRawTextFallback();
        return;
      }
      renderMCQQuestion(0);
    } 
    else if (selectedMode === 'open') {
      resultsTitleText.textContent = `Open-Ended Cards: ${selectedSubject}`;
      parsedQuestions = parseOpenQuestionsText(rawGeneratedText);
      if (parsedQuestions.length === 0) {
        renderRawTextFallback();
        return;
      }
      renderOpenQuestion(0);
    } 
    else if (selectedMode === 'summary') {
      resultsTitleText.textContent = `Bullet Summary: ${selectedSubject}`;
      const bullets = parseSummaryBulletsText(rawGeneratedText);
      if (bullets.length === 0) {
        renderRawTextFallback();
        return;
      }
      renderSummaryOutline(bullets);
    }
    else if (selectedMode === 'mixed') {
      resultsTitleText.textContent = `Mixed Review Sheet: ${selectedSubject}`;
      
      // Mixed mode contains both MCQs and summary bullets
      const mcqs = parseMCQText(rawGeneratedText);
      const bullets = parseSummaryBulletsText(rawGeneratedText);
      
      if (mcqs.length === 0 && bullets.length === 0) {
        renderRawTextFallback();
        return;
      }
      renderMixedReview(mcqs, bullets);
    }
  }

  function renderRawTextFallback() {
    resultsContent.innerHTML = `
      <div style="font-size:13px; color: var(--text-secondary); margin-bottom: 12px;">Failed to parse structured format. Showing raw output:</div>
      <pre style="white-space: pre-wrap; font-family: var(--font-mono); color: var(--text-primary); line-height: 1.6; background-color: var(--bg-tertiary); padding: 16px; border-radius: var(--radius-md); border:1px solid var(--border);">${escapeHTML(rawGeneratedText)}</pre>
    `;
  }

  // --- Parsers ---

  // MCQ Parser
  function parseMCQText(text) {
    const mcqs = [];
    const blocks = text.split(/(?=Question\s*\d+\s*:|\b\d+\.\s+Question:|\b\d+\.\s+)/i);

    blocks.forEach(block => {
      if (!block.trim()) return;

      const qMatch = block.match(/(?:Question\s*\d*\s*:|\b\d+\.\s+Question:|\b\d+\.\s+)?(.*?)(?=\b[A-D]\b[\)\.\:\-]\s*|$)/si);
      if (!qMatch) return;
      const question = qMatch[1].replace(/^\d+[\.\s]*/, '').trim();

      const aMatch = block.match(/\bA\b[\)\.\:\-]\s*(.*?)(?=\bB\b[\)\.\:\-]\s*|$)/si);
      const bMatch = block.match(/\bB\b[\)\.\:\-]\s*(.*?)(?=\bC\b[\)\.\:\-]\s*|$)/si);
      const cMatch = block.match(/\bC\b[\)\.\:\-]\s*(.*?)(?=\bD\b[\)\.\:\-]\s*|$)/si);
      const dMatch = block.match(/\bD\b[\)\.\:\-]\s*(.*?)(?=\bAnswer\b|\bCorrect\b|$)/si);

      if (!aMatch || !bMatch || !cMatch || !dMatch) return;

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

  // Open Ended Parser
  function parseOpenQuestionsText(text) {
    const qaPairs = [];
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
        currentPair.answer += ' ' + line.trim();
      }
    });

    if (currentPair) qaPairs.push(currentPair);
    return qaPairs;
  }

  // Summary bullets parser
  function parseSummaryBulletsText(text) {
    const bullets = [];
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+[\.\)]/.test(trimmed)) {
        const clean = trimmed.replace(/^[\•\-\*\d+\.\)\s]*/, '').trim();
        if (clean) bullets.push(clean);
      }
    });

    // Fallback split by paragraph
    if (bullets.length === 0) {
      lines.forEach(line => {
        if (line.trim().length > 15 && !line.includes('Question') && !line.includes('Answer:')) {
          bullets.push(line.trim());
        }
      });
    }

    return bullets;
  }

  // --- Renderers ---

  // A. MCQ Question Card Builder
  function renderMCQQuestion(index) {
    if (index >= parsedQuestions.length) {
      renderQuizResultsScreen();
      return;
    }

    currentQuizIndex = index;
    const mcq = parsedQuestions[index];
    const progressPercent = Math.round((index / parsedQuestions.length) * 100);

    resultsContent.innerHTML = `
      <div class="mcq-question-card">
        <div class="quiz-progress-wrapper">
          <div class="quiz-progress-text">
            <span>Question ${index + 1} of ${parsedQuestions.length}</span>
            <span>Score: ${userScore} / ${index}</span>
          </div>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
        
        <div class="mcq-question-title">${escapeHTML(mcq.question)}</div>
        
        <div class="mcq-choices-list">
          <div class="choice-card" data-letter="A"><span class="choice-letter">A</span>${escapeHTML(mcq.options.A)}</div>
          <div class="choice-card" data-letter="B"><span class="choice-letter">B</span>${escapeHTML(mcq.options.B)}</div>
          <div class="choice-card" data-letter="C"><span class="choice-letter">C</span>${escapeHTML(mcq.options.C)}</div>
          <div class="choice-card" data-letter="D"><span class="choice-letter">D</span>${escapeHTML(mcq.options.D)}</div>
        </div>
      </div>
    `;

    // Add click listeners to choices
    const choiceCards = resultsContent.querySelectorAll('.choice-card');
    choiceCards.forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('locked')) return;

        const letter = card.getAttribute('data-letter');
        const isCorrect = letter === mcq.correctAnswer;
        
        // Lock selections
        choiceCards.forEach(c => {
          c.classList.add('locked');
          if (c.getAttribute('data-letter') === mcq.correctAnswer) {
            c.classList.add('correct');
          }
        });

        if (isCorrect) {
          userScore++;
          window.showToast('✓ Correct!', 'success');
        } else {
          card.classList.add('wrong');
          wrongAnswersLog.push({
            question: mcq.question,
            options: mcq.options,
            correctAnswer: mcq.correctAnswer,
            userAnswer: letter
          });
          window.showToast(`✗ Wrong! Correct answer was ${mcq.correctAnswer}`, 'error');
        }

        // Wait 1.5 seconds then load next question
        setTimeout(() => {
          renderMCQQuestion(index + 1);
        }, 1500);
      });
    });
  }

  // Quiz end screen
  function renderQuizResultsScreen(showOnlyWrong = false) {
    const totalQ = parsedQuestions.length;
    const pct = Math.round((userScore / totalQ) * 100);
    
    let gradeMsg = 'Very Good!';
    let badge = '🧠';
    
    if (pct === 100) {
      gradeMsg = 'Perfect Score!';
      badge = '🏆';
    } else if (pct >= 80) {
      gradeMsg = 'Excellent Job!';
      badge = '🌟';
    } else if (pct >= 50) {
      gradeMsg = 'Passed! Keep studying.';
      badge = '📚';
    } else {
      gradeMsg = 'Needs Improvement.';
      badge = '💡';
    }

    // Save score in local Storage
    window.StudyStorage.saveReviewSession({
      id: 'review-' + Date.now(),
      subject: selectedSubject,
      mode: selectedMode,
      difficulty: selectedDifficulty,
      questions: totalQ,
      score: pct
    });

    resultsContent.innerHTML = `
      <div class="quiz-results-view">
        <div class="grade-badge">${badge}</div>
        <div class="results-score-text">${userScore} / ${totalQ}</div>
        <div class="results-grade-text">${pct}% — ${gradeMsg}</div>
        <div class="results-meta-desc">You completed the review session for ${selectedSubject} at ${selectedDifficulty} level.</div>
        
        <div class="results-actions-row">
          <button class="btn-primary" id="results-try-again-btn">Try Again</button>
          ${wrongAnswersLog.length > 0 ? `<button class="btn-secondary" id="results-wrong-btn">Review Wrong Answers (${wrongAnswersLog.length})</button>` : ''}
          <button class="btn-secondary" id="results-export-btn">Export Results</button>
        </div>
      </div>
    `;

    document.getElementById('results-try-again-btn').addEventListener('click', () => {
      // reshuffles and restarts
      parsedQuestions.sort(() => Math.random() - 0.5);
      userScore = 0;
      wrongAnswersLog = [];
      renderMCQQuestion(0);
    });

    const wrongBtn = document.getElementById('results-wrong-btn');
    if (wrongBtn) {
      wrongBtn.addEventListener('click', () => {
        renderWrongAnswersLogView();
      });
    }

    document.getElementById('results-export-btn').addEventListener('click', () => {
      exportScoreCard();
    });
  }

  // Wrong Answers Viewer
  function renderWrongAnswersLogView() {
    resultsContent.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="font-weight:700; font-size:16px; color:var(--danger);">Review Wrong Answers</div>
        <div class="mcq-quiz-area">
          ${wrongAnswersLog.map((w, idx) => `
            <div class="mcq-card" style="border-left: 4px solid var(--danger);">
              <div class="mcq-question">${idx + 1}. ${escapeHTML(w.question)}</div>
              <div class="mcq-options">
                <div class="mcq-option locked ${w.userAnswer === 'A' ? 'selected-wrong' : ''} ${w.correctAnswer === 'A' ? 'correct' : ''}"><span class="option-letter">A</span>${escapeHTML(w.options.A)}</div>
                <div class="mcq-option locked ${w.userAnswer === 'B' ? 'selected-wrong' : ''} ${w.correctAnswer === 'B' ? 'correct' : ''}"><span class="option-letter">B</span>${escapeHTML(w.options.B)}</div>
                <div class="mcq-option locked ${w.userAnswer === 'C' ? 'selected-wrong' : ''} ${w.correctAnswer === 'C' ? 'correct' : ''}"><span class="option-letter">C</span>${escapeHTML(w.options.C)}</div>
                <div class="mcq-option locked ${w.userAnswer === 'D' ? 'selected-wrong' : ''} ${w.correctAnswer === 'D' ? 'correct' : ''}"><span class="option-letter">D</span>${escapeHTML(w.options.D)}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" id="back-to-results-btn" style="align-self:flex-start;">Back to Results</button>
      </div>
    `;

    document.getElementById('back-to-results-btn').addEventListener('click', () => {
      renderQuizResultsScreen();
    });
  }

  // B. Open-Ended Question Card Builder
  function renderOpenQuestion(index) {
    if (index >= parsedQuestions.length) {
      renderOpenEndedFinishedScreen();
      return;
    }

    currentQuizIndex = index;
    const pair = parsedQuestions[index];

    resultsContent.innerHTML = `
      <div class="open-question-card">
        <div style="font-size: 12px; font-weight:700; color: var(--text-secondary); margin-bottom: 8px;">Question ${index + 1} of ${parsedQuestions.length}</div>
        <div class="card" style="padding: 24px; min-height: 140px; justify-content: center; font-weight: 700; font-size:16px;">
          ${escapeHTML(pair.question)}
        </div>
        
        <button class="btn-secondary" id="reveal-answer-btn" style="align-self: center;">Reveal Answer</button>
        
        <div class="open-answer-reveal-box" id="open-answer-reveal-box">
          <div style="font-weight: 700; color: var(--accent); margin-bottom: 8px;">Suggested Answer:</div>
          <div>${escapeHTML(pair.answer)}</div>
        </div>

        <div class="self-rate-actions" id="self-rate-actions" style="display: none; margin-top: 12px;">
          <button class="btn-primary" id="rate-known-btn" style="background-color: var(--success);">Got It ✓</button>
          <button class="btn-secondary" id="rate-learning-btn" style="border-color: var(--warning); color: var(--warning);">Still Learning</button>
        </div>
      </div>
    `;

    const revealBtn = document.getElementById('reveal-answer-btn');
    const answerBox = document.getElementById('open-answer-reveal-box');
    const actionsBox = document.getElementById('self-rate-actions');

    revealBtn.addEventListener('click', () => {
      answerBox.classList.add('active');
      actionsBox.style.display = 'flex';
      revealBtn.style.display = 'none';
    });

    document.getElementById('rate-known-btn').addEventListener('click', () => {
      selfRatedKnownCount++;
      renderOpenQuestion(index + 1);
    });

    document.getElementById('rate-learning-btn').addEventListener('click', () => {
      selfRatedLearningCount++;
      renderOpenQuestion(index + 1);
    });
  }

  function renderOpenEndedFinishedScreen() {
    resultsContent.innerHTML = `
      <div class="quiz-results-view">
        <div class="grade-badge">🎓</div>
        <div class="results-score-text">Open Review Completed</div>
        <div class="results-meta-desc">You went through ${parsedQuestions.length} review questions.</div>
        
        <div style="display:flex; gap:24px; margin: 12px 0;">
          <div style="text-align:center;">
            <div style="font-size:24px; font-weight:800; color:var(--success);">${selfRatedKnownCount}</div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Marked as Known</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:24px; font-weight:800; color:var(--warning);">${selfRatedLearningCount}</div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Still Learning</div>
          </div>
        </div>

        <button class="btn-primary" id="results-try-again-btn">Try Again</button>
      </div>
    `;

    document.getElementById('results-try-again-btn').addEventListener('click', () => {
      parsedQuestions.sort(() => Math.random() - 0.5);
      selfRatedKnownCount = 0;
      selfRatedLearningCount = 0;
      renderOpenQuestion(0);
    });
  }

  // C. Summary Outline Builder
  function renderSummaryOutline(bullets) {
    const wrapper = document.createElement('div');
    wrapper.className = 'summary-outline-card';

    bullets.forEach(bullet => {
      const card = document.createElement('div');
      card.className = 'summary-outline-bullet';
      card.innerHTML = `
        <span style="color:var(--accent); font-size:16px; margin-right:4px;">•</span>
        <span style="flex-grow:1;">${escapeHTML(bullet)}</span>
        <div class="bullet-copy-icon" title="Copy Bullet">
          <svg viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H14m0 0l3-3m-3 3l3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      `;

      card.querySelector('.bullet-copy-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(bullet).then(() => {
          window.showToast('Copied point to clipboard!');
        });
      });

      wrapper.appendChild(card);
    });

    resultsContent.appendChild(wrapper);
  }

  // D. Mixed Review Sheet Builder
  function renderMixedReview(mcqs, bullets) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '20px';

    if (mcqs.length > 0) {
      const mcqTitle = document.createElement('div');
      mcqTitle.style.fontWeight = '700';
      mcqTitle.style.fontSize = '15px';
      mcqTitle.style.color = 'var(--accent)';
      mcqTitle.textContent = 'Part 1: Multiple Choice Questions';
      wrap.appendChild(mcqTitle);

      const quizArea = document.createElement('div');
      quizArea.className = 'mcq-quiz-area';
      
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

        const optionButtons = card.querySelectorAll('.mcq-option');
        optionButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            if (btn.classList.contains('locked')) return;
            const chosen = btn.getAttribute('data-letter');
            const correct = chosen === mcq.correctAnswer;
            
            optionButtons.forEach(b => {
              b.classList.add('locked');
              if (b.getAttribute('data-letter') === mcq.correctAnswer) {
                b.classList.add('correct');
              } else if (b.getAttribute('data-letter') === chosen && !correct) {
                b.classList.add('selected-wrong');
              }
            });

            if (correct) {
              window.showToast(`Q${qIdx+1}: Correct!`);
            } else {
              window.showToast(`Q${qIdx+1}: Wrong! Answer is ${mcq.correctAnswer}`, 'error');
            }
          });
        });
        
        quizArea.appendChild(card);
      });
      wrap.appendChild(quizArea);
    }

    if (bullets.length > 0) {
      const bulletTitle = document.createElement('div');
      bulletTitle.style.fontWeight = '700';
      bulletTitle.style.fontSize = '15px';
      bulletTitle.style.color = 'var(--accent)';
      bulletTitle.style.marginTop = '16px';
      bulletTitle.textContent = 'Part 2: Key Bullet Summary';
      wrap.appendChild(bulletTitle);

      const bulletsWrapper = document.createElement('div');
      bulletsWrapper.className = 'summary-outline-card';

      bullets.forEach(bullet => {
        const card = document.createElement('div');
        card.className = 'summary-outline-bullet';
        card.innerHTML = `
          <span style="color:var(--accent); font-size:16px; margin-right:4px;">•</span>
          <span style="flex-grow:1;">${escapeHTML(bullet)}</span>
        `;
        bulletsWrapper.appendChild(card);
      });
      wrap.appendChild(bulletsWrapper);
    }

    resultsContent.appendChild(wrap);
  }

  // --- Exports Functions ---
  
  function exportScoreCard() {
    if (!rawGeneratedText || !window.api) return;
    
    const time = new Date().toLocaleString();
    const scoreCard = `StudyMind Quiz Results Card
Subject: ${selectedSubject}
Difficulty: ${selectedDifficulty}
Date Completed: ${time}
Final Score: ${userScore} / ${parsedQuestions.length} (${Math.round((userScore / parsedQuestions.length) * 100)}%)

====================================
WRONG ANSWERS REVIEW LOG:
${wrongAnswersLog.map((w, i) => `
${i + 1}. Question: ${w.question}
   Choices:
     A) ${w.options.A}
     B) ${w.options.B}
     C) ${w.options.C}
     D) ${w.options.D}
   Correct Answer: ${w.correctAnswer}
   Your Answer: ${w.userAnswer}
`).join('\n')}
`;

    const defaultName = `StudyMind-ScoreCard-${Date.now()}.txt`;
    window.api.saveToFile(defaultName, scoreCard).then(result => {
      if (result.success) {
        window.showToast('Scorecard saved successfully!');
      } else if (result.message !== 'Save cancelled') {
        window.showToast(`Error: ${result.message}`, 'error');
      }
    });
  }

  // Copy raw generated material
  copyBtn.addEventListener('click', () => {
    if (!rawGeneratedText) return;
    navigator.clipboard.writeText(rawGeneratedText).then(() => {
      window.showToast('Copied raw review materials to clipboard!');
    }).catch(() => {
      window.showToast('Copy failed.', 'error');
    });
  });

  // Save raw generated material to disk
  saveBtn.addEventListener('click', async () => {
    if (!rawGeneratedText || !window.api) return;
    const defaultName = `StudyMind-Review-${Date.now()}.txt`;
    const result = await window.api.saveToFile(defaultName, rawGeneratedText);
    
    if (result.success) {
      window.showToast('Review saved successfully!');
    } else if (result.message !== 'Save cancelled') {
      window.showToast(`Failed: ${result.message}`, 'error');
    }
  });

  // Restart wizard
  restartBtn.addEventListener('click', () => {
    goToStep(1);
    notesTextarea.value = '';
    wordCountDisplay.textContent = '0 words';
  });

  // Helper Escaper
  function escapeHTML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Pre-fill reviewer content from global trigger if navigated from Notes AI
  window.prefillReviewNotes = function(notes, subjectName) {
    notesTextarea.value = notes;
    const words = notes ? notes.split(/\s+/).length : 0;
    wordCountDisplay.textContent = `${words} words`;
    
    // Select subject tag matching
    subjectPills.forEach(p => {
      if (p.getAttribute('data-subject') === subjectName) {
        p.click();
      }
    });
  };

  // Initial step setup
  goToStep(1);
});
