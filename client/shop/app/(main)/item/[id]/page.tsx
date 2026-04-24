"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Skeleton } from "@heroui/skeleton";
import { Spinner } from "@heroui/spinner";
import { Textarea } from "@heroui/input";
import {
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader,
} from "@heroui/modal";

import { useAuth } from "@/contexts/auth-context";
import { itemsApi, ordersApi, wishlistApi, reviewsApi, type ApiItem, type ApiReview } from "@/lib/api-client";
import { peso } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const CONDITION_META: Record<string, { label: string; color: string }> = {
  NEW:      { label: "New",      color: "bg-brand-green-100 text-brand-green-700" },
  LIKE_NEW: { label: "Like New", color: "bg-brand-teal-100 text-brand-teal-700" },
  GOOD:     { label: "Good",     color: "bg-brand-gold-100 text-brand-gold-700" },
  FAIR:     { label: "Fair",     color: "bg-brand-primary-100 text-brand-primary-700" },
};

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < Math.round(value) ? "text-brand-gold-500" : "text-border-strong"} style={{ fontSize: 14 }}>
          ★
        </span>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="text-2xl transition-transform duration-100 active:scale-90"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          <span className={(hover || value) >= n ? "text-brand-gold-500" : "text-border-strong"}>★</span>
        </button>
      ))}
    </span>
  );
}

