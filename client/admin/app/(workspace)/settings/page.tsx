"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Skeleton } from "@heroui/skeleton";

import { configApi, lockersApi, type ApiLockerPlan } from "@/lib/api-client";
import { notifySuccess, notifyError } from "@/lib/unithrift-toast";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export default function SettingsPage() {
  const [feePct, setFeePct]         = useState<number | "">("");
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving, setFeeSaving]   = useState(false);

  const [plans, setPlans]             = useState<ApiLockerPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planEdits, setPlanEdits]     = useState<Record<string, { name: string; price: string }>>({});
  const [savingId, setSavingId]       = useState<string | null>(null);

  const loadFee = useCallback(async () => {
    setFeeLoading(true);
    try {
      const { feePct: v } = await configApi.getPlatformFee();
      setFeePct(v);
    } catch {
      // non-blocking
    } finally {
      setFeeLoading(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const { plans: p } = await lockersApi.plans();
      setPlans(p);
      const edits: Record<string, { name: string; price: string }> = {};
      p.forEach((plan) => { edits[plan.id] = { name: plan.name, price: plan.price }; });
      setPlanEdits(edits);
    } catch {
      // non-blocking
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFee();
    loadPlans();
  }, [loadFee, loadPlans]);

  async function saveFee() {
    if (feePct === "" || Number(feePct) < 0 || Number(feePct) > 100) return;
    setFeeSaving(true);
    try {
      await configApi.setPlatformFee(Number(feePct));
      notifySuccess({ title: "Fee updated", description: `Platform fee set to ${feePct}%.` });
    } catch (e: unknown) {
      notifyError({ title: "Update failed", description: (e as Error).message });
    } finally {
      setFeeSaving(false);
    }
  }

  async function savePlan(id: string) {
    const edit = planEdits[id];
    if (!edit) return;
    setSavingId(id);
    try {
      const price = parseFloat(edit.price);
      if (isNaN(price) || price < 0) throw new Error("Invalid price");
      await configApi.updateSubscriptionPlan(id, { name: edit.name, price });
      notifySuccess({ title: "Plan updated", description: `"${edit.name}" saved.` });
      setPlans((prev) => prev.map((p) => p.id === id ? { ...p, name: edit.name, price: edit.price } : p));
    } catch (e: unknown) {
      notifyError({ title: "Update failed", description: (e as Error).message });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <h1 className="text-2xl font-semibold text-text-1">Settings</h1>
        <p className="text-sm text-text-3">Platform configuration and subscription plan management.</p>
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Platform fee card */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
          <Card className="panel-surface">
            <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5">
              <p className="text-base font-semibold text-text-1">Platform Fee</p>
              <p className="text-xs text-text-3">
                Percentage charged to buyers on top of the item price. Applies to all new orders.
              </p>
            </CardHeader>
            <CardBody className="px-5 pb-5">
              {feeLoading ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : (
                <div className="flex items-end gap-3">
                  <Input
                    label="Fee percentage"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={String(feePct)}
                    onValueChange={(v) => setFeePct(v === "" ? "" : Number(v))}
                    endContent={<span className="text-sm text-text-3">%</span>}
                    classNames={{ inputWrapper: "bg-surface-bg-1 border border-border-subtle" }}
                  />
                  <Button
                    className="btn-brand shrink-0"
                    isLoading={feeSaving}
                    onPress={saveFee}
                  >
                    Save
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Subscription plans card */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <Card className="panel-surface">
            <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5">
              <p className="text-base font-semibold text-text-1">Subscription Plans</p>
              <p className="text-xs text-text-3">Edit locker subscription plan names and prices.</p>
            </CardHeader>
            <CardBody className="space-y-4 px-5 pb-5">
              {plansLoading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </>
              ) : plans.length === 0 ? (
                <p className="text-sm text-text-3">No plans found.</p>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-border-subtle bg-surface-bg-1 p-4"
                  >
                    <p className="mb-3 text-xs uppercase tracking-wide text-text-3">
                      {plan.planKey} — {plan.durationDays}d
                    </p>
                    <div className="flex gap-2">
                      <Input
                        label="Name"
                        size="sm"
                        value={planEdits[plan.id]?.name ?? plan.name}
                        onValueChange={(v) =>
                          setPlanEdits((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], name: v } }))
                        }
                        classNames={{ inputWrapper: "bg-surface-bg-0 border border-border-subtle" }}
                      />
                      <Input
                        label="Price (₱)"
                        size="sm"
                        type="number"
                        min={0}
                        step={1}
                        value={planEdits[plan.id]?.price ?? plan.price}
                        onValueChange={(v) =>
                          setPlanEdits((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], price: v } }))
                        }
                        classNames={{ inputWrapper: "bg-surface-bg-0 border border-border-subtle" }}
                      />
                      <Button
                        className="btn-brand mt-auto shrink-0"
                        size="sm"
                        isLoading={savingId === plan.id}
                        onPress={() => savePlan(plan.id)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
