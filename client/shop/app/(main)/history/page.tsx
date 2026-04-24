"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Skeleton } from "@heroui/skeleton";
import { Tab, Tabs } from "@heroui/tabs";
import { Textarea } from "@heroui/input";
import {
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader,
} from "@heroui/modal";

import { ordersApi, reviewsApi, type ApiOrder } from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const STATUS_META: Record<string, { label: string; color: string; dot: string; emoji: string }> = {
  HELD:             { label: "In Locker",        color: "text-brand-gold-600",    dot: "bg-brand-gold-400",    emoji: "🔒" },
  COMPLETED:        { label: "Completed",         color: "text-brand-green-600",   dot: "bg-brand-green-500",   emoji: "✅" },
  REFUND_REQUESTED: { label: "Refund Requested",  color: "text-status-warning-600",dot: "bg-status-warning-400",emoji: "📤" },
  REFUNDED:         { label: "Refunded",          color: "text-brand-teal-600",    dot: "bg-brand-teal-400",    emoji: "↩️" },
  PARTIAL_REFUND:   { label: "Partial Refund",    color: "text-brand-primary-600", dot: "bg-brand-primary-400", emoji: "🔁" },
  CANCELLED:        { label: "Cancelled",         color: "text-status-danger-600", dot: "bg-status-danger-400", emoji: "❌" },
};

// Ordered pipeline steps for the visual timeline
const TIMELINE_STEPS = ["HELD", "COMPLETED"] as const;

