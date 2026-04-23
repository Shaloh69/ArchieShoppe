"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { StatusChip } from "@/components/unithrift/status-chip";
import {
  lockersApi,
  ordersApi,
  refundsApi,
  reportsApi,
  type ApiLockerSlot,
  type ApiOrder,
  type ApiOverview,
  type ApiRefund,
} from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<ApiOverview | null>(null);
  const [heldOrders, setHeldOrders] = useState<ApiOrder[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<ApiRefund[]>([]);
  const [errorSlots, setErrorSlots] = useState<ApiLockerSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, ordersRes, refundsRes, lockersRes] =
        await Promise.all([
          reportsApi.overview(),
          ordersApi.adminAll({ status: "HELD", limit: "10" }),
          refundsApi.adminAll({ status: "PENDING", limit: "10" }),
          lockersApi.all(),
        ]);
      setOverview(overviewRes.overview);
      setHeldOrders(ordersRes.orders);
      setPendingRefunds(refundsRes.refunds);
      setErrorSlots(
        lockersRes.slots.filter(
          (s) => s.status === "ERROR" || s.status === "OUT_OF_SERVICE",
        ),
      );
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const kpis = overview
    ? [
        { label: "Active items", value: overview.activeItems.toString() },
        { label: "Refunds pending", value: overview.pendingRefunds.toString() },
        {
          label: "Occupied slots",
          value: `${overview.occupiedSlots} / ${overview.totalSlots}`,
        },
        { label: "Total orders", value: overview.totalOrders.toString() },
        {
          label: "Platform revenue",
          value: peso(Number(overview.platformRevenue)),
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Overview</h1>
        <p className="text-sm text-text-2">
          Operational snapshot for transactions, refunds, and lockers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="border border-border-subtle bg-surface-bg-2"
          >
            <CardBody className="gap-1 p-4">
              <p className="text-xs uppercase tracking-wide text-text-3">
                {kpi.label}
              </p>
              <p className="text-2xl font-semibold text-brand-primary-800">
                {kpi.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ResponsiveTable>
          <Table
            aria-label="Held orders"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[620px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-[#11203A]",
              td: "text-text-2",
            }}
          >
            <TableHeader>
              <TableColumn>ORDER ID</TableColumn>
              <TableColumn>ITEM</TableColumn>
              <TableColumn>HOLD ENDS</TableColumn>
              <TableColumn>STATUS</TableColumn>
            </TableHeader>
            <TableBody items={heldOrders} emptyContent="No held orders">
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id.slice(0, 12)}…</TableCell>
                  <TableCell>{entry.item?.title ?? entry.itemId}</TableCell>
                  <TableCell>
                    {entry.holdEndsAt ? shortDateTime(entry.holdEndsAt) : "N/A"}
                  </TableCell>
                  <TableCell>
                    <StatusChip kind="order" value={entry.status} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>

        <ResponsiveTable>
          <Table
            aria-label="Refund queue"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[620px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-[#11203A]",
              td: "text-text-2",
            }}
          >
            <TableHeader>
              <TableColumn>REFUND ID</TableColumn>
              <TableColumn>ORDER ID</TableColumn>
              <TableColumn>REQUESTED</TableColumn>
              <TableColumn>POLICY</TableColumn>
            </TableHeader>
            <TableBody items={pendingRefunds} emptyContent="No pending refunds">
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id.slice(0, 12)}…</TableCell>
                  <TableCell>{entry.orderId.slice(0, 12)}…</TableCell>
                  <TableCell>{shortDateTime(entry.requestedAt)}</TableCell>
                  <TableCell>{entry.policy ?? "—"}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>

      {errorSlots.length > 0 ? (
        <Card className="border border-status-danger-600/40 bg-surface-bg-2">
          <CardBody className="p-4 text-sm text-text-2">
            <p className="font-semibold text-status-danger-600">
              Locker alerts
            </p>
            {errorSlots.map((slot) => (
              <p key={slot.slotId}>
                {slot.slotId}: {slot.status} —{" "}
                {slot.lastEvent ?? "no recent event"}
              </p>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
