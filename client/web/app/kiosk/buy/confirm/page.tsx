"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";

import { items } from "@/lib/unithrift-mocks";
import { peso } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

function KioskBuyConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const itemId = searchParams.get("itemId");

  const item = useMemo(
    () => items.find((entry) => entry.id === itemId && entry.status === "ACTIVE"),
    [itemId],
  );

  const onConfirm = async () => {
    if (!item) {
      notifyError({
        title: "Cannot continue",
        description: "Selected item is no longer available.",
      });
      router.push("/kiosk/buy/browse");
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setLoading(false);
    notifySuccess({
      title: "Order confirmed",
      description: `Unlock issued for slot ${item.slotId}.`,
    });
    router.push(`/kiosk/buy/success?slot=${item.slotId ?? "N/A"}&orderId=ord-demo`);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center">
      <Card className="w-full border border-border-subtle bg-surface-bg-2">
        <CardBody className="space-y-5 p-8">
          <h1 className="text-3xl font-semibold text-text-1">Confirm Purchase</h1>
          {item ? (
            <>
              <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-4 text-lg text-text-2">
                <p>Item: {item.title}</p>
                <p>Amount: {peso(item.price)}</p>
                <p>Slot: {item.slotId ?? "N/A"}</p>
              </div>
              <p className="text-sm text-status-warning-600">
                Payment held up to 24 hours (refund rules apply).
              </p>
            </>
          ) : (
            <p className="text-status-danger-600">Item context missing. Return to browse.</p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              className="h-14 text-lg bg-surface-bg-3 text-text-1 hover:bg-surface-bg-1"
              onPress={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              className="h-14 text-lg bg-brand-primary-500 text-white hover:bg-brand-primary-400"
              isLoading={loading}
              onPress={onConfirm}
            >
              Confirm
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function KioskBuyConfirmPage() {
  return (
    <Suspense fallback={<div className="text-text-2">Loading confirmation...</div>}>
      <KioskBuyConfirmContent />
    </Suspense>
  );
}
