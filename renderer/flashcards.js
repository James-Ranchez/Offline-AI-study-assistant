/* StudyMind Flashcard System Logic */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements on Flashcards tab
  const setGrid = document.getElementById('fc-set-grid');
  const emptyState = document.getElementById('fc-empty-state');
  const mainView = document.getElementById('fc-main-view');
  const createView = document.getElementById('fc-create-view');
  
  // Header buttons
  const newSetBtn = document.getElementById('new-set-btn');
  const backToMainBtn = document.getElementById('fc-back-to-main');

  // Creation fields
  const setNameInput = document.getElementById('fc-set-name');
  const setSubjectSelect = document.getElementById('fc-set-subject');
  const manualTabBtn = document.getElementById('fc-tab-manual');
  const aiTabBtn = document.getElementById('fc-tab-ai');
  const manualForm = document.getElementById('fc-form-manual');
  const aiForm = document.getElementById('fc-form-ai');

  // Manual Inputs
  const cardFrontInput = document.getElementById('fc-card-front');
  const cardBackInput = document.getElementById('fc-card-back');
  const addCardBtn = document.getElementById('fc-add-card-btn');

  // AI Inputs
  const aiNotesInput = document.getElementById('fc-ai-notes');
  const aiCountSelect = document.getElementById('fc-ai-count');
  const aiGenerateBtn = document.getElementById('fc-ai-generate-btn');

  // Preview List
  const previewList = document.getElementById('fc-preview-list');
  const saveSetBtn = document.getElementById('fc-save-set-btn');

  // Study Overlay elements
  const studyOverlay = document.getElementById('fc-study-overlay');
  const studyTitle = document.getElementById('fc-study-title');
  const studyProgressText = document.getElementById('fc-study-progress-text');
  const closeStudyBtn = document.getElementById('fc-close-study-btn');
  const cardViewport = document.getElementById('fc-active-card-element');
  const cardFrontText = document.getElementById('fc-card-front-text');
  const cardBackText = document.getElementById('fc-card-back-text');
  const prevCardBtn = document.getElementById('fc-prev-btn');
  const nextCardBtn = document.getElementById('fc-next-btn');
  const ratingRow = document.getElementById('fc-rating-row');
  const rateGotIt = document.getElementById('fc-rate-got-it');
  const rateAlmost = document.getElementById('fc-rate-almost');
  const rateMissed = document.getElementById('fc-rate-missed');
  
  // Deck States
  let tempCards = []; // Cards in active editing set
  let activeEditingSetId = null;
  let activeStudyDeck = [];
  let currentStudyIndex = 0;
  let studySetReference = null;
  let studySessionRatings = {}; // tracks rating per card id
  let isAiGenerating = false;
  let shuffleMode = false;
  
  // --- View controllers ---
  function showMainView() {
    mainView.style.display = 'block';
    createView.style.display = 'none';
    loadFlashcardSets();
    if (window.refreshDashboard) window.refreshDashboard();
  }

  function showCreateView(editingSetId = null) {
    mainView.style.display = 'none';
    createView.style.display = 'block';
    
    // Clear inputs
    setNameInput.value = '';
    tempCards = [];
    activeEditingSetId = editingSetId;
    
    if (editingSetId) {
      // Edit mode
      const sets = window.StudyStorage.getFlashcardSets();
      const match = sets.find(s => s.id === editingSetId);
      if (match) {
        setNameInput.value = match.name;
        setSubjectSelect.value = match.subject || 'Science';
        tempCards = [...match.cards];
      }
    }
    
    renderPreviewList();
    switchTab('manual');
  }

  function switchTab(tab) {
    if (tab === 'manual') {
      manualTabBtn.classList.add('active');
      aiTabBtn.classList.remove('active');
      manualForm.style.display = 'flex';
      aiForm.style.display = 'none';
    } else {
      manualTabBtn.classList.remove('active');
      aiTabBtn.classList.add('active');
      manualForm.style.display = 'none';
      aiForm.style.display = 'flex';
    }
  }

  // --- Initializers & Set loaders ---
  function loadFlashcardSets() {
    setGrid.innerHTML = '';
    const sets = window.StudyStorage.getFlashcardSets();

    if (sets.length === 0) {
      emptyState.style.display = 'flex';
      setGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    setGrid.style.display = 'grid';

    sets.forEach(set => {
      // Calculate performance percentage
      let totalGotIt = 0;
      let totalMissed = 0;
      set.cards.forEach(c => {
        totalGotIt += (c.gotIt || 0);
        totalMissed += (c.missed || 0);
      });
      
      const totalRated = totalGotIt + totalMissed;
      const perfPct = totalRated > 0 ? Math.round((totalGotIt / totalRated) * 100) : 0;
      const lastStudiedStr = set.lastStudied 
        ? new Date(set.lastStudied).toLocaleDateString() 
        : 'Never';

      const card = document.createElement('div');
      card.className = 'fc-set-card';
      
      card.innerHTML = `
        <div class="fc-set-info">
          <span class="fc-set-title">${escapeHTML(set.name)}</span>
          <span class="fc-set-meta">${set.cards.length} cards | Subject: ${escapeHTML(set.subject || 'General')}</span>
        </div>
        <div class="fc-set-stats">
          <span>Mastery: <strong>${perfPct}%</strong></span>
          <span>Last Studied: <strong>${lastStudiedStr}</strong></span>
        </div>
        <div class="fc-set-actions">
          <button class="btn-primary fc-set-action-btn study-btn" title="Study Now">
            <svg viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Study
          </button>
          <button class="fc-set-action-btn edit-btn" title="Edit Set">
            <svg viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="fc-set-action-btn delete-btn delete" title="Delete Set">
            <svg viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="fc-set-action-btn export-btn" title="Export as CSV">
            <svg viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      `;

      // Study Now trigger
      card.querySelector('.study-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        startStudySession(set);
      });

      // Edit trigger
      card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showCreateView(set.id);
      });

      // Delete trigger
      card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        window.showConfirmModal(
          'Delete Flashcard Set?',
          `Are you sure you want to permanently delete the set "${set.name}"? This action cannot be undone.`,
          () => {
            window.StudyStorage.deleteFlashcardSet(set.id);
            window.showToast('Flashcard set deleted');
            loadFlashcardSets();
          }
        );
      });

      // Export trigger
      card.querySelector('.export-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        exportCSV(set);
      });

      // General card click studies too
      card.addEventListener('click', () => {
        startStudySession(set);
      });

      setGrid.appendChild(card);
    });
  }

  // --- Manual Cards Additions ---
  addCardBtn.addEventListener('click', () => {
    const front = cardFrontInput.value.trim();
    const back = cardBackInput.value.trim();

    if (!front || !back) {
      window.showToast('Please fill out both Front and Back card details.', 'warning');
      return;
    }

    tempCards.push({
      id: 'card-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      front: front,
      back: back,
      gotIt: 0,
      missed: 0
    });

    cardFrontInput.value = '';
    cardBackInput.value = '';
    cardFrontInput.focus();

    renderPreviewList();
    window.showToast('Card added to set preview!');
  });

  // --- AI Flashcards Generator ---
  aiGenerateBtn.addEventListener('click', () => {
    if (isAiGenerating) return;

    const notes = aiNotesInput.value.trim();
    const num = aiCountSelect.value;

    if (!notes) {
      window.showToast('Please paste some study notes for the AI first.', 'warning');
      return;
    }

    isAiGenerating = true;
    aiGenerateBtn.textContent = 'Generating cards...';
    aiGenerateBtn.disabled = true;

    const prompt = `Generate exactly ${num} flashcard pairs from these notes. Return each card strictly formatted as:
FRONT: [term or question] | BACK: [definition or answer]

Do not write any extra introduction or conclusion text. Only return the cards.

Notes:
${notes}`;

    let responseText = '';

    Ollama.generate(
      prompt,
      // Chunk listener
      (chunk) => {
        responseText += chunk;
      },
      // Completion listener
      () => {
        isAiGenerating = false;
        aiGenerateBtn.textContent = 'Generate Cards';
        aiGenerateBtn.disabled = false;

        parseAiFlashcards(responseText);
        aiNotesInput.value = '';
        window.showToast('✓ AI Flashcards generated and added to preview!');
      },
      // Error listener
      () => {
        isAiGenerating = false;
        aiGenerateBtn.textContent = 'Generate Cards';
        aiGenerateBtn.disabled = false;
        window.showToast('Could not reach Ollama connection.', 'error');
      }
    );
  });

  // Parse lines matching: FRONT: [term] | BACK: [def]
  function parseAiFlashcards(text) {
    const lines = text.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const match = trimmed.match(/^FRONT\s*:\s*(.*?)\s*\|\s*BACK\s*:\s*(.*)/i);
      if (match) {
        tempCards.push({
          id: 'card-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          front: match[1].trim(),
          back: match[2].trim(),
          gotIt: 0,
          missed: 0
        });
      }
    });

    renderPreviewList();
  }

  // --- Preview List Renderer ---
  function renderPreviewList() {
    previewList.innerHTML = '';
    
    if (tempCards.length === 0) {
      previewList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px;">No cards added yet. Add manually or generate with AI.</div>`;
      saveSetBtn.disabled = true;
      return;
    }

    saveSetBtn.disabled = false;

    tempCards.forEach((card, idx) => {
      const item = document.createElement('div');
      item.className = 'fc-preview-item';
      
      item.innerHTML = `
        <div class="fc-preview-text">
          <span class="fc-preview-front">Q: ${escapeHTML(card.front)}</span>
          <span class="fc-preview-back">A: ${escapeHTML(card.back)}</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="fc-set-action-btn edit-card" title="Edit Card"><svg viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button class="fc-set-action-btn delete-card delete" title="Delete Card"><svg viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
      `;

      // Edit Card inline
      item.querySelector('.edit-card').addEventListener('click', () => {
        const newFront = prompt('Edit Front Side:', card.front);
        const newBack = prompt('Edit Back Side:', card.back);
        if (newFront !== null && newBack !== null) {
          card.front = newFront.trim() || card.front;
          card.back = newBack.trim() || card.back;
          renderPreviewList();
        }
      });

      // Delete card
      item.querySelector('.delete-card').addEventListener('click', () => {
        tempCards.splice(idx, 1);
        renderPreviewList();
      });

      previewList.appendChild(item);
    });
  }

  // Save the full flashcard set
  saveSetBtn.addEventListener('click', () => {
    const name = setNameInput.value.trim();
    const subject = setSubjectSelect.value;

    if (!name) {
      window.showToast('Please type a name for this flashcard set.', 'warning');
      return;
    }

    if (tempCards.length === 0) {
      window.showToast('Please add at least one card to the set.', 'warning');
      return;
    }

    const setId = activeEditingSetId || 'fc-set-' + Date.now();
    const newSet = {
      id: setId,
      name: name,
      subject: subject,
      cards: tempCards
    };

    window.StudyStorage.saveFlashcardSet(newSet);
    window.showToast('✓ Flashcard set saved successfully!');
    showMainView();
  });

  // --- Flashcard Study player (Flip overlays) ---

  function startStudySession(set, missedOnly = false) {
    studySetReference = set;
    
    // Pick cards to study
    let cardsToStudy = [...set.cards];
    if (missedOnly) {
      cardsToStudy = set.cards.filter(c => studySessionRatings[c.id] === 'missed');
    }

    if (cardsToStudy.length === 0) {
      window.showToast('No cards to study!', 'warning');
      return;
    }

    if (shuffleMode) {
      cardsToStudy.sort(() => Math.random() - 0.5);
    }

    activeStudyDeck = cardsToStudy;
    currentStudyIndex = 0;
    studySessionRatings = {}; // Reset ratings

    // Open fullscreen overlay
    studyOverlay.style.display = 'flex';
    studyTitle.textContent = `Studying: ${set.name}`;
    
    renderActiveCard();
  }

  function renderActiveCard() {
    if (currentStudyIndex < 0 || currentStudyIndex >= activeStudyDeck.length) {
      renderStudyEndScreen();
      return;
    }

    const card = activeStudyDeck[currentStudyIndex];
    
    // Reset flip orientation
    cardViewport.classList.remove('flipped');
    
    // Draw text sides
    cardFrontText.textContent = card.front;
    cardBackText.textContent = card.back;

    // Progress updates
    studyProgressText.textContent = `Card ${currentStudyIndex + 1} of ${activeStudyDeck.length}`;

    // Hide rating actions until flipped
    ratingRow.classList.remove('active');

    // Manage arrow navigations
    prevCardBtn.disabled = currentStudyIndex === 0;
    nextCardBtn.disabled = true; // Disabled until flipped/rated or navigated
  }

  // Click card viewport flips it
  cardViewport.addEventListener('click', () => {
    cardViewport.classList.toggle('flipped');
    
    // Reveal rating buttons if flipped to back
    if (cardViewport.classList.contains('flipped')) {
      ratingRow.classList.add('active');
      nextCardBtn.disabled = false;
    } else {
      ratingRow.classList.remove('active');
    }
  });

  // Navigation Arrows
  prevCardBtn.addEventListener('click', () => {
    if (currentStudyIndex > 0) {
      currentStudyIndex--;
      renderActiveCard();
    }
  });

  nextCardBtn.addEventListener('click', () => {
    if (currentStudyIndex < activeStudyDeck.length - 1) {
      currentStudyIndex++;
      renderActiveCard();
    } else {
      renderStudyEndScreen();
    }
  });

  // Self-rating hooks
  rateGotIt.addEventListener('click', () => {
    logRating('gotIt');
  });

  rateAlmost.addEventListener('click', () => {
    logRating('almost');
  });

  rateMissed.addEventListener('click', () => {
    logRating('missed');
  });

  function logRating(rating) {
    const card = activeStudyDeck[currentStudyIndex];
    studySessionRatings[card.id] = rating;

    // Update localStorage counts inside the set reference
    const set = studySetReference;
    const match = set.cards.find(c => c.id === card.id);
    if (match) {
      if (rating === 'gotIt') {
        match.gotIt = (match.gotIt || 0) + 1;
        window.showToast('✓ Marked as Got It!');
      } else if (rating === 'missed') {
        match.missed = (match.missed || 0) + 1;
        window.showToast('✗ Marked as Missed.', 'error');
      } else {
        window.showToast('Marked as Almost.', 'warning');
      }
      window.StudyStorage.saveFlashcardSet(set);
    }

    // Advance to next card automatically after 600ms
    setTimeout(() => {
      if (currentStudyIndex < activeStudyDeck.length - 1) {
        currentStudyIndex++;
        renderActiveCard();
      } else {
        renderStudyEndScreen();
      }
    }, 600);
  }

  function renderStudyEndScreen() {
    // Compile stats
    let gotItCount = 0;
    let missedCount = 0;
    let almostCount = 0;

    Object.values(studySessionRatings).forEach(r => {
      if (r === 'gotIt') gotItCount++;
      if (r === 'missed') missedCount++;
      if (r === 'almost') almostCount++;
    });

    const total = activeStudyDeck.length;
    const pct = total > 0 ? Math.round((gotItCount / total) * 100) : 0;

    // Update set lastStudied date
    studySetReference.lastStudied = new Date().toISOString();
    window.StudyStorage.saveFlashcardSet(studySetReference);

    // Log progress log
    window.StudyStorage.logStudySession({
      date: new Date().toISOString().split('T')[0],
      type: 'flashcard',
      duration: total * 15, // Estimate 15 seconds per flashcard studied
      score: pct
    });

    cardViewport.classList.remove('flipped');
    cardFrontText.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px; align-items:center;">
        <span style="font-size:36px;">🎉</span>
        <span style="font-size:18px; font-weight:800;">Deck Completed!</span>
        <span style="font-size:14px; font-weight:500; color:var(--text-secondary);">Mastery: ${pct}%</span>
        <div style="display:flex; gap:16px; font-size:11px; margin-top:8px;">
          <span style="color:var(--success);">Got It: ${gotItCount}</span>
          <span style="color:var(--warning);">Almost: ${almostCount}</span>
          <span style="color:var(--danger);">Missed: ${missedCount}</span>
        </div>
        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; justify-content:center;">
          <button class="btn-primary" id="fc-study-restart" style="padding:6px 12px; font-size:12px;">Restart Deck</button>
          ${missedCount > 0 ? `<button class="btn-secondary" id="fc-study-missed" style="padding:6px 12px; font-size:12px; border-color:var(--danger); color:var(--danger);">Review Missed (${missedCount})</button>` : ''}
          <button class="btn-secondary" id="fc-study-shuffle-toggle" style="padding:6px 12px; font-size:12px;">
            Shuffle: ${shuffleMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    `;

    cardBackText.textContent = '';
    studyProgressText.textContent = 'Completed!';
    ratingRow.classList.remove('active');
    prevCardBtn.disabled = true;
    nextCardBtn.disabled = true;

    // Attach end buttons
    document.getElementById('fc-study-restart').addEventListener('click', (e) => {
      e.stopPropagation();
      startStudySession(studySetReference);
    });

    const missedBtn = document.getElementById('fc-study-missed');
    if (missedBtn) {
      missedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startStudySession(studySetReference, true);
      });
    }

    const shuffleBtn = document.getElementById('fc-study-shuffle-toggle');
    shuffleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      shuffleMode = !shuffleMode;
      shuffleBtn.textContent = `Shuffle: ${shuffleMode ? 'ON' : 'OFF'}`;
      window.showToast(`Shuffling turned ${shuffleMode ? 'ON' : 'OFF'}`);
    });
  }

  // Close overlay
  closeStudyBtn.addEventListener('click', () => {
    studyOverlay.style.display = 'none';
    loadFlashcardSets();
  });

  // --- CSV Exporter ---
  function exportCSV(set) {
    if (!window.api) return;
    
    // Header
    let csvContent = 'Front,Back\n';
    set.cards.forEach(card => {
      // Escape quotes for CSV values
      const f = `"${card.front.replace(/"/g, '""')}"`;
      const b = `"${card.back.replace(/"/g, '""')}"`;
      csvContent += `${f},${b}\n`;
    });

    const defaultName = `${set.name.replace(/\s+/g, '-')}-Flashcards.txt`;
    window.api.saveToFile(defaultName, csvContent).then(result => {
      if (result.success) {
        window.showToast('CSV Flashcard file exported successfully!');
      } else if (result.message !== 'Save cancelled') {
        window.showToast(`Export failed: ${result.message}`, 'error');
      }
    });
  }

  // --- Global bindings for search routing ---
  window.loadFlashcardSetById = function(id) {
    const sets = window.StudyStorage.getFlashcardSets();
    const match = sets.find(s => s.id === id);
    if (match) startStudySession(match);
  };

  // --- Button trigger routes ---
  newSetBtn.addEventListener('click', () => {
    showCreateView();
  });
  
  backToMainBtn.addEventListener('click', () => {
    showMainView();
  });

  manualTabBtn.addEventListener('click', () => switchTab('manual'));
  aiTabBtn.addEventListener('click', () => switchTab('ai'));

  function escapeHTML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load
  loadFlashcardSets();
});
