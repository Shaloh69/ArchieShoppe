"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
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
import { Tooltip } from "@heroui/tooltip";

import { StatusChip } from "@/components/unithrift/status-chip";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ordersApi, type ApiOrder } from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const statuses = [
  "all",
  "HELD",
  "COMPLETED",
  "REFUND_REQUESTED",
  "REFUNDED",
  "PARTIAL_REFUND",
  "CANCELLED",
];

const TIMELINE_STEPS = ["HELD", "COMPLETED"];

function OrderTimeline({ status, events }: { status: string; events?: ApiOrder["events"] }) {
  const reached = (step: string) => {
    if (step === "HELD") return true;
    if (step === "COMPLETED") return status === "COMPLETED" || status === "REFUNDED" || status === "PARTIAL_REFUND";
    return false;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-0">
        {TIMELINE_STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${reached(step) ? "bg-brand-primary-600 text-white" : "bg-surface-bg-3 text-text-3 border border-border-subtle"}`}>
              {i + 1}
            </div>
            <span className={`ml-1.5 text-xs font-medium ${reached(step) ? "text-text-1" : "text-text-3"}`}>{step}</span>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`mx-2 h-0.5 w-8 rounded ${reached(TIMELINE_STEPS[i + 1]) ? "bg-brand-primary-600" : "bg-border-subtle"}`} />
            )}
          </div>
        ))}
      </div>
      {events && events.length > 0 && (
        <div className="space-y-1.5 border-l-2 border-border-subtle pl-3">
          {events.map((ev) => (
            <div key={ev.id} className="relative">
              <div className="absolute -left-4 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary-500" />
              <p className="text-xs font-medium text-text-1">{ev.event}</p>
              <p className="text-[10px] text-text-3">{shortDateTime(ev.createdAt)} · {ev.actor}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminTransactionsPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
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

  const selected = orders.find((e) => e.id === selectedId) ?? null;

  const handleForceComplete = async () => {
    if (!selected) return;
    setCompleting(true);
    try {
      const res = await ordersApi.complete(selected.id);
      setOrders((prev) => prev.map((o) => (o.id === selected.id ? { ...o, ...res.order } : o)));
      notifySuccess({ title: "Order completed", description: `Order ${selected.id.slice(0, 10)}… force-completed.` });
      setConfirmOpen(false);
      setSelectedId(null);
    } catch (err) {
      notifyError({ title: "Failed", description: (err as Error).message });
    } finally {
      setCompleting(false);
    }
  };

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

      {loading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
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
            <TableBody items={filtered} emptyContent="No transactions match these filters.">
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Tooltip content={entry.id}>
                      <span className="cursor-default">{entry.id.slice(0, 10)}…</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{shortDateTime(entry.createdAt)}</TableCell>
                  <TableCell>{entry.buyer?.fullName ?? entry.buyerId.slice(0, 8)}</TableCell>
                  <TableCell>{entry.seller?.fullName ?? entry.sellerId.slice(0, 8)}</TableCell>
                  <TableCell>{entry.item?.title ?? entry.itemId.slice(0, 12)}</TableCell>
                  <TableCell>{peso(Number(entry.amount))}</TableCell>
                  <TableCell><StatusChip kind="order" value={entry.status} /></TableCell>
                  <TableCell>{entry.slotId ?? "N/A"}</TableCell>
                  <TableCell>
                    <Button className="btn-brand" size="sm" onPress={() => setSelectedId(entry.id)}>View</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
      )}

      {/* Order detail drawer */}
      <Drawer
        isOpen={Boolean(selected)}
        placement="right"
        size="sm"
        onOpenChange={(open) => { if (!open) setSelectedId(null); }}
      >
        <DrawerContent className="border-l border-border-subtle bg-surface-bg-2">
          <DrawerHeader className="border-b border-border-subtle pb-3 text-text-1">
            <p className="text-base font-semibold">Order Detail</p>
            {selected && <p className="text-[11px] text-text-3 font-normal">{selected.id}</p>}
          </DrawerHeader>
          <DrawerBody className="gap-4">
            {selected ? (
              <div className="space-y-4 text-sm">
                {/* Parties */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3">
                    <p className="mb-1.5 text-[10px] uppercase tracking-wide text-text-3">Buyer</p>
                    <div className="flex items-center gap-2">
                      <Avatar name={selected.buyer?.fullName ?? "B"} size="sm" classNames={{ base: "bg-brand-primary-200 text-brand-primary-800 shrink-0", name: "text-[10px] font-bold" }} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-text-1">{selected.buyer?.fullName ?? "—"}</p>
                        <p className="truncate text-[10px] text-text-3">{selected.buyer?.email ?? selected.buyerId.slice(0, 12)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3">
                    <p className="mb-1.5 text-[10px] uppercase tracking-wide text-text-3">Seller</p>
                    <div className="flex items-center gap-2">
                      <Avatar name={selected.seller?.fullName ?? "S"} size="sm" classNames={{ base: "bg-brand-cyan-200 text-brand-cyan-800 shrink-0", name: "text-[10px] font-bold" }} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-text-1">{selected.seller?.fullName ?? "—"}</p>
                        <p className="truncate text-[10px] text-text-3">{selected.seller?.email ?? selected.sellerId.slice(0, 12)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item + meta */}
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-text-3">Item</p>
                  <p className="font-semibold text-text-1">{selected.item?.title ?? selected.itemId}</p>
                  <Divider className="my-1" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-2">
                    <span className="text-text-3">Amount</span><span className="font-medium text-text-1">{peso(Number(selected.amount))}</span>
                    <span className="text-text-3">Status</span><span><StatusChip kind="order" value={selected.status} /></span>
                    <span className="text-text-3">Slot</span><span>{selected.slotId ?? "N/A"}</span>
                    <span className="text-text-3">Hold ends</span><span>{selected.holdEndsAt ? shortDateTime(selected.holdEndsAt) : "N/A"}</span>
                    <span className="text-text-3">Created</span><span>{shortDateTime(selected.createdAt)}</span>
                    {selected.personalCode && <><span className="text-text-3">Code</span><span className="font-mono">{selected.personalCode}</span></>}
                  </div>
                </div>

                {/* Timeline */}
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-text-3">Timeline</p>
                  <OrderTimeline status={selected.status} events={selected.events} />
                </div>

                <Divider />

                {/* Actions */}
                {selected.status === "HELD" && (
                  <Button
                    className="w-full bg-status-danger-600 text-white hover:brightness-110"
                    onPress={() => setConfirmOpen(true)}
                  >
                    Force-complete order
                  </Button>
                )}
                {selected.status !== "HELD" && (
                  <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-center text-xs text-text-3">
                    No admin actions available for {selected.status} orders.
                  </div>
                )}

                {/* Refund info if exists */}
                {selected.refund && (
                  <div className="rounded-lg border border-status-warning-300/40 bg-status-warning-50 p-3 text-xs space-y-1">
                    <p className="font-semibold text-status-warning-700">Refund attached</p>
                    <p className="text-text-2">Status: {selected.refund.status}</p>
                    <p className="text-text-2">Policy: {selected.refund.policy}</p>
                    <p className="text-text-2">Buyer gets: {peso(Number(selected.refund.buyerRefundAmount))}</p>
                  </div>
                )}
              </div>
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Force-complete confirmation modal */}
      <Modal isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <ModalContent className="bg-surface-bg-2">
          <ModalHeader className="text-text-1">Confirm Force-Complete</ModalHeader>
          <ModalBody>
            <p className="text-sm text-text-2">
              This will mark order <span className="font-mono text-text-1">{selected?.id.slice(0, 14)}…</span> as COMPLETED and trigger seller payout. This action cannot be undone.
            </p>
            {selected && (
              <div className="mt-2 rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-xs text-text-2 space-y-1">
                <p>Item: <span className="font-medium text-text-1">{selected.item?.title ?? "—"}</span></p>
                <p>Amount: <span className="font-medium text-text-1">{peso(Number(selected.amount))}</span></p>
                <p>Buyer: <span className="font-medium text-text-1">{selected.buyer?.fullName ?? "—"}</span></p>
                <p>Seller: <span className="font-medium text-text-1">{selected.seller?.fullName ?? "—"}</span></p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              className="bg-status-danger-600 text-white"
              isLoading={completing}
              onPress={handleForceComplete}
            >
              Force-complete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
