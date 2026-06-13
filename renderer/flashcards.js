/* StudyMind Flashcard System Logic */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements on Flashcards tab
  const emptyState = document.getElementById('fc-empty-state');
  const mainView = document.getElementById('fc-main-view');
  const createView = document.getElementById('fc-create-view');
  
  // Sidebar deck list elements
  const deckList = document.getElementById('fc-deck-list');
  const deckSearchInput = document.getElementById('fc-deck-search-input');
  const deckCountLabel = document.getElementById('fc-deck-count-label');
  
  // Deck detail panel elements
  const deckDetailPanel = document.getElementById('fc-deck-detail-panel');
  const detailTitle = document.getElementById('fc-detail-title');
  const detailMeta = document.getElementById('fc-detail-meta');
  const detailMastery = document.getElementById('fc-detail-mastery');
  const detailCardCount = document.getElementById('fc-detail-card-count');
  const detailLastStudied = document.getElementById('fc-detail-last-studied');
  const detailCardsList = document.getElementById('fc-detail-cards-list');
  const detailStudyBtn = document.getElementById('fc-detail-study-btn');
  const detailEditBtn = document.getElementById('fc-detail-edit-btn');
  const detailExportBtn = document.getElementById('fc-detail-export-btn');
  const detailDeleteBtn = document.getElementById('fc-detail-delete-btn');
  
  // Header buttons
  const newSetBtn = document.getElementById('new-set-btn');
  const emptyCreateBtn = document.getElementById('fc-empty-create-btn');
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
  const aiCountSlider = document.getElementById('fc-ai-count');
  const aiCountValDisplay = document.getElementById('fc-ai-count-val');
  const aiGenerateBtn = document.getElementById('fc-ai-generate-btn');

  // Preview List
  const previewList = document.getElementById('fc-preview-list');
  const saveSetBtn = document.getElementById('fc-save-set-btn');
  const previewStudyBtn = document.getElementById('fc-preview-study-btn');

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
  let selectedDeckId = null; // Currently selected deck in sidebar
  let isSessionEnded = false;
  
  // --- View controllers ---
  function showMainView() {
    mainView.style.display = 'flex';
    createView.style.display = 'none';
    loadFlashcardSets();
    if (window.refreshDashboard) window.refreshDashboard();
  }

  function showCreateView(editingSetId = null) {
    mainView.style.display = 'none';
    createView.style.display = 'flex';
    
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

  // --- Sidebar Deck List ---
  function loadFlashcardSets() {
    const sets = window.StudyStorage.getFlashcardSets();
    const searchTerm = (deckSearchInput ? deckSearchInput.value.trim().toLowerCase() : '');
    
    // Filter by search
    const filteredSets = searchTerm 
      ? sets.filter(s => s.name.toLowerCase().includes(searchTerm))
      : sets;
    
    // Populate sidebar list
    renderDeckSidebar(filteredSets);
    
    // Update count label
    if (deckCountLabel) {
      deckCountLabel.textContent = `${sets.length} deck${sets.length !== 1 ? 's' : ''}`;
    }
    
    // Show/hide empty state vs detail panel
    if (sets.length === 0) {
      emptyState.style.display = 'flex';
      deckDetailPanel.style.display = 'none';
      selectedDeckId = null;
    } else {
      emptyState.style.display = 'none';
      
      // If no deck is selected, or selected deck no longer exists, select the first one
      const selectedExists = sets.find(s => s.id === selectedDeckId);
      if (!selectedDeckId || !selectedExists) {
        if (filteredSets.length > 0) {
          selectDeck(filteredSets[0].id);
        } else {
          deckDetailPanel.style.display = 'none';
        }
      } else {
        // Refresh the detail view for the currently selected deck
        selectDeck(selectedDeckId);
      }
    }
  }

  function renderDeckSidebar(sets) {
    if (!deckList) return;
    deckList.innerHTML = '';
    
    if (sets.length === 0) {
      deckList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:24px 12px; line-height:1.5;">No decks found.</div>`;
      return;
    }
    
    sets.forEach(set => {
      // Calculate mastery
      let totalGotIt = 0;
      let totalMissed = 0;
      set.cards.forEach(c => {
        totalGotIt += (c.gotIt || 0);
        totalMissed += (c.missed || 0);
      });
      const totalRated = totalGotIt + totalMissed;
      const perfPct = totalRated > 0 ? Math.round((totalGotIt / totalRated) * 100) : 0;
      
      const item = document.createElement('div');
      item.className = 'fc-deck-list-item' + (set.id === selectedDeckId ? ' active' : '');
      item.dataset.deckId = set.id;
      
      item.innerHTML = `
        <span class="fc-deck-list-item-title">${escapeHTML(set.name)}</span>
        <div class="fc-deck-list-item-meta">
          <span>${set.cards.length} card${set.cards.length !== 1 ? 's' : ''}</span>
          <span class="fc-deck-list-item-mastery">${perfPct}%</span>
        </div>
      `;
      
      item.addEventListener('click', () => {
        selectDeck(set.id);
      });
      
      deckList.appendChild(item);
    });
  }

  function selectDeck(deckId) {
    selectedDeckId = deckId;
    
    const sets = window.StudyStorage.getFlashcardSets();
    const set = sets.find(s => s.id === deckId);
    if (!set) return;
    
    // Update sidebar active state
    document.querySelectorAll('.fc-deck-list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.deckId === deckId);
    });
    
    // Show detail panel
    emptyState.style.display = 'none';
    deckDetailPanel.style.display = 'flex';
    
    // Calculate mastery
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
    
    // Populate detail header
    detailTitle.textContent = set.name;
    detailMeta.textContent = `${set.cards.length} cards | Subject: ${set.subject || 'General'}`;
    
    // Populate stats
    detailMastery.textContent = `${perfPct}%`;
    detailCardCount.textContent = set.cards.length;
    detailLastStudied.textContent = lastStudiedStr;
    
    // Render cards list
    renderDetailCards(set);
    
    // Wire up detail action buttons
    detailStudyBtn.onclick = () => startStudySession(set);
    detailEditBtn.onclick = () => showCreateView(set.id);
    detailExportBtn.onclick = () => exportCSV(set);
    detailDeleteBtn.onclick = () => {
      window.showConfirmModal(
        'Delete Flashcard Set?',
        `Are you sure you want to permanently delete the set "${set.name}"? This action cannot be undone.`,
        () => {
          selectedDeckId = null;
          window.StudyStorage.deleteFlashcardSet(set.id);
          window.showToast('Flashcard set deleted');
          loadFlashcardSets();
        }
      );
    };
  }

  function renderDetailCards(set) {
    if (!detailCardsList) return;
    detailCardsList.innerHTML = '';
    
    if (set.cards.length === 0) {
      detailCardsList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:24px;">No cards in this deck yet.</div>`;
      return;
    }
    
    set.cards.forEach((card, idx) => {
      const item = document.createElement('div');
      item.className = 'fc-detail-card-item';
      
      item.innerHTML = `
        <span class="fc-detail-card-num">${idx + 1}</span>
        <div class="fc-detail-card-text">
          <span class="fc-detail-card-front">${escapeHTML(card.front)}</span>
          <span class="fc-detail-card-back">${escapeHTML(card.back)}</span>
        </div>
      `;
      
      detailCardsList.appendChild(item);
    });
  }

  // Sidebar search filtering
  if (deckSearchInput) {
    deckSearchInput.addEventListener('input', () => {
      const sets = window.StudyStorage.getFlashcardSets();
      const searchTerm = deckSearchInput.value.trim().toLowerCase();
      const filteredSets = searchTerm
        ? sets.filter(s => s.name.toLowerCase().includes(searchTerm))
        : sets;
      renderDeckSidebar(filteredSets);
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
  aiNotesInput.addEventListener('input', () => {
    const text = aiNotesInput.value.trim();
    if (window.detectSubject) {
      const detected = window.detectSubject(text);
      if (detected) {
        setSubjectSelect.value = detected;
      }
    }
  });

  aiGenerateBtn.addEventListener('click', () => {
    if (isAiGenerating) return;

    const notes = aiNotesInput.value.trim();
    const num = aiCountSlider.value;

    if (!notes) {
      window.showToast('Please paste some study notes for the AI first.', 'warning');
      return;
    }

    // Auto subject detection fallback immediately before generation
    if (window.detectSubject) {
      const detected = window.detectSubject(notes);
      if (detected) {
        setSubjectSelect.value = detected;
      }
    }

    isAiGenerating = true;
    aiGenerateBtn.textContent = 'Generating cards...';
    aiGenerateBtn.disabled = true;

    const prompt = `Based on the following notes, identify the key academic terms and their definitions. Generate exactly ${num} flashcards. Differentiate the term and its definition clearly.
Format each flashcard exactly like this, with the definition/question on the FRONT and the corresponding key term/answer on the BACK:
FRONT: [definition]
BACK: [term/answer]

Do not write any extra introduction or conclusion text. Only return the cards in this format.

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
        
        // Fallback: parse direct notes using the dash rule
        const text = aiNotesInput.value.trim();
        const prevLength = tempCards.length;
        parseAiFlashcards(text);
        
        if (tempCards.length > prevLength) {
          aiNotesInput.value = '';
          window.showToast('✓ Extracted cards directly from notes using dashes!', 'success');
        } else {
          window.showToast('Could not reach Ollama connection.', 'error');
        }
      }
    );
  });

  // Helper to clean brackets, quotes, and whitespace from parsed strings
  function cleanValue(val) {
    if (!val) return '';
    let cleaned = val.trim();
    // Strip leading/trailing brackets [ ]
    cleaned = cleaned.replace(/^\[|\]$/g, '').trim();
    // Strip leading/trailing quotes
    cleaned = cleaned.replace(/^['"]|['"]$/g, '').trim();
    return cleaned;
  }

  // Parse lines matching FRONT: [term] | BACK: [def] (inline) or multi-line FRONT: [term] and BACK: [def]
  function parseAiFlashcards(text) {
    const lines = text.split('\n');
    let currentFront = '';
    const initialLength = tempCards.length;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Try matching FRONT: ... | BACK: ... inline first, with relaxed prefix matching (ignoring list bullets/numbers)
      const inlineMatch = trimmed.match(/(?:^|[^a-zA-Z])FRONT\b[^:|]*[:|]\s*(.*?)\s*\|\s*BACK\b[^:]*:\s*(.*)/i);
      if (inlineMatch) {
        tempCards.push({
          id: 'card-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          front: cleanValue(inlineMatch[1]),
          back: cleanValue(inlineMatch[2]),
          gotIt: 0,
          missed: 0
        });
        return;
      }

      // Try matching separate line FRONT: ... and BACK: ...
      const frontMatch = trimmed.match(/(?:^|[^a-zA-Z])FRONT\b[^:]*:\s*(.*)/i);
      const backMatch = trimmed.match(/(?:^|[^a-zA-Z])BACK\b[^:]*:\s*(.*)/i);

      if (frontMatch) {
        currentFront = frontMatch[1].trim();
      } else if (backMatch && currentFront) {
        tempCards.push({
          id: 'card-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          front: cleanValue(currentFront),
          back: cleanValue(backMatch[1]),
          gotIt: 0,
          missed: 0
        });
        currentFront = ''; // Reset
      }
    });

    // Fallback: If FRONT/BACK formatting wasn't matched, parse lines containing a dash
    // where the left side is the answer (BACK) and the right side is the question (FRONT).
    if (tempCards.length === initialLength) {
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Skip heading lines or lines too short to contain a valid definition pair
        if (trimmed.startsWith('#') || trimmed.length < 5) return;

        let left = '';
        let right = '';

        // Match en-dash, em-dash, or hyphen with spaces first to prevent splitting on inner-word hyphens (e.g. "on-device")
        const primaryMatch = trimmed.match(/^(.*?)\s*(?:[\u2012\u2013\u2014—–]|\s+-\s+)\s*(.*)$/);
        if (primaryMatch) {
          left = primaryMatch[1].replace(/^[-*•\d\.\s]+/, '').trim();
          right = primaryMatch[2].trim();
        } else {
          // Fallback: split on the first standard hyphen if no spaced dash exists
          const dashIndex = trimmed.indexOf('-');
          if (dashIndex > 0 && dashIndex < trimmed.length - 1) {
            left = trimmed.substring(0, dashIndex).replace(/^[-*•\d\.\s]+/, '').trim();
            right = trimmed.substring(dashIndex + 1).trim();
          }
        }

        if (left.length > 0 && right.length > 0) {
          tempCards.push({
            id: 'card-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
            front: cleanValue(right), // Right side is the question/FRONT
            back: cleanValue(left),   // Left side is the answer/BACK
            gotIt: 0,
            missed: 0
          });
        }
      });
    }

    renderPreviewList();
  }

  // --- Preview List Renderer ---
  function renderPreviewList() {
    previewList.innerHTML = '';
    
    if (tempCards.length === 0) {
      previewList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px;">No cards added yet. Add manually or generate with AI.</div>`;
      saveSetBtn.disabled = true;
      if (previewStudyBtn) previewStudyBtn.disabled = true;
      return;
    }

    saveSetBtn.disabled = false;
    if (previewStudyBtn) previewStudyBtn.disabled = false;

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

  saveSetBtn.addEventListener('click', () => {
    const name = setNameInput.value.trim();
    let subject = setSubjectSelect.value;

    // Auto subject detection fallback based on card content if no subject was set
    if (window.detectSubject && (!subject || subject === 'Other')) {
      const sampleText = tempCards.map(c => c.front + ' ' + c.back).join(' ');
      const detected = window.detectSubject(sampleText);
      if (detected) {
        subject = detected;
        setSubjectSelect.value = detected;
      }
    }

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
    selectedDeckId = setId; // Select the newly saved deck
    showMainView();
  });

  // Preview / Study active temp deck
  if (previewStudyBtn) {
    previewStudyBtn.addEventListener('click', () => {
      if (tempCards.length === 0) return;
      const tempSet = {
        id: 'fc-preview-temp',
        name: setNameInput.value.trim() || 'Temporary Preview Set',
        subject: setSubjectSelect.value,
        cards: tempCards
      };
      startStudySession(tempSet);
    });
  }

  // Study session keyboard navigation shortcuts
  document.addEventListener('keydown', (e) => {
    if (studyOverlay && (studyOverlay.style.display === 'flex' || studyOverlay.style.display === 'block')) {
      if (isSessionEnded) {
        if (e.code === 'Escape') {
          e.preventDefault();
          closeStudySession();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        cardViewport.click();
      } else if (e.key === '1') {
        if (ratingRow.classList.contains('active')) {
          e.preventDefault();
          rateMissed.click();
        }
      } else if (e.key === '2') {
        if (ratingRow.classList.contains('active')) {
          e.preventDefault();
          rateAlmost.click();
        }
      } else if (e.key === '3') {
        if (ratingRow.classList.contains('active')) {
          e.preventDefault();
          rateGotIt.click();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (!prevCardBtn.disabled) prevCardBtn.click();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (!nextCardBtn.disabled) nextCardBtn.click();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        closeStudySession();
      }
    }
  });

  // --- Flashcard Study player (Flip overlays) ---

  function startStudySession(set, missedOnly = false) {
    studySetReference = set;
    isSessionEnded = false;
    if (cardViewport) cardViewport.classList.remove('completed-state');
    
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
    if (isSessionEnded) return;
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
    isSessionEnded = true;
    if (cardViewport) cardViewport.classList.add('completed-state');

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
      <div class="fc-completion-layout">
        <span class="fc-completion-emoji">🎉</span>
        <h3 class="fc-completion-title">Deck Completed!</h3>
        <div class="fc-completion-mastery">
          <span class="fc-mastery-val">${pct}%</span>
          <span class="fc-mastery-lbl">Mastery Rate</span>
        </div>
        <div class="fc-completion-stats">
          <span class="stat-pill got-it">Got It: <strong>${gotItCount}</strong></span>
          <span class="stat-pill almost">Almost: <strong>${almostCount}</strong></span>
          <span class="stat-pill missed">Missed: <strong>${missedCount}</strong></span>
        </div>
        <div class="fc-completion-actions">
          <button class="btn-primary" id="fc-study-restart">Restart Deck</button>
          ${missedCount > 0 ? `<button class="btn-secondary btn-review-missed" id="fc-study-missed">Review Missed (${missedCount})</button>` : ''}
          <button class="btn-secondary" id="fc-study-shuffle-toggle">
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

  function closeStudySession() {
    studyOverlay.style.display = 'none';
    if (createView.style.display === 'flex' || (studySetReference && studySetReference.id === 'fc-preview-temp')) {
      showMainView();
    } else {
      loadFlashcardSets();
    }
  }

  // Close overlay
  closeStudyBtn.addEventListener('click', () => {
    closeStudySession();
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

  if (emptyCreateBtn) {
    emptyCreateBtn.addEventListener('click', () => {
      showCreateView();
    });
  }
  
  backToMainBtn.addEventListener('click', () => {
    showMainView();
  });

  manualTabBtn.addEventListener('click', () => switchTab('manual'));
  aiTabBtn.addEventListener('click', () => switchTab('ai'));

  if (aiCountSlider && aiCountValDisplay) {
    aiCountSlider.addEventListener('input', () => {
      aiCountValDisplay.textContent = aiCountSlider.value;
    });
  }

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
