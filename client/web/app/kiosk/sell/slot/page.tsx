"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";

import { notifyInfo, notifySuccess } from "@/lib/unithrift-toast";

function KioskSellSlotContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slot = searchParams.get("slot") ?? "N/A";
  const code = searchParams.get("code") ?? "";
  const item = searchParams.get("item") ?? "Item";

  const onContinue = () => {
    notifySuccess({
      title: "Slot access granted",
      description: `Code ${code} consumed. Place your item in slot ${slot}.`,
    });
    router.push(
      `/kiosk/sell/place?slot=${slot}&item=${encodeURIComponent(item)}`,
    );
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center">
      <Card className="w-full border border-border-subtle bg-surface-bg-2">
        <CardBody className="space-y-5 p-8 text-center">
          <h1 className="text-3xl font-semibold text-text-1">
            Your slot is #{slot}
          </h1>
          <p className="text-lg text-text-2">
            Open the slot and place your item.
          </p>
          <div className="mx-auto h-44 w-44 rounded-xl border border-border-subtle bg-surface-bg-3" />
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              className="h-14 text-lg bg-surface-bg-3 text-text-1 hover:bg-surface-bg-1"
              onPress={() => {
                notifyInfo({
                  title: "Returning",
                  description: "Sell flow cancelled.",
                });
                router.push("/kiosk/welcome");
              }}
            >
              Cancel
            </Button>
            <Button className="h-14 text-lg btn-cta" onPress={onContinue}>
              Continue
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function KioskSellSlotPage() {
  return (
    <Suspense
      fallback={<div className="text-text-2">Loading slot details...</div>}
    >
      <KioskSellSlotContent />
    </Suspense>
  );
}
