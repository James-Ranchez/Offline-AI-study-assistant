/* StudyMind Upgraded Focus Timer & Pomodoro Logic */

document.addEventListener('DOMContentLoaded', () => {
  // Timer modes tabs
  const tabPomodoro = document.getElementById('timer-tab-pomodoro');
  const tabCustom = document.getElementById('timer-tab-custom');

  // Input groups
  const customInputs = document.getElementById('timer-custom-inputs');
  const customFocusMin = document.getElementById('timer-custom-focus');
  const customBreakMin = document.getElementById('timer-custom-break');

  // Timer displays
  const timerDigits = document.getElementById('timer-digits');
  const timerStateLabel = document.getElementById('timer-state-label');
  const progressRing = document.getElementById('timer-progress-ring');

  // Controls
  const playBtn = document.getElementById('timer-play-btn');
  const resetBtn = document.getElementById('timer-reset-btn');

  // Tracker dots
  const trackerDotsContainer = document.getElementById('timer-tracker-dots');

  // State Management
  let timerMode = 'pomodoro'; // pomodoro | custom | countdown
  let pomodoroState = 'focus'; // focus | short | long
  let completedPomodorosToday = 0;

  let isRunning = false;
  let timerInterval = null;
  let durationSeconds = 25 * 60;
  let secondsLeft = 25 * 60;

  // Circle Math: r=92 -> Perimeter = 2 * Math.PI * 92 = ~578
  const strokePerimeter = 578;

  function initTimer() {
    loadSettings();
    updateTimerUI();
    renderTrackerDots();
    
    // Tab event listeners
    tabPomodoro.addEventListener('click', () => switchMode('pomodoro'));
    tabCustom.addEventListener('click', () => switchMode('custom'));
    
  }

  function loadSettings() {
    const settings = window.StudyStorage.getSettings();
    
    // Count how many pomodoros completed today in logs
    const progress = window.StudyStorage.getProgress();
    const today = new Date().toISOString().split('T')[0];
    const todayPomodoros = progress.sessions.filter(s => s.date === today && s.type === 'timer');
    completedPomodorosToday = todayPomodoros.length;

    if (timerMode === 'pomodoro') {
      customInputs.classList.remove('active');
      if (pomodoroState === 'focus') {
        durationSeconds = (settings.pomodoro.focus || 25) * 60;
        timerStateLabel.textContent = 'Focus Session';
      } else if (pomodoroState === 'short') {
        durationSeconds = (settings.pomodoro.short || 5) * 60;
        timerStateLabel.textContent = 'Short Break';
      } else {
        durationSeconds = (settings.pomodoro.long || 15) * 60;
        timerStateLabel.textContent = 'Long Break';
      }
    } else if (timerMode === 'custom') {
      customInputs.classList.add('active');
      const focusVal = parseInt(customFocusMin.value, 10) || 25;
      durationSeconds = focusVal * 60;
      timerStateLabel.textContent = 'Focus Session';
    } 

    if (!isRunning) {
      secondsLeft = durationSeconds;
    }
  }

  function switchMode(mode) {
    if (isRunning) {
      stopTimer();
    }
    
    timerMode = mode;
    
    tabPomodoro.classList.remove('active');
    tabCustom.classList.remove('active');

    if (mode === 'pomodoro') {
      tabPomodoro.classList.add('active');
      pomodoroState = 'focus';
    } else if (mode === 'custom') {
      tabCustom.classList.add('active');
    } 

    loadSettings();
    updateTimerUI();
  }

  // --- Circular Progress & UI Renderers ---
  function updateTimerUI() {
    const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const secs = (secondsLeft % 60).toString().padStart(2, '0');
    timerDigits.textContent = `${mins}:${secs}`;

    // SVG dashoffset calculations
    const ratio = secondsLeft / durationSeconds;
    const offset = strokePerimeter - (strokePerimeter * ratio);
    
    if (progressRing) {
      progressRing.style.strokeDashoffset = offset;
      
      // Update color based on state
      if (timerMode === 'pomodoro') {
        if (pomodoroState === 'focus') {
          progressRing.style.stroke = 'var(--accent)';
        } else if (pomodoroState === 'short') {
          progressRing.style.stroke = 'var(--success)';
        } else {
          progressRing.style.stroke = 'var(--warning)';
        }
      } else {
        progressRing.style.stroke = 'var(--accent)';
      }
    }
  }

  function renderTrackerDots() {
    if (!trackerDotsContainer) return;
    trackerDotsContainer.innerHTML = '';

    // Show 4 dots
    const dotsCount = 4;
    const filledCount = completedPomodorosToday % 4; // loop every 4 pomodoros
    const countLeft = filledCount === 0 && completedPomodorosToday > 0 ? 4 : filledCount;

    for (let i = 1; i <= dotsCount; i++) {
      const dot = document.createElement('div');
      dot.className = `timer-dot ${i <= countLeft ? 'filled' : ''}`;
      trackerDotsContainer.appendChild(dot);
    }
  }

  // Custom inputs listeners
  customFocusMin.addEventListener('input', () => {
    if (timerMode === 'custom') {
      if (!isRunning) {
        loadSettings();
        updateTimerUI();
      }
    }
  });

  // --- Clock Controls ---
  
  function startTimer() {
    isRunning = true;
    playBtn.textContent = 'Pause';
    playBtn.className = 'btn-secondary';
    window.showToast('Study timer started!');

    timerInterval = setInterval(() => {
      secondsLeft--;
      updateTimerUI();

      if (secondsLeft <= 0) {
        handleTimerExpiry();
      }
    }, 1000);
  }

  function stopTimer() {
    isRunning = false;
    playBtn.textContent = 'Resume';
    playBtn.className = 'btn-primary';
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    window.showToast('Study timer paused.');
  }

  function resetTimer() {
    if (isRunning) {
      stopTimer();
    }
    loadSettings();
    updateTimerUI();
    playBtn.textContent = 'Start';
    playBtn.className = 'btn-primary';
    window.showToast('Timer reset.');
  }

  playBtn.addEventListener('click', () => {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  resetBtn.addEventListener('click', resetTimer);

  // --- Expiry alarm mechanics ---
  function handleTimerExpiry() {
    stopTimer();
    playTimerChime();

    // Reset controls label
    playBtn.textContent = 'Start';
    playBtn.className = 'btn-primary';

    if (timerMode === 'pomodoro') {
      if (pomodoroState === 'focus') {
        completedPomodorosToday++;
        renderTrackerDots();
        
        // Log study session in progress tracker
        window.StudyStorage.logStudySession({
          date: new Date().toISOString().split('T')[0],
          type: 'timer',
          duration: durationSeconds,
          score: null
        });

        // Trigger native notification
        fireLocalNotification('Pomodoro Session Complete!', 'Excellent work. Time for a break!');

        // Check if long break required
        if (completedPomodorosToday % 4 === 0) {
          pomodoroState = 'long';
          window.showToast('🏆 4 Focus Sessions Complete! Take a long 15m break.', 'success');
        } else {
          pomodoroState = 'short';
          window.showToast('✓ Session complete! Take a 5m short break.', 'success');
        }
      } else { // break completed
        pomodoroState = 'focus';
        fireLocalNotification('Break Complete!', 'Let\'s get back to studying!');
        window.showToast('Break ended! Ready to focus?', 'info');
      }
    } else if (timerMode === 'custom') {
      // Toggle between Focus/Break in Custom Mode if break minutes provided
      const breakVal = parseInt(customBreakMin.value, 10) || 5;
      if (pomodoroState === 'focus') {
        pomodoroState = 'short'; // treat as short break
        durationSeconds = breakVal * 60;
        secondsLeft = durationSeconds;
        timerStateLabel.textContent = 'Custom Break';
        fireLocalNotification('Custom Focus Session Complete!', 'Time for a custom break.');
        window.showToast('✓ Custom Focus Complete! Break started.');
      } else {
        pomodoroState = 'focus';
        const focusVal = parseInt(customFocusMin.value, 10) || 25;
        durationSeconds = focusVal * 60;
        secondsLeft = durationSeconds;
        timerStateLabel.textContent = 'Focus Session';
        fireLocalNotification('Custom Break Complete!', 'Ready to focus again.');
        window.showToast('Break ended! Focus block active.');
      }
    } else { // countdown
      fireLocalNotification('Countdown Finished!', 'Timer completed.');
      window.showToast('✓ Countdown timer complete!');
      secondsLeft = durationSeconds;
    }

    loadSettings();
    updateTimerUI();
    
    // Refresh dashboard stats
    if (window.refreshDashboard) window.refreshDashboard();
  }

  // Native notification trigger
  function fireLocalNotification(title, body) {
    const settings = window.StudyStorage.getSettings();
    if (!settings.notifications) return;

    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '../assets/icon.png' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '../assets/icon.png' });
        }
      });
    }
  }

  // 100% Offline-compatible Web Audio API alarm
  function playTimerChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2); // A5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc2.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(audioCtx.currentTime + 0.8);
      osc2.stop(audioCtx.currentTime + 0.8);
      
      // Clean up audio resources after playback completes
      osc2.onended = () => {
        audioCtx.close().catch(() => {});
      };
    } catch (e) {
      console.warn('Audio chime failure:', e);
    }
  }

  // Request notifications permission immediately
  if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }

  initTimer();
});
