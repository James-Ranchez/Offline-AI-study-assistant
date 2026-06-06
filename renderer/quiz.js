/* StudyMind Interactive Quiz Maker Logic */

document.addEventListener('DOMContentLoaded', () => {
  const quizView = document.getElementById('quizmaker-view');
  if (!quizView) return;

  // Wizard elements
  const stepNodes = quizView.querySelectorAll('.wizard-step-node');
  const stepLines = quizView.querySelectorAll('.wizard-line');
  const stepPanels = quizView.querySelectorAll('.wizard-step-panel');

  // Step 1: Input elements
  const notesTextarea = document.getElementById('quizmaker-notes');
  const wordCountDisplay = document.getElementById('quizmaker-word-count');
  const subjectPills = quizView.querySelectorAll('.quiz-subject-pill');
  const modePills = quizView.querySelectorAll('.quiz-mode-pill');
  const nextToStep2Btn = document.getElementById('quizmaker-step1-next');

  // Step 2: Configure elements
  const countSlider = document.getElementById('quizmaker-count');
  const countDisplay = document.getElementById('quizmaker-count-val');
  const diffPills = quizView.querySelectorAll('.quiz-diff-pill');
  const langPills = quizView.querySelectorAll('.quiz-lang-pill');
  const backToStep1Btn = document.getElementById('quizmaker-step2-back');
  const generateBtn = document.getElementById('quizmaker-generate-btn');

  // Step 3: Results Elements
  const resultsCard = document.getElementById('quizmaker-results-card');
  const resultsTitleText = document.getElementById('quizmaker-results-title-text');
  const resultsContent = document.getElementById('quizmaker-results-content');
  const copyBtn = document.getElementById('quizmaker-copy-btn');
  const saveBtn = document.getElementById('quizmaker-save-btn');
  const restartBtn = document.getElementById('quizmaker-restart-btn');

  // State Management
  let currentStep = 1;
  let selectedSubject = 'Science';
  let selectedMode = 'mcq'; // mcq | open
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

  // --- Step Navigation ---
  function goToStep(step) {
    currentStep = step;
    
    // Update step nodes
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
  notesTextarea.addEventListener('input', () => {
    const text = notesTextarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    wordCountDisplay.textContent = `${words} words`;

    // Auto subject detection
    if (window.detectSubject) {
      const detected = window.detectSubject(text);
      if (detected) {
        subjectPills.forEach(p => {
          if (p.getAttribute('data-subject') === detected && !p.classList.contains('active')) {
            p.click();
          }
        });
      }
    }
  });

  subjectPills.forEach(pill => {
    pill.addEventListener('click', () => {
      subjectPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedSubject = pill.getAttribute('data-subject');
    });
  });

  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedMode = pill.getAttribute('data-mode');
    });
  });

  nextToStep2Btn.addEventListener('click', () => {
    const notes = notesTextarea.value.trim();
    if (!notes) {
      window.showToast('Please paste or write some study notes first.', 'warning');
      return;
    }
    goToStep(2);
  });

  // --- Step 2: Configure Handlers ---
  countSlider.addEventListener('input', () => {
    countDisplay.textContent = countSlider.value;
  });

  diffPills.forEach(pill => {
    pill.addEventListener('click', () => {
      diffPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedDifficulty = pill.getAttribute('data-diff');
    });
  });

  langPills.forEach(pill => {
    pill.addEventListener('click', () => {
      langPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedLanguage = pill.getAttribute('data-lang');
    });
  });

  backToStep1Btn.addEventListener('click', () => {
    goToStep(1);
  });

  // --- Step 3: Run Generation and Play ---
  generateBtn.addEventListener('click', async () => {
    if (isGenerating) return;

    const notes = notesTextarea.value.trim();
    
    // Auto subject detection fallback immediately before generation
    if (window.detectSubject) {
      const detected = window.detectSubject(notes);
      if (detected) {
        selectedSubject = detected;
        subjectPills.forEach(p => {
          if (p.getAttribute('data-subject') === detected) {
            subjectPills.forEach(sp => sp.classList.remove('active'));
            p.classList.add('active');
          }
        });
      }
    }

    isGenerating = true;
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;
    goToStep(3);

    resultsTitleText.textContent = `Generating quiz for ${selectedSubject}`;
    resultsContent.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; gap: 16px; width: 100%;">
        <div class="dot-loader" style="display: flex; gap: 6px;">
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.2s;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.4s;"></span>
        </div>
        <span style="font-weight: 700; font-size: 13px; color: var(--text-secondary);">StudyMind is identifying terms & definitions to build a quiz...</span>
      </div>
    `;

    const numQ = countSlider.value;
    let diffPrompt = '';
    if (selectedDifficulty === 'Easy') diffPrompt = 'Use simple, straightforward questions.';
    if (selectedDifficulty === 'Medium') diffPrompt = 'Include some application and reasoning questions.';
    if (selectedDifficulty === 'Hard') diffPrompt = 'Prioritize analysis, comparison, and critical thinking questions.';

    let prompt = '';
    
    if (selectedMode === 'mcq') {
      prompt = `Create exactly ${numQ} multiple choice questions (MCQ) in English based on the notes below.
If the notes are long or contain many concepts, select only the most relevant ${numQ} terms/definitions to write questions for. Do not try to include every single word or concept; prioritize the main ideas.
${diffPrompt}

CRITICAL RULES FOR ACCURACY AND DISTRACTORS:
- Ensure all questions and correct answers are 100% accurate to the uploaded notes.
- Do NOT swap closely related abbreviations (e.g. do not swap CPU, GPU, and NPU) if it makes the correct answer incorrect or confusing.
- DO NOT generate options by changing just a single letter of the correct term to make a distractor (for example, do not change "CPU" to "NPU", "GPU", "MPU", "BPU" or similar to create incorrect choices).
- Do not invent fake terms. Use actual distinct concepts as distractors.

Format each question exactly as:
Question [Number]: [Question text]
A) [Choice A]
B) [Choice B]
C) [Choice C]
D) [Choice D]
Answer: [Correct Letter]

