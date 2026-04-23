"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await itemsApi.getById(params.id);
        if (res.item.status !== "ACTIVE") { setNotFound(true); return; }
        setItem(res.item);
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    })();
  }, [params.id]);

  const balance = Number(user?.walletBalance ?? 0);
  const canAfford = item ? balance >= Number(item.price) : false;

  const onConfirm = async () => {
    if (!item) return;
    setSubmitting(true);
    try {
      const res = await ordersApi.create(item.id);
      setConfirmOpen(false);
      notifySuccess({
        title: "Order confirmed!",
        description: `Go to locker ${res.order.slotId ?? "N/A"} and use code: ${res.order.personalCode}`,
      });
      router.push("/history");
    } catch (e) {
      notifyError({ title: "Purchase failed", description: (e as Error).message });
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner color="warning" size="lg" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">😕</p>
        <p className="mt-3 text-lg font-semibold text-text-1">Item not available</p>
        <p className="mt-1 text-sm text-text-3">This listing may have been sold or removed.</p>
        <Button className="mt-4 btn-cta" onPress={() => router.push("/browse")}>
          Back to browse
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <button
        className="flex items-center gap-1 text-sm text-brand-primary-600"
        onClick={() => router.back()}
      >
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* Product image */}
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-bg-2">
        {item.imageUrl ? (
          <img
            alt={item.title}
            className="aspect-square w-full object-cover"
            src={item.imageUrl?.startsWith("http") ? item.imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${item.imageUrl}`}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-brand-primary-200 to-brand-teal-100 text-7xl">
            🏷️
          </div>
        )}
      </div>

      {/* Details card */}
      <div className="rounded-2xl border border-border-subtle bg-surface-bg-2 p-4 space-y-3">
        <div>
          <h1 className="text-xl font-bold text-text-1">{item.title}</h1>
          {item.seller?.fullName && (
            <p className="mt-0.5 text-sm text-text-3">by {item.seller.fullName}</p>
          )}
        </div>

        <p className="text-3xl font-bold text-brand-primary-600">{peso(Number(item.price))}</p>

        <div className="flex gap-2">
          <span className="rounded-full bg-brand-primary-100 px-3 py-1 text-xs font-medium text-brand-primary-700">
            {item.condition}
          </span>
          <span className="rounded-full bg-surface-bg-3 px-3 py-1 text-xs font-medium text-text-2">
            {item.category}
          </span>
        </div>

        {item.description && (
          <p className="text-sm leading-relaxed text-text-2">{item.description}</p>
        )}

        <div className="rounded-xl bg-surface-bg-3 p-3 text-sm text-text-2 space-y-1">
          <p>Locker slot: <span className="font-medium text-text-1">{item.slotId ?? "Unassigned"}</span></p>
          <p>Your balance: <span className="font-medium text-text-1">{peso(balance)}</span></p>
        </div>

        {!canAfford && (
          <p className="rounded-xl bg-status-warning-100 px-3 py-2 text-xs font-medium text-status-warning-600">
            Insufficient balance — top up your wallet first.
          </p>
        )}
      </div>

      {/* Sticky buy bar */}
      <div className="sticky bottom-16 z-30 rounded-2xl border border-border-strong bg-surface-bg-1 p-3 shadow-lg">
        <Button
          className="h-14 w-full text-lg btn-cta"
          isDisabled={!canAfford || !user}
          onPress={() => setConfirmOpen(true)}
        >
          {!user ? "Log in to buy" : !canAfford ? "Insufficient balance" : "Buy now"}
        </Button>
      </div>

      <Modal isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <ModalContent className="border border-border-subtle bg-surface-bg-2 text-text-1">
          <ModalHeader className="text-text-1">Confirm purchase</ModalHeader>
          <ModalBody>
            <div className="space-y-2 text-sm text-text-2">
              <p>Item: <span className="font-medium text-text-1">{item.title}</span></p>
              <p>Total: <span className="font-bold text-brand-primary-600">{peso(Number(item.price))}</span></p>
              <p className="text-xs text-status-warning-600">
                Payment held up to 24 hours. Refund rules apply.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="btn-cta" isLoading={submitting} onPress={onConfirm}>
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
