/* Toast Notification Manager */

(function() {
  window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon based on toast type
    let iconSVG = '';
    if (type === 'success') {
      iconSVG = `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else if (type === 'error') {
      iconSVG = `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else if (type === 'warning') {
      iconSVG = `<svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else { // info
      iconSVG = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    // Prepend checkmark or status icon symbol
    let prefix = '';
    if (type === 'success') prefix = '✓ ';
    if (type === 'error') prefix = '✗ ';
    if (type === 'warning') prefix = '⚠ ';
    if (type === 'info') prefix = 'ℹ ';

    toast.innerHTML = `${iconSVG}<span>${prefix}${message}</span>`;
    container.appendChild(toast);

    // Dismiss animation trigger after 3s
    setTimeout(() => {
      toast.classList.add('dismissing');
      setTimeout(() => {
        toast.remove();
      }, 300); // 300ms transition time out
    }, 3000);
  };
})();
