(function() {
  'use strict';

  // 1. Immediate keyboard shortcuts interception
  window.addEventListener('keydown', function(e) {
    var isMac = navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    var cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // F12 or keycode 123
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    // Ctrl+Shift+I / J / C / K / U or Cmd+Option+I / J / C / U
    if (
      (cmdOrCtrl && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.key === 'K' || e.key === 'k')) ||
      (isMac && e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.key === 'U' || e.key === 'u'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    // Ctrl+U / Ctrl+S
    if (cmdOrCtrl && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // 2. Immediate context menu (right-click) prevention
  window.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  // 3. Automated agent / headless detection
  try {
    if (navigator.webdriver || window._phantom || window.__nightmare || window.callPhantom || window.__selenium_unwrapped) {
      window.stop && window.stop();
    }
  } catch(e) {}

  // 4. Clear and sanitize console
  try {
    var noop = function() {};
    window.console.log = noop;
    window.console.warn = noop;
    window.console.error = noop;
    window.console.debug = noop;
    window.console.info = noop;
    window.console.dir = noop;
    window.console.table = noop;
  } catch(e) {}
})();
