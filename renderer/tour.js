/* StudyMind Onboarding Tour Guide */

document.addEventListener('DOMContentLoaded', () => {
  // Tour steps definition
  const tourSteps = [
    {
      targetId: 'nav-dashboard',
      title: '🏠 Welcome Dashboard',
      body: 'Welcome to StudyMind! Start here to see today\'s study stats, streak counter, and recent study files.',
      placement: 'right'
    },
    {
      targetId: 'nav-chat',
      title: '💬 AI Study Chat',
      body: 'Have academic questions? Chat offline with your local AI engine. Try the subject quick prompts to get started.',
      placement: 'right'
    },
    {
      targetId: 'nav-reviewer',
      title: '📋 Review Maker Wizard',
      body: 'Paste textbook pages or study notes to generate interactive quizzes, key points summary cards, or accordion Q&As.',
      placement: 'right'
    },
    {
      targetId: 'nav-flashcards',
      title: '🃏 Flashcard Decks',
      body: 'Practice active recall. Design decks manually or let the AI build flashcard pairs directly from your notes.',
      placement: 'right'
    },
    {
      targetId: 'nav-timer',
      title: '⏱️ Pomodoro Study Timer',
      body: 'Boost focus with custom work intervals. The circular progress ring will alert you even if you minimize the application.',
      placement: 'right'
    }
  ];

  let currentTourStep = 0;
  let overlayNode = null;
  let tooltipNode = null;
  let highlightNode = null;

  window.startOnboardingTour = function() {
    if (document.getElementById('onboarding-view').classList.contains('active')) {
      // Don't start tour if local Ollama onboarding setup is visible
      return;
    }
    
    currentTourStep = 0;
    window.tourActive = true;
    createTourElements();
    showStep(0);
  };

  function createTourElements() {
    // Remove existing if any
    if (overlayNode) overlayNode.remove();

    overlayNode = document.createElement('div');
    overlayNode.id = 'tour-overlay';
    overlayNode.className = 'tour-overlay active';
    document.body.appendChild(overlayNode);

    highlightNode = document.createElement('div');
    highlightNode.className = 'tour-highlight';
    overlayNode.appendChild(highlightNode);

    tooltipNode = document.createElement('div');
    tooltipNode.className = 'tour-tooltip';
    overlayNode.appendChild(tooltipNode);
  }

  function showStep(index) {
    if (index < 0 || index >= tourSteps.length) {
      endTour();
      return;
    }

    currentTourStep = index;
    const step = tourSteps[index];
    const target = document.getElementById(step.targetId);

    if (!target) {
      endTour();
      return;
    }

    // Ensure the target is visible (e.g. sidebar collapsed or not)
    // Calculate bounding rect of target
    const rect = target.getBoundingClientRect();
    
    // Position highlight box
    highlightNode.style.top = `${rect.top - 4}px`;
    highlightNode.style.left = `${rect.left - 4}px`;
    highlightNode.style.width = `${rect.width + 8}px`;
    highlightNode.style.height = `${rect.height + 8}px`;

    // Populate tooltip content
    tooltipNode.innerHTML = `
      <div class="tour-tooltip-title">${step.title}</div>
      <div class="tour-tooltip-body">${step.body}</div>
      <div class="tour-tooltip-footer">
        <span class="tour-step-indicator">Step ${index + 1} of ${tourSteps.length}</span>
        <div class="tour-actions">
          <button class="tour-btn btn-secondary" id="tour-skip-btn">Skip</button>
          <button class="tour-btn btn-primary" id="tour-next-btn">${index === tourSteps.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    `;

    // Position tooltip
    tooltipNode.className = `tour-tooltip arrow-${step.placement}`;
    
    const tooltipWidth = 320;
    const tooltipHeight = tooltipNode.offsetHeight || 150; // estimate if not rendered

    if (step.placement === 'right') {
      tooltipNode.style.left = `${rect.right + 14}px`;
      tooltipNode.style.top = `${rect.top + rect.height / 2 - tooltipHeight / 2}px`;
    }

    // Attach button listeners
    document.getElementById('tour-skip-btn').addEventListener('click', () => {
      endTour();
    });
    
    document.getElementById('tour-next-btn').addEventListener('click', () => {
      showStep(currentTourStep + 1);
    });

    window.tourActive = true;
  }

  window.skipTour = function() {
    endTour();
  };

  function endTour() {
    window.tourActive = false;
    if (overlayNode) {
      overlayNode.remove();
      overlayNode = null;
    }
    window.StudyStorage.setTourCompleted();
    window.showToast('Tour completed! Enjoy studying with StudyMind.', 'info');
  }

  // Trigger tour check on startup
  setTimeout(() => {
    const isFirstTime = window.StudyStorage.isFirstLaunch();
    const isTourDone = window.StudyStorage.isTourCompleted();
    
    if (isFirstTime || !isTourDone) {
      window.startOnboardingTour();
    }
  }, 2500); // Wait for app variables and connections to settle
});