function OrderTimeline({ status }: { status: string }) {
  const activeIdx = TIMELINE_STEPS.indexOf(status as (typeof TIMELINE_STEPS)[number]);
  return (
    <div className="flex items-center gap-0">
      {TIMELINE_STEPS.map((step, i) => {
        const done    = i <= activeIdx;
        const current = i === activeIdx;
        const meta    = STATUS_META[step];
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs transition-all ${
                done
                  ? "border-brand-primary-600 bg-brand-primary-600 text-white"
                  : "border-border-strong bg-surface-bg-3 text-text-4"
              } ${current ? "ring-2 ring-brand-primary-200" : ""}`}>
                {done ? "✓" : i + 1}
              </div>
              <p className={`text-[9px] font-medium ${done ? "text-brand-primary-600" : "text-text-4"}`}>
                {meta.label}
              </p>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`mb-4 h-0.5 w-10 transition-all ${done && i < activeIdx ? "bg-brand-primary-600" : "bg-border-strong"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="text-2xl transition-transform active:scale-90"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          <span className={(hover || value) >= n ? "text-brand-gold-500" : "text-border-strong"}>★</span>
        </button>
      ))}
    </div>
  );
}

function OrderCard({ order, onReview }: { order: ApiOrder; onReview?: () => void }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[order.status] ?? { label: order.status, color: "text-text-2", dot: "bg-border-strong", emoji: "📦" };
  const showTimeline = ["HELD", "COMPLETED"].includes(order.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-bg-1 shadow-sm"
    >
      {/* Card header */}
      <button
        className="flex w-full items-start gap-3 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Item image */}
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-bg-3">
          {order.item?.imageUrl ? (
            <img alt="" className="h-full w-full object-cover" src={order.item.imageUrl} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">🏷️</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text-1">{order.item?.title ?? order.itemId}</p>
          <p className="text-xs text-text-3">{shortDateTime(order.createdAt)}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-brand-primary-600">{peso(Number(order.amount))}</p>
          <svg className={`ml-auto mt-1 text-text-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Expandable details */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border-subtle px-4 pb-4 pt-3">
              {/* Timeline */}
              {showTimeline && (
                <div className="flex justify-center py-2">
                  <OrderTimeline status={order.status} />
                </div>
              )}

              {/* Info grid */}
              <div className="rounded-xl bg-surface-bg-3 p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-3">Slot</span>
                  <span className="font-medium text-text-1">{order.slotId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-3">Pickup code</span>
                  <span className="font-mono font-semibold text-brand-primary-600">{order.personalCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-3">Hold ends</span>
                  <span className="font-medium text-text-1">{shortDateTime(order.holdEndsAt)}</span>
                </div>
                {order.seller && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-3">Seller</span>
                    <div className="flex items-center gap-1.5">
                      <Avatar src={order.seller.avatarUrl} name={order.seller.fullName} size="sm" showFallback />
                      <span className="font-medium text-text-1">{order.seller.fullName}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Events timeline */}
              {order.events && order.events.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-4">Events</p>
                  {order.events.map((ev, i) => (
                    <div key={ev.id} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className="mt-1 h-2 w-2 rounded-full bg-brand-primary-400" />
                        {i < order.events!.length - 1 && <div className="mt-1 w-px flex-1 bg-border-subtle" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-xs font-semibold text-text-1">{ev.event}</p>
                        <p className="text-[10px] text-text-4">{shortDateTime(ev.createdAt)} · {ev.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Review CTA */}
              {order.status === "COMPLETED" && !order.review && onReview && (
                <button
                  className="w-full rounded-xl border border-brand-gold-300 bg-brand-gold-50 py-2 text-sm font-semibold text-brand-gold-700 transition-all hover:bg-brand-gold-100 active:scale-[0.98]"
                  onClick={onReview}
                >
                  ⭐ Rate this seller
                </button>
              )}
              {order.review && (
                <div className="flex items-center gap-1.5 rounded-xl bg-surface-bg-3 px-3 py-2 text-xs text-text-3">
                  <span>{"★".repeat(order.review.rating)}</span>
                  <span>You reviewed this order</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("purchases");
  const [orders,    setOrders]    = useState<ApiOrder[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Review state
  const [reviewOrder,  setReviewOrder]  = useState<ApiOrder | null>(null);
  const [rating,       setRating]       = useState(0);
  const [comment,      setComment]      = useState("");
  const [reviewBusy,   setReviewBusy]   = useState(false);

  const fetchOrders = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      const res = tab === "sales" ? await ordersApi.mySales() : await ordersApi.myPurchases();
      setOrders(res.orders);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [fetchOrders, activeTab]);

  const submitReview = async () => {
    if (!reviewOrder || rating === 0) return;
    setReviewBusy(true);
    try {
      await reviewsApi.create({ orderId: reviewOrder.id, rating, comment: comment || undefined });
      notifySuccess({ title: "Review submitted!", description: "Thank you for your feedback." });
      setOrders((prev) =>
        prev.map((o) => o.id === reviewOrder.id ? { ...o, review: { id: "", orderId: o.id, reviewerId: "", sellerId: "", rating, comment, createdAt: new Date().toISOString() } } : o),
      );
      setReviewOrder(null);
      setRating(0);
      setComment("");
    } catch (e) {
      notifyError({ title: "Failed to submit", description: (e as Error).message });
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-text-1">History</h1>
        <p className="text-sm text-text-3">Track your purchases, sales, and timelines.</p>
      </div>

      <Tabs
        classNames={{
          tabList: "bg-surface-bg-2 border border-border-subtle",
          cursor: "bg-brand-primary-600",
          tab: "data-[selected=true]:text-white",
        }}
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
      >
        <Tab key="purchases" title="Purchases" />
        <Tab key="sales" title="Sales" />
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center"
        >
          <p className="text-4xl">🕒</p>
          <p className="mt-2 font-semibold text-text-2">No history yet</p>
          <p className="mt-1 text-sm text-text-4">Your {activeTab} will appear here.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onReview={activeTab === "purchases" && order.status === "COMPLETED" && !order.review
                ? () => { setReviewOrder(order); setRating(0); setComment(""); }
                : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Review modal */}
      <Modal isOpen={Boolean(reviewOrder)} onOpenChange={(open) => { if (!open) setReviewOrder(null); }}>
        <ModalContent className="border border-border-subtle bg-surface-bg-2 text-text-1">
          <ModalHeader>Rate your seller</ModalHeader>
          <ModalBody className="space-y-4">
            {reviewOrder?.seller && (
              <div className="flex flex-col items-center gap-2">
                <Avatar src={reviewOrder.seller.avatarUrl} name={reviewOrder.seller.fullName} size="lg" isBordered showFallback />
                <p className="font-semibold text-text-1">{reviewOrder.seller.fullName}</p>
                <p className="text-xs text-text-3">for: {reviewOrder.item?.title}</p>
              </div>
            )}
            <div className="flex justify-center">
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <Textarea
              classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-strong" }}
              label="Comment (optional)"
              labelPlacement="outside"
              placeholder="Share your experience with this seller…"
              value={comment}
              onValueChange={setComment}
              maxRows={4}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setReviewOrder(null)}>Cancel</Button>
            <Button className="btn-cta" isLoading={reviewBusy} isDisabled={rating === 0} onPress={submitReview}>
              Submit review
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
