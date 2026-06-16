/* StudyMind Global Search Logic */

document.addEventListener('DOMContentLoaded', () => {
  const searchTrigger = document.getElementById('sidebar-search-trigger');
  const searchOverlay = document.getElementById('search-overlay');
  const searchInput = document.getElementById('search-modal-input');
  const searchClose = document.getElementById('search-modal-close');
  const resultsList = document.getElementById('search-results-list');

  let debounceTimer = null;

  if (!searchTrigger || !searchOverlay || !searchInput || !resultsList) return;

  // Click search trigger opens overlay
  searchTrigger.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    searchInput.value = '';
    searchInput.focus();
    renderSearchResults(''); // Render empty state or recent items
  });

  // Close search overlay
  searchClose.addEventListener('click', () => {
    searchOverlay.classList.remove('active');
  });

  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
      searchOverlay.classList.remove('active');
    }
  });

  // Debounced input listener
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderSearchResults(searchInput.value.trim());
    }, 300); // 300ms debounce
  });

  function renderSearchResults(query) {
    resultsList.innerHTML = '';

    if (!query) {
      resultsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 24px;">Type to search notes, chats, and flashcards...</div>`;
      return;
    }

    const lowerQuery = query.toLowerCase();

    // 1. Fetch data pools from Storage
    const chatSessions = window.StudyStorage.getChatSessions();
    const notes = window.StudyStorage.getNotes();
    const flashcardSets = window.StudyStorage.getFlashcardSets();

    // 2. Perform searches
    const matchedChats = chatSessions.filter(c => 
      (c.name && c.name.toLowerCase().includes(lowerQuery)) ||
      (c.subject && c.subject.toLowerCase().includes(lowerQuery)) ||
      c.messages.some(m => m.content.toLowerCase().includes(lowerQuery))
    );

    const matchedNotes = notes.filter(n => 
      (n.title && n.title.toLowerCase().includes(lowerQuery)) ||
      (n.content && n.content.toLowerCase().includes(lowerQuery)) ||
      (n.subject && n.subject.toLowerCase().includes(lowerQuery))
    );

    const matchedSets = flashcardSets.filter(f => 
      (f.name && f.name.toLowerCase().includes(lowerQuery)) ||
      (f.subject && f.subject.toLowerCase().includes(lowerQuery)) ||
      f.cards.some(c => c.front.toLowerCase().includes(lowerQuery) || c.back.toLowerCase().includes(lowerQuery))
    );

    const hasResults = matchedChats.length > 0 || matchedNotes.length > 0 || matchedSets.length > 0;

    if (!hasResults) {
      resultsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 24px;">No results found for "${escapeHTML(query)}"</div>`;
      return;
    }

    // Render Group: Notes
    if (matchedNotes.length > 0) {
      const group = document.createElement('div');
      group.className = 'search-result-group';
      group.innerHTML = `<div class="search-group-title">My Notes</div>`;
      
      matchedNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <svg class="search-result-icon" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="search-result-info">
            <div class="search-result-title">${escapeHTML(note.title || 'Untitled Note')}</div>
            <div class="search-result-snippet">${escapeHTML(note.content.substring(0, 70))}...</div>
          </div>
        `;
        item.addEventListener('click', () => {
          searchOverlay.classList.remove('active');
          if (window.navigateToView) window.navigateToView('notes-view');
          if (window.loadNoteById) window.loadNoteById(note.id);
        });
        group.appendChild(item);
      });
      resultsList.appendChild(group);
    }

    // Render Group: Chats
    if (matchedChats.length > 0) {
      const group = document.createElement('div');
      group.className = 'search-result-group';
      group.innerHTML = `<div class="search-group-title">Study Chats</div>`;
      
      matchedChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        // Find last user prompt snippet
        const lastUserMsg = chat.messages.filter(m => m.role === 'user').pop();
        const snippet = lastUserMsg ? lastUserMsg.content : (chat.messages[0] ? chat.messages[0].content : '');

        item.innerHTML = `
          <svg class="search-result-icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="search-result-info">
            <div class="search-result-title">${escapeHTML(chat.name || 'Study Chat')}</div>
            <div class="search-result-snippet">${escapeHTML(snippet.substring(0, 70))}...</div>
          </div>
        `;
        item.addEventListener('click', () => {
          searchOverlay.classList.remove('active');
          if (window.navigateToView) window.navigateToView('chat-view');
          if (window.loadChatById) window.loadChatById(chat.id);
        });
        group.appendChild(item);
      });
      resultsList.appendChild(group);
    }

    // Render Group: Flashcards
    if (matchedSets.length > 0) {
      const group = document.createElement('div');
      group.className = 'search-result-group';
      group.innerHTML = `<div class="search-group-title">Flashcards</div>`;
      
      matchedSets.forEach(set => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <svg class="search-result-icon" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="search-result-info">
            <div class="search-result-title">${escapeHTML(set.name || 'Untitled Set')}</div>
            <div class="search-result-snippet">${set.cards.length} cards | Subject: ${escapeHTML(set.subject || 'General')}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          searchOverlay.classList.remove('active');
          if (window.navigateToView) window.navigateToView('flashcards-view');
          if (window.loadFlashcardSetById) window.loadFlashcardSetById(set.id);
        });
        group.appendChild(item);
      });
      resultsList.appendChild(group);
    }
  }

  function escapeHTML(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
