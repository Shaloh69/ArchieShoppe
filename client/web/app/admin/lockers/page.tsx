"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";

import { StatusChip } from "@/components/unithrift/status-chip";
import { shortDateTime } from "@/lib/unithrift-format";
import { lockers } from "@/lib/unithrift-mocks";
import { notifyInfo, notifySuccess } from "@/lib/unithrift-toast";

export default function AdminLockersPage() {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const selected = useMemo(
    () => lockers.find((slot) => slot.slotId === selectedSlotId) || null,
    [selectedSlotId],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Lockers</h1>
        <p className="text-sm text-text-2">Monitor slot states, command history, and emergency controls.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {lockers.map((slot) => (
          <Card
            key={slot.slotId}
            isPressable
            className="border border-border-subtle bg-surface-bg-2 text-left hover:border-brand-primary-400"
            onPress={() => setSelectedSlotId(slot.slotId)}
          >
            <CardBody className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-1">{slot.slotId}</h3>
                <StatusChip kind="locker" value={slot.status} />
              </div>
              <p className="text-sm text-text-2">{slot.currentItem ?? "No current item"}</p>
              <p className="text-xs text-text-3">{shortDateTime(slot.lastEvent)}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Drawer
        isOpen={Boolean(selected)}
        placement="right"
        onOpenChange={(open) => {
          if (!open) setSelectedSlotId(null);
        }}
      >
        <DrawerContent className="border-l border-border-subtle bg-surface-bg-2">
          <DrawerHeader className="text-text-1">Locker slot details</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Slot: {selected.slotId}</p>
                  <p>Current item: {selected.currentItem ?? "None"}</p>
                  <p>Sensor summary: {selected.sensorSummary}</p>
                  <p>Last event: {shortDateTime(selected.lastEvent)}</p>
                </div>
                <div className="grid gap-2">
                  <Button
                    className="bg-brand-cyan-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifySuccess({
                        title: "Unlock command sent",
                        description: `Emergency unlock for ${selected.slotId} queued.`,
                      })
                    }
                  >
                    Unlock (Emergency)
                  </Button>
                  <Button
                    className="bg-brand-primary-600 text-white hover:bg-brand-primary-500"
                    onPress={() =>
                      notifyInfo({
                        title: "Lock command sent",
                        description: `${selected.slotId} lock command queued.`,
                      })
                    }
                  >
                    Lock
                  </Button>
                  <Button
                    className="bg-status-danger-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifyInfo({
                        title: "Marked out-of-service",
                        description: `${selected.slotId} hidden from assignment pool.`,
                      })
                    }
                  >
                    Out-of-service
                  </Button>
                  <Button
                    className="bg-status-success-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifySuccess({
                        title: "Returned to service",
                        description: `${selected.slotId} is available for operations.`,
                      })
                    }
                  >
                    In-service
                  </Button>
                  <Button
                    className="bg-brand-indigo-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifySuccess({
                        title: "Reconcile completed",
                        description: `Target state updated for ${selected.slotId}.`,
                      })
                    }
                  >
                    Reconcile
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
