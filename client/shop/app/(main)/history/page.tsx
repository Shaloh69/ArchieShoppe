"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Tab, Tabs } from "@heroui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";

import { StatusChip } from "@/components/unithrift/status-chip";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { EmptyBlock } from "@/components/unithrift/state-block";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { ordersApi, type ApiOrder } from "@/lib/api-client";

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
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const query = useDebouncedValue(search, 350).toLowerCase();

  const fetchOrders = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      const res =
        tab === "sales"
          ? await ordersApi.mySales()
          : await ordersApi.myPurchases();
      setOrders(res.orders);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [fetchOrders, activeTab]);

  const visibleOrders = useMemo(() => {
    return orders
      .filter((entry) =>
        statusFilter === "all" ? true : entry.status === statusFilter,
      )
      .filter((entry) =>
        (entry.item?.title ?? entry.itemId).toLowerCase().includes(query),
      );
  }, [orders, query, statusFilter]);

  const selectedOrder = useMemo(
    () => visibleOrders.find((entry) => entry.id === selectedOrderId) ?? null,
    [selectedOrderId, visibleOrders],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">History</h1>
        <p className="text-sm text-text-2">
          Track purchases, sales, and order event timelines.
        </p>
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
          classNames={{
            inputWrapper: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Search item"
          labelPlacement="outside"
          placeholder="Search by item..."
          value={search}
          onValueChange={setSearch}
        />
        <Select
          classNames={{
            trigger: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Status"
          labelPlacement="outside"
          selectedKeys={[statusFilter]}
          onSelectionChange={(keys) =>
            setStatusFilter(Array.from(keys)[0]?.toString() || "all")
          }
        >
          {orderStatuses.map((status) => (
            <SelectItem key={status}>
              {status === "all" ? "All statuses" : status}
            </SelectItem>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : visibleOrders.length === 0 ? (
        <EmptyBlock
          description="No records match your current filters."
          title="No history found"
        />
      ) : (
        <ResponsiveTable>
          <Table
            aria-label="Order history table"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[780px]",
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
                  <TableCell>{shortDateTime(entry.createdAt)}</TableCell>
                  <TableCell className="text-text-1">
                    {entry.item?.title ?? entry.itemId}
                  </TableCell>
                  <TableCell>{peso(Number(entry.amount))}</TableCell>
                  <TableCell>
                    <StatusChip kind="order" value={entry.status} />
                  </TableCell>
                  <TableCell>{entry.slotId ?? "N/A"}</TableCell>
                  <TableCell>
                    <Button
                      className="btn-brand"
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
        </ResponsiveTable>
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
                  <p>
                    Item: {selectedOrder.item?.title ?? selectedOrder.itemId}
                  </p>
                  <p>Amount: {peso(Number(selectedOrder.amount))}</p>
                  <p>
                    Buyer:{" "}
                    {selectedOrder.buyer?.fullName ?? selectedOrder.buyerId}
                  </p>
                  <p>
                    Seller:{" "}
                    {selectedOrder.seller?.fullName ?? selectedOrder.sellerId}
                  </p>
                  {selectedOrder.personalCode ? (
                    <p>Code: {selectedOrder.personalCode}</p>
                  ) : null}
                  <p className="mt-2 text-xs">
                    Refund policy: ≤12h full, ≤24h 75%, &gt;24h no refund.
                  </p>
                </div>
                {selectedOrder.events && selectedOrder.events.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-text-1">
                      Timeline
                    </h4>
                    {selectedOrder.events.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3"
                      >
                        <p className="text-sm font-medium text-text-1">
                          {event.event}
                        </p>
                        <p className="text-xs text-text-3">
                          {shortDateTime(event.createdAt)}
                        </p>
                        <p className="mt-1 text-sm text-text-2">
                          {event.actor}
                        </p>
                      </div>
                    ))}
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
