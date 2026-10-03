"use client";

import { useEffect } from "react";

export default function SecurityShield() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Block Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // F12 or keyCode 123
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (Inspect DevTools)
      // Ctrl+Shift+J / Cmd+Option+J (Console)
      // Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
      // Ctrl+Shift+K (Firefox Web Console)
      if (
        (cmdOrCtrl && e.shiftKey && ["I", "i", "J", "j", "C", "c", "K", "k"].includes(e.key)) ||
        (isMac && e.metaKey && e.altKey && ["I", "i", "J", "j", "C", "c", "U", "u"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+U / Cmd+U (View Source)
      // Ctrl+S / Cmd+S (Save Page)
      if (cmdOrCtrl && ["u", "U", "s", "S"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // 2. Disable Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 3. Clear & neutralize console methods
    const disableConsole = () => {
      try {
        const noop = () => {};
        window.console.log = noop;
        window.console.info = noop;
        window.console.warn = noop;
        window.console.debug = noop;
        window.console.dir = noop;
        window.console.table = noop;
        window.console.clear();
      } catch {}
    };

    // 4. Anti-Automated Agent & Headless Detection
    const checkAutomatedAgent = () => {
      try {
        const isWebdriver = !!navigator.webdriver;
        const hasAutomatedProps =
          (window as any)._phantom ||
          (window as any).__nightmare ||
          (window as any).callPhantom ||
          (window as any).__selenium_unwrapped ||
          (window as any).cdc_adoQx0fiRnPnDuGvgWRelq_Array ||
          (window as any).cdc_adoQx0fiRnPnDuGvgWRelq_Promise;

        if (isWebdriver || hasAutomatedProps) {
          // Neutralize environment for automated background scraper agents
          document.body.innerHTML = "<div style='display:flex;height:100vh;align-items:center;justify-content:center;background:#050505;color:#f59e0b;font-family:sans-serif;font-weight:bold;'>Protected StreamNet Cinema Experience</div>";
        }
      } catch {}
    };

    // 5. Anti-Debugger / Anti-Inspection Loop
    let debugInterval: NodeJS.Timeout;
    const startAntiDebugger = () => {
      debugInterval = setInterval(() => {
        try {
          const startTime = performance.now();
          // Function evaluation to trigger breakpoint if DevTools is active
          (function() {
            Function("debugger")();
          })();
          const endTime = performance.now();
          if (endTime - startTime > 100) {
            // DevTools was open and hit debugger pause
            window.console.clear();
          }
        } catch {}
      }, 1000);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true, passive: false });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true, passive: false });

    disableConsole();
    checkAutomatedAgent();
    startAntiDebugger();

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      if (debugInterval) clearInterval(debugInterval);
    };
  }, []);

  return null;
}
