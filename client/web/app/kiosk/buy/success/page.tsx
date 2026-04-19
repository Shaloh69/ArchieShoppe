"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";

function KioskBuySuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slot = searchParams.get("slot") ?? "N/A";
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          router.replace("/kiosk/welcome");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center">
      <Card className="w-full border border-status-success-600/40 bg-surface-bg-2">
        <CardBody className="items-center gap-4 p-10 text-center">
          <div className="kiosk-glow rounded-full border border-status-success-600/40 bg-status-success-100 p-5 text-4xl text-status-success-600">
            âœ“
          </div>
          <h1 className="text-4xl font-semibold text-text-1">Purchase Successful</h1>
          <p className="text-lg text-text-2">Please claim your item from Slot #{slot}</p>
          <p className="text-sm text-text-3">Returning to welcome screen in {secondsLeft}s...</p>
          <Button
            className="h-14 min-w-48 text-lg btn-cta"
            onPress={() => router.replace("/kiosk/welcome")}
          >
            Return now
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

export default function KioskBuySuccessPage() {
  return (
    <Suspense fallback={<div className="text-text-2">Loading success state...</div>}>
      <KioskBuySuccessContent />
    </Suspense>
  );
}

