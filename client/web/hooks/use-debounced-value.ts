"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);

    return () => clearTimeout(handle);
  }, [delay, value]);

  return debounced;
}
