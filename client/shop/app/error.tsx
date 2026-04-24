"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

function isChunkError(error: Error) {
  return (
    error.name === "ChunkLoadError" ||
    error.message?.includes("Loading chunk") ||
    error.message?.includes("Failed to fetch dynamically imported module")
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const chunkError = isChunkError(error);

  useEffect(() => {
    console.error(error);
    if (chunkError) {
      // Auto-reload once on mount — catches the common "stale cache after deploy" case
      const reloaded = sessionStorage.getItem("chunk_reload");
      if (!reloaded) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.assign(window.location.href);
      }
    } else {
      sessionStorage.removeItem("chunk_reload");
    }
  }, [error, chunkError]);

  function handleRetry() {
    if (chunkError) {
      // For missing chunks: clear guard, force full navigation (bypasses cache/SW)
      sessionStorage.removeItem("chunk_reload");
      window.location.assign(window.location.href);
    } else {
      reset();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-bg-0 p-6">
      <Card className="max-w-xl border border-status-danger-600/60 bg-surface-bg-2">
        <CardBody className="space-y-4 p-8">
          <h2 className="text-2xl font-semibold text-text-1">
            {chunkError ? "New version available" : "Something went wrong"}
          </h2>
          <p className="text-sm text-text-2">
            {chunkError
              ? "A new version of the app was deployed. Reload to get the latest version."
              : "The interface hit an unexpected runtime issue."}
          </p>
          {!chunkError && (
            <p className="rounded-md border border-border-strong bg-surface-bg-3 p-3 font-mono text-xs text-text-2">
              {error.message}
            </p>
          )}
          <Button className="focus-ring btn-cta w-fit" onPress={handleRetry}>
            {chunkError ? "Reload page" : "Retry"}
          </Button>
        </CardBody>
      </Card>
    </main>
  );
}
