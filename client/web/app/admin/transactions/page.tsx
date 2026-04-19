"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";

import { StatusChip } from "@/components/unithrift/status-chip";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { orders } from "@/lib/unithrift-mocks";
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 350).toLowerCase();

  const filtered = useMemo(
    () =>
      orders.filter((order) => (status === "all" ? true : order.status === status)).filter((order) => {
        return (
          order.id.toLowerCase().includes(q) ||
          order.itemTitle.toLowerCase().includes(q) ||
          order.buyer.toLowerCase().includes(q) ||
          order.seller.toLowerCase().includes(q)
        );
      }),
    [q, status],
  );

  const selected = filtered.find((entry) => entry.id === selectedId) || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Transactions</h1>
        <p className="text-sm text-text-2">Filter and inspect order lifecycle and wallet movements.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          label="Search"
          labelPlacement="outside"
          placeholder="Order ID, buyer, seller, item..."
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

      <ResponsiveTable>
        <Table
          aria-label="Admin transactions"
          classNames={{
            base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[1080px]",
            th: "bg-surface-bg-3 text-text-2",
            tr: "border-b border-border-subtle hover:bg-[#11203A]",
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
          <TableBody items={filtered} emptyContent="No transactions match these filters.">
            {(entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.id}</TableCell>
                <TableCell>{shortDateTime(entry.date)}</TableCell>
                <TableCell>{entry.buyer}</TableCell>
                <TableCell>{entry.seller}</TableCell>
                <TableCell>{entry.itemTitle}</TableCell>
                <TableCell>{peso(entry.amount)}</TableCell>
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

      <Drawer
        isOpen={Boolean(selected)}
        placement="right"
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DrawerContent className="border-l border-border-subtle bg-surface-bg-2">
          <DrawerHeader className="text-text-1">Transaction detail</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Order: {selected.id}</p>
                  <p>Amount: {peso(selected.amount)}</p>
                  <p>Status: {selected.status}</p>
                  <p>Hold ends: {selected.holdEndsAt ? shortDateTime(selected.holdEndsAt) : "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-text-1">Timeline</h4>
                  {selected.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3"
                    >
                      <p className="text-sm text-text-1">{event.event}</p>
                      <p className="text-xs text-text-3">{shortDateTime(event.timestamp)}</p>
                      <p className="text-sm text-text-2">{event.details}</p>
                    </div>
                  ))}
                </div>
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
                        description: "Administrative completion has been recorded.",
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

