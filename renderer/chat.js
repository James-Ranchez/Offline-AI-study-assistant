/* StudyMind Upgraded Study Chat Logic */

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const chatHistory = document.getElementById('chat-history');
  const welcomeState = document.getElementById('chat-welcome-state');
  const thinkingBubble = document.getElementById('chat-thinking');
  
  // Header Actions
  const newChatBtn = document.getElementById('chat-new-btn');
  const saveSessionBtn = document.getElementById('chat-save-btn');
  const drawerToggleBtn = document.getElementById('chat-history-drawer-toggle');
  const clearSessionBtn = document.getElementById('chat-clear-btn');
  const activeModelMeta = document.getElementById('chat-active-model-meta');
  
  // Drawer Elements
  const chatDrawer = document.getElementById('chat-drawer');
  const drawerCloseBtn = document.getElementById('chat-drawer-close');
  const sessionsList = document.getElementById('sessions-list');

  // Suggestions elements
  const subjectsRow = document.getElementById('subjects-row');
  const subPromptsContainer = document.getElementById('sub-prompts-container');
  const charCounter = document.getElementById('chat-char-counter');

  let currentSession = null;
  let isGenerating = false;

  // 18 Sub-prompts matching subjects
  const subPrompts = {
    'Science': [
      "Explain the water cycle simply with examples.",
      "How does photosynthesis convert light into glucose?",
      "What is the difference between mitosis and meiosis?"
    ],
    'Math': [
      "Explain the Pythagorean theorem with a real-world scenario.",
      "How do quadratic equations describe motion?",
      "What are the rules of logarithms explained simply?"
    ],
    'History': [
      "What were the main causes of World War 2?",
      "Summarize the significance of the Industrial Revolution.",
      "Explain the rise and fall of the Roman Empire."
    ],
    'English': [
      "What is a metaphor and how does it differ from a simile?",
      "Explain the structure of a persuasive essay.",
      "Summarize the main themes of Shakespeare's Romeo and Juliet."
    ],
    'Filipino': [
      "Ipaliwanag ang kahulugan at kasaysayan ng Florante at Laura.",
      "Ano ang kaibahan ng sanaysay sa maikling kwento?",
      "Ibuod ang mahalagang aral sa Noli Me Tangere."
    ],
    'Values': [
      "Why is empathy important in resolving conflicts?",
      "Explain the concept of integrity with everyday examples.",
      "How can we practice mindfulness during stressful exams?"
    ]
  };

  // Set active model indicator in header
  if (activeModelMeta) {
    const settings = window.StudyStorage.getSettings();
    activeModelMeta.textContent = `Model: ${settings.model || 'tinyllama'}`;
  }

  // --- Sidebar Session Loading & Database Sync ---
  
  // Reload sessions listing in the chat drawer
  function refreshSessionsList() {
    sessionsList.innerHTML = '';
    const sessions = window.StudyStorage.getChatSessions();
    
    if (sessions.length === 0) {
      sessionsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px 10px;">No saved study chats</div>`;
      return;
    }

    sessions.forEach(session => {
      const item = document.createElement('div');
      item.className = `session-item ${currentSession && currentSession.id === session.id ? 'active' : ''}`;
      
      // Choose subject icon
      let icon = '💬';
      if (session.subject === 'Science') icon = '🌧️';
      if (session.subject === 'Math') icon = '📐';
      if (session.subject === 'History') icon = '🏛️';
      if (session.subject === 'English') icon = '📖';
      if (session.subject === 'Filipino') icon = '🇵🇭';
      if (session.subject === 'Values') icon = '🕊️';

      item.innerHTML = `
        <div class="session-item-title">
          <span style="font-size:14px; margin-right: 4px;">${icon}</span>
          <span>${escapeHTML(session.name || 'Study Chat')}</span>
        </div>
        <button class="session-delete-btn" title="Delete Session" data-id="${session.id}">
          <svg viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `;
      
      item.addEventListener('click', (e) => {
        if (e.target.closest('.session-delete-btn')) return;
        loadSession(session);
        chatDrawer.classList.remove('active'); // auto-close drawer on load
      });

      const delBtn = item.querySelector('.session-delete-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sessionId = delBtn.getAttribute('data-id');
        
        window.showConfirmModal(
          'Delete Saved Chat?',
          'Are you sure you want to delete this study conversation session? This will remove it from your storage.',
          () => {
            window.StudyStorage.deleteChatSession(sessionId);
            window.showToast('Study session deleted');
            if (currentSession && currentSession.id === sessionId) {
              startNewChat();
            } else {
              refreshSessionsList();
            }
          }
        );
      });

      sessionsList.appendChild(item);
    });
  }

  // Load session into chat
  function loadSession(session) {
    currentSession = session;
    welcomeState.style.display = 'none';
    
    // Clear old bubbles
    const bubbles = chatHistory.querySelectorAll('.chat-message-row');
    bubbles.forEach(b => b.remove());

    // Render session messages
    session.messages.forEach(msg => {
      appendMessageBubble(msg.role, msg.content, msg.timestamp);
    });

    scrollToBottom();
    refreshSessionsList();
  }

  // Clear workspace
  function startNewChat() {
    currentSession = null;
    welcomeState.style.display = 'flex';
    
    const bubbles = chatHistory.querySelectorAll('.chat-message-row');
    bubbles.forEach(b => b.remove());
    
    // Reset suggestions
    initSuggestions();
    refreshSessionsList();
  }

  // Expose global load hooks for Search
  window.loadChatById = function(id) {
    const sessions = window.StudyStorage.getChatSessions();
    const match = sessions.find(s => s.id === id);
    if (match) loadSession(match);
  };

  // --- Message UI Builders ---
  function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function appendMessageBubble(role, text, timestamp = null) {
    const row = document.createElement('div');
    row.className = `chat-message-row ${role}-row`;

    const timeStr = timestamp 
      ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role}`;
    
    const formatted = formatAIResponseText(text);
    bubble.innerHTML = `
      <p>${formatted}</p>
      <span class="message-timestamp">${timeStr}</span>
    `;
    
    if (role === 'assistant') {
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'chat-avatar';
      avatarDiv.textContent = 'SM';
      row.appendChild(avatarDiv);
    }
    row.appendChild(bubble);
    
    chatHistory.appendChild(row);
    return bubble;
  }

  // Textarea autoexpand and character counter
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    
    const length = chatInput.value.length;
    if (length > 500) {
      charCounter.textContent = `${length} characters`;
      charCounter.style.display = 'block';
      if (length > 1500) {
        charCounter.classList.add('warning');
      } else {
        charCounter.classList.remove('warning');
      }
    } else {
      charCounter.style.display = 'none';
    }
  });

  // --- Prompt Suggestions Logic ---
  function initSuggestions() {
    subPromptsContainer.innerHTML = '';
    const activeChip = subjectsRow.querySelector('.subject-chip.active');
    if (activeChip) activeChip.classList.remove('active');
    
    // Reset subjects selection row
    const chips = subjectsRow.querySelectorAll('.subject-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        const sub = chip.getAttribute('data-subject');
        renderSubPrompts(sub);
      });
    });
  }

  function renderSubPrompts(subject) {
    subPromptsContainer.innerHTML = '';
    const promptsList = subPrompts[subject] || [];
    
    promptsList.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'sub-prompt-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        submitUserMessage(text, subject);
      });
      subPromptsContainer.appendChild(btn);
    });
  }

  // --- AI Submission and Streaming ---
  async function submitUserMessage(overrideText = null, chosenSubject = null) {
    if (isGenerating) return;

    const query = (overrideText || chatInput.value).trim();
    if (!query) return;

    isGenerating = true;
    chatInput.value = '';
    chatInput.style.height = '38px';
    charCounter.style.display = 'none';
    welcomeState.style.display = 'none';

    const timestamp = new Date().toISOString();
    appendMessageBubble('user', query, timestamp);
    scrollToBottom();

    // Determine subject tag if fresh chat
    let subject = chosenSubject || 'Science';
    const settings = window.StudyStorage.getSettings();
    if (!chosenSubject) {
      subject = settings.defaultSubject || 'Science';
    }

    if (!currentSession) {
      currentSession = {
        id: 'chat-' + Date.now(),
        name: query.length > 25 ? query.substring(0, 25) + '...' : query,
        subject: subject,
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: []
      };
    }

    currentSession.messages.push({ role: 'user', content: query, timestamp });

    // Show thinking bubble
    thinkingBubble.classList.add('active');
    scrollToBottom();

    // Gather context (last 10 turns)
    const recentMessages = currentSession.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const messages = [
      {
        role: 'system',
        content: 'You are StudyMind, a supportive, knowledgeable, and friendly offline AI study assistant. Speak like an actual human study partner who is mentoring the student. Answer questions clearly, simply, and accurately. Use examples and analogies when helpful. Keep your answers conversational, encouraging, and focused on helping the student learn. Do not repeat prompt tags or prefix your responses with role names.'
      },
      ...recentMessages
    ];

    // Create assistant bubble placeholder with streaming cursor
    const bubble = appendMessageBubble('assistant', '', new Date().toISOString());
    const paragraph = bubble.querySelector('p');
    
    // Add blinking cursor
    const cursor = document.createElement('span');
    cursor.className = 'streaming-cursor';
    bubble.appendChild(cursor);

    let responseText = '';

    // Invoke stream chat
    Ollama.chat(
      messages,
      // Chunk listener
      (chunk) => {
        thinkingBubble.classList.remove('active');
        responseText += chunk;
        paragraph.innerHTML = formatAIResponseText(responseText);
        scrollToBottom();
      },
      // Completion listener
      () => {
        thinkingBubble.classList.remove('active');
        cursor.remove();
        isGenerating = false;

        const aiTime = new Date().toISOString();
        currentSession.messages.push({ role: 'assistant', content: responseText, timestamp: aiTime });
        
        // Save
        window.StudyStorage.saveChatSession(currentSession);
        
        // Log in progress tracker
        window.StudyStorage.logStudySession({
          date: new Date().toISOString().split('T')[0],
          type: 'chat',
          duration: 120, // Estimate 2 minutes spent per chat turn
          score: null
        });

        refreshSessionsList();
      },
      // Error listener
      (err) => {
        thinkingBubble.classList.remove('active');
        cursor.remove();
        isGenerating = false;

        const errMsg = Ollama.isMockMode 
          ? 'Error compiling mock response.'
          : "Could not reach the AI. Ensure Ollama service is running. Consult settings diagnostics.";

        paragraph.innerHTML = `<span style="color: var(--danger); font-weight:700;">Connection Error: ${errMsg}</span>`;
        window.showToast('AI response stream encountered an error.', 'error');
      }
    );
  }

  // --- Actions Listeners ---
  sendBtn.addEventListener('click', () => submitUserMessage());
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitUserMessage();
    }
  });

  newChatBtn.addEventListener('click', () => {
    startNewChat();
  });

  saveSessionBtn.addEventListener('click', () => {
    if (!currentSession) {
      window.showToast('No active conversation to save', 'error');
      return;
    }
    
    const newName = prompt('Enter a custom name for this study session:', currentSession.name);
    if (newName && newName.trim()) {
      currentSession.name = newName.trim();
      window.StudyStorage.saveChatSession(currentSession);
      window.showToast('Session title updated!');
      refreshSessionsList();
      if (window.refreshDashboard) window.refreshDashboard();
    }
  });

  // Drawer Controls
  drawerToggleBtn.addEventListener('click', () => {
    chatDrawer.classList.toggle('active');
  });

  drawerCloseBtn.addEventListener('click', () => {
    chatDrawer.classList.remove('active');
  });

  // Clear active history
  clearSessionBtn.addEventListener('click', () => {
    if (!currentSession) {
      window.showToast('No active conversation to clear', 'error');
      return;
    }

    window.showConfirmModal(
      'Clear Conversation History?',
      'Are you sure you want to clear all messages from this active session? The session slot will remain but dialogue will be wiped.',
      () => {
        currentSession.messages = [];
        currentSession.name = 'New Study Chat';
        window.StudyStorage.saveChatSession(currentSession);
        loadSession(currentSession);
        window.showToast('Conversation wiped.');
      }
    );
  });

  // --- Formatting Helpers ---
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

  // Initial Startup
  initSuggestions();
  refreshSessionsList();
});
