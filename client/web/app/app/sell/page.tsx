"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

import { StatusChip } from "@/components/unithrift/status-chip";
import { peso, shortDate } from "@/lib/unithrift-format";
import { categories, conditions, lockers, lockerSubscriptionPlans } from "@/lib/unithrift-mocks";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/unithrift-toast";
import type { LockerSubscriptionPlanId } from "@/lib/unithrift-types";

const steps = ["Item details", "Subscription plan", "Slot selection", "Seller code"];

export default function SellPage() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("400");
  const [category, setCategory] = useState(categories[0]);
  const [condition, setCondition] = useState<(typeof conditions)[number]>(conditions[0]);
  const [selectedPlanId, setSelectedPlanId] = useState<LockerSubscriptionPlanId | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [sellerCode, setSellerCode] = useState<string | null>(null);
  const [rentalEndsAt, setRentalEndsAt] = useState<string | null>(null);

  const availableSlots = useMemo(
    () => lockers.filter((slot) => slot.status === "EMPTY").map((slot) => slot.slotId),
    [],
  );
  const selectedPlan = useMemo(
    () => lockerSubscriptionPlans.find((plan) => plan.id === selectedPlanId) ?? null,
    [selectedPlanId],
  );

  const getPlanEndDate = (durationDays: number) => {
    const end = new Date();
    end.setDate(end.getDate() + durationDays);
    return end.toISOString();
  };

  const goToNext = () => {
    if (step === 0) {
      if (!title.trim() || !description.trim() || Number(price) <= 0) {
        notifyError({
          title: "Missing listing details",
          description: "Complete title, description, and valid price before continuing.",
        });
        return;
      }
      notifyInfo({ title: "Item draft created", description: "Listing saved as pending draft." });
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!selectedPlan) {
        notifyError({
          title: "Choose a subscription plan",
          description: "Locker rentals require a paid plan. Minimum is 1 week.",
        });
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!selectedSlot) {
        notifyError({
          title: "Select a slot first",
          description: "Choose one available locker slot to proceed.",
        });
        return;
      }
      if (!selectedPlan) {
        notifyError({
          title: "Plan missing",
          description: "Select a rental plan before generating your seller code.",
        });
        setStep(1);
        return;
      }
      const generated = `${Math.floor(100000 + Math.random() * 900000)}`;
      const endDate = getPlanEndDate(selectedPlan.durationDays);

      setSellerCode(generated);
      setRentalEndsAt(endDate);
      notifySuccess({
        title: "Seller code generated",
        description: `Use ${generated} at the kiosk. Plan: ${selectedPlan.name} (${peso(selectedPlan.price)}).`,
      });
      setStep(3);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Sell an item</h1>
        <p className="text-sm text-text-2">
          Create listing, choose a paid locker subscription, assign a slot, and generate your
          6-digit seller code.
        </p>
      </div>

      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="p-5">
          <div className="grid gap-3 md:grid-cols-4">
            {steps.map((entry, index) => (
              <div
                key={entry}
                className={`rounded-lg border p-3 ${
                  index === step
                    ? "border-brand-primary-400 bg-brand-primary-900 text-white"
                    : "border-border-subtle bg-surface-bg-3 text-text-2"
                }`}
              >
                <p className="text-xs uppercase tracking-wide">Step {index + 1}</p>
                <p className="mt-1 font-medium">{entry}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {step === 0 ? (
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="grid gap-4 p-6 md:grid-cols-2">
            <Input
              classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
              label="Title"
              labelPlacement="outside"
              placeholder="Item title"
              value={title}
              onValueChange={setTitle}
            />
            <Input
              classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
              label="Price"
              labelPlacement="outside"
              min={1}
              placeholder="400"
              type="number"
              value={price}
              onValueChange={setPrice}
            />
            <Select
              classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
              label="Category"
              labelPlacement="outside"
              selectedKeys={[category]}
              onSelectionChange={(keys) => setCategory(Array.from(keys)[0]?.toString() || categories[0])}
            >
              {categories.map((entry) => (
                <SelectItem key={entry}>{entry}</SelectItem>
              ))}
            </Select>
            <Select
              classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
              label="Condition"
              labelPlacement="outside"
              selectedKeys={[condition]}
              onSelectionChange={(keys) =>
                setCondition(
                  (Array.from(keys)[0]?.toString() as (typeof conditions)[number]) || conditions[0],
                )
              }
            >
              {conditions.map((entry) => (
                <SelectItem key={entry}>{entry}</SelectItem>
              ))}
            </Select>
            <div className="md:col-span-2">
              <Textarea
                classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
                label="Description"
                labelPlacement="outside"
                minRows={4}
                placeholder="Add item details..."
                value={description}
                onValueChange={setDescription}
              />
            </div>
          </CardBody>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="space-y-4 p-6">
            <p className="text-sm text-text-2">
              Select a subscription plan. Minimum term is 1 week, up to a few months.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lockerSubscriptionPlans.map((plan) => (
                <button
                  key={plan.id}
                  className={`rounded-lg border p-4 text-left transition ${
                    selectedPlanId === plan.id
                      ? "border-brand-primary-400 bg-brand-primary-900 text-white"
                      : "border-border-subtle bg-surface-bg-3 text-text-2 hover:border-brand-primary-500"
                  }`}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-semibold">{plan.name}</p>
                    {plan.highlight ? (
                      <Chip className="bg-brand-peach-100 text-text-inverse">{plan.highlight}</Chip>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm">{plan.durationDays} days access</p>
                  <p className="mt-1 text-xl font-semibold">{peso(plan.price)}</p>
                </button>
              ))}
            </div>
            <Chip className="w-fit bg-status-warning-100 text-text-inverse">
              No free plan. A paid subscription is required before slot assignment.
            </Chip>
          </CardBody>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="space-y-4 p-6">
            {selectedPlan ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                <span className="font-medium text-text-1">Selected plan:</span>
                <Chip className="bg-brand-primary-100 text-text-inverse">{selectedPlan.name}</Chip>
                <span>{peso(selectedPlan.price)}</span>
              </div>
            ) : null}
            <p className="text-sm text-text-2">Select from available slots:</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {availableSlots.map((slotId) => (
                <button
                  key={slotId}
                  className={`rounded-lg border p-4 text-left transition ${
                    selectedSlot === slotId
                      ? "border-brand-primary-400 bg-brand-primary-900 text-white"
                      : "border-border-subtle bg-surface-bg-3 text-text-2 hover:border-brand-primary-500"
                  }`}
                  type="button"
                  onClick={() => setSelectedSlot(slotId)}
                >
                  <p className="text-xs uppercase">Slot</p>
                  <p className="text-lg font-semibold">{slotId}</p>
                  <div className="mt-2">
                    <StatusChip kind="locker" value="EMPTY" />
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-text-3">
              Billing and renewal are managed by your selected subscription.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="items-center gap-4 p-8 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-primary-700">Seller Code</p>
            <p className="rounded-xl border border-brand-primary-400 bg-brand-primary-900 px-8 py-5 text-5xl font-semibold text-white">
              {sellerCode}
            </p>
            <p className="text-sm text-text-2">Go to kiosk and enter this code to open slot {selectedSlot}.</p>
            {selectedPlan ? (
              <div className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-bg-3 p-4 text-left text-sm text-text-2">
                <p className="font-semibold text-text-1">Rental summary</p>
                <p>Plan: {selectedPlan.name}</p>
                <p>Price: {peso(selectedPlan.price)}</p>
                <p>Duration: {selectedPlan.durationDays} days</p>
                <p>Ends on: {rentalEndsAt ? shortDate(rentalEndsAt) : "Pending"}</p>
              </div>
            ) : null}
            <div className="h-32 w-32 rounded-lg border border-border-subtle bg-surface-bg-3" />
          </CardBody>
        </Card>
      ) : null}

      <div className="flex gap-3">
        <Button
          className="bg-surface-bg-3 text-text-1 hover:bg-surface-bg-1"
          isDisabled={step === 0}
          onPress={() => setStep((prev) => Math.max(prev - 1, 0))}
        >
          Back
        </Button>
        <Button className="focus-ring btn-cta" isDisabled={step === 3} onPress={goToNext}>
          {step === 0 ? "Continue to plan" : step === 1 ? "Continue to slot" : "Generate code"}
        </Button>
      </div>
    </div>
  );
}
