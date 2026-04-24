"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Skeleton } from "@heroui/skeleton";

import { StatusChip } from "@/components/unithrift/status-chip";
import { peso, shortDate } from "@/lib/unithrift-format";
import { categories, conditions } from "@/lib/unithrift-mocks";
import {
  itemsApi,
  lockersApi,
  type ApiItem,
  type ApiLockerPlan,
  type ApiLockerSlot,
} from "@/lib/api-client";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";
import { useAuth } from "@/contexts/auth-context";

const STEPS = [
  { label: "Item details",      icon: "📋" },
  { label: "Subscription plan", icon: "📦" },
  { label: "Review & confirm",  icon: "✅" },
  { label: "Seller code",       icon: "🔑" },
];

const INPUT_WRAP = "bg-surface-bg-3 border border-border-subtle focus-within:border-brand-primary-400 transition-colors";

export default function SellPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("400");
  const [category, setCategory] = useState(categories[0]);
  const [condition, setCondition] = useState<string>(conditions[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<ApiLockerPlan[]>([]);
  const [slots, setSlots] = useState<ApiLockerSlot[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [createdItem, setCreatedItem] = useState<ApiItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableSlots = useMemo(
    () => slots.filter((s) => s.status === "EMPTY"),
    [slots],
  );
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const fetchPlanData = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const [plansRes, slotsRes] = await Promise.all([
        lockersApi.plans(),
        lockersApi.all(),
      ]);
      setPlans(plansRes.plans);
      setSlots(slotsRes.slots);
    } catch {
      // non-blocking
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  const goToNext = async () => {
    if (step === 0) {
      if (!title.trim() || !description.trim() || Number(price) <= 0) {
        notifyError({
          title: "Missing listing details",
          description: "Complete title, description, and valid price before continuing.",
        });
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!selectedPlan) {
        notifyError({
          title: "Choose a subscription plan",
          description: "A paid plan is required before slot assignment.",
        });
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!selectedPlan) { setStep(1); return; }
      setSubmitting(true);
      try {
        const form = new FormData();
        form.append("title", title.trim());
        form.append("description", description.trim());
        form.append("price", String(Math.round(Number(price) * 100)));
        form.append("category", category);
        form.append("condition", condition);
        form.append("subscriptionPlanId", selectedPlan.id);
        if (imageFile) form.append("image", imageFile);

        const res = await itemsApi.create(form);
        setCreatedItem(res.item);
        notifySuccess({
          title: "Listing created",
          description: `Slot ${res.item.slotId ?? "assigned"} assigned. Use your seller code at the kiosk.`,
        });
        setStep(3);
      } catch (e) {
        notifyError({ title: "Listing failed", description: (e as Error).message });
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Role gate — only SELLER and ADMIN can access
  if (user && user.role === "BUYER") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="text-5xl">🏷️</span>
        <p className="text-xl font-extrabold text-text-1">Sellers only</p>
        <p className="text-sm text-text-3">Upgrade your account to start listing items.</p>
        <a href="/profile" className="rounded-xl bg-brand-primary-600 px-6 py-2.5 text-sm font-semibold text-white">
          Go to Profile
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <h1 className="text-2xl font-extrabold text-text-1">Sell an item</h1>
        <p className="mt-0.5 text-sm text-text-3">
          Create a listing, pick a locker plan, and get your seller code.
        </p>
      </motion.div>

      {/* Step indicator */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="relative"
      >
        {/* Progress bar */}
        <div className="absolute left-4 right-4 top-5 h-0.5 bg-border-subtle">
          <motion.div
            className="h-full bg-brand-primary-600"
            animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>

        <div className="relative grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center gap-1.5 pt-0">
              <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${
                i < step
                  ? "border-brand-primary-600 bg-brand-primary-600 text-white shadow-sm"
                  : i === step
                    ? "border-brand-primary-600 bg-brand-primary-600 text-white shadow-md ring-4 ring-brand-primary-100"
                    : "border-border-strong bg-surface-bg-1 text-text-4"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <p className={`text-center text-[10px] font-medium leading-tight ${
                i === step ? "text-brand-primary-700" : i < step ? "text-brand-primary-500" : "text-text-4"
              }`}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Step panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >

          {/* ── Step 0: Item Details ───────────────────────────────── */}
          {step === 0 && (
            <Card className="border border-border-subtle bg-surface-bg-1 shadow-sm">
              <CardBody className="grid gap-4 p-5 md:grid-cols-2">
                <Input
                  classNames={{ inputWrapper: INPUT_WRAP }}
                  label="Title"
                  labelPlacement="outside"
                  placeholder="e.g. Blue Denim Jacket"
                  value={title}
                  onValueChange={setTitle}
                />
                <Input
                  classNames={{ inputWrapper: INPUT_WRAP }}
                  label="Price (₱)"
                  labelPlacement="outside"
                  min={1}
                  placeholder="400"
                  startContent={<span className="text-sm text-text-3">₱</span>}
                  type="number"
                  value={price}
                  onValueChange={setPrice}
                />
                <Select
                  classNames={{ trigger: `${INPUT_WRAP}` }}
                  label="Category"
                  labelPlacement="outside"
                  selectedKeys={[category]}
                  onSelectionChange={(keys) =>
                    setCategory(Array.from(keys)[0]?.toString() || categories[0])
                  }
                >
                  {categories.map((entry) => (
                    <SelectItem key={entry}>{entry}</SelectItem>
                  ))}
                </Select>
                <Select
                  classNames={{ trigger: `${INPUT_WRAP}` }}
                  label="Condition"
                  labelPlacement="outside"
                  selectedKeys={[condition]}
                  onSelectionChange={(keys) =>
                    setCondition(Array.from(keys)[0]?.toString() || conditions[0])
                  }
                >
                  {conditions.map((entry) => (
                    <SelectItem key={entry}>{entry}</SelectItem>
                  ))}
                </Select>
                <div className="md:col-span-2">
                  <Textarea
                    classNames={{ inputWrapper: INPUT_WRAP }}
                    label="Description"
                    labelPlacement="outside"
                    minRows={4}
                    placeholder="Describe the item — size, material, flaws…"
                    value={description}
                    onValueChange={setDescription}
                  />
                </div>
                <div className="md:col-span-2">
                  <p className="mb-1.5 text-sm font-medium text-text-2">
                    Photo <span className="text-text-4">(optional)</span>
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-bg-3 px-4 py-3 text-sm text-text-3 transition-colors hover:border-brand-primary-400 hover:bg-brand-primary-50">
                    <span>📷</span>
                    <span>{imageFile ? imageFile.name : "Choose photo…"}</span>
                    <input
                      accept="image/*"
                      className="hidden"
                      type="file"
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ── Step 1: Subscription Plan ─────────────────────────── */}
          {step === 1 && (
            <Card className="border border-border-subtle bg-surface-bg-1 shadow-sm">
              <CardBody className="space-y-4 p-5">
                {loadingPlans ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-text-3">
                      Select a storage plan. Your item will be held in a campus locker.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {plans.map((plan) => {
                        const active = selectedPlanId === plan.id;
                        return (
                          <motion.button
                            key={plan.id}
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`relative rounded-xl border p-4 text-left transition-all duration-150 ${
                              active
                                ? "border-brand-primary-500 bg-brand-primary-50 ring-2 ring-brand-primary-300/50 shadow-sm"
                                : "border-border-subtle bg-surface-bg-3 hover:border-brand-primary-300 hover:bg-brand-primary-50/50"
                            }`}
                          >
                            {plan.highlight && (
                              <span className="absolute -top-2 right-3 rounded-full bg-brand-gold-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                BEST VALUE
                              </span>
                            )}
                            {active && (
                              <span className="absolute right-3 top-3 text-brand-primary-600">✓</span>
                            )}
                            <p className={`text-base font-bold ${active ? "text-brand-primary-700" : "text-text-1"}`}>
                              {plan.name}
                            </p>
                            <p className="mt-0.5 text-xs text-text-3">{plan.durationDays} days storage</p>
                            <p className={`mt-2 text-2xl font-extrabold ${active ? "text-brand-primary-600" : "text-text-1"}`}>
                              {peso(Number(plan.price))}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-brand-gold-50 px-3 py-2 text-xs text-brand-gold-700">
                      <span>⚠️</span>
                      A paid subscription is required before slot assignment.
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          )}

          {/* ── Step 2: Review & Confirm ──────────────────────────── */}
          {step === 2 && (
            <Card className="border border-border-subtle bg-surface-bg-1 shadow-sm">
              <CardBody className="space-y-4 p-5">
                <p className="font-semibold text-text-1">Review your listing</p>

                <div className="rounded-xl border border-border-subtle bg-surface-bg-3 p-4 text-sm space-y-1.5">
                  {[
                    ["Title", title],
                    ["Price", peso(Number(price))],
                    ["Category", category],
                    ["Condition", condition],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline gap-2">
                      <span className="min-w-[72px] text-text-3">{k}</span>
                      <span className="font-medium text-text-1">{v}</span>
                    </div>
                  ))}
                </div>

                {selectedPlan && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-primary-200 bg-brand-primary-50 p-3 text-sm">
                    <span className="font-semibold text-brand-primary-700">Plan:</span>
                    <Chip className="bg-brand-primary-600 text-white text-xs" size="sm">
                      {selectedPlan.name}
                    </Chip>
                    <span className="font-bold text-brand-primary-700">{peso(Number(selectedPlan.price))}</span>
                    <span className="text-text-3">({selectedPlan.durationDays} days)</span>
                  </div>
                )}

                <div className="rounded-xl border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p className="font-semibold text-text-1">
                    Available slots:{" "}
                    <span className="text-brand-green-600">{availableSlots.length}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableSlots.slice(0, 6).map((s) => (
                      <div key={s.slotId} className="flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-bg-1 px-2 py-1 text-xs">
                        <span>{s.slotId}</span>
                        <StatusChip kind="locker" value="EMPTY" />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-text-4">
                    The server assigns the first available slot automatically.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ── Step 3: Success – Seller Code ────────────────────── */}
          {step === 3 && createdItem && (
            <Card className="border border-border-subtle bg-surface-bg-1 shadow-sm">
              <CardBody className="items-center gap-5 p-8 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-100 text-3xl"
                >
                  🎉
                </motion.div>

                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary-600">
                  Assigned Slot
                </p>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 22 }}
                  className="rounded-2xl border-2 border-brand-primary-600 bg-gradient-to-br from-brand-primary-600 to-brand-primary-700 px-10 py-5 shadow-lg"
                >
                  <p className="text-5xl font-extrabold tracking-[0.25em] text-white">
                    {createdItem.slotId ?? "—"}
                  </p>
                </motion.div>

                <p className="max-w-xs text-sm text-text-2">
                  Your listing is in{" "}
                  <span className="font-semibold text-text-1">DRAFT</span>. Go to
                  the kiosk, open slot {createdItem.slotId ?? "N/A"}, and place your item.
                </p>
                <p className="text-xs text-text-4">
                  After placing your item, activate the listing from My Listings.
                </p>

                {selectedPlan && (
                  <div className="w-full max-w-xs rounded-xl border border-border-subtle bg-surface-bg-3 p-4 text-left text-sm space-y-1">
                    <p className="font-semibold text-text-1">Rental summary</p>
                    {[
                      ["Plan", selectedPlan.name],
                      ["Price", peso(Number(selectedPlan.price))],
                      ["Duration", `${selectedPlan.durationDays} days`],
                      ["Ends on", createdItem.subscriptionEndsAt ? shortDate(createdItem.subscriptionEndsAt) : "Pending"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-baseline gap-2 text-text-3">
                        <span className="min-w-[64px]">{k}</span>
                        <span className="text-text-2">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {step < 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3"
        >
          <Button
            className="btn-ghost rounded-xl border border-border-subtle"
            isDisabled={step === 0}
            onPress={() => setStep((prev) => Math.max(prev - 1, 0))}
          >
            Back
          </Button>
          <Button
            className="btn-cta flex-1 rounded-xl"
            isLoading={submitting}
            onPress={goToNext}
          >
            {step === 0 ? "Continue to plan →"
              : step === 1 ? "Continue to review →"
              : "Create listing 🚀"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
