"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Progress } from "@heroui/progress";

import { notifySuccess } from "@/lib/unithrift-toast";

function KioskSellPlaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slot = searchParams.get("slot") ?? "N/A";
  const item = searchParams.get("item") ?? "Item";
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 20));
    }, 850);

    return () => window.clearInterval(timer);
  }, []);

  const onDone = () => {
    notifySuccess({
      title: "Listing activated",
      description: `${item} now active in slot ${slot}.`,
    });
    router.push("/kiosk/welcome");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center">
      <Card className="w-full border border-border-subtle bg-surface-bg-2">
        <CardBody className="space-y-5 p-8">
          <h1 className="text-3xl font-semibold text-text-1">Place Item in Slot #{slot}</h1>
          <p className="text-lg text-text-2">Waiting for item placement confirmation...</p>
          <Progress
            aria-label="Placement confirmation"
            classNames={{ indicator: "bg-brand-cyan-400", track: "bg-surface-bg-3" }}
            value={progress}
          />
          <p className="text-sm text-text-3">Sensor poll status: {progress}%</p>
          <Button
            className="h-14 text-lg bg-brand-cyan-600 text-white hover:brightness-110"
            onPress={onDone}
          >
            Done
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

export default function KioskSellPlacePage() {
  return (
    <Suspense fallback={<div className="text-text-2">Loading placement status...</div>}>
      <KioskSellPlaceContent />
    </Suspense>
  );
}
