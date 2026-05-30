/* StudyMind Progress and Achievements Logic */

document.addEventListener('DOMContentLoaded', () => {
  // Summary boxes
  const streakVal = document.getElementById('prog-streak-val');
  const timeVal = document.getElementById('prog-time-val');
  const reviewsVal = document.getElementById('prog-reviews-val');
  const flashcardsVal = document.getElementById('prog-flashcards-val');

  // Heatmap
  const heatmapContainer = document.getElementById('heatmap-container');

  // SVG Chart
  const chartSvg = document.getElementById('score-chart-svg');

  // Mastery
  const masteryContainer = document.getElementById('mastery-list-container');

  // Badges
  const badgesContainer = document.getElementById('badges-grid-container');

  function initProgress() {
    loadSummaryStats();
    loadActivityHeatmap();
    renderScoreLineChart();
    renderFlashcardMastery();
    loadAchievementsBadges();
  }

  // --- Calculate Week stats ---
  function loadSummaryStats() {
    const progress = window.StudyStorage.getProgress();
    
    // Streak
    if (streakVal) {
      streakVal.textContent = `🔥 ${progress.streak.count || 0} Days`;
    }

    // Date math for "this week" (past 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weekSessions = progress.sessions.filter(s => new Date(s.date) >= sevenDaysAgo);

    // Total Study Time this week
    if (timeVal) {
      const totalSeconds = weekSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      timeVal.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} mins`;
    }

    // Reviews completed this week
    if (reviewsVal) {
      const reviewCount = weekSessions.filter(s => s.type === 'review').length;
      reviewsVal.textContent = `${reviewCount} Completed`;
    }

    // Flashcards studied this week
    if (flashcardsVal) {
      const fcCount = weekSessions.filter(s => s.type === 'flashcard').length;
      flashcardsVal.textContent = `${fcCount} Sessions`;
    }
  }

  // --- GitHub Heatmap ---
  function loadActivityHeatmap() {
    if (!heatmapContainer) return;
    heatmapContainer.innerHTML = '';

    const progress = window.StudyStorage.getProgress();
    
    // Get last 30 days count map
    const sessionsMap = {};
    progress.sessions.forEach(s => {
      // ignore active_time silent logs in counts
      if (s.type === 'active_time') return;
      sessionsMap[s.date] = (sessionsMap[s.date] || 0) + 1;
    });

    // Create 30 days boxes from past to today
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = sessionsMap[dateStr] || 0;

      // Determine level (0 to 4)
      let level = 0;
      if (count >= 7) level = 4;
      else if (count >= 5) level = 3;
      else if (count >= 3) level = 2;
      else if (count >= 1) level = 1;

      const dayBox = document.createElement('div');
      dayBox.className = `heatmap-day level-${level}`;
      dayBox.title = `${date.toLocaleDateString()}: ${count} study sessions`;
      
      heatmapContainer.appendChild(dayBox);
    }
  }

  // --- SVG Score Line Graph ---
  function renderScoreLineChart() {
    if (!chartSvg) return;
    chartSvg.innerHTML = '';

    // Read review history
    const reviews = window.StudyStorage.getReviewSessions();
    // Only MCQ scores
    const mcqSessions = reviews.filter(r => r.mode === 'mcq').slice(0, 10).reverse(); // last 10, chronological

    if (mcqSessions.length === 0) {
      chartSvg.innerHTML = `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="var(--text-muted)" font-size="12px">Complete MCQ reviews to display progress chart</text>`;
      return;
    }

    const width = chartSvg.clientWidth || 500;
    const height = 180;
    const paddingLeft = 40;
    const paddingBottom = 20;
    const paddingTop = 20;
    const paddingRight = 20;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Draw horizontal grid lines (0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 4; i++) {
      const pct = i * 25;
      const y = paddingTop + chartH - (chartH * (pct / 100));
      
      // Grid line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', paddingLeft);
      line.setAttribute('y1', y);
      line.setAttribute('x2', width - paddingRight);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', 'var(--border)');
      line.setAttribute('stroke-dasharray', '4 4');
      chartSvg.appendChild(line);

      // Label text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', paddingLeft - 8);
      text.setAttribute('y', y + 4);
      text.setAttribute('fill', 'var(--text-secondary)');
      text.setAttribute('font-size', '10px');
      text.setAttribute('text-anchor', 'end');
      text.textContent = `${pct}%`;
      chartSvg.appendChild(text);
    }

    // Plot points
    const points = [];
    const stepX = mcqSessions.length > 1 ? chartW / (mcqSessions.length - 1) : chartW;

    mcqSessions.forEach((session, idx) => {
      const x = paddingLeft + (idx * stepX);
      const y = paddingTop + chartH - (chartH * (session.score / 100));
      points.push({ x, y, score: session.score, date: new Date(session.completedAt).toLocaleDateString() });
    });

    // 1. Draw area gradient polygon
    if (points.length > 1) {
      const areaPoints = [
        `${paddingLeft},${paddingTop + chartH}`,
        ...points.map(p => `${p.x},${p.y}`),
        `${paddingLeft + chartW},${paddingTop + chartH}`
      ].join(' ');

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', areaPoints);
      polygon.setAttribute('fill', 'url(#chart-gradient)');
      polygon.setAttribute('opacity', '0.2');
      chartSvg.appendChild(polygon);
      
      // Define gradient inside svg
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
      `;
      chartSvg.appendChild(defs);
    }

    // 2. Draw polyline path
    if (points.length > 1) {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', 'var(--accent)');
      polyline.setAttribute('stroke-width', '3');
      polyline.setAttribute('stroke-linecap', 'round');
      polyline.setAttribute('stroke-linejoin', 'round');
      chartSvg.appendChild(polyline);
    }

    // 3. Draw circles and text tooltips
    points.forEach(p => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', 'var(--bg-secondary)');
      circle.setAttribute('stroke', 'var(--accent)');
      circle.setAttribute('stroke-width', '2');
      circle.style.cursor = 'pointer';
      
      // Simple hover tooltips
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Score: ${p.score}% on ${p.date}`;
      circle.appendChild(title);
      
      chartSvg.appendChild(circle);
    });
  }

  // --- Flashcard Mastery ---
  function renderFlashcardMastery() {
    if (!masteryContainer) return;
    masteryContainer.innerHTML = '';

    const sets = window.StudyStorage.getFlashcardSets();

    if (sets.length === 0) {
      masteryContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;">Create flashcard sets to display mastery bars</div>`;
      return;
    }

    // Take top 4 sets
    const topSets = sets.slice(0, 4);

    topSets.forEach(set => {
      let mastered = 0;
      let learning = 0;
      let newCards = 0;

      set.cards.forEach(c => {
        const gotIt = c.gotIt || 0;
        const missed = c.missed || 0;
        
        if (gotIt === 0 && missed === 0) newCards++;
        else if (gotIt > missed) mastered++;
        else learning++;
      });

      const total = set.cards.length;
      const pctMastered = Math.round((mastered / total) * 100);
      const pctLearning = Math.round((learning / total) * 100);
      const pctNew = 100 - pctMastered - pctLearning;

      const item = document.createElement('div');
      item.className = 'mastery-item';
      
      item.innerHTML = `
        <div class="mastery-item-header">
          <span>${escapeHTML(set.name)}</span>
          <span>${mastered} / ${total} Mastered</span>
        </div>
        <div class="mastery-bar-container">
          <div class="mastery-bar-segment mastered" style="width: ${pctMastered}%;" title="Mastered: ${pctMastered}%"></div>
          <div class="mastery-bar-segment learning" style="width: ${pctLearning}%;" title="Learning: ${pctLearning}%"></div>
          <div class="mastery-bar-segment new" style="width: ${pctNew}%;" title="New: ${pctNew}%"></div>
        </div>
      `;

      masteryContainer.appendChild(item);
    });
  }

  // --- Achievements Badges ---
  function loadAchievementsBadges() {
    if (!badgesContainer) return;
    badgesContainer.innerHTML = '';

    const progress = window.StudyStorage.getProgress();
    const unlockedIds = new Set(progress.badges.map(b => b.id));

    const badges = [
      { id: 'streak_3', name: 'On Fire', req: 'Maintain a 3-day study streak', icon: '🔥' },
      { id: 'reviews_10', name: 'Bookworm', req: 'Complete 10 study reviews', icon: '📚' },
      { id: 'flashcard_100', name: 'Flashmaster', req: 'Log 5 active flashcard reviews', icon: '🃏' },
      { id: 'focus_5', name: 'Focus Mode', req: 'Complete 5 Pomodoro sessions', icon: '⏱️' },
      { id: 'perfect_score', name: 'Perfect Score', req: 'Score 100% on any review quiz', icon: '🏆' }
    ];

    badges.forEach(badge => {
      const isUnlocked = unlockedIds.has(badge.id);
      
      const item = document.createElement('div');
      item.className = `badge-item ${isUnlocked ? '' : 'locked'}`;

      item.innerHTML = `
        <span class="badge-status-tag">${isUnlocked ? 'Unlocked' : 'Locked'}</span>
        <div class="badge-icon">${badge.icon}</div>
        <div class="badge-name">${badge.name}</div>
        <div class="badge-requirement">${badge.req}</div>
      `;

      badgesContainer.appendChild(item);
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

  // Expose global triggers
  window.refreshProgressTracker = initProgress;

  initProgress();
});
