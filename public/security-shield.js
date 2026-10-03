(function() {
  'use strict';

  // 1. Immediate keyboard shortcuts interception
  window.addEventListener('keydown', function(e) {
    var target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    var isMac = navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    var cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // F12 or keycode 123
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I / J / C / K / U or Cmd+Option+I / J / C / U
    if (
      (cmdOrCtrl && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.key === 'K' || e.key === 'k')) ||
      (isMac && e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.key === 'U' || e.key === 'u'))
    ) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U / Ctrl+S
    if (cmdOrCtrl && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }
  }, true);

  // 2. Immediate context menu prevention on non-interactive elements
  window.addEventListener('contextmenu', function(e) {
    var target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'VIDEO' || (target.closest && (target.closest('video') || target.closest('iframe'))))) {
      return;
    }
    e.preventDefault();
    return false;
  }, true);
})();
