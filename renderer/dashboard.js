/* StudyMind Dashboard Logic */

document.addEventListener('DOMContentLoaded', () => {
  const greetingText = document.getElementById('dashboard-greeting');
  const activeModelDot = document.getElementById('dashboard-model-dot');
  const activeModelText = document.getElementById('dashboard-model-text');
  // Stat counters
  const sessionsCountVal = document.getElementById('stat-sessions-value');
  const streakCountVal = document.getElementById('stat-streak-value');
  const studyTimeVal = document.getElementById('stat-time-value');

  // Tip of the day
  const tipTextNode = document.getElementById('tip-text-content');

  // Recent list
  const recentListContainer = document.getElementById('recent-list-container');

  // Quick Action Buttons
  const actionChat = document.getElementById('action-chat');
  const actionFlashcards = document.getElementById('action-flashcards');
  const actionTimer = document.getElementById('action-timer');

  const studyTips = [
    "Use the Pomodoro Technique: Focus for 25 minutes, then take a 5-minute break.",
    "Active Recall is key: Test yourself instead of just rereading your notes.",
    "Space out your study sessions over days or weeks to improve long-term retention.",
    "Teach what you learn to someone else. It's the best way to spot gaps in your knowledge.",
    "Keep your study space clean and free from distractions like social media.",
    "Take handwritten notes. It improves synthesis and memory retention compared to typing.",
    "Get enough sleep! Sleep is when your brain consolidates new information into memory.",
    "Use study chat suggestions to quickly explore complex topics with the AI.",
    "Create flashcards for difficult terms and test yourself daily using active recall.",
    "Break large topics down into smaller, manageable chunks.",
    "Use analogies to relate new concepts to things you already understand.",
    "Quiz yourself before a test using the Quiz Maker.",
    "Switch between different subjects during a study session to keep your brain active.",
    "Study in a quiet environment that mimics exam conditions.",
    "Review your notes within 24 hours of writing them to reinforce memory.",
    "Reward yourself after completing a study goal to build positive habits.",
    "Stay hydrated. Dehydration can reduce concentration and cognitive function.",
    "Use the Concept Explainer tool in Study Chat to simplify advanced textbooks into simple analogies.",
    "Track your progress weekly to stay motivated and see your improvements.",
    "Identify your weakest areas and prioritize studying them first."
  ];

  // Initialize Dashboard
  function initDashboard() {
    updateGreeting();
    updateOllamaStatus();
    updateStudyStats();
    loadRecentSessions();
    rotateTipOfTheDay();
  }

  // Time-based greeting
  function updateGreeting() {
    if (!greetingText) return;
    const hour = new Date().getHours();
    let greet = 'Good morning';
    if (hour >= 12 && hour < 18) {
      greet = 'Good afternoon';
    } else if (hour >= 18) {
      greet = 'Good evening';
    }
    greetingText.textContent = `${greet}, StudyMind is ready!`;
  }

  // Ollama status reflection
  function updateOllamaStatus() {
    if (!activeModelDot || !activeModelText) return;

    // Check if Ollama connected
    const isOnline = !Ollama.isMockMode;
    if (Ollama.isMockMode) {
      activeModelDot.className = 'status-dot';
      activeModelDot.style.backgroundColor = 'var(--warning)';
      activeModelDot.style.boxShadow = '0 0 8px var(--warning)';
      activeModelText.textContent = 'Ollama Status: Mock Mode';
    } else {
      activeModelDot.className = isOnline ? 'status-dot online' : 'status-dot offline';
      activeModelText.textContent = isOnline ? 'Ollama Status: AI Ready' : 'Ollama Status: AI Offline';
    }
  }

  // Calculate today's stats from progress storage
  function updateStudyStats() {
    if (!sessionsCountVal || !streakCountVal || !studyTimeVal) return;

    const progress = window.StudyStorage.getProgress();
    const today = new Date().toISOString().split('T')[0];

    // 1. Streak count
    streakCountVal.textContent = `🔥 ${progress.streak.count || 0}`;

    // 2. Today's sessions count
    const todaySessions = progress.sessions.filter(s => s.date === today && s.type !== 'active_time');
    sessionsCountVal.textContent = todaySessions.length;

    // 3. Today's study time
    // Sum from sessions (timer sessions and active time tracking)
    const todayTimeSessions = progress.sessions.filter(s => s.date === today);
    const totalSeconds = todayTimeSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      studyTimeVal.textContent = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      studyTimeVal.textContent = `${minutes}m`;
    } else {
      studyTimeVal.textContent = `${totalSeconds}s`;
    }
  }

  // Load last 5 recent sessions (chats, notes, flashcards)
  function loadRecentSessions() {
    if (!recentListContainer) return;
    recentListContainer.innerHTML = '';

    const chatSessions = window.StudyStorage.getChatSessions();
    const notes = window.StudyStorage.getNotes();
    const flashcardSets = window.StudyStorage.getFlashcardSets();

    // Flatten all items into a single list with metadata
    const allSessions = [];

    chatSessions.forEach(c => {
      allSessions.push({
        id: c.id,
        title: c.name || 'Study Chat',
        type: 'chat',
        date: new Date(c.updatedAt || c.createdAt),
        meta: `${c.messages.length} messages | ${c.subject || 'General'}`
      });
    });

    notes.forEach(n => {
      allSessions.push({
        id: n.id,
        title: n.title || 'Untitled Note',
        type: 'note',
        date: new Date(n.updatedAt || n.createdAt),
        meta: `Note | ${n.subject || 'General'}`
      });
    });

    flashcardSets.forEach(f => {
      allSessions.push({
        id: f.id,
        title: f.name || 'Untitled Set',
        type: 'flashcard',
        date: new Date(f.lastStudied || f.createdAt),
        meta: `${f.cards.length} cards | Flashcards`
      });
    });

    // Sort by date descending
    allSessions.sort((a, b) => b.date - a.date);

    // Limit to 5
    const recents = allSessions.slice(0, 5);

    if (recents.length === 0) {
      recentListContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;">No recent sessions. Start studying to see history here!</div>`;
      return;
    }

    recents.forEach(session => {
      const item = document.createElement('div');
      item.className = 'recent-item';

      let icon = '';
      if (session.type === 'chat') {
        icon = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      } else if (session.type === 'note') {
        icon = `<svg viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      } else {
        icon = `<svg viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      }

      item.innerHTML = `
        <div class="recent-item-left">
          <div class="recent-item-icon">${icon}</div>
          <div class="recent-item-info">
            <span class="recent-item-title">${escapeHTML(session.title)}</span>
            <span class="recent-item-meta">${escapeHTML(session.meta)}</span>
          </div>
        </div>
        <span class="recent-item-right">${timeAgo(session.date)}</span>
      `;

      item.addEventListener('click', () => {
        if (session.type === 'chat') {
          if (window.navigateToView) window.navigateToView('chat-view');
          if (window.loadChatById) window.loadChatById(session.id);
        } else if (session.type === 'note') {
          if (window.navigateToView) window.navigateToView('notes-view');
          if (window.loadNoteById) window.loadNoteById(session.id);
        } else {
          if (window.navigateToView) window.navigateToView('flashcards-view');
          if (window.loadFlashcardSetById) window.loadFlashcardSetById(session.id);
        }
      });

      recentListContainer.appendChild(item);
    });
  }

  // Rotate a tip from the tips array on launch
  function rotateTipOfTheDay() {
    if (!tipTextNode) return;
    const randomIndex = Math.floor(Math.random() * studyTips.length);
    tipTextNode.textContent = studyTips[randomIndex];
  }

  // Helper time ago
  function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);

    if (interval >= 1) return `${interval}y ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;
    return 'Just now';
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

  // Quick Action Routing Listeners
  if (actionChat) {
    actionChat.addEventListener('click', () => {
      if (window.navigateToView) window.navigateToView('chat-view');
    });
  }
  const actionQuiz = document.getElementById('action-quiz');
  if (actionQuiz) {
    actionQuiz.addEventListener('click', () => {
      if (window.navigateToView) window.navigateToView('quizmaker-view');
    });
  }
  if (actionFlashcards) {
    actionFlashcards.addEventListener('click', () => {
      if (window.navigateToView) window.navigateToView('flashcards-view');
      // Trigger card set creation pane
      const newSetBtn = document.getElementById('new-set-btn');
      if (newSetBtn) newSetBtn.click();
    });
  }
  if (actionTimer) {
    actionTimer.addEventListener('click', () => {
      if (window.navigateToView) window.navigateToView('timer-view');
    });
  }

  // Expose updater globally so other views can refresh it
  window.refreshDashboard = initDashboard;

  // Run initialization
  initDashboard();

  // Active time tracking: Increment study time spent by 10 seconds while the app is active
  setInterval(() => {
    // Only track if app has focus or is active (Electron environments are typically single-user desk focus)
    if (document.hasFocus()) {
      window.StudyStorage.logStudySession({
        date: new Date().toISOString().split('T')[0],
        type: 'active_time',
        duration: 10,
        score: null
      });
      // Silent refresh of stats if dashboard is currently visible
      const dbView = document.getElementById('dashboard-view');
      if (dbView && dbView.classList.contains('active')) {
        updateStudyStats();
      }
    }
  }, 10000);
});
