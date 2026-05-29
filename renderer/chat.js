/* Study Chat Feature Logic */

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const chatHistory = document.getElementById('chat-history');
  const welcomeState = document.getElementById('chat-welcome-state');
  const thinkingBubble = document.getElementById('chat-thinking');
  const newChatBtn = document.getElementById('new-chat-btn');
  const sessionsList = document.getElementById('sessions-list');
  const clearSessionBtn = document.getElementById('clear-session-btn');
  const quickChips = document.querySelectorAll('.quick-chip');

  let currentSession = null;
  let isGenerating = false;

  // --- Sidebar Session Loading & Database Sync ---
  
  // Reload sessions listing in the chat drawer
  async function refreshSessionsList() {
    if (!window.api) return; // Safeguard if running in raw browser testing
    
    try {
      const sessions = await window.api.getSessions();
      sessionsList.innerHTML = '';
      
      if (sessions.length === 0) {
        sessionsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px 10px;">No saved study chats</div>`;
        return;
      }

      sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = `session-item ${currentSession && currentSession.id === session.id ? 'active' : ''}`;
        
        // Truncated title layout
        item.innerHTML = `
          <div class="session-item-title">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>${escapeHTML(session.title)}</span>
          </div>
          <button class="session-delete-btn" title="Delete Session" data-id="${session.id}">
            <svg viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        `;
        
        // Restore session on click (excluding clicks on the trash button)
        item.addEventListener('click', (e) => {
          if (e.target.closest('.session-delete-btn')) return;
          loadSession(session);
        });

        // Delete session listener
        const delBtn = item.querySelector('.session-delete-btn');
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const sessionId = delBtn.getAttribute('data-id');
          
          await window.api.deleteSession(sessionId);
          window.showToast('Study session deleted');
          
          if (currentSession && currentSession.id === sessionId) {
            startNewChat();
          } else {
            refreshSessionsList();
          }
        });

        sessionsList.appendChild(item);
      });
    } catch (err) {
      console.error('Failed to sync session logs:', err);
    }
  }

  // Load an existing session into the workspace
  function loadSession(session) {
    currentSession = session;
    
    // Clear display
    welcomeState.style.display = 'none';
    
    // Remove existing conversation bubbles
    const bubbles = chatHistory.querySelectorAll('.message-bubble');
    bubbles.forEach(b => b.remove());

    // Render session messages
    session.messages.forEach(msg => {
      appendMessageBubble(msg.role, msg.content);
    });

    scrollToBottom();
    refreshSessionsList();
  }

  // Clear current active session (creates a blank canvas)
  function startNewChat() {
    currentSession = null;
    welcomeState.style.display = 'flex';
    
    const bubbles = chatHistory.querySelectorAll('.message-bubble');
    bubbles.forEach(b => b.remove());
    
    refreshSessionsList();
  }

  // --- Message UI Builders ---

  // Scroll active window down to bottom
  function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  // Appends a styled bubble containing plaintext or basic markdown structures
  function appendMessageBubble(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role}`;
    
    // Simplistic converter for markdown bold, bullet listings, and headers
    const htmlText = formatAIResponseText(text);
    bubble.innerHTML = `<p>${htmlText}</p>`;
    
    chatHistory.appendChild(bubble);
    return bubble;
  }

  // Auto-growing chat inputs
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  // --- AI Submissions and Streaming Logic ---

  async function submitUserMessage(overrideText = null) {
    if (isGenerating) return;

    const query = (overrideText || chatInput.value).trim();
    if (!query) return;

    isGenerating = true;
    
    // UI Reset
    chatInput.value = '';
    chatInput.style.height = '44px';
    welcomeState.style.display = 'none';

    // Renders User bubble
    appendMessageBubble('user', query);
    scrollToBottom();

    // Instantiate session object in memory if starting fresh
    if (!currentSession) {
      currentSession = {
        id: 'session-' + Date.now(),
        title: query.length > 25 ? query.substring(0, 25) + '...' : query,
        createdAt: new Date().toISOString(),
        messages: []
      };
    }

    // Save user turn in session memory
    currentSession.messages.push({ role: 'user', content: query });

    // Show "Thinking..." bouncing dots
    thinkingBubble.classList.add('active');
    scrollToBottom();

    // Prepare message sequence string to feed local Ollama prompt
    let chatHistoryPrompt = '';
    
    // Inject system persona instruction first
    const systemPrompt = `You are StudyMind, a helpful and friendly study assistant for students. Answer questions clearly, simply, and accurately. Use examples when helpful. Keep answers concise but complete.\n\n`;
    
    chatHistoryPrompt += systemPrompt;
    
    // Compile history thread (limiting to last 8 turns to avoid local RAM bloat on i3 CPUs)
    const recentMessages = currentSession.messages.slice(-8);
    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        chatHistoryPrompt += `User: ${msg.content}\n`;
      } else {
        chatHistoryPrompt += `Assistant: ${msg.content}\n`;
      }
    });
    
    // Direct output continuation marker
    chatHistoryPrompt += `Assistant: `;

    // Renders Assistant bubble placeholder
    const assistantBubble = appendMessageBubble('assistant', '');
    const bubbleParagraph = assistantBubble.querySelector('p');
    let responseText = '';

    // Invoke streaming
    Ollama.generate(
      chatHistoryPrompt,
      // Chunk handler
      (chunk) => {
        // Hide thinking dots once first tokens arrive
        thinkingBubble.classList.remove('active');
        
        responseText += chunk;
        bubbleParagraph.innerHTML = formatAIResponseText(responseText);
        scrollToBottom();
      },
      // Completion handler
      async () => {
        thinkingBubble.classList.remove('active');
        isGenerating = false;

        // Save AI turn in session memory
        currentSession.messages.push({ role: 'assistant', content: responseText });

        // Save session in local database file
        if (window.api) {
          await window.api.saveSession(currentSession);
        }
        
        refreshSessionsList();
      },
      // Error handler
      (err) => {
        thinkingBubble.classList.remove('active');
        isGenerating = false;
        
        const errMsg = Ollama.isMockMode 
          ? 'Error generating mock reply'
          : "StudyMind can't reach the AI engine. Make sure Ollama is running. Go to Settings for help.";
        
        bubbleParagraph.innerHTML = `<span style="color: var(--color-advanced); font-weight: 700;">Error: ${errMsg}</span>`;
        window.showToast('AI response encountered a connection failure.', 'error');
      }
    );
  }

  // Trigger Send on button clicks
  sendBtn.addEventListener('click', () => submitUserMessage());

  // Trigger Send on Enter key presses (omitting shift+enter lines)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitUserMessage();
    }
  });

  // Action listeners for quick start chips
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt');
      submitUserMessage(promptText);
    });
  });

  // Sidebar controls
  newChatBtn.addEventListener('click', () => {
    startNewChat();
  });

  // Bottom action: Clear current conversation history
  clearSessionBtn.addEventListener('click', () => {
    if (!currentSession) {
      window.showToast('No active conversation to clear', 'error');
      return;
    }
    
    window.showConfirmModal(
      'Clear Study Conversation?',
      'Are you sure you want to clear all messages from this active session? The session block will remain but the conversation history will be wiped.',
      async () => {
        currentSession.messages = [];
        currentSession.title = 'New Study Chat';
        
        if (window.api) {
          await window.api.saveSession(currentSession);
        }
        
        loadSession(currentSession);
        window.showToast('Conversation cleared successfully');
      }
    );
  });

  // Helper: Escapes raw HTML strings safely
  function escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Simplistic markdown formatting converter (Bold, Lists, Headers)
  function formatAIResponseText(text) {
    let escaped = escapeHTML(text);
    
    // Bold matching: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Bullet points: \n* or \n•
    escaped = escaped.replace(/\n[•\*]\s*(.*?)(?=\n|$)/g, '<br>• $1');
    
    // Numbered listings
    escaped = escaped.replace(/\n(\d+)\.\s*(.*?)(?=\n|$)/g, '<br>$1. $2');

    // Accordion custom bold lists
    escaped = escaped.replace(/\n###\s*(.*?)(?=\n|$)/g, '<h4>$1</h4>');
    
    return escaped;
  }

  // Initial Sync
  setTimeout(refreshSessionsList, 500);
});
