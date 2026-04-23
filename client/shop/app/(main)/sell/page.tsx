"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";

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

const steps = [
  "Item details",
  "Subscription plan",
  "Review & confirm",
  "Seller code",
];

export default function SellPage() {
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
          description:
            "Complete title, description, and valid price before continuing.",
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
      if (!selectedPlan) {
        setStep(1);
        return;
      }
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
        notifyError({
          title: "Listing failed",
          description: (e as Error).message,
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Sell an item</h1>
        <p className="text-sm text-text-2">
          Create listing, choose a paid locker subscription, and generate your
          seller code.
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
                <p className="text-xs uppercase tracking-wide">
                  Step {index + 1}
                </p>
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
              classNames={{
                inputWrapper: "bg-surface-bg-3 border border-border-subtle",
              }}
              label="Title"
              labelPlacement="outside"
              placeholder="Item title"
              value={title}
              onValueChange={setTitle}
            />
            <Input
              classNames={{
                inputWrapper: "bg-surface-bg-3 border border-border-subtle",
              }}
              label="Price (₱)"
              labelPlacement="outside"
              min={1}
              placeholder="400"
              type="number"
              value={price}
              onValueChange={setPrice}
            />
            <Select
              classNames={{
                trigger: "bg-surface-bg-3 border border-border-subtle",
              }}
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
              classNames={{
                trigger: "bg-surface-bg-3 border border-border-subtle",
              }}
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
                classNames={{
                  inputWrapper: "bg-surface-bg-3 border border-border-subtle",
                }}
                label="Description"
                labelPlacement="outside"
                minRows={4}
                placeholder="Add item details..."
                value={description}
                onValueChange={setDescription}
              />
            </div>
            <div className="md:col-span-2">
              <p className="mb-1 text-sm text-text-2">Photo (optional)</p>
              <input
                accept="image/*"
                className="text-sm text-text-2"
                type="file"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </CardBody>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="space-y-4 p-6">
            {loadingPlans ? (
              <div className="flex justify-center py-10">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <p className="text-sm text-text-2">
                  Select a subscription plan. Minimum term is 1 week.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {plans.map((plan) => (
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
                          <Chip className="bg-brand-peach-100 text-text-inverse">
                            Best value
                          </Chip>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm">
                        {plan.durationDays} days access
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {peso(Number(plan.price))}
                      </p>
                    </button>
                  ))}
                </div>
                <Chip className="w-fit bg-status-warning-100 text-text-inverse">
                  A paid subscription is required before slot assignment.
                </Chip>
              </>
            )}
          </CardBody>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="space-y-4 p-6">
            <p className="text-sm font-semibold text-text-1">
              Review your listing
            </p>
            <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-4 text-sm text-text-2">
              <p>
                <span className="text-text-1">Title:</span> {title}
              </p>
              <p>
                <span className="text-text-1">Price:</span>{" "}
                {peso(Number(price))}
              </p>
              <p>
                <span className="text-text-1">Category:</span> {category}
              </p>
              <p>
                <span className="text-text-1">Condition:</span> {condition}
              </p>
            </div>
            {selectedPlan ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                <span className="font-semibold text-text-1">Plan:</span>
                <Chip className="bg-brand-primary-100 text-text-inverse">
                  {selectedPlan.name}
                </Chip>
                <span>{peso(Number(selectedPlan.price))}</span>
                <span>({selectedPlan.durationDays} days)</span>
              </div>
            ) : null}
            <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
              <p className="font-semibold text-text-1">
                Available slots: {availableSlots.length}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableSlots.slice(0, 6).map((s) => (
                  <div
                    key={s.slotId}
                    className="flex items-center gap-1 rounded border border-border-subtle px-2 py-1"
                  >
                    <span>{s.slotId}</span>
                    <StatusChip kind="locker" value="EMPTY" />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-text-3">
                The server will assign the first available slot automatically.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {step === 3 && createdItem ? (
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="items-center gap-4 p-8 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-primary-700">
              Assigned Slot
            </p>
            <p className="rounded-xl border border-brand-primary-400 bg-brand-primary-900 px-8 py-5 text-5xl font-semibold tracking-[0.2em] text-white">
              {createdItem.slotId ?? "—"}
            </p>
            <p className="text-sm text-text-2">
              Your listing is in{" "}
              <span className="font-semibold text-text-1">DRAFT</span>. Go to
              the kiosk, open slot {createdItem.slotId ?? "N/A"}, and place your
              item.
            </p>
            <p className="text-xs text-text-3">
              After placing your item, activate the listing from My Listings.
            </p>
            {selectedPlan ? (
              <div className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-bg-3 p-4 text-left text-sm text-text-2">
                <p className="font-semibold text-text-1">Rental summary</p>
                <p>Plan: {selectedPlan.name}</p>
                <p>Price: {peso(Number(selectedPlan.price))}</p>
                <p>Duration: {selectedPlan.durationDays} days</p>
                <p>
                  Ends on:{" "}
                  {createdItem.subscriptionEndsAt
                    ? shortDate(createdItem.subscriptionEndsAt)
                    : "Pending"}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <div className="flex gap-3">
        <Button
          className="bg-surface-bg-3 text-text-1 hover:bg-surface-bg-1"
          isDisabled={step === 0 || step === 3}
          onPress={() => setStep((prev) => Math.max(prev - 1, 0))}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button
            className="focus-ring btn-cta"
            isLoading={submitting}
            onPress={goToNext}
          >
            {step === 0
              ? "Continue to plan"
              : step === 1
                ? "Continue to review"
                : "Create listing"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
