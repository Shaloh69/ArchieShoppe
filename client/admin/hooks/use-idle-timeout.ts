"use client";

import { useEffect } from "react";

export function useIdleTimeout(onTimeout: () => void, timeoutMs: number) {
  useEffect(() => {
    let timeout = window.setTimeout(onTimeout, timeoutMs);

    const reset = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(onTimeout, timeoutMs);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "touchstart",
      "click",
    ];

    events.forEach((eventName) => window.addEventListener(eventName, reset));

    return () => {
      window.clearTimeout(timeout);
      events.forEach((eventName) =>
        window.removeEventListener(eventName, reset),
      );
    };
  }, [onTimeout, timeoutMs]);
}
