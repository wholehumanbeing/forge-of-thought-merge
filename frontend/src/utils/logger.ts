/** Basic console logger with prefixes */

// Extend the Window interface to include our custom property
interface WindowWithLastErr extends Window {
  __lastErr__?: number;
}

export const logger = {
  debug: console.log.bind(console, "[DEBUG]"),
  info:  console.log.bind(console, "[INFO]"),
  warn:  console.warn.bind(console, "[WARN]"),
  error: (...a: unknown[]) => {
      const win = window as WindowWithLastErr;
      if (win.__lastErr__ && performance.now() - win.__lastErr__ < 2000) return;
      win.__lastErr__ = performance.now();
      console.error("[ERROR]", ...a);
  },
}; 