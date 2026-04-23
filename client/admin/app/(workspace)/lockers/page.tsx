"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import { Spinner } from "@heroui/spinner";

import { StatusChip } from "@/components/unithrift/status-chip";
import { useAdminWs } from "@/hooks/use-ws";
import { lockersApi, type ApiLockerSlot } from "@/lib/api-client";
import { shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function AdminLockersPage() {
  const [slots, setSlots] = useState<ApiLockerSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lockersApi.all();
      setSlots(res.slots);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useAdminWs(
    useCallback(
      (msg) => {
        if (msg.type === "LOCKER_UPDATE") fetchSlots();
      },
      [fetchSlots],
    ),
  );

  const selected = useMemo(
    () => slots.find((s) => s.slotId === selectedSlotId) ?? null,
    [slots, selectedSlotId],
  );

  const updateStatus = async (
    slotId: string,
    status: string,
    label: string,
  ) => {
    setActioning(true);
    try {
      await lockersApi.updateStatus(slotId, status);
      notifySuccess({
        title: `${label} applied`,
        description: `Slot ${slotId} updated to ${status}.`,
      });
      fetchSlots();
    } catch (e) {
      notifyError({
        title: "Action failed",
        description: (e as Error).message,
      });
    } finally {
      setActioning(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Lockers</h1>
        <p className="text-sm text-text-2">
          Monitor slot states, command history, and emergency controls.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {slots.map((slot) => (
            <Card
              key={slot.slotId}
              isPressable
              className="border border-border-subtle bg-surface-bg-2 text-left hover:border-brand-primary-400"
              onPress={() => setSelectedSlotId(slot.slotId)}
            >
              <CardBody className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-1">
                    {slot.slotId}
                  </h3>
                  <StatusChip kind="locker" value={slot.status} />
                </div>
                <p className="text-sm text-text-2">
                  {slot.currentItem?.title ?? "No current item"}
                </p>
                <p className="text-xs text-text-3">
                  {slot.lastEvent ? shortDateTime(slot.lastEvent) : "—"}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        isOpen={Boolean(selected)}
        placement="right"
        onOpenChange={(open) => {
          if (!open) setSelectedSlotId(null);
        }}
      >
        <DrawerContent className="border-l border-border-subtle bg-surface-bg-2">
          <DrawerHeader className="text-text-1">
            Locker slot details
          </DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Slot: {selected.slotId}</p>
                  <p>Status: {selected.status}</p>
                  <p>Current item: {selected.currentItem?.title ?? "None"}</p>
                  <p>
                    Last event:{" "}
                    {selected.lastEvent
                      ? shortDateTime(selected.lastEvent)
                      : "—"}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Button
                    className="btn-cta"
                    isLoading={actioning}
                    onPress={() =>
                      updateStatus(
                        selected.slotId,
                        "EMPTY",
                        "Unlock (Emergency)",
                      )
                    }
                  >
                    Unlock (Emergency)
                  </Button>
                  <Button
                    className="btn-cta"
                    isLoading={actioning}
                    onPress={() =>
                      updateStatus(selected.slotId, "LOCKED", "Lock")
                    }
                  >
                    Lock
                  </Button>
                  <Button
                    className="bg-status-danger-600 text-white hover:brightness-110"
                    isLoading={actioning}
                    onPress={() =>
                      updateStatus(
                        selected.slotId,
                        "OUT_OF_SERVICE",
                        "Out-of-service",
                      )
                    }
                  >
                    Out-of-service
                  </Button>
                  <Button
                    className="bg-status-success-600 text-white hover:brightness-110"
                    isLoading={actioning}
                    onPress={() =>
                      updateStatus(selected.slotId, "EMPTY", "In-service")
                    }
                  >
                    In-service
                  </Button>
                </div>
              </div>
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