export default function ItemDetailPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();

  const [item,        setItem]        = useState<ApiItem | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [savedCount,  setSavedCount]  = useState(0);
  const [saveBusy,    setSaveBusy]    = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  // Reviews state
  const [reviews,    setReviews]    = useState<ApiReview[]>([]);
  const [avgRating,  setAvgRating]  = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewOpen,  setReviewOpen]  = useState(false);
  const [rating,      setRating]      = useState(0);
  const [comment,     setComment]     = useState("");
  const [reviewBusy,  setReviewBusy]  = useState(false);
  // orderId for buyer to leave a review on
  const [reviewableOrderId, setReviewableOrderId] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await itemsApi.getById(params.id);
      if (res.item.status !== "ACTIVE") { setNotFound(true); return; }
      setItem(res.item);
      setSaved(res.item.isSaved ?? false);
      setSavedCount(res.item.savedCount ?? 0);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchReviews = useCallback(async (sellerId: string) => {
    setReviewsLoading(true);
    try {
      const res = await reviewsApi.bySeller(sellerId);
      setReviews(res.reviews);
      setAvgRating(res.avgRating);
      setReviewCount(res.totalReviews);
    } catch { /* silent */ } finally {
      setReviewsLoading(false);
    }
  }, []);

  const checkReviewable = useCallback(async () => {
    if (!user || !item) return;
    try {
      const res = await ordersApi.myPurchases();
      const eligible = res.orders.find(
        (o) => o.item?.id === item.id && o.status === "COMPLETED" && !o.review,
      );
      setReviewableOrderId(eligible?.id ?? null);
    } catch { /* ignore */ }
  }, [user, item]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  useEffect(() => {
    if (item?.seller?.id) {
      fetchReviews(item.seller.id);
    }
  }, [item?.seller?.id, fetchReviews]);

  useEffect(() => {
    checkReviewable();
  }, [checkReviewable]);

  const toggleSave = async () => {
    if (!user) { notifyError({ title: "Login required", description: "Sign in to save items." }); return; }
    if (saveBusy) return;
    setSaveBusy(true);
    const next = !saved;
    setSaved(next);
    setSavedCount((c) => next ? c + 1 : Math.max(0, c - 1));
    try {
      await wishlistApi.toggle(params.id);
    } catch {
      setSaved(!next);
      setSavedCount((c) => !next ? c + 1 : Math.max(0, c - 1));
    } finally {
      setSaveBusy(false);
    }
  };

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
    } finally {
      setSubmitting(false); }
  };

  const submitReview = async () => {
    if (!reviewableOrderId || rating === 0) return;
    setReviewBusy(true);
    try {
      await reviewsApi.create({ orderId: reviewableOrderId, rating, comment: comment || undefined });
      notifySuccess({ title: "Review submitted!", description: "Thank you for your feedback." });
      setReviewOpen(false);
      setReviewableOrderId(null);
      if (item?.seller?.id) fetchReviews(item.seller.id);
    } catch (e) {
      notifyError({ title: "Failed to submit", description: (e as Error).message });
    } finally {
      setReviewBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">😕</p>
        <p className="mt-3 text-lg font-semibold text-text-1">Item not available</p>
        <p className="mt-1 text-sm text-text-3">This listing may have been sold or removed.</p>
        <Button className="mt-4 btn-cta" onPress={() => router.push("/browse")}>Back to browse</Button>
      </div>
    );
  }

  const balance   = Number(user?.walletBalance ?? 0);
  const canAfford = balance >= Number(item.displayPrice ?? item.price);
  const displayPx = Number(item.displayPrice ?? item.price);
  const condMeta  = CONDITION_META[item.condition ?? ""] ?? { label: item.condition, color: "bg-surface-bg-3 text-text-2" };

  return (
    <div className="space-y-4 pb-4">
      {/* Back */}
      <button className="flex items-center gap-1 text-sm text-brand-primary-600" onClick={() => router.back()}>
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* Product image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24 }}
        className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-bg-2"
      >
        {item.imageUrl ? (
          <img
            alt={item.title}
            className="aspect-square w-full object-cover"
            src={item.imageUrl.startsWith("http") ? item.imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${item.imageUrl}`}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-brand-primary-200 to-brand-teal-100 text-7xl">🏷️</div>
        )}
      </motion.div>

      {/* Details card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.05 }}
        className="rounded-2xl border border-border-subtle bg-surface-bg-1 p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-text-1">{item.title}</h1>
          {/* Save button */}
          <button
            onClick={toggleSave}
            disabled={saveBusy}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-sm transition-all duration-150 active:scale-95"
          >
            <motion.span
              animate={{ scale: saved ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 0.22 }}
              className={saved ? "text-red-500" : "text-text-4"}
            >
              {saved ? "♥" : "♡"}
            </motion.span>
            <span className="text-[11px] text-text-3">{savedCount}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-3xl font-extrabold text-brand-primary-600">{peso(displayPx)}</p>
          {item.serviceFee && item.serviceFee > 0 && (
            <span className="rounded-full bg-brand-primary-50 px-2 py-0.5 text-[10px] font-medium text-brand-primary-600">
              incl. ₱{item.serviceFee.toFixed(2)} fee
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${condMeta.color}`}>
            {condMeta.label}
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

        {!canAfford && user && (
          <p className="rounded-xl bg-status-warning-100 px-3 py-2 text-xs font-medium text-status-warning-600">
            Insufficient balance — top up your wallet first.
          </p>
        )}
      </motion.div>

      {/* Seller card */}
      {item.seller && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.1 }}
          className="rounded-2xl border border-border-subtle bg-surface-bg-1 p-4"
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-4">Seller</p>
          <div className="flex items-center gap-3">
            <Avatar
              src={item.seller.avatarUrl}
              name={item.seller.fullName}
              size="md"
              isBordered
              classNames={{ base: "border-brand-primary-200" }}
              showFallback
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text-1">{item.seller.fullName}</p>
              <div className="flex items-center gap-1.5">
                {reviewsLoading ? (
                  <Skeleton className="h-3.5 w-20 rounded" />
                ) : reviewCount > 0 ? (
                  <>
                    <StarRating value={avgRating} />
                    <span className="text-[11px] text-text-3">{avgRating.toFixed(1)} ({reviewCount})</span>
                  </>
                ) : (
                  <span className="text-[11px] text-text-4">No reviews yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Review prompt for eligible buyer */}
          {reviewableOrderId && (
            <button
              className="mt-3 w-full rounded-xl border border-brand-gold-300 bg-brand-gold-50 py-2 text-sm font-semibold text-brand-gold-700 transition-all hover:bg-brand-gold-100 active:scale-[0.98]"
              onClick={() => setReviewOpen(true)}
            >
              ⭐ Leave a review for this seller
            </button>
          )}
        </motion.div>
      )}

      {/* Reviews section */}
      {reviews.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.15 }}
          className="rounded-2xl border border-border-subtle bg-surface-bg-1 p-4 space-y-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-4">Reviews</p>
          {reviews.slice(0, 5).map((rev) => (
            <div key={rev.id} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <Avatar
                  src={rev.reviewer?.avatarUrl}
                  name={rev.reviewer?.fullName ?? "User"}
                  size="sm"
                  showFallback
                />
                <div>
                  <p className="text-xs font-semibold text-text-1">{rev.reviewer?.fullName}</p>
                  <StarRating value={rev.rating} />
                </div>
              </div>
              {rev.comment && <p className="mt-1.5 text-xs leading-relaxed text-text-2">{rev.comment}</p>}
            </div>
          ))}
        </motion.div>
      )}

      {/* Sticky buy bar */}
      <div className="sticky bottom-16 z-30 rounded-2xl border border-border-strong bg-surface-bg-1 p-3 shadow-lg">
        <Button
          className="h-14 w-full text-lg btn-cta"
          isDisabled={!canAfford || !user || item.status !== "ACTIVE"}
          onPress={() => setConfirmOpen(true)}
        >
          {!user ? "Log in to buy" : !canAfford ? "Insufficient balance" : `Buy now · ${peso(displayPx)}`}
        </Button>
      </div>

      {/* Confirm purchase modal */}
      <Modal isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <ModalContent className="border border-border-subtle bg-surface-bg-2 text-text-1">
          <ModalHeader className="text-text-1">Confirm purchase</ModalHeader>
          <ModalBody>
            <div className="space-y-2 text-sm text-text-2">
              <p>Item: <span className="font-medium text-text-1">{item.title}</span></p>
              <p>Total: <span className="font-bold text-brand-primary-600">{peso(displayPx)}</span></p>
              {item.serviceFee && item.serviceFee > 0 && (
                <p className="text-xs text-text-3">Includes ₱{item.serviceFee.toFixed(2)} platform fee</p>
              )}
              <p className="text-xs text-status-warning-600">Payment held for up to 24 hours. Refund rules apply.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="btn-cta" isLoading={submitting} onPress={onConfirm}>Confirm</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Review modal */}
      <Modal isOpen={reviewOpen} onOpenChange={setReviewOpen}>
        <ModalContent className="border border-border-subtle bg-surface-bg-2 text-text-1">
          <ModalHeader>Rate this seller</ModalHeader>
          <ModalBody className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar src={item.seller?.avatarUrl} name={item.seller?.fullName} size="lg" isBordered showFallback />
              <p className="font-semibold text-text-1">{item.seller?.fullName}</p>
            </div>
            <div className="flex justify-center">
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <Textarea
              classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-strong" }}
              label="Comment (optional)"
              labelPlacement="outside"
              placeholder="Share your experience…"
              value={comment}
              onValueChange={setComment}
              maxRows={4}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setReviewOpen(false)}>Cancel</Button>
            <Button
              className="btn-cta"
              isLoading={reviewBusy}
              isDisabled={rating === 0}
              onPress={submitReview}
            >
              Submit review
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
