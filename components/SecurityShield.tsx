"use client";

import { useEffect } from "react";

export default function SecurityShield() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Block Keyboard Shortcuts for source inspection while allowing normal input
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const isMac = navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // F12 or keyCode 123
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
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
        return false;
      }

      // Ctrl+U / Cmd+U (View Source)
      // Ctrl+S / Cmd+S (Save Page)
      if (cmdOrCtrl && ["u", "U", "s", "S"].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };

    // 2. Prevent Context Menu on non-interactive cinema elements
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "VIDEO" || target.closest("video") || target.closest("iframe"))) {
        return;
      }
      e.preventDefault();
      return false;
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true, passive: false });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true, passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    };
  }, []);

  return null;
}
