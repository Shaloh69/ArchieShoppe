"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (error.name === "ChunkLoadError" || error.message?.includes("Loading chunk")) {
      const reloaded = sessionStorage.getItem("chunk_reload");
      if (!reloaded) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
      }
    } else {
      sessionStorage.removeItem("chunk_reload");
    }
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-bg-0 p-6">
      <Card className="max-w-xl border border-status-danger-600/60 bg-surface-bg-2">
        <CardBody className="space-y-4 p-8">
          <h2 className="text-2xl font-semibold text-text-1">
            Something went wrong
          </h2>
          <p className="text-sm text-text-2">
            The interface hit an unexpected runtime issue.
          </p>
          <p className="rounded-md border border-border-strong bg-surface-bg-3 p-3 font-mono text-xs text-text-2">
            {error.message}
          </p>
          <Button className="focus-ring btn-cta w-fit" onPress={() => reset()}>
            Retry
          </Button>
        </CardBody>
      </Card>
    </main>
  );
}