Do not write any extra introduction, explanation, or conclusion text. Only output the questions in the exact structure above.

Notes:
${notes}`;
    } else {
      prompt = `Create exactly ${numQ} open-ended review questions with concise answers in English based on the notes below.
If the notes are long or contain many concepts, select only the most relevant ${numQ} terms/definitions to write questions for. Do not try to include every single word or concept; prioritize the main ideas.
${diffPrompt}

CRITICAL RULES FOR ACCURACY:
- Ensure all questions and answers are 100% accurate to the uploaded notes.
- Do not swap closely related abbreviations or terms.

Format each question exactly as:
Q: [Question text]
A: [Model answer text]

Do not write any extra introduction, explanation, or conclusion text. Only output the questions and answers in the exact structure above.

Notes:
${notes}`;
    }

    rawGeneratedText = '';

    Ollama.generate(
      prompt,
      (chunk) => {
        rawGeneratedText += chunk;
      },
      () => {
        isGenerating = false;
        generateBtn.textContent = 'Generate Quiz';
        generateBtn.disabled = false;
        
        renderResults();
        window.showToast('✓ Quiz generated!');
      },
      (err) => {
        isGenerating = false;
        generateBtn.textContent = 'Generate Quiz';
        generateBtn.disabled = false;
        goToStep(2);
        
        const errMsg = Ollama.isMockMode
          ? 'Demo Mock quiz generation failed.'
          : 'Could not communicate with Ollama. Make sure the service is active.';
        window.showToast(errMsg, 'error');
      }
    );
  });

  // Helper to parse notes directly into term-definition pairs using en-dash, em-dash, or standard hyphen
  function parseNotesToPairs(notesText) {
    const pairs = [];
    if (!notesText) return pairs;

    const lines = notesText.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.length < 5) return;

      let left = '';
      let right = '';

      // Match en-dash, em-dash, or hyphen with spaces first to prevent splitting on inner-word hyphens (e.g. "on-device")
      const primaryMatch = trimmed.match(/^(.*?)\s*(?:[\u2012\u2013\u2014—–]|\s+-\s+)\s*(.*)$/);
      if (primaryMatch) {
        left = primaryMatch[1].replace(/^[-*•\d\.\s]+/, '').trim();
        right = primaryMatch[2].trim();
      } else {
        // Fallback: search for first standard hyphen
        const dashIndex = trimmed.indexOf('-');
        if (dashIndex > 0 && dashIndex < trimmed.length - 1) {
          left = trimmed.substring(0, dashIndex).replace(/^[-*•\d\.\s]+/, '').trim();
          right = trimmed.substring(dashIndex + 1).trim();
        }
      }

      if (left.length > 0 && right.length > 0) {
        pairs.push({ term: left, def: right });
      }
    });
    return pairs;
  }

  // Locally generate MCQ quiz if AI fails or is offline
  function generateLocalMCQFromNotes(notesText) {
    const pairs = parseNotesToPairs(notesText);
    if (pairs.length === 0) return [];

    const mcqs = [];
    // Shuffle pairs to get random assortment
    const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);
    const count = Math.min(parseInt(countSlider.value, 10), shuffledPairs.length);

    for (let i = 0; i < count; i++) {
      const current = shuffledPairs[i];
      const questionText = `Which term matches this description: "${current.def}"?`;
      const correctAnswer = current.term;

      // Extract other terms for distractors
      const otherTerms = pairs.filter(p => p.term !== current.term).map(p => p.term);
      otherTerms.sort(() => Math.random() - 0.5);

      const choices = [correctAnswer];
      for (let j = 0; j < Math.min(3, otherTerms.length); j++) {
        choices.push(otherTerms[j]);
      }

      while (choices.length < 4) {
        choices.push(`Alternative concept ${choices.length + 1}`);
      }

      // Shuffle choices
      choices.sort(() => Math.random() - 0.5);

      const letters = ['A', 'B', 'C', 'D'];
      const correctIdx = choices.indexOf(correctAnswer);

      mcqs.push({
        question: questionText,
        options: {
          A: choices[0],
          B: choices[1],
          C: choices[2],
          D: choices[3]
        },
        correctAnswer: letters[correctIdx]
      });
    }
    return mcqs;
  }

  // Locally generate Open-Ended quiz if AI fails or is offline
  function generateLocalOpenFromNotes(notesText) {
    const pairs = parseNotesToPairs(notesText);
    if (pairs.length === 0) return [];

    const qaPairs = [];
    const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);
    const count = Math.min(parseInt(countSlider.value, 10), shuffledPairs.length);

    for (let i = 0; i < count; i++) {
      const current = shuffledPairs[i];
      qaPairs.push({
        question: `Explain the concept or definition: "${current.def}"`,
        answer: current.term
      });
    }
    return qaPairs;
  }

  // Render Quiz Modes
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
      
      // Fallback: if AI output failed to parse, try parsing notes directly
      if (parsedQuestions.length === 0) {
        const notes = notesTextarea.value.trim();
        parsedQuestions = generateLocalMCQFromNotes(notes);
        if (parsedQuestions.length > 0) {
          window.showToast('✓ Generated quiz directly from notes!', 'success');
        }
      }

      if (parsedQuestions.length === 0) {
        renderRawTextFallback();
        return;
      }
      renderMCQQuestion(0);
    } else {
      resultsTitleText.textContent = `Open-Ended Quiz: ${selectedSubject}`;
      parsedQuestions = parseOpenQuestionsText(rawGeneratedText);
      
      // Fallback: if AI output failed to parse, try parsing notes directly
      if (parsedQuestions.length === 0) {
        const notes = notesTextarea.value.trim();
        parsedQuestions = generateLocalOpenFromNotes(notes);
        if (parsedQuestions.length > 0) {
          window.showToast('✓ Generated review questions directly from notes!', 'success');
        }
      }

      if (parsedQuestions.length === 0) {
        renderRawTextFallback();
        return;
      }
      renderOpenQuestion(0);
    }
  }

  function renderRawTextFallback() {
    resultsContent.innerHTML = `
      <div style="font-size:13px; color: var(--text-secondary); margin-bottom: 12px;">Failed to parse quiz format. Raw response:</div>
      <pre style="white-space: pre-wrap; font-family: var(--font-mono); color: var(--text-primary); line-height: 1.6; background-color: var(--bg-tertiary); padding: 16px; border-radius: var(--radius-md); border:1px solid var(--border);">${escapeHTML(rawGeneratedText)}</pre>
    `;
  }

  // MCQ Parser
  function parseMCQText(text) {
    const mcqs = [];
    // Split by Question markers at the start of a line
    const blocks = text.split(/(?:^|\n)(?=Question\s*\d+\s*:|\d+[\.\s]+Question:|\d+[\.\s]+A\))/i);

    blocks.forEach(block => {
      if (!block.trim()) return;

      // Extract Question part (up to the first option A) starting on a new line)
      const qMatch = block.match(/(?:Question\s*\d*\s*:|\d+[\.\s]+Question:|\d+[\.\s]+)?(.*?)(?=(?:^|\n)\s*A\b[\)\.\:\-]\s*|$)/si);
      if (!qMatch) return;
      const question = qMatch[1].replace(/^\d+[\.\s]*/, '').trim();

      const aMatch = block.match(/(?:^|\n)\s*A\b[\)\.\:\-]\s*(.*?)(?=(?:^|\n)\s*B\b[\)\.\:\-]\s*|$)/si);
      const bMatch = block.match(/(?:^|\n)\s*B\b[\)\.\:\-]\s*(.*?)(?=(?:^|\n)\s*C\b[\)\.\:\-]\s*|$)/si);
      const cMatch = block.match(/(?:^|\n)\s*C\b[\)\.\:\-]\s*(.*?)(?=(?:^|\n)\s*D\b[\)\.\:\-]\s*|$)/si);
      const dMatch = block.match(/(?:^|\n)\s*D\b[\)\.\:\-]\s*(.*?)(?=(?:^|\n)\s*(?:Answer|Correct)[\s*\:\-]*|$)/si);

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

  // Open-Ended Parser
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

  // Render Single MCQ
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

    const choiceCards = resultsContent.querySelectorAll('.choice-card');
    choiceCards.forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('locked')) return;

        const letter = card.getAttribute('data-letter');
        const isCorrect = letter === mcq.correctAnswer;
        
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

        setTimeout(() => {
          renderMCQQuestion(index + 1);
        }, 1500);
      });
    });
  }

  // MCQ End Results
  function renderQuizResultsScreen() {
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
      id: 'quiz-' + Date.now(),
      subject: selectedSubject,
      mode: 'Quiz Maker (' + selectedMode.toUpperCase() + ')',
      difficulty: selectedDifficulty,
      questions: totalQ,
      score: pct
    });

    resultsContent.innerHTML = `
      <div class="quiz-results-view">
        <div class="grade-badge">${badge}</div>
        <div class="results-score-text">${userScore} / ${totalQ}</div>
        <div class="results-grade-text">${pct}% — ${gradeMsg}</div>
        <div class="results-meta-desc">You completed the quiz session for ${selectedSubject} at ${selectedDifficulty} level.</div>
        
        <div class="results-actions-row">
          <button class="btn-primary" id="quizmaker-try-again-btn">Try Again</button>
          ${wrongAnswersLog.length > 0 ? `<button class="btn-secondary" id="quizmaker-wrong-btn">Review Wrong Answers (${wrongAnswersLog.length})</button>` : ''}
          <button class="btn-secondary" id="quizmaker-export-btn">Export Results</button>
        </div>
      </div>
    `;

    document.getElementById('quizmaker-try-again-btn').addEventListener('click', () => {
      parsedQuestions.sort(() => Math.random() - 0.5);
      userScore = 0;
      wrongAnswersLog = [];
      renderMCQQuestion(0);
    });

    const wrongBtn = document.getElementById('quizmaker-wrong-btn');
    if (wrongBtn) {
      wrongBtn.addEventListener('click', () => {
        renderWrongAnswersLogView();
      });
    }

    document.getElementById('quizmaker-export-btn').addEventListener('click', () => {
      exportScoreCard();
    });
  }

  // Wrong Answers log reviewer
  function renderWrongAnswersLogView() {
    resultsContent.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="font-weight:700; font-size:16px; color:var(--danger);">Review Wrong Answers</div>
        <div class="mcq-quiz-area">
          ${wrongAnswersLog.map((w, idx) => `
            <div class="mcq-card" style="border-left: 4px solid var(--danger); margin-bottom:12px; padding:16px; background:var(--bg-secondary); border-radius:var(--radius-md);">
              <div class="mcq-question" style="font-weight:700; margin-bottom:8px;">${idx + 1}. ${escapeHTML(w.question)}</div>
              <div class="mcq-options" style="display:flex; flex-direction:column; gap:6px;">
                <div class="choice-card locked ${w.userAnswer === 'A' ? 'wrong' : ''} ${w.correctAnswer === 'A' ? 'correct' : ''}"><span class="choice-letter">A</span>${escapeHTML(w.options.A)}</div>
                <div class="choice-card locked ${w.userAnswer === 'B' ? 'wrong' : ''} ${w.correctAnswer === 'B' ? 'correct' : ''}"><span class="choice-letter">B</span>${escapeHTML(w.options.B)}</div>
                <div class="choice-card locked ${w.userAnswer === 'C' ? 'wrong' : ''} ${w.correctAnswer === 'C' ? 'correct' : ''}"><span class="choice-letter">C</span>${escapeHTML(w.options.C)}</div>
                <div class="choice-card locked ${w.userAnswer === 'D' ? 'wrong' : ''} ${w.correctAnswer === 'D' ? 'correct' : ''}"><span class="choice-letter">D</span>${escapeHTML(w.options.D)}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" id="quizmaker-back-to-results-btn" style="align-self:flex-start;">Back to Results</button>
      </div>
    `;

    document.getElementById('quizmaker-back-to-results-btn').addEventListener('click', () => {
      renderQuizResultsScreen();
    });
  }

  // Render Open Ended Q&A Card
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
        <div class="card" style="padding: 24px; min-height: 140px; justify-content: center; font-weight: 700; font-size:16px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-md); display:flex; align-items:center;">
          ${escapeHTML(pair.question)}
        </div>
        
        <button class="btn-secondary" id="quizmaker-reveal-answer-btn" style="align-self: center; margin-top:12px;">Reveal Answer</button>
        
        <div class="open-answer-reveal-box" id="quizmaker-open-answer-reveal-box" style="margin-top:12px;">
          <div style="font-weight: 700; color: var(--accent); margin-bottom: 8px;">Suggested Answer:</div>
          <div>${escapeHTML(pair.answer)}</div>
        </div>

        <div class="self-rate-actions" id="quizmaker-self-rate-actions" style="display: none; margin-top: 12px;">
          <button class="btn-primary" id="quizmaker-rate-known-btn" style="background-color: var(--success);">Got It ✓</button>
          <button class="btn-secondary" id="quizmaker-rate-learning-btn" style="border-color: var(--warning); color: var(--warning);">Still Learning</button>
        </div>
      </div>
    `;

    const revealBtn = document.getElementById('quizmaker-reveal-answer-btn');
    const answerBox = document.getElementById('quizmaker-open-answer-reveal-box');
    const actionsBox = document.getElementById('quizmaker-self-rate-actions');

    revealBtn.addEventListener('click', () => {
      answerBox.classList.add('active');
      actionsBox.style.display = 'flex';
      revealBtn.style.display = 'none';
    });

    document.getElementById('quizmaker-rate-known-btn').addEventListener('click', () => {
      selfRatedKnownCount++;
      renderOpenQuestion(index + 1);
    });

    document.getElementById('quizmaker-rate-learning-btn').addEventListener('click', () => {
      selfRatedLearningCount++;
      renderOpenQuestion(index + 1);
    });
  }

  // Open-Ended Completed Screen
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

        <button class="btn-primary" id="quizmaker-results-try-again-btn">Try Again</button>
      </div>
    `;

    // Log progress
    const pct = parsedQuestions.length > 0 ? Math.round((selfRatedKnownCount / parsedQuestions.length) * 100) : 0;
    window.StudyStorage.saveReviewSession({
      id: 'quiz-open-' + Date.now(),
      subject: selectedSubject,
      mode: 'Quiz Maker (Open-Ended)',
      difficulty: selectedDifficulty,
      questions: parsedQuestions.length,
      score: pct
    });

    document.getElementById('quizmaker-results-try-again-btn').addEventListener('click', () => {
      parsedQuestions.sort(() => Math.random() - 0.5);
      selfRatedKnownCount = 0;
      selfRatedLearningCount = 0;
      renderOpenQuestion(0);
    });
  }

  // Export Scorecard
  function exportScoreCard() {
    if (!rawGeneratedText || !window.api) return;
    
    const time = new Date().toLocaleString();
    const scoreCard = `StudyMind Practice Quiz Scorecard
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

    const defaultName = `StudyMind-QuizScore-${Date.now()}.txt`;
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
      window.showToast('Copied quiz layout to clipboard!');
    }).catch(() => {
      window.showToast('Copy failed.', 'error');
    });
  });

  // Save raw generated material to disk
  saveBtn.addEventListener('click', async () => {
    if (!rawGeneratedText || !window.api) return;
    const defaultName = `StudyMind-Quiz-${Date.now()}.txt`;
    const result = await window.api.saveToFile(defaultName, rawGeneratedText);
    
    if (result.success) {
      window.showToast('Quiz saved successfully!');
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

  // Prefill notes trigger for Quiz Maker
  window.prefillQuizNotes = function(notes, subjectName) {
    notesTextarea.value = notes;
    const words = notes ? notes.split(/\s+/).length : 0;
    wordCountDisplay.textContent = `${words} words`;
    
    subjectPills.forEach(p => {
      if (p.getAttribute('data-subject') === subjectName) {
        p.click();
      }
    });
  };

  // Initial step setup
  goToStep(1);
});
