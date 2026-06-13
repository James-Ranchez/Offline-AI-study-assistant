/* StudyMind Upgraded Study Chat Logic */

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const chatHistory = document.getElementById('chat-history');
  const welcomeState = document.getElementById('chat-welcome-state');
  const thinkingBubble = document.getElementById('chat-thinking');
  
  // Header Actions
  const newChatBtn = document.getElementById('chat-new-btn');
  const drawerToggleBtn = document.getElementById('chat-history-drawer-toggle');
  const clearSessionBtn = document.getElementById('chat-clear-btn');
  const activeModelMeta = document.getElementById('chat-active-model-meta');

  // Inline Rename Elements
  const chatTitleLabel = document.getElementById('chat-header-title-label');
  const chatTitleInput = document.getElementById('chat-title-rename-input');
  const chatTitleRenameBtn = document.getElementById('chat-title-rename-btn');
  const renameIconPencil = chatTitleRenameBtn ? chatTitleRenameBtn.querySelector('.rename-icon-pencil') : null;
  const renameIconCheck = chatTitleRenameBtn ? chatTitleRenameBtn.querySelector('.rename-icon-check') : null;
  
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
    
    // Sync inline title label + input value
    const sessionTitle = session.name || 'Study Chat';
    if (chatTitleLabel) chatTitleLabel.textContent = sessionTitle;
    if (chatTitleInput) chatTitleInput.value = sessionTitle;
    // Ensure we're not stuck in edit mode
    exitRenameEditMode(false);

    // Clear old bubbles
    const bubbles = chatHistory.querySelectorAll('.chat-message-row');
    bubbles.forEach(b => b.remove());

    // Render session messages
    session.messages.forEach(msg => {
      appendMessageBubble(msg.role, msg.content, msg.timestamp, msg);
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
    
    // Reset title back to default and cancel any rename edit
    if (chatTitleLabel) chatTitleLabel.textContent = 'Active study thread';
    if (chatTitleInput) chatTitleInput.value = 'Active study thread';
    exitRenameEditMode(false);

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

  function appendMessageBubble(role, text, timestamp = null, msgObj = null) {
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

    // Render chips if assistant message
    if (role === 'assistant') {
      // Create a minimal messageObj if not present to allow Copy / Save to Notes
      const finalMsgObj = msgObj || { role: 'assistant', content: text, timestamp: timestamp || new Date().toISOString() };
      renderMessageActionChips(bubble, finalMsgObj, currentSession);
      if (finalMsgObj.relatedQuestions && finalMsgObj.relatedQuestions.length > 0) {
        renderBubbleRelatedQuestionChips(bubble, finalMsgObj.relatedQuestions, finalMsgObj.explanationTopic || (currentSession ? currentSession.name : 'Concept'));
      }
    }

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

    let bubble = null;
    let paragraph = null;
    let cursor = null;
    let responseText = '';

    // Invoke stream chat
    Ollama.chat(
      messages,
      // Chunk listener
      (chunk) => {
        if (!bubble) {
          thinkingBubble.classList.remove('active');
          bubble = appendMessageBubble('assistant', '', new Date().toISOString());
          paragraph = bubble.querySelector('p');
          
          cursor = document.createElement('span');
          cursor.className = 'streaming-cursor';
          bubble.appendChild(cursor);
        }
        responseText += chunk;
        paragraph.innerHTML = formatAIResponseText(responseText);
        scrollToBottom();
      },
      // Completion listener
      () => {
        thinkingBubble.classList.remove('active');
        if (cursor) cursor.remove();
        isGenerating = false;

        const aiTime = new Date().toISOString();
        const assistantMessage = { role: 'assistant', content: responseText, timestamp: aiTime };
        currentSession.messages.push(assistantMessage);
        
        // Save
        window.StudyStorage.saveChatSession(currentSession);
        
        // Log in progress tracker
        window.StudyStorage.logStudySession({
          date: new Date().toISOString().split('T')[0],
          type: 'chat',
          duration: 120, // Estimate 2 minutes spent per chat turn
          score: null
        });

        // Add action chips under the bubble
        if (bubble) {
          renderMessageActionChips(bubble, assistantMessage, currentSession);
        }

        refreshSessionsList();
      },
      // Error listener
      (err) => {
        thinkingBubble.classList.remove('active');
        if (cursor) cursor.remove();
        isGenerating = false;

        if (!bubble) {
          bubble = appendMessageBubble('assistant', '', new Date().toISOString());
          paragraph = bubble.querySelector('p');
        }

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

  // --- Inline Rename Logic ---
  function enterRenameEditMode() {
    if (!currentSession) {
      window.showToast('Start a conversation first before renaming.', 'info');
      return;
    }
    chatTitleInput.value = currentSession.name || 'Study Chat';
    chatTitleLabel.style.display = 'none';
    chatTitleInput.style.display = 'block';
    renameIconPencil.style.display = 'none';
    renameIconCheck.style.display = 'block';
    chatTitleRenameBtn.classList.add('editing');
    chatTitleInput.focus();
    chatTitleInput.select();
  }

  function exitRenameEditMode(save) {
    chatTitleLabel.style.display = 'block';
    chatTitleInput.style.display = 'none';
    renameIconPencil.style.display = 'block';
    renameIconCheck.style.display = 'none';
    chatTitleRenameBtn.classList.remove('editing');

    if (save && currentSession) {
      const newName = chatTitleInput.value.trim();
      if (newName) {
        currentSession.name = newName;
        chatTitleLabel.textContent = newName;
        window.StudyStorage.saveChatSession(currentSession);
        refreshSessionsList();
        if (window.refreshDashboard) window.refreshDashboard();
        window.showToast('Chat renamed!', 'success');
      }
    }
  }

  if (chatTitleRenameBtn) {
    chatTitleRenameBtn.addEventListener('click', () => {
      if (chatTitleRenameBtn.classList.contains('editing')) {
        exitRenameEditMode(true);
      } else {
        enterRenameEditMode();
      }
    });
  }

  if (chatTitleInput) {
    chatTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        exitRenameEditMode(true);
      } else if (e.key === 'Escape') {
        exitRenameEditMode(false);
      }
    });
  }

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

  // --- Concept Explainer Drawer Event Listeners & Integrations ---
  const explainerDrawer = document.getElementById('chat-explainer-drawer');
  const explainerToggleBtn = document.getElementById('chat-explainer-drawer-toggle');
  const explainerCloseBtn = document.getElementById('chat-explainer-drawer-close');
  const explainerGenerateBtn = document.getElementById('chat-explainer-generate-btn');
  const explainerInput = document.getElementById('chat-explainer-input');
  const explainerCompareWrapper = document.getElementById('chat-explainer-compare-wrapper');
  const explainerCompareInput = document.getElementById('chat-explainer-compare-input');
  const explainerFormatSelect = document.getElementById('chat-explainer-format');

  // Difficulty Level Buttons inside Explainer Drawer
  const chatBtnSimple = document.getElementById('chat-diff-simple');
  const chatBtnStandard = document.getElementById('chat-diff-standard');
  const chatBtnAdvanced = document.getElementById('chat-diff-advanced');

  let selectedExplainerLevel = 'Simple';
  const chatDiffButtons = [chatBtnSimple, chatBtnStandard, chatBtnAdvanced];

  chatDiffButtons.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      chatDiffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedExplainerLevel = btn.getAttribute('data-level');
    });
  });

  if (explainerToggleBtn && explainerDrawer) {
    explainerToggleBtn.addEventListener('click', () => {
      explainerDrawer.classList.toggle('active');
      if (explainerDrawer.classList.contains('active') && explainerInput) {
        explainerInput.focus();
      }
    });
  }

  if (explainerCloseBtn && explainerDrawer) {
    explainerCloseBtn.addEventListener('click', () => {
      explainerDrawer.classList.remove('active');
    });
  }

  if (explainerFormatSelect && explainerCompareWrapper) {
    explainerFormatSelect.addEventListener('change', () => {
      if (explainerFormatSelect.value === 'compare') {
        explainerCompareWrapper.style.display = 'flex';
      } else {
        explainerCompareWrapper.style.display = 'none';
      }
    });
  }

  if (explainerGenerateBtn) {
    explainerGenerateBtn.addEventListener('click', () => {
      const topic = (explainerInput ? explainerInput.value : '').trim();
      if (!topic) {
        window.showToast('Please type a topic first', 'warning');
        return;
      }

      const compareTopic = (explainerCompareInput ? explainerCompareInput.value : '').trim();
      const format = explainerFormatSelect ? explainerFormatSelect.value : 'explain';

      if (explainerDrawer) {
        explainerDrawer.classList.remove('active');
      }

      // Reset inputs
      if (explainerInput) explainerInput.value = '';
      if (explainerCompareInput) explainerCompareInput.value = '';
      if (explainerFormatSelect) {
        explainerFormatSelect.value = 'explain';
        explainerCompareWrapper.style.display = 'none';
      }

      submitTopicExplainerExplanation(topic, compareTopic, selectedExplainerLevel, format);
    });
  }

  // Submit structured topic explanation
  async function submitTopicExplainerExplanation(topic, compareTopic, level, format) {
    if (isGenerating) return;

    isGenerating = true;
    chatInput.value = '';
    chatInput.style.height = '38px';
    charCounter.style.display = 'none';
    welcomeState.style.display = 'none';

    const timestamp = new Date().toISOString();
    
    // Create custom user message display text
    let userMsgText = `Explain the concept of **${topic}**`;
    if (format === 'compare') {
      userMsgText = `Compare and contrast **${topic}** with **${compareTopic}**`;
    } else if (format === 'steps') {
      userMsgText = `Provide a step-by-step breakdown of **${topic}**`;
    } else if (format === 'misconceptions') {
      userMsgText = `Explain common misconceptions about **${topic}**`;
    } else if (format === 'examples') {
      userMsgText = `Provide real-world examples for **${topic}**`;
    }
    userMsgText += ` (Difficulty: ${level})`;

    appendMessageBubble('user', userMsgText, timestamp);
    scrollToBottom();

    // Determine subject tag if fresh chat
    let subject = window.detectSubject(topic) || 'Science';

    if (!currentSession) {
      currentSession = {
        id: 'chat-' + Date.now(),
        name: topic.length > 25 ? topic.substring(0, 25) + '...' : topic,
        subject: subject,
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: []
      };
    }

    currentSession.messages.push({ role: 'user', content: userMsgText, timestamp });

    // Show thinking bubble
    thinkingBubble.classList.add('active');
    scrollToBottom();

    // Core instructions based on difficulty
    let diffInstruction = '';
    if (level === 'Simple') {
      diffInstruction = 'Explain this concept at a basic level appropriate for a 10-year-old child. Use very simple language, relatable everyday analogies, and clear examples.';
    } else if (level === 'Standard') {
      diffInstruction = 'Explain this concept at a high school student level. Use clear accessible language, structured details, and practical real-world applications.';
    } else {
      diffInstruction = 'Provide an advanced, technically detailed, and academic explanation appropriate for college level. Use precise terminology and explore underlying mechanisms.';
    }

    // Formatting prompt construction
    let prompt = '';
    if (format === 'explain') {
      prompt = `Explain the concept of "${topic}". ${diffInstruction} Do not write any extra introduction or conclusion.`;
    } else if (format === 'steps') {
      prompt = `Provide a step-by-step breakdown explaining "${topic}". ${diffInstruction} Break it down into logical sequential steps. Do not write any extra introduction or conclusion.`;
    } else if (format === 'compare') {
      prompt = `Compare and contrast the concept of "${topic}" with "${compareTopic}". ${diffInstruction} Highlight key similarities and differences clearly. Do not write any extra introduction or conclusion.`;
    } else if (format === 'misconceptions') {
      prompt = `Explain common misconceptions and errors students make about the topic "${topic}", and explain the correct physics or facts. ${diffInstruction} Do not write any extra introduction or conclusion.`;
    } else if (format === 'examples') {
      prompt = `Explain "${topic}" by providing concrete, practical, real-world examples. ${diffInstruction} Focus on clear cases that make it easy to understand. Do not write any extra introduction or conclusion.`;
    }

    // Gather context (last 10 turns) - in this case it might just be the new prompt
    const recentMessages = currentSession.messages.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const messages = [
      {
        role: 'system',
        content: 'You are StudyMind, a supportive, knowledgeable, and friendly offline AI study assistant. Speak like an actual human study partner who is mentoring the student. Answer questions clearly, simply, and accurately. Use examples and analogies when helpful. Keep your answers conversational, encouraging, and focused on helping the student learn. Do not repeat prompt tags or prefix your responses with role names.'
      },
      ...recentMessages,
      { role: 'user', content: prompt }
    ];

    let bubble = null;
    let paragraph = null;
    let cursor = null;
    let responseText = '';

    // Invoke stream chat
    Ollama.chat(
      messages,
      // Chunk listener
      (chunk) => {
        if (!bubble) {
          thinkingBubble.classList.remove('active');
          bubble = appendMessageBubble('assistant', '', new Date().toISOString());
          paragraph = bubble.querySelector('p');
          
          cursor = document.createElement('span');
          cursor.className = 'streaming-cursor';
          bubble.appendChild(cursor);
        }
        responseText += chunk;
        paragraph.innerHTML = formatAIResponseText(responseText);
        scrollToBottom();
      },
      // Completion listener
      () => {
        thinkingBubble.classList.remove('active');
        if (cursor) cursor.remove();
        isGenerating = false;

        const aiTime = new Date().toISOString();
        const assistantMessage = {
          role: 'assistant',
          content: responseText,
          timestamp: aiTime,
          isExplanation: true,
          explanationTopic: topic,
          explanationLevel: level
        };
        currentSession.messages.push(assistantMessage);
        
        // Save
        window.StudyStorage.saveChatSession(currentSession);
        
        // Log in progress tracker
        window.StudyStorage.logStudySession({
          date: new Date().toISOString().split('T')[0],
          type: 'chat',
          duration: 180, // Estimate 3 minutes spent reading/generating topic explanations
          score: null
        });

        // Add action chips under the bubble
        if (bubble) {
          renderMessageActionChips(bubble, assistantMessage, currentSession);
          // Generate related questions in background
          generateBubbleRelatedQuestions(topic, responseText, bubble, assistantMessage, currentSession);
        }

        refreshSessionsList();
      },
      // Error listener
      (err) => {
        thinkingBubble.classList.remove('active');
        if (cursor) cursor.remove();
        isGenerating = false;

        if (!bubble) {
          bubble = appendMessageBubble('assistant', '', new Date().toISOString());
          paragraph = bubble.querySelector('p');
        }

        const errMsg = Ollama.isMockMode 
          ? 'Error compiling mock response.'
          : "Could not reach the AI. Ensure Ollama service is running. Consult settings diagnostics.";

        paragraph.innerHTML = `<span style="color: var(--danger); font-weight:700;">Connection Error: ${errMsg}</span>`;
        window.showToast('AI response stream encountered an error.', 'error');
      }
    );
  }

  // Submit follow-up explanation (Go Deeper or Simplify)
  async function submitFollowUpExplanation(topic, previousContent, type) {
    if (isGenerating) return;

    let userPromptText = '';
    let prompt = '';
    let level = 'Standard';

    if (type === 'deeper') {
      userPromptText = `Go deeper on this concept.`;
      prompt = `Based on this explanation, explain the topic "${topic}" in more detail, providing advanced details, mechanics, and technical insights:\n${previousContent.substring(0, 800)}`;
      level = 'Advanced';
    } else {
      userPromptText = `Simplify this explanation more.`;
      prompt = `Based on this explanation, explain the topic "${topic}" even more simply, using extremely simple analogies and basic vocabulary appropriate for a young child:\n${previousContent.substring(0, 800)}`;
      level = 'Simple';
    }

    isGenerating = true;
    welcomeState.style.display = 'none';

    const timestamp = new Date().toISOString();
    appendMessageBubble('user', userPromptText, timestamp);
    scrollToBottom();

    if (!currentSession) {
      currentSession = {
        id: 'chat-' + Date.now(),
        name: topic.length > 25 ? topic.substring(0, 25) + '...' : topic,
        subject: window.detectSubject(topic) || 'Science',
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: []
      };
    }

    currentSession.messages.push({ role: 'user', content: userPromptText, timestamp });

    // Show thinking bubble
    thinkingBubble.classList.add('active');
    scrollToBottom();

    const recentMessages = currentSession.messages.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const messages = [
      {
        role: 'system',
        content: 'You are StudyMind, a supportive, knowledgeable, and friendly offline AI study assistant. Speak like an actual human study partner who is mentoring the student. Answer questions clearly, simply, and accurately. Use examples and analogies when helpful. Keep your answers conversational, encouraging, and focused on helping the student learn. Do not repeat prompt tags or prefix your responses with role names.'
      },
      ...recentMessages,
      { role: 'user', content: prompt }
    ];

    let bubble = null;
    let paragraph = null;
    let cursor = null;
    let responseText = '';

    Ollama.chat(
      messages,
      (chunk) => {
        if (!bubble) {
          thinkingBubble.classList.remove('active');
          bubble = appendMessageBubble('assistant', '', new Date().toISOString());
          paragraph = bubble.querySelector('p');
          
          cursor = document.createElement('span');
          cursor.className = 'streaming-cursor';
          bubble.appendChild(cursor);
        }
        responseText += chunk;
        paragraph.innerHTML = formatAIResponseText(responseText);
        scrollToBottom();
      },
      () => {
        thinkingBubble.classList.remove('active');
        if (cursor) cursor.remove();
        isGenerating = false;

        const aiTime = new Date().toISOString();
        const assistantMessage = {
          role: 'assistant',
          content: responseText,
          timestamp: aiTime,
          isExplanation: true,
          explanationTopic: topic,
          explanationLevel: level
        };
        currentSession.messages.push(assistantMessage);
        
        window.StudyStorage.saveChatSession(currentSession);
        
        window.StudyStorage.logStudySession({
          date: new Date().toISOString().split('T')[0],
          type: 'chat',
          duration: 120,
          score: null
        });

        if (bubble) {
          renderMessageActionChips(bubble, assistantMessage, currentSession);
          generateBubbleRelatedQuestions(topic, responseText, bubble, assistantMessage, currentSession);
        }
        refreshSessionsList();
      },
      (err) => {
        thinkingBubble.classList.remove('active');
        if (cursor) cursor.remove();
        isGenerating = false;
        
        if (!bubble) {
          bubble = appendMessageBubble('assistant', '', new Date().toISOString());
          paragraph = bubble.querySelector('p');
        }
        paragraph.innerHTML = `<span style="color: var(--danger); font-weight:700;">Connection Error: Could not reach the AI.</span>`;
      }
    );
  }

  // Render quick actions on assistant bubble
  function renderMessageActionChips(bubbleElement, messageObj, sessionObj) {
    const existing = bubbleElement.querySelector('.message-action-chips');
    if (existing) existing.remove();

    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'message-action-chips';

    // 1. Copy Button
    const copyChip = document.createElement('button');
    copyChip.className = 'chat-action-chip';
    copyChip.innerHTML = '📋 Copy';
    copyChip.addEventListener('click', () => {
      navigator.clipboard.writeText(messageObj.content).then(() => {
        window.showToast('Copied to clipboard!');
      });
    });
    chipsContainer.appendChild(copyChip);

    // 2. Save Note Button
    const saveNoteChip = document.createElement('button');
    saveNoteChip.className = 'chat-action-chip';
    saveNoteChip.innerHTML = '📝 Save to Notes';
    saveNoteChip.addEventListener('click', () => {
      const activeTopic = messageObj.explanationTopic || (sessionObj ? sessionObj.name : 'Study Chat Explanation');
      const selectedLevel = messageObj.explanationLevel || 'Standard';
      const newNote = {
        id: 'note-' + Date.now(),
        title: `Explanation: ${activeTopic}`,
        content: messageObj.content,
        subject: selectedLevel === 'Advanced' ? 'Science' : 'Other',
        tags: ['topic-explainer'],
        wordCount: messageObj.content.split(/\s+/).filter(Boolean).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      window.StudyStorage.saveNote(newNote);
      window.showToast('✓ Saved directly to My Notes!');
    });
    chipsContainer.appendChild(saveNoteChip);

    // 3. Go Deeper / Simplify (if isExplanation is true)
    if (messageObj.isExplanation) {
      const goDeeperChip = document.createElement('button');
      goDeeperChip.className = 'chat-action-chip';
      goDeeperChip.innerHTML = '🔍 Go Deeper';
      goDeeperChip.addEventListener('click', () => {
        submitFollowUpExplanation(messageObj.explanationTopic, messageObj.content, 'deeper');
      });
      chipsContainer.appendChild(goDeeperChip);

      const simplifyChip = document.createElement('button');
      simplifyChip.className = 'chat-action-chip';
      simplifyChip.innerHTML = '👶 Simplify';
      simplifyChip.addEventListener('click', () => {
        submitFollowUpExplanation(messageObj.explanationTopic, messageObj.content, 'simplify');
      });
      chipsContainer.appendChild(simplifyChip);
    }

    bubbleElement.appendChild(chipsContainer);
  }

  // Generate 3 related questions using Ollama
  function generateBubbleRelatedQuestions(topic, explanation, bubbleElement, messageObj, sessionObj) {
    if (messageObj.relatedQuestions && messageObj.relatedQuestions.length > 0) {
      renderBubbleRelatedQuestionChips(bubbleElement, messageObj.relatedQuestions, topic);
      return;
    }

    const prompt = `Based on this explanation of "${topic}", generate exactly 3 simple follow-up questions a student might ask to understand it deeper. Return only the questions, each on a new line starting with 'Q:'. Do not write introduction text.
Explanation:
${explanation.substring(0, 300)}`;

    let responseText = '';

    Ollama.generate(
      prompt,
      (chunk) => {
        responseText += chunk;
      },
      () => {
        const lines = responseText.split('\n');
        const questions = [];
        let questionsCount = 0;

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;

          const match = trimmed.match(/^Q\s*[\:\-]\s*(.*)/i);
          if (match && questionsCount < 3) {
            questionsCount++;
            questions.push(match[1].trim());
          }
        });

        if (questions.length > 0) {
          messageObj.relatedQuestions = questions;
          window.StudyStorage.saveChatSession(sessionObj);
          renderBubbleRelatedQuestionChips(bubbleElement, questions, topic);
        }
      },
      () => {
        // Silent error
      }
    );
  }

  function renderBubbleRelatedQuestionChips(bubbleElement, questions, topic) {
    const existing = bubbleElement.querySelector('.message-related-questions');
    if (existing) existing.remove();

    const relatedContainer = document.createElement('div');
    relatedContainer.className = 'message-related-questions';

    const title = document.createElement('div');
    title.className = 'message-related-title';
    title.textContent = 'Explore Related Questions:';
    relatedContainer.appendChild(title);

    const listContainer = document.createElement('div');
    listContainer.className = 'message-related-list';
    listContainer.style.display = 'flex';
    listContainer.style.flexDirection = 'column';
    listContainer.style.gap = '6px';
    listContainer.style.marginTop = '6px';

    questions.forEach(q => {
      const qBtn = document.createElement('button');
      qBtn.className = 'message-question-chip';
      qBtn.textContent = q;
      qBtn.addEventListener('click', () => {
        submitUserMessage(q, window.detectSubject(topic));
      });
      listContainer.appendChild(qBtn);
    });

    relatedContainer.appendChild(listContainer);
    bubbleElement.appendChild(relatedContainer);
  }

  // Initial Startup
  initSuggestions();
  refreshSessionsList();
});
