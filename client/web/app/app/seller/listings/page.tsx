"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";

import { EmptyBlock } from "@/components/unithrift/state-block";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { StatusChip } from "@/components/unithrift/status-chip";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { peso, shortDate, shortDateTime } from "@/lib/unithrift-format";
import { lockers, lockerSubscriptionPlans, myListings } from "@/lib/unithrift-mocks";
import { notifyInfo, notifySuccess } from "@/lib/unithrift-toast";

const statuses = ["all", "DRAFT", "ACTIVE", "SOLD", "REMOVED", "PENDING"];

export default function SellerListingsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 300).toLowerCase();

  const filtered = useMemo(
    () =>
      myListings
        .filter((item) => (status === "all" ? true : item.status === status))
        .filter((item) => item.title.toLowerCase().includes(q)),
    [q, status],
  );

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const selectedLocker = useMemo(
    () => lockers.find((entry) => entry.slotId === selected?.slotId) ?? null,
    [selected?.slotId],
  );
  const selectedPlan = useMemo(
    () =>
      lockerSubscriptionPlans.find((entry) => entry.id === selected?.lockerSubscriptionPlanId) ?? null,
    [selected?.lockerSubscriptionPlanId],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">My Listings</h1>
        <p className="text-sm text-text-2">Manage statuses, slot assignment, and listing actions.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          label="Search item"
          labelPlacement="outside"
          placeholder="Search listing..."
          value={query}
          onValueChange={setQuery}
        />
        <Select
          classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
          label="Status"
          labelPlacement="outside"
          selectedKeys={[status]}
          onSelectionChange={(keys) => setStatus(Array.from(keys)[0]?.toString() || "all")}
        >
          {statuses.map((entry) => (
            <SelectItem key={entry}>{entry === "all" ? "All statuses" : entry}</SelectItem>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock description="No listings match current filters." title="No listing records" />
      ) : (
        <ResponsiveTable>
          <Table
            aria-label="My listings table"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[860px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-[#11203A]",
              td: "text-text-2",
            }}
          >
            <TableHeader>
              <TableColumn>ITEM</TableColumn>
              <TableColumn>PRICE</TableColumn>
              <TableColumn>SLOT</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>UPDATED</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody items={filtered}>
              {(item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-text-1">{item.title}</TableCell>
                  <TableCell>{peso(item.price)}</TableCell>
                  <TableCell>{item.slotId ?? "N/A"}</TableCell>
                  <TableCell>
                    <StatusChip kind="item" value={item.status} />
                  </TableCell>
                  <TableCell>{shortDateTime(item.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        className="btn-brand"
                        size="sm"
                        onPress={() => {
                          setSelectedId(item.id);
                          notifyInfo({
                            title: "Editing mode",
                            description: "Listing detail drawer opened.",
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        className="bg-status-danger-600 text-white hover:brightness-110"
                        size="sm"
                        onPress={() =>
                          notifySuccess({
                            title: "Listing unlisted",
                            description: `${item.title} set to removed state.`,
                          })
                        }
                      >
                        Unlist
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
      )}

      <Drawer
        isOpen={Boolean(selected)}
        placement="right"
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DrawerContent className="border-l border-border-subtle bg-surface-bg-2">
          <DrawerHeader className="text-text-1">Listing details</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p className="text-text-1">{selected.title}</p>
                  <p>Price: {peso(selected.price)}</p>
                  <p>Category: {selected.category}</p>
                  <p>Condition: {selected.condition}</p>
                  <p>Slot: {selected.slotId ?? "Unassigned"}</p>
                  <p>Plan: {selectedPlan?.name ?? "No active subscription"}</p>
                  <p>Plan end: {selected?.lockerSubscriptionEndsAt ? shortDate(selected.lockerSubscriptionEndsAt) : "N/A"}</p>
                </div>
                {selectedLocker ? (
                  <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3">
                    <h4 className="mb-2 text-sm font-semibold text-text-1">Locker status</h4>
                    <StatusChip kind="locker" value={selectedLocker.status} />
                    <p className="mt-3 text-sm text-text-2">{selectedLocker.sensorSummary}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

