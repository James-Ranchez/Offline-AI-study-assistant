/* StudyMind Local Storage and State Manager */

const StudyStorage = {
  // Key names constants
  KEYS: {
    SETTINGS: 'sm_settings',
    CHAT_SESSIONS: 'sm_chat_sessions',
    REVIEW_SESSIONS: 'sm_review_sessions',
    FLASHCARD_SETS: 'sm_flashcard_sets',
    NOTES: 'sm_notes',
    PROGRESS: 'sm_progress',
    FIRST_LAUNCH: 'sm_first_launch',
    TOUR_COMPLETED: 'sm_tour_completed'
  },

  // Sensible Defaults
  DEFAULTS: {
    SETTINGS: {
      theme: 'dark',
      model: 'tinyllama',
      responseLength: 600,
      temperature: 0.7,
      defaultSubject: 'Science',
      pomodoro: { focus: 25, short: 5, long: 15 },
      notifications: true,
      accentColor: 'blue-violet',
      fontSize: 'medium'
    },
    PROGRESS: {
      streak: { count: 0, lastDate: null },
      sessions: [],
      badges: []
    }
  },

  // Helper: Read key safely
  _read(key, fallback = null) {
    try {
      const data = localStorage.getItem(key);
      if (data === null) return fallback;
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error reading key "${key}" from localStorage:`, e);
      return fallback;
    }
  },

  // Helper: Write key safely
  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error writing key "${key}" to localStorage:`, e);
      return false;
    }
  },

  // --- Settings Manager ---
  getSettings() {
    const settings = this._read(this.KEYS.SETTINGS);
    if (!settings) {
      this.saveSettings(this.DEFAULTS.SETTINGS);
      return this.DEFAULTS.SETTINGS;
    }
    // Deep merge defaults to ensure any new settings attributes exist
    return { ...this.DEFAULTS.SETTINGS, ...settings };
  },

  saveSettings(settings) {
    return this._write(this.KEYS.SETTINGS, settings);
  },

  // --- Chat Sessions Manager ---
  getChatSessions() {
    return this._read(this.KEYS.CHAT_SESSIONS, []);
  },

  saveChatSession(session) {
    const sessions = this.getChatSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    session.updatedAt = new Date().toISOString();
    
    if (index !== -1) {
      sessions[index] = session;
    } else {
      session.createdAt = new Date().toISOString();
      sessions.unshift(session);
    }
    
    // Limit stored sessions to last 50, auto-archive older ones
    if (sessions.length > 50) {
      sessions.splice(50);
    }
    
    return this._write(this.KEYS.CHAT_SESSIONS, sessions);
  },

  deleteChatSession(id) {
    const sessions = this.getChatSessions();
    const filtered = sessions.filter(s => s.id !== id);
    return this._write(this.KEYS.CHAT_SESSIONS, filtered);
  },

  clearChatSessions() {
    return this._write(this.KEYS.CHAT_SESSIONS, []);
  },

  // --- Review Sessions Manager ---
  getReviewSessions() {
    return this._read(this.KEYS.REVIEW_SESSIONS, []);
  },

  saveReviewSession(session) {
    const sessions = this.getReviewSessions();
    session.completedAt = new Date().toISOString();
    sessions.unshift(session);
    
    if (sessions.length > 50) {
      sessions.splice(50);
    }
    
    this._write(this.KEYS.REVIEW_SESSIONS, sessions);
    
    // Log in progress tracker
    this.logStudySession({
      date: new Date().toISOString().split('T')[0],
      type: 'review',
      duration: 300, // Estimated 5 minutes for study review
      score: session.score
    });
  },

  // --- Flashcard Sets Manager ---
  getFlashcardSets() {
    return this._read(this.KEYS.FLASHCARD_SETS, []);
  },

  saveFlashcardSet(set) {
    const sets = this.getFlashcardSets();
    const index = sets.findIndex(s => s.id === set.id);
    
    if (index !== -1) {
      sets[index] = set;
    } else {
      set.createdAt = new Date().toISOString();
      set.lastStudied = null;
      sets.unshift(set);
    }
    return this._write(this.KEYS.FLASHCARD_SETS, sets);
  },

  deleteFlashcardSet(id) {
    const sets = this.getFlashcardSets();
    const filtered = sets.filter(s => s.id !== id);
    return this._write(this.KEYS.FLASHCARD_SETS, filtered);
  },

  // --- Notes Manager ---
  getNotes() {
    return this._read(this.KEYS.NOTES, []);
  },

  saveNote(note) {
    const notes = this.getNotes();
    const index = notes.findIndex(n => n.id === note.id);
    note.updatedAt = new Date().toISOString();
    
    if (index !== -1) {
      notes[index] = note;
    } else {
      note.createdAt = new Date().toISOString();
      notes.unshift(note);
    }
    return this._write(this.KEYS.NOTES, notes);
  },

  deleteNote(id) {
    const notes = this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    return this._write(this.KEYS.NOTES, filtered);
  },

  // --- Progress & Stats Tracker ---
  getProgress() {
    const progress = this._read(this.KEYS.PROGRESS);
    if (!progress) {
      this._write(this.KEYS.PROGRESS, this.DEFAULTS.PROGRESS);
      return this.DEFAULTS.PROGRESS;
    }
    return { ...this.DEFAULTS.PROGRESS, ...progress };
  },

  saveProgress(progress) {
    return this._write(this.KEYS.PROGRESS, progress);
  },

  // Logs a session to progress log
  logStudySession(sessionInfo) {
    // sessionInfo: { date: 'YYYY-MM-DD', type: 'chat|review|flashcard|timer', duration: seconds, score: percentOrNull }
    const progress = this.getProgress();
    
    // Log session
    progress.sessions.push(sessionInfo);
    
    // Cap sessions to prevent unbounded localStorage growth
    // (active_time alone adds ~8,640 entries/day at 10s intervals)
    const MAX_SESSIONS = 5000;
    if (progress.sessions.length > MAX_SESSIONS) {
      progress.sessions = progress.sessions.slice(-MAX_SESSIONS);
    }
    
    // Check and update streak
    this._updateStreak(progress);
    
    // Check and update achievements badges
    this._checkAchievements(progress);
    
    this.saveProgress(progress);
  },

  _updateStreak(progress) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const lastDate = progress.streak.lastDate;
    
    if (lastDate === today) {
      // Already logged today
      return;
    } else if (lastDate === yesterday) {
      // Streak continues
      progress.streak.count += 1;
      progress.streak.lastDate = today;
    } else {
      // Streak broken or brand new
      progress.streak.count = 1;
      progress.streak.lastDate = today;
    }
  },

  _checkAchievements(progress) {
    const unlockedIds = new Set(progress.badges.map(b => b.id));
    const now = new Date().toISOString();

    const addBadge = (id) => {
      if (!unlockedIds.has(id)) {
        progress.badges.push({ id, unlockedAt: now });
        if (window.showToast) {
          window.showToast(`🏆 Achievement Unlocked: ${this.BADGE_NAMES[id]}!`, 'success');
        }
      }
    };

    // 1. Streak badge "On Fire"
    if (progress.streak.count >= 3) addBadge('streak_3');
    
    // 2. Reviews completed "Bookworm"
    const reviewsCount = progress.sessions.filter(s => s.type === 'review').length;
    if (reviewsCount >= 10) addBadge('reviews_10');

    // 3. Flashcards studied "Flashmaster"
    const flashcardSessionsCount = progress.sessions.filter(s => s.type === 'flashcard').length;
    if (flashcardSessionsCount >= 5) addBadge('flashcard_100'); // Let's say 5 sessions is mastery

    // 4. Timer sessions completed "Focus Mode"
    const timerSessionsCount = progress.sessions.filter(s => s.type === 'timer').length;
    if (timerSessionsCount >= 5) addBadge('focus_5');

    // 5. Perfect score review "Perfect Score"
    const hasPerfectScore = progress.sessions.some(s => s.type === 'review' && s.score === 100);
    if (hasPerfectScore) addBadge('perfect_score');
  },

  BADGE_NAMES: {
    streak_3: 'On Fire (3-day streak)',
    reviews_10: 'Bookworm (10 reviews)',
    flashcard_100: 'Flashmaster (studied sets)',
    focus_5: 'Focus Mode (5 pomodoros)',
    perfect_score: 'Perfect Score (100% on a review)'
  },

  // --- App States (First Launch, Onboarding) ---
  isFirstLaunch() {
    const val = localStorage.getItem(this.KEYS.FIRST_LAUNCH);
    return val === null || val === 'true';
  },

  setFirstLaunchCompleted() {
    localStorage.setItem(this.KEYS.FIRST_LAUNCH, 'false');
  },

  isTourCompleted() {
    const val = localStorage.getItem(this.KEYS.TOUR_COMPLETED);
    return val === 'true';
  },

  setTourCompleted() {
    localStorage.setItem(this.KEYS.TOUR_COMPLETED, 'true');
  }
};

// Expose globally
window.StudyStorage = StudyStorage;
window.Storage = StudyStorage; // alias
