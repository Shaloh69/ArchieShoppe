"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";

import { itemsApi, ordersApi, type ApiItem } from "@/lib/api-client";
import { peso } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

function KioskBuyConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [item, setItem] = useState<ApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const itemId = searchParams.get("itemId");

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await itemsApi.getById(itemId);
        if (res.item.status === "ACTIVE") setItem(res.item);
      } catch {
        // item unavailable
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId]);

  const onConfirm = async () => {
    if (!item) {
      notifyError({
        title: "Cannot continue",
        description: "Selected item is no longer available.",
      });
      router.push("/buy/browse");
      return;
    }
    setSubmitting(true);
    try {
      const res = await ordersApi.create(item.id);
      notifySuccess({
        title: "Order confirmed",
        description: `Unlock issued for slot ${res.order.slotId}. Code: ${res.order.personalCode}`,
      });
      router.push(
        `/buy/success?slot=${res.order.slotId ?? "N/A"}&orderId=${res.order.id}`,
      );
    } catch (e) {
      notifyError({
        title: "Purchase failed",
        description: (e as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center">
      <Card className="w-full border border-border-subtle bg-surface-bg-2">
        <CardBody className="space-y-5 p-8">
          <h1 className="text-3xl font-semibold text-text-1">
            Confirm Purchase
          </h1>
          {item ? (
            <>
              <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-4 text-lg text-text-2">
                <p>Item: {item.title}</p>
                <p>Amount: {peso(Number(item.price))}</p>
                <p>Slot: {item.slotId ?? "N/A"}</p>
              </div>
              <p className="text-sm text-status-warning-600">
                Payment held up to 24 hours (refund rules apply).
              </p>
            </>
          ) : (
            <p className="text-status-danger-600">
              Item context missing. Return to browse.
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              className="h-14 text-lg bg-surface-bg-3 text-text-1 hover:bg-surface-bg-1"
              onPress={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              className="h-14 text-lg btn-cta"
              isDisabled={!item}
              isLoading={submitting}
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
    <Suspense
      fallback={<div className="text-text-2">Loading confirmation...</div>}
    >
      <KioskBuyConfirmContent />
    </Suspense>
  );
}
