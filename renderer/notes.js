/* StudyMind Note Editor Logic */

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar elements
  const notesSearchInput = document.getElementById('notes-search-input');
  const notesNewBtn = document.getElementById('notes-new-btn');
  const notesList = document.getElementById('notes-list');

  // Editor elements
  const titleInput = document.getElementById('notes-title-input');
  const contentTextarea = document.getElementById('notes-content-textarea');
  const wordCountVal = document.getElementById('notes-word-count');
  const saveStatus = document.getElementById('notes-save-status');
  const subjectSelect = document.getElementById('notes-subject');

  // Editor Actions
  const copyNoteBtn = document.getElementById('note-action-copy');
  const exportNoteBtn = document.getElementById('note-action-export');
  const deleteNoteBtn = document.getElementById('note-action-delete');

  // AI Assist Toolbar
  const aiSummarizeBtn = document.getElementById('note-ai-summarize');
  const aiExplainBtn = document.getElementById('note-ai-explain');
  const aiQuizBtn = document.getElementById('note-ai-quiz');
  const aiTermsBtn = document.getElementById('note-ai-terms');
  const aiImproveBtn = document.getElementById('note-ai-improve');

  // AI Drawer
  const aiDrawer = document.getElementById('notes-ai-drawer');
  const aiDrawerClose = document.getElementById('notes-ai-drawer-close');
  const aiDrawerContent = document.getElementById('notes-ai-drawer-content');
  const aiDrawerCopy = document.getElementById('notes-ai-copy-btn');
  const aiDrawerSave = document.getElementById('notes-ai-save-btn');

  // Note States
  let activeNote = null;
  let hasChanges = false;
  let autoSaveTimer = null;
  let aiDrawerText = '';
  let isAiProcessing = false;

  // Initialize
  function initNotes() {
    loadNotesList();
    
    // Auto-select first note if exists
    const notes = window.StudyStorage.getNotes();
    if (notes.length > 0) {
      loadNote(notes[0]);
    } else {
      createBlankNote();
    }

    // Start 30s AutoSave interval
    startAutoSaveInterval();
  }

  // Load list with search filter
  function loadNotesList(query = '') {
    notesList.innerHTML = '';
    const notes = window.StudyStorage.getNotes();
    const lowerQuery = query.toLowerCase();

    const filtered = notes.filter(n => 
      (n.title && n.title.toLowerCase().includes(lowerQuery)) ||
      (n.content && n.content.toLowerCase().includes(lowerQuery))
    );

    if (filtered.length === 0) {
      notesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 20px;">No notes found</div>`;
      return;
    }

    filtered.forEach(note => {
      const item = document.createElement('div');
      item.className = `note-item ${activeNote && activeNote.id === note.id ? 'active' : ''}`;
      
      const snippet = note.content ? note.content.substring(0, 50) : 'Empty note...';
      const dateStr = new Date(note.updatedAt || note.createdAt).toLocaleDateString();

      item.innerHTML = `
        <span class="note-item-title">${escapeHTML(note.title || 'Untitled Note')}</span>
        <span class="note-item-preview">${escapeHTML(snippet)}</span>
        <span class="note-item-date">${dateStr}</span>
      `;

      item.addEventListener('click', () => {
        // Save current note before switching
        saveCurrentNoteImmediately();
        loadNote(note);
      });

      notesList.appendChild(item);
    });
  }

  // Load note into editor
  function loadNote(note) {
    activeNote = note;
    titleInput.value = note.title || '';
    contentTextarea.value = note.content || '';
    subjectSelect.value = note.subject || 'Science';
    
    updateWordCount();
    hasChanges = false;
    saveStatus.style.display = 'none';

    // Highlight active in sidebar list
    const items = notesList.querySelectorAll('.note-item');
    items.forEach(it => it.classList.remove('active'));
    
    // Find active index
    loadNotesList(notesSearchInput.value);
  }

  // Blank note creator
  function createBlankNote() {
    saveCurrentNoteImmediately();
    
    const newNote = {
      id: 'note-' + Date.now(),
      title: 'Untitled Note',
      content: '',
      subject: 'Science',
      tags: [],
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    window.StudyStorage.saveNote(newNote);
    loadNote(newNote);
    loadNotesList();
    titleInput.focus();
  }

  // Expose global hooks for search
  window.loadNoteById = function(id) {
    const notes = window.StudyStorage.getNotes();
    const match = notes.find(n => n.id === id);
    if (match) loadNote(match);
  };

  // --- AutoSave Mechanics ---
  function startAutoSaveInterval() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(() => {
      if (hasChanges && activeNote) {
        saveCurrentNoteImmediately(true); // silent auto-save
      }
    }, 30000); // 30 seconds
  }

  function saveCurrentNoteImmediately(isAuto = false) {
    if (!activeNote) return;
    
    const title = titleInput.value.trim() || 'Untitled Note';
    const content = contentTextarea.value;
    const subject = subjectSelect.value;

    // Check if there are real updates
    if (title === activeNote.title && content === activeNote.content && subject === activeNote.subject && !hasChanges) {
      return;
    }

    activeNote.title = title;
    activeNote.content = content;
    activeNote.subject = subject;
    activeNote.wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
    
    saveStatus.innerHTML = `<span>Saving...</span>`;
    saveStatus.style.display = 'flex';

    window.StudyStorage.saveNote(activeNote);
    hasChanges = false;

    setTimeout(() => {
      saveStatus.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Saved</span>`;
      setTimeout(() => {
        if (!hasChanges) saveStatus.style.display = 'none';
      }, 2000);
    }, 500);

    // Refresh list labels
    loadNotesList(notesSearchInput.value);
    if (window.refreshDashboard) window.refreshDashboard();
  }

  // Expose manual save hook to shortcuts.js
  window.triggerNoteSave = function() {
    saveCurrentNoteImmediately();
    window.showToast('✓ Note saved!');
  };

  // Track inputs for saving indicators
  titleInput.addEventListener('input', () => { hasChanges = true; });
  contentTextarea.addEventListener('input', () => { 
    hasChanges = true; 
    updateWordCount();
    
    // Auto subject detection
    if (window.detectSubject) {
      const text = contentTextarea.value.trim();
      const detected = window.detectSubject(text);
      if (detected) {
        subjectSelect.value = detected;
      }
    }
  });
  subjectSelect.addEventListener('change', () => { hasChanges = true; });

  function updateWordCount() {
    const text = contentTextarea.value.trim();
    const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
    wordCountVal.textContent = `${count} words`;
  }

  // Search input with debounce
  let searchDebounce = null;
  notesSearchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      loadNotesList(notesSearchInput.value);
    }, 200);
  });

  // --- AI Toolbar Assist Actions ---
  function runNoteAiAction(actionName, promptInstruction) {
    if (isAiProcessing) return;

    const content = contentTextarea.value.trim();
    if (!content) {
      window.showToast('Please type something in the note first.', 'warning');
      return;
    }

    isAiProcessing = true;
    aiDrawerText = '';
    aiDrawer.classList.add('active');
    
    // Loader indicator inside drawer
    aiDrawerContent.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px 0; gap: 12px; height:100%;">
        <div class="dot-loader" style="display: flex; gap: 6px;">
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.2s;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.4s;"></span>
        </div>
        <span style="font-weight:700; color:var(--text-secondary); font-size:12px;">StudyMind is analyzing...</span>
      </div>
    `;

    const compiledPrompt = `${promptInstruction}\n\nNote Content:\n${content}`;

    Ollama.generate(
      compiledPrompt,
      // Chunk listener
      (chunk) => {
        if (aiDrawerText === '') {
          aiDrawerContent.innerHTML = '';
        }
        aiDrawerText += chunk;
        aiDrawerContent.innerHTML = formatAIOutcome(aiDrawerText);
        aiDrawerContent.scrollTop = aiDrawerContent.scrollHeight;
      },
      // Completion listener
      () => {
        isAiProcessing = false;
        window.showToast(`✓ Note analysis complete: ${actionName}`);
      },
      // Error listener
      () => {
        isAiProcessing = false;
        aiDrawerContent.innerHTML = `<span style="color:var(--danger); font-weight:700;">Could not reach Ollama offline engine.</span>`;
        window.showToast('AI analysis encountered an error.', 'error');
      }
    );
  }

  aiSummarizeBtn.addEventListener('click', () => {
    runNoteAiAction('Summary', 'Summarize this note into 5 concise bullet points:');
  });

  aiExplainBtn.addEventListener('click', () => {
    runNoteAiAction('Concept Explanation', 'Explain this note simply for a student using analogies:');
  });

  aiTermsBtn.addEventListener('click', () => {
    runNoteAiAction('Key Vocabulary', 'Extract and list the key terms and definitions from this note:');
  });

  aiImproveBtn.addEventListener('click', () => {
    runNoteAiAction('Writing Improvement', 'Improve the clarity, grammar, and layout of this note while keeping it student-friendly:');
  });

  // Redirection to Quiz Maker
  aiQuizBtn.addEventListener('click', () => {
    const content = contentTextarea.value.trim();
    if (!content) {
      window.showToast('Please type notes content first.', 'warning');
      return;
    }
    
    saveCurrentNoteImmediately();
    
    if (window.prefillQuizNotes) {
      window.prefillQuizNotes(content, subjectSelect.value);
    }
    
    if (window.navigateToView) {
      window.navigateToView('quizmaker-view');
      window.showToast('Note loaded into Quiz Maker!');
    }
  });

  // Drawer Close
  aiDrawerClose.addEventListener('click', () => {
    aiDrawer.classList.remove('active');
  });

  // Drawer Actions: Copy
  aiDrawerCopy.addEventListener('click', () => {
    if (!aiDrawerText) return;
    navigator.clipboard.writeText(aiDrawerText).then(() => {
      window.showToast('Copied AI result to clipboard!');
    });
  });

  // Drawer Actions: Save as new note
  aiDrawerSave.addEventListener('click', () => {
    if (!aiDrawerText) return;

    const newNote = {
      id: 'note-' + Date.now(),
      title: `AI Analysis - ${activeNote ? activeNote.title : 'Notes'}`,
      content: aiDrawerText,
      subject: activeNote ? activeNote.subject : 'Science',
      tags: ['ai-assist'],
      wordCount: aiDrawerText.split(/\s+/).filter(Boolean).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    window.StudyStorage.saveNote(newNote);
    loadNote(newNote);
    loadNotesList();
    aiDrawer.classList.remove('active');
    window.showToast('✓ AI results saved as a new note!');
  });

  // --- Editor toolbar controls ---
  
  // Copy All
  copyNoteBtn.addEventListener('click', () => {
    const content = contentTextarea.value;
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      window.showToast('✓ Note contents copied to clipboard!');
    });
  });

  // Export as TXT file
  exportNoteBtn.addEventListener('click', async () => {
    const content = contentTextarea.value;
    if (!content || !window.api) return;

    const title = titleInput.value.trim() || 'Untitled-Note';
    const defaultName = `${title.replace(/\s+/g, '-')}.txt`;
    
    const result = await window.api.saveToFile(defaultName, content);
    if (result.success) {
      window.showToast('✓ Note exported successfully!');
    } else if (result.message !== 'Save cancelled') {
      window.showToast(`Export failed: ${result.message}`, 'error');
    }
  });

  // Delete note
  deleteNoteBtn.addEventListener('click', () => {
    if (!activeNote) return;

    window.showConfirmModal(
      'Delete Note?',
      `Are you sure you want to permanently delete the note "${activeNote.title || 'Untitled Note'}"? This action cannot be undone.`,
      () => {
        window.StudyStorage.deleteNote(activeNote.id);
        window.showToast('Note deleted');
        
        // Reload
        const notes = window.StudyStorage.getNotes();
        if (notes.length > 0) {
          loadNote(notes[0]);
        } else {
          createBlankNote();
        }
        loadNotesList();
      }
    );
  });

  async function importPdfNote() {
    if (!window.api || !window.api.readPdfFile) {
      window.showToast('PDF parsing API is not available.', 'error');
      return;
    }

    try {
      const result = await window.api.readPdfFile();
      if (!result.success) {
        if (result.message !== 'No file selected') {
          window.showToast(`PDF Import failed: ${result.message}`, 'error');
        }
        return;
      }

      // Auto-save the current note before importing
      saveCurrentNoteImmediately();

      const newNote = {
        id: 'note-' + Date.now(),
        title: result.fileName || 'Imported PDF Note',
        content: result.text || '',
        subject: 'Science', // default subject
        tags: ['pdf-import'],
        wordCount: result.text ? result.text.split(/\s+/).filter(Boolean).length : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      window.StudyStorage.saveNote(newNote);
      loadNote(newNote);
      loadNotesList();
      window.showToast('✓ PDF study notes imported!', 'success');
    } catch (err) {
      console.error('Error importing PDF:', err);
      window.showToast('Error importing PDF file.', 'error');
    }
  }

  notesNewBtn.addEventListener('click', createBlankNote);

  const notesUploadPdfBtn = document.getElementById('notes-upload-pdf-btn');
  if (notesUploadPdfBtn) {
    notesUploadPdfBtn.addEventListener('click', importPdfNote);
  }

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

  function formatAIOutcome(text) {
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

  // Start app
  initNotes();
});
