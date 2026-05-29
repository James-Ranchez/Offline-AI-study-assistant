/* Study Mind - Study Flow Planner & Pomodoro Timer Logic */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element Selection ---
  const uploadZone = document.getElementById('planner-upload-zone');
  const fileInput = document.getElementById('planner-file-input');
  const fileInfo = document.getElementById('planner-file-info');
  const fileName = document.getElementById('planner-file-name');
  const fileRemove = document.getElementById('planner-file-remove');
  const generateBtn = document.getElementById('planner-generate-btn');
  
  const emptyTimeline = document.getElementById('planner-empty-timeline');
  const timelineCard = document.getElementById('planner-timeline-card');
  const timelineContent = document.getElementById('planner-timeline-content');
  
  // Timer elements
  const timerDigits = document.getElementById('timer-digits');
  const timerTaskLabel = document.getElementById('timer-task-label');
  const timerPlayBtn = document.getElementById('timer-play-btn');
  const timerResetBtn = document.getElementById('timer-reset-btn');
  const progressRing = document.getElementById('timer-progress-ring');

  // --- States ---
  let uploadedText = '';
  let isGeneratingFlow = false;
  
  // Timer States
  let timerDuration = 25 * 60; // 25 minutes default in seconds
  let timerSecondsLeft = 25 * 60;
  let timerIsRunning = false;
  let timerInterval = null;
  let currentTaskTitle = 'Study Time';
  let currentActiveStepNode = null;

  // --- 1. File Upload Mechanics (Drag & Drop + Input Click) ---

  // Drag over triggers hover highlighting
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  // Drop files handler
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) handleSelectedFile(file);
  });

  // Click opens file picker
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleSelectedFile(file);
  });

  // Read files offline using native HTML5 FileReader API
  function handleSelectedFile(file) {
    if (!file.name.endsWith('.txt')) {
      window.showToast('Please upload a standard text file (.txt)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedText = e.target.result;
      
      // Update UI elements
      fileName.textContent = file.name;
      uploadZone.style.display = 'none';
      fileInfo.style.display = 'flex';
      
      window.showToast(`File "${file.name}" loaded successfully!`);
    };
    
    reader.onerror = () => {
      window.showToast('Error reading the uploaded file.', 'error');
    };

    reader.readAsText(file);
  }

  // File removals
  fileRemove.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    uploadedText = '';
    fileInput.value = '';
    
    fileInfo.style.display = 'none';
    uploadZone.style.display = 'flex';
    window.showToast('Uploaded notes removed.');
  });

  // --- 2. Study Flow AI Generator ---

  generateBtn.addEventListener('click', () => {
    if (isGeneratingFlow) return;

    const notes = uploadedText.trim();
    if (!notes) {
      window.showToast('Please upload a lesson text file first', 'error');
      return;
    }

    isGeneratingFlow = true;
    generateBtn.textContent = 'Planning Flow...';
    generateBtn.disabled = true;

    // Reset timeline view
    emptyTimeline.style.display = 'none';
    timelineCard.style.display = 'block';
    
    timelineContent.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px; gap: 16px; width: 100%;">
        <div class="dot-loader" style="display: flex; gap: 6px;">
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.2s;"></span>
          <span class="dot" style="animation: bounce 1.2s infinite ease-in-out; animation-delay: 0.4s;"></span>
        </div>
        <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-secondary);">AI is budgeting your study schedule...</span>
      </div>
    `;

    // Construct schedule prompt instructions
    const prompt = `Based on the following study materials, design a custom Study Flow schedule. Divide the material into exactly 4 logical study steps. 
For each step, provide a Title, a suggested Time Duration in minutes (between 15 and 45 minutes), and a brief description Goal.
Format each step exactly as:
Step [Number]: [Title] | Time: [Minutes] | Goal: [Description]

Do not write any extra introduction or conclusion text.

Material:
${notes}`;

    let rawFlowOutput = '';

    // Invoke generation
    Ollama.generate(
      prompt,
      // Chunk listener
      (chunk) => {
        rawFlowOutput += chunk;
      },
      // Completion listener
      () => {
        isGeneratingFlow = false;
        generateBtn.textContent = 'Generate Study Flow';
        generateBtn.disabled = false;
        
        renderStudyTimeline(rawFlowOutput);
        window.showToast('Dynamic Study Flow created successfully!');
      },
      // Error listener
      (err) => {
        isGeneratingFlow = false;
        generateBtn.textContent = 'Generate Study Flow';
        generateBtn.disabled = false;
        timelineCard.style.display = 'none';
        emptyTimeline.style.display = 'flex';
        
        window.showToast('Failed to connect to local AI. Check Settings.', 'error');
      }
    );
  });

  // Parses AI response into structural step lists
  function renderStudyTimeline(text) {
    timelineContent.innerHTML = '';
    
    const steps = parseFlowText(text);
    
    if (steps.length === 0) {
      timelineContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: var(--font-sans); color: var(--text-primary); line-height: 1.6;">${escapeHTML(text)}</pre>`;
      return;
    }

    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'planner-timeline-list';

    steps.forEach((step, idx) => {
      const row = document.createElement('div');
      row.className = 'timeline-item';
      row.setAttribute('data-time', step.time);
      row.setAttribute('data-title', step.title);

      row.innerHTML = `
        <span class="timeline-item-dot"></span>
        <div class="timeline-item-header">
          <span class="timeline-item-title">Step ${step.index}: ${escapeHTML(step.title)}</span>
          <span class="timeline-item-duration">${step.time} mins</span>
        </div>
        <div class="timeline-item-goal">${escapeHTML(step.goal)}</div>
      `;

      // Select step row to trigger timer duration updates
      row.addEventListener('click', () => {
        // Toggle selected highlights
        const items = timelineContent.querySelectorAll('.timeline-item');
        items.forEach(it => it.classList.remove('active'));
        row.classList.add('active');

        // Load into active Pomodoro clock
        loadTaskIntoTimer(step.title, step.time, row);
      });

      timelineContainer.appendChild(row);
    });

    timelineContent.appendChild(timelineContainer);
  }

  // Resilient text parsers for timeline formatting
  function parseFlowText(text) {
    const steps = [];
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Regex matches: Step [Number]: [Title] | Time: [Minutes] | Goal: [Description]
      const match = trimmed.match(/^Step\s*(\d+)\s*:?\s*(.*?)\s*\|\s*Time\s*:\s*(\d+)\s*\|\s*Goal\s*:\s*(.*)/i);
      
      if (match) {
        steps.push({
          index: parseInt(match[1], 10),
          title: match[2].trim(),
          time: parseInt(match[3], 10),
          goal: match[4].trim()
        });
      }
    });

    return steps;
  }

  // --- 3. Circular Countdown Pomodoro Timer Engine ---

  function loadTaskIntoTimer(title, minutes, nodeReference) {
    // Reset any running interval first
    stopTimerInterval();
    
    currentTaskTitle = title;
    currentActiveStepNode = nodeReference;
    
    // Set timing lengths
    timerDuration = minutes * 60;
    timerSecondsLeft = timerDuration;
    
    // Reset controls
    timerIsRunning = false;
    timerPlayBtn.textContent = 'Play';
    timerPlayBtn.className = 'btn-primary';
    
    timerTaskLabel.textContent = title;
    timerTaskLabel.title = title;
    
    updateTimerUI();
  }

  // Formats MM:SS readouts and SVG progress ring percentages
  function updateTimerUI() {
    const minStr = Math.floor(timerSecondsLeft / 60).toString().padStart(2, '0');
    const secStr = (timerSecondsLeft % 60).toString().padStart(2, '0');
    timerDigits.textContent = `${minStr}:${secStr}`;

    // SVG Circular Path math: r=74 -> Perimeter = ~465
    // Dashoffset starts at 0 (full colored ring) and increases to 465 (empty gray ring)
    const ratio = timerSecondsLeft / timerDuration;
    const offset = 465 - (465 * ratio);
    progressRing.style.strokeDashoffset = offset;
  }

  // Toggles play/pause states
  timerPlayBtn.addEventListener('click', () => {
    if (timerIsRunning) {
      stopTimerInterval();
      timerPlayBtn.textContent = 'Resume';
      timerPlayBtn.className = 'btn-primary';
      window.showToast('Pomodoro clock paused');
    } else {
      startTimerInterval();
      timerPlayBtn.textContent = 'Pause';
      timerPlayBtn.className = 'btn-secondary';
      window.showToast('Study timer started!');
    }
  });

  // Timer interval counters
  function startTimerInterval() {
    timerIsRunning = true;
    
    timerInterval = setInterval(() => {
      timerSecondsLeft--;
      
      updateTimerUI();
      
      if (timerSecondsLeft <= 0) {
        handleTimerCompletion();
      }
    }, 1000);
  }

  function stopTimerInterval() {
    timerIsRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Timer Reset
  timerResetBtn.addEventListener('click', () => {
    stopTimerInterval();
    
    timerSecondsLeft = timerDuration;
    timerIsRunning = false;
    
    timerPlayBtn.textContent = 'Play';
    timerPlayBtn.className = 'btn-primary';
    
    updateTimerUI();
    window.showToast('Timer reset to step duration');
  });

  // Completion Alert Handlers
  function handleTimerCompletion() {
    stopTimerInterval();
    
    timerPlayBtn.textContent = 'Play';
    timerPlayBtn.className = 'btn-primary';
    timerSecondsLeft = 0;
    
    updateTimerUI();

    // Mark current active row node as completed in UI
    if (currentActiveStepNode) {
      currentActiveStepNode.classList.remove('active');
      currentActiveStepNode.classList.add('completed');
    }

    // Play offline synthesizer chime ding-dong!
    playTimerAlertSound();

    window.showToast(`Task Complete: "${currentTaskTitle}"! Time for a short break!`, 'success');
  }

  // Web Audio API Synthesizer: 100% offline-compatible chime alarm
  function playTimerAlertSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Dual-tone synthesizer chime (ding-dong!)
      const osc1 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.type = 'sine';
      // Dual-frequency slide: D5 to A5
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); 
      
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      
      osc1.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.6);
    } catch (err) {
      console.warn('Web Audio API synth chime failed:', err);
    }
  }

  // Helper: Escapes raw HTML
  function escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
