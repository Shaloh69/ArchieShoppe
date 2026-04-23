"use client";

import { useEffect, useState } from "react";
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
import { Spinner } from "@heroui/spinner";

import { EmptyBlock } from "@/components/unithrift/state-block";
import { StatusChip } from "@/components/unithrift/status-chip";
import { useAuth } from "@/contexts/auth-context";
import { itemsApi, ordersApi, type ApiItem } from "@/lib/api-client";
import { peso } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState<ApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await itemsApi.getById(params.id);
        if (res.item.status !== "ACTIVE") {
          setNotFound(true);
          return;
        }
        setItem(res.item);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <EmptyBlock
        actionLabel="Back to browse"
        description="This listing may have been sold or removed."
        title="Item not available"
        onAction={() => router.push("/app/browse")}
      />
    );
  }

  const balance = Number(user?.walletBalance ?? 0);
  const canAfford = balance >= Number(item.price);

  const confirmPurchase = async () => {
    if (!canAfford) {
      notifyError({
        title: "Insufficient wallet balance",
        description: "Top up your wallet to complete this purchase.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await ordersApi.create(item.id);
      setIsConfirmOpen(false);
      notifySuccess({
        title: "Order confirmed",
        description: `Locker ${res.order.slotId ?? "N/A"} unlock request issued. Code: ${res.order.personalCode}`,
      });
      router.push("/app/history");
    } catch (e) {
      notifyError({
        title: "Purchase failed",
        description: (e as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="gap-4 p-5">
          {item.imageUrl ? (
            <img
              alt={item.title}
              className="aspect-[4/3] w-full rounded-xl object-cover"
              src={`${process.env.NEXT_PUBLIC_API_URL}${item.imageUrl}`}
            />
          ) : (
            <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-brand-primary-900 via-brand-primary-700 to-brand-indigo-600" />
          )}
        </CardBody>
      </Card>

      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="gap-4 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-1">
                {item.title}
              </h1>
              <p className="text-sm text-text-2">
                Sold by {item.seller?.fullName ?? "—"}
              </p>
            </div>
            <StatusChip kind="item" value={item.status} />
          </div>
          <p className="text-3xl font-semibold text-brand-primary-800">
            {peso(Number(item.price))}
          </p>
          <p className="text-sm text-text-2">{item.description}</p>
          <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
            <p>Condition: {item.condition}</p>
            <p>Category: {item.category}</p>
            <p>Locker slot: {item.slotId ?? "Unassigned"}</p>
            <p>Your balance: {peso(balance)}</p>
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
              <p>Total: {peso(Number(item.price))}</p>
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
