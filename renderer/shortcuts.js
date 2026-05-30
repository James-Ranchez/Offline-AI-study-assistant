/* StudyMind Keyboard Shortcuts Handler */

document.addEventListener('keydown', (e) => {
  // Navigation Shortcuts: Ctrl + 1 to 6, Ctrl + ,
  if (e.ctrlKey && !e.shiftKey && !e.altKey) {
    const key = e.key;
    if (['1', '2', '3', '4', '5', '6'].includes(key)) {
      e.preventDefault();
      const views = {
        '1': 'dashboard-view',
        '2': 'chat-view',
        '3': 'reviewer-view',
        '4': 'flashcards-view',
        '5': 'notes-view',
        '6': 'timer-view'
      };
      const viewId = views[key];
      if (viewId && window.navigateToView) {
        window.navigateToView(viewId);
      }
      return;
    }

    if (key === ',') {
      e.preventDefault();
      if (window.navigateToView) {
        window.navigateToView('settings-view');
      }
      return;
    }

    // Ctrl+N: Context-aware new item creation
    if (key.toLowerCase() === 'n') {
      e.preventDefault();
      const activeView = document.querySelector('.view-container.active');
      if (!activeView) return;

      if (activeView.id === 'chat-view') {
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) newChatBtn.click();
      } else if (activeView.id === 'notes-view') {
        const newNoteBtn = document.getElementById('new-note-btn');
        if (newNoteBtn) newNoteBtn.click();
      } else if (activeView.id === 'flashcards-view') {
        const newSetBtn = document.getElementById('new-set-btn');
        if (newSetBtn) newSetBtn.click();
      }
      return;
    }

    // Ctrl+S: Context-aware save
    if (key.toLowerCase() === 's') {
      e.preventDefault();
      const activeView = document.querySelector('.view-container.active');
      if (!activeView) return;

      if (activeView.id === 'chat-view') {
        // Save chat session
        const saveChatBtn = document.getElementById('save-chat-btn');
        if (saveChatBtn) saveChatBtn.click();
      } else if (activeView.id === 'notes-view') {
        // Manual save note trigger
        if (window.triggerNoteSave) {
          window.triggerNoteSave();
        }
      }
      return;
    }

    // Ctrl+K: Focus global search
    if (key.toLowerCase() === 'k') {
      e.preventDefault();
      const searchTrigger = document.getElementById('sidebar-search-trigger');
      if (searchTrigger) searchTrigger.click();
      return;
    }
  }

  // Esc: Close modal/drawer
  if (e.key === 'Escape') {
    // Check if confirm modal is open
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal && confirmModal.classList.contains('active')) {
      const cancelBtn = document.getElementById('confirm-cancel-btn');
      if (cancelBtn) cancelBtn.click();
      return;
    }

    // Check if global search modal is open
    const searchOverlay = document.getElementById('search-overlay');
    if (searchOverlay && searchOverlay.classList.contains('active')) {
      searchOverlay.classList.remove('active');
      return;
    }

    // Check if onboarding tour is active
    if (window.tourActive && window.skipTour) {
      window.skipTour();
      return;
    }
    
    // Check if Notes AI drawer is open
    const notesAiDrawer = document.getElementById('notes-ai-drawer');
    if (notesAiDrawer && notesAiDrawer.classList.contains('active')) {
      notesAiDrawer.classList.remove('active');
      return;
    }
  }

  // Flashcards Study Mode keyboard shortcuts
  const flashcardsView = document.getElementById('flashcards-view');
  if (flashcardsView && flashcardsView.classList.contains('active')) {
    const studyOverlay = document.getElementById('fc-study-overlay');
    if (studyOverlay && studyOverlay.style.display === 'flex') {
      const activeElement = document.activeElement;
      const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
      
      if (!isInput) {
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          const cardElement = document.getElementById('fc-active-card-element');
          if (cardElement) cardElement.click();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevBtn = document.getElementById('fc-prev-btn');
          if (prevBtn) prevBtn.click();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextBtn = document.getElementById('fc-next-btn');
          if (nextBtn) nextBtn.click();
        }
      }
    }
  }
});
