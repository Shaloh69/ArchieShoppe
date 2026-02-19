"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Tab, Tabs } from "@heroui/tabs";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";

import { StatusChip } from "@/components/unithrift/status-chip";
import { EmptyBlock } from "@/components/unithrift/state-block";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { orders } from "@/lib/unithrift-mocks";

const orderStatuses = [
  "all",
  "HELD",
  "COMPLETED",
  "REFUND_REQUESTED",
  "REFUNDED",
  "PARTIAL_REFUND",
  "CANCELLED",
] as const;

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("purchases");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const query = useDebouncedValue(search, 350).toLowerCase();

  const visibleOrders = useMemo(() => {
    const role = activeTab === "sales" ? "seller" : "buyer";

    return orders
      .filter((entry) => entry.role === role)
      .filter((entry) => (statusFilter === "all" ? true : entry.status === statusFilter))
      .filter((entry) => entry.itemTitle.toLowerCase().includes(query));
  }, [activeTab, query, statusFilter]);

  const selectedOrder = useMemo(
    () => visibleOrders.find((entry) => entry.id === selectedOrderId) || null,
    [selectedOrderId, visibleOrders],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">History</h1>
        <p className="text-sm text-text-2">Track purchases, sales, and order event timelines.</p>
      </div>

      <Tabs
        classNames={{
          tabList: "bg-surface-bg-2 border border-border-subtle",
          cursor: "bg-brand-primary-600",
          tab: "data-[selected=true]:text-white",
        }}
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
      >
        <Tab key="purchases" title="Purchases" />
        <Tab key="sales" title="Sales" />
      </Tabs>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          label="Search item"
          labelPlacement="outside"
          placeholder="Search by item..."
          value={search}
          onValueChange={setSearch}
        />
        <Select
          classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
          label="Status"
          labelPlacement="outside"
          selectedKeys={[statusFilter]}
          onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0]?.toString() || "all")}
        >
          {orderStatuses.map((status) => (
            <SelectItem key={status}>{status === "all" ? "All statuses" : status}</SelectItem>
          ))}
        </Select>
      </div>

      {visibleOrders.length === 0 ? (
        <EmptyBlock
          description="No records match your current filters."
          title="No history found"
        />
      ) : (
        <Table
          aria-label="Order history table"
          classNames={{
            base: "border border-border-subtle rounded-xl bg-surface-bg-2",
            th: "bg-surface-bg-3 text-text-2",
            tr: "border-b border-border-subtle hover:bg-[#11203A]",
            td: "text-text-2",
          }}
        >
          <TableHeader>
            <TableColumn>DATE</TableColumn>
            <TableColumn>ITEM</TableColumn>
            <TableColumn>AMOUNT</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>SLOT</TableColumn>
            <TableColumn>ACTION</TableColumn>
          </TableHeader>
          <TableBody items={visibleOrders}>
            {(entry) => (
              <TableRow key={entry.id}>
                <TableCell>{shortDateTime(entry.date)}</TableCell>
                <TableCell className="text-text-1">{entry.itemTitle}</TableCell>
                <TableCell>{peso(entry.amount)}</TableCell>
                <TableCell>
                  <StatusChip kind="order" value={entry.status} />
                </TableCell>
                <TableCell>{entry.slotId ?? "N/A"}</TableCell>
                <TableCell>
                  <Button
                    className="bg-brand-primary-700 text-text-1 hover:bg-brand-primary-600"
                    size="sm"
                    onPress={() => setSelectedOrderId(entry.id)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Drawer
        isOpen={Boolean(selectedOrder)}
        placement="right"
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      >
        <DrawerContent className="border-l border-border-subtle bg-surface-bg-2">
          <DrawerHeader className="text-text-1">Order details</DrawerHeader>
          <DrawerBody>
            {selectedOrder ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Order: {selectedOrder.id}</p>
                  <p>Item: {selectedOrder.itemTitle}</p>
                  <p>Amount: {peso(selectedOrder.amount)}</p>
                  <p>Buyer: {selectedOrder.buyer}</p>
                  <p>Seller: {selectedOrder.seller}</p>
                  <p className="mt-2 text-xs">
                    Refund policy reminder: ≤12h full, ≤24h 80%, &gt;24h no refund.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-text-1">Timeline</h4>
                  {selectedOrder.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3"
                    >
                      <p className="text-sm font-medium text-text-1">{event.event}</p>
                      <p className="text-xs text-text-3">{shortDateTime(event.timestamp)}</p>
                      <p className="mt-1 text-sm text-text-2">{event.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
