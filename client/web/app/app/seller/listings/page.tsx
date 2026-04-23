"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import { EmptyBlock } from "@/components/unithrift/state-block";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { StatusChip } from "@/components/unithrift/status-chip";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { peso, shortDate, shortDateTime } from "@/lib/unithrift-format";
import { itemsApi, type ApiItem } from "@/lib/api-client";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const statuses = ["all", "DRAFT", "ACTIVE", "SOLD", "REMOVED", "PENDING"];

export default function SellerListingsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 300).toLowerCase();

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await itemsApi.myListings();
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const filtered = useMemo(
    () =>
      items
        .filter((item) => (status === "all" ? true : item.status === status))
        .filter((item) => item.title.toLowerCase().includes(q)),
    [items, q, status],
  );

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const handleUnlist = async (item: ApiItem) => {
    try {
      await itemsApi.remove(item.id);
      notifySuccess({
        title: "Listing removed",
        description: `${item.title} has been unlisted.`,
      });
      fetchListings();
    } catch (e) {
      notifyError({
        title: "Unlist failed",
        description: (e as Error).message,
      });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">My Listings</h1>
        <p className="text-sm text-text-2">
          Manage statuses, slot assignment, and listing actions.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          classNames={{
            inputWrapper: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Search item"
          labelPlacement="outside"
          placeholder="Search listing..."
          value={query}
          onValueChange={setQuery}
        />
        <Select
          classNames={{
            trigger: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Status"
          labelPlacement="outside"
          selectedKeys={[status]}
          onSelectionChange={(keys) =>
            setStatus(Array.from(keys)[0]?.toString() || "all")
          }
        >
          {statuses.map((entry) => (
            <SelectItem key={entry}>
              {entry === "all" ? "All statuses" : entry}
            </SelectItem>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyBlock
          description="No listings match current filters."
          title="No listing records"
        />
      ) : (
        <ResponsiveTable>
          <Table
            aria-label="My listings table"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[860px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-brand-primary-50",
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
                  <TableCell>{peso(Number(item.price))}</TableCell>
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
                        onPress={() => setSelectedId(item.id)}
                      >
                        View
                      </Button>
                      {item.status !== "SOLD" && item.status !== "REMOVED" ? (
                        <Button
                          className="bg-status-danger-600 text-white hover:brightness-110"
                          size="sm"
                          onPress={() => handleUnlist(item)}
                        >
                          Unlist
                        </Button>
                      ) : null}
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
                  <p>Price: {peso(Number(selected.price))}</p>
                  <p>Category: {selected.category}</p>
                  <p>Condition: {selected.condition}</p>
                  <p>Slot: {selected.slotId ?? "Unassigned"}</p>
                  <p>
                    Plan:{" "}
                    {selected.subscriptionPlan?.name ??
                      "No active subscription"}
                  </p>
                  <p>
                    Plan end:{" "}
                    {selected.subscriptionEndsAt
                      ? shortDate(selected.subscriptionEndsAt)
                      : "N/A"}
                  </p>
                </div>
                {selected.slot ? (
                  <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3">
                    <h4 className="mb-2 text-sm font-semibold text-text-1">
                      Locker status
                    </h4>
                    <StatusChip kind="locker" value={selected.slot.status} />
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

