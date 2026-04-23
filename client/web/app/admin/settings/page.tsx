"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";

import { configApi, lockersApi, type ApiLockerPlan } from "@/lib/api-client";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [feeRate, setFeeRate] = useState("");
  const [feeInput, setFeeInput] = useState("");
  const [feeSaving, setFeeSaving] = useState(false);

  const [plans, setPlans] = useState<ApiLockerPlan[]>([]);
  const [planInputs, setPlanInputs] = useState<Record<string, { name: string; price: string }>>({});
  const [planSaving, setPlanSaving] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, plansRes] = await Promise.all([
        configApi.getAll(),
        lockersApi.plans(),
      ]);
      const raw = configRes.config["platform_fee_rate"] ?? "8";
      setFeeRate(raw);
      setFeeInput(raw);
      setPlans(plansRes.plans);
      const inputs: Record<string, { name: string; price: string }> = {};
      for (const p of plansRes.plans) {
        inputs[p.id] = { name: p.name, price: String(p.price) };
      }
      setPlanInputs(inputs);
    } catch {
      notifyError({ title: "Load failed", description: "Could not load settings." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveFee = async () => {
    const parsed = parseFloat(feeInput);
    if (isNaN(parsed) || parsed < 0 || parsed > 50) {
      notifyError({ title: "Invalid value", description: "Fee must be 0–50." });
      return;
    }
    setFeeSaving(true);
    try {
      await configApi.setPlatformFee(parsed);
      setFeeRate(String(parsed));
      notifySuccess({ title: "Fee updated", description: `Platform fee is now ${parsed}%.` });
    } catch (e) {
      notifyError({ title: "Save failed", description: (e as Error).message });
    } finally {
      setFeeSaving(false);
    }
  };

  const savePlan = async (planId: string) => {
    const input = planInputs[planId];
    if (!input) return;
    const price = parseFloat(input.price);
    if (isNaN(price) || price <= 0) {
      notifyError({ title: "Invalid price", description: "Price must be a positive number." });
      return;
    }
    setPlanSaving(planId);
    try {
      const res = await configApi.updatePlan(planId, { name: input.name, price });
      setPlans((prev) => prev.map((p) => (p.id === planId ? res.plan : p)));
      notifySuccess({ title: "Plan updated", description: `${input.name} saved.` });
    } catch (e) {
      notifyError({ title: "Save failed", description: (e as Error).message });
    } finally {
      setPlanSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Settings</h1>
        <p className="text-sm text-text-2">
          Configure platform fee and locker subscription pricing.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Platform Fee */}
          <Card className="border border-border-subtle bg-surface-bg-2">
            <CardHeader className="pb-0">
              <div>
                <h2 className="text-base font-semibold text-text-1">Platform Fee</h2>
                <p className="text-xs text-text-2">
                  Added on top of the item price — paid by the buyer at checkout.
                  Current: <span className="font-medium text-brand-primary-400">{feeRate}%</span>
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-3 pt-3">
              <Input
                endContent={<span className="text-sm text-text-3">%</span>}
                label="Fee rate (0–50)"
                max={50}
                min={0}
                step={0.5}
                type="number"
                value={feeInput}
                onValueChange={setFeeInput}
              />
              <Button
                className="btn-cta w-full"
                isLoading={feeSaving}
                onPress={saveFee}
              >
                Save fee
              </Button>
            </CardBody>
          </Card>

          {/* Subscription Plans */}
          <Card className="border border-border-subtle bg-surface-bg-2">
            <CardHeader className="pb-0">
              <div>
                <h2 className="text-base font-semibold text-text-1">Locker Subscription Plans</h2>
                <p className="text-xs text-text-2">
                  Flat rental fees charged to sellers when listing an item.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 pt-3">
              {plans.map((plan) => {
                const input = planInputs[plan.id];
                if (!input) return null;
                return (
                  <div
                    key={plan.id}
                    className="space-y-2 rounded-lg border border-border-subtle bg-surface-bg-3 p-3"
                  >
                    <p className="text-xs font-medium text-text-3 uppercase tracking-wide">
                      {plan.planKey}
                    </p>
                    <Input
                      label="Display name"
                      value={input.name}
                      onValueChange={(v) =>
                        setPlanInputs((prev) => ({
                          ...prev,
                          [plan.id]: { ...prev[plan.id], name: v },
                        }))
                      }
                    />
                    <Input
                      label={`Price (₱) — ${plan.durationDays} days`}
                      min={1}
                      startContent={<span className="text-sm text-text-3">₱</span>}
                      type="number"
                      value={input.price}
                      onValueChange={(v) =>
                        setPlanInputs((prev) => ({
                          ...prev,
                          [plan.id]: { ...prev[plan.id], price: v },
                        }))
                      }
                    />
                    <Button
                      className="btn-cta w-full"
                      isLoading={planSaving === plan.id}
                      size="sm"
                      onPress={() => savePlan(plan.id)}
                    >
                      Save plan
                    </Button>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
