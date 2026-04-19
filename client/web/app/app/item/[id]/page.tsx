"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

import { EmptyBlock } from "@/components/unithrift/state-block";
import { StatusChip } from "@/components/unithrift/status-chip";
import { peso } from "@/lib/unithrift-format";
import { items, walletBalance } from "@/lib/unithrift-mocks";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const item = useMemo(
    () => items.find((entry) => entry.id === params.id && entry.status === "ACTIVE"),
    [params.id],
  );

  if (!item) {
    return (
      <EmptyBlock
        actionLabel="Back to browse"
        description="This listing may have been sold or removed."
        title="Item not available (409)"
        onAction={() => router.push("/app/browse")}
      />
    );
  }

  const canAfford = walletBalance >= item.price;

  const confirmPurchase = async () => {
    if (!canAfford) {
      notifyError({
        title: "Insufficient wallet balance",
        description: "Top up your wallet to complete this purchase.",
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsSubmitting(false);
    setIsConfirmOpen(false);

    notifySuccess({
      title: "Order confirmed",
      description: `Locker ${item.slotId ?? "N/A"} unlock request issued.`,
    });
    router.push("/app/history");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="gap-4 p-5">
          <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-brand-primary-900 via-brand-primary-700 to-brand-indigo-600" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`thumb-${i}`}
                className="aspect-[4/3] rounded-lg bg-surface-bg-3 border border-border-subtle"
              />
            ))}
          </div>
        </CardBody>
      </Card>

      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="gap-4 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-1">{item.title}</h1>
              <p className="text-sm text-text-2">Sold by {item.sellerName}</p>
            </div>
            <StatusChip kind="item" value={item.status} />
          </div>
          <p className="text-3xl font-semibold text-brand-primary-800">{peso(item.price)}</p>
          <p className="text-sm text-text-2">{item.description}</p>
          <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
            <p>Condition: {item.condition}</p>
            <p>Category: {item.category}</p>
            <p>Locker slot: {item.slotId ?? "Unassigned"}</p>
            <p>Wallet balance: {peso(walletBalance)}</p>
          </div>
          <Button
            className="focus-ring btn-cta disabled:bg-border-strong disabled:text-text-3"
            isDisabled={!canAfford}
            onPress={() => setIsConfirmOpen(true)}
          >
            Buy now
          </Button>
          {!canAfford ? (
            <p className="text-xs text-status-warning-600">
              Insufficient wallet balance. Top-up required before purchasing.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Modal isOpen={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <ModalContent className="border border-border-subtle bg-surface-bg-3 text-text-1">
          <ModalHeader>Confirm purchase</ModalHeader>
          <ModalBody>
            <div className="space-y-2 text-sm text-text-2">
              <p>Item: {item.title}</p>
              <p>Total: {peso(item.price)}</p>
              <p>Hold policy: payment held for up to 24 hours.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="btn-cta"
              isLoading={isSubmitting}
              onPress={confirmPurchase}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

