"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import { StatusChip } from "@/components/unithrift/status-chip";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ordersApi, type ApiOrder } from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { notifyInfo, notifySuccess } from "@/lib/unithrift-toast";

const statuses = [
  "all",
  "HELD",
  "COMPLETED",
  "REFUND_REQUESTED",
  "REFUNDED",
  "PARTIAL_REFUND",
  "CANCELLED",
];

export default function AdminTransactionsPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 350).toLowerCase();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.adminAll();
      setOrders(res.orders);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => (status === "all" ? true : o.status === status))
        .filter(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            (o.item?.title ?? "").toLowerCase().includes(q) ||
            (o.buyer?.fullName ?? "").toLowerCase().includes(q) ||
            (o.seller?.fullName ?? "").toLowerCase().includes(q),
        ),
    [orders, q, status],
  );

  const selected = filtered.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Transactions</h1>
        <p className="text-sm text-text-2">
          Filter and inspect order lifecycle and wallet movements.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          classNames={{
            inputWrapper: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Search"
          labelPlacement="outside"
          placeholder="Order ID, buyer, seller, item..."
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
      ) : (
        <ResponsiveTable>
          <Table
            aria-label="Admin transactions"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[1080px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-brand-primary-50",
              td: "text-text-2",
            }}
          >
            <TableHeader>
              <TableColumn>ORDER ID</TableColumn>
              <TableColumn>DATE</TableColumn>
              <TableColumn>BUYER</TableColumn>
              <TableColumn>SELLER</TableColumn>
              <TableColumn>ITEM</TableColumn>
              <TableColumn>AMOUNT</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>SLOT</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody
              items={filtered}
              emptyContent="No transactions match these filters."
            >
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id.slice(0, 10)}…</TableCell>
                  <TableCell>{shortDateTime(entry.createdAt)}</TableCell>
                  <TableCell>
                    {entry.buyer?.fullName ?? entry.buyerId}
                  </TableCell>
                  <TableCell>
                    {entry.seller?.fullName ?? entry.sellerId}
                  </TableCell>
                  <TableCell>{entry.item?.title ?? entry.itemId}</TableCell>
                  <TableCell>{peso(Number(entry.amount))}</TableCell>
                  <TableCell>
                    <StatusChip kind="order" value={entry.status} />
                  </TableCell>
                  <TableCell>{entry.slotId ?? "N/A"}</TableCell>
                  <TableCell>
                    <Button
                      className="btn-brand"
                      size="sm"
                      onPress={() => setSelectedId(entry.id)}
                    >
                      View
                    </Button>
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
          <DrawerHeader className="text-text-1">
            Transaction detail
          </DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Order: {selected.id}</p>
                  <p>Amount: {peso(Number(selected.amount))}</p>
                  <p>Status: {selected.status}</p>
                  <p>Slot: {selected.slotId ?? "N/A"}</p>
                  <p>
                    Hold ends:{" "}
                    {selected.holdEndsAt
                      ? shortDateTime(selected.holdEndsAt)
                      : "N/A"}
                  </p>
                </div>
                {selected.events && selected.events.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-text-1">
                      Timeline
                    </h4>
                    {selected.events.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3"
                      >
                        <p className="text-sm text-text-1">{event.event}</p>
                        <p className="text-xs text-text-3">
                          {shortDateTime(event.createdAt)}
                        </p>
                        <p className="text-sm text-text-2">{event.actor}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Button
                    className="bg-status-warning-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifyInfo({
                        title: "Order frozen",
                        description: "Transaction has been frozen for review.",
                      })
                    }
                  >
                    Freeze
                  </Button>
                  <Button
                    className="btn-cta"
                    onPress={() =>
                      notifyInfo({
                        title: "Order unfrozen",
                        description: "Transaction re-enabled for normal flow.",
                      })
                    }
                  >
                    Unfreeze
                  </Button>
                  <Button
                    className="bg-status-danger-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifySuccess({
                        title: "Force-complete applied",
                        description:
                          "Administrative completion has been recorded.",
                      })
                    }
                  >
                    Force-complete
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

