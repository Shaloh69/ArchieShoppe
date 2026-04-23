"use client";

import { useState } from "react";
import { Button } from "@heroui/button";

export const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-3">
      <Button
        className="min-w-20 btn-brand"
        onPress={() => setCount((prev) => prev - 1)}
      >
        -1
      </Button>
      <span className="rounded-md border border-border-strong bg-surface-bg-2 px-4 py-2 text-text-1">
        {count}
      </span>
      <Button
        className="min-w-20 btn-brand"
        onPress={() => setCount((prev) => prev + 1)}
      >
        +1
      </Button>
    </div>
  );
};
