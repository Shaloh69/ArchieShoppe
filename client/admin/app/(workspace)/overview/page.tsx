"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } },
};

const KPI_COLOR: Record<number, string> = {
  0: "text-brand-primary-700",
  1: "text-status-warning-600",
  2: "text-brand-cyan-700",
  3: "text-brand-indigo-600",
  4: "text-status-success-600",
};

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<ApiOverview | null>(null);
  const [heldOrders, setHeldOrders] = useState<ApiOrder[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<ApiRefund[]>([]);
  const [errorSlots, setErrorSlots] = useState<ApiLockerSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else { setLoading(true); setError(false); }
    try {
      const [overviewRes, ordersRes, refundsRes, lockersRes] = await Promise.all([
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
      if (!silent) setError(false);
    } catch {
      if (!silent) setError(true);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(true), 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const kpis = overview
    ? [
        { label: "Active items",      value: overview.activeItems.toString() },
        { label: "Refunds pending",   value: overview.pendingRefunds.toString() },
        { label: "Occupied slots",    value: `${overview.occupiedSlots} / ${overview.totalSlots}` },
        { label: "Total orders",      value: overview.totalOrders.toString() },
        { label: "Platform revenue",  value: peso(Number(overview.platformRevenue)) },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border border-border-subtle bg-surface-bg-2">
              <CardBody className="gap-2 p-4">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-8 w-24 rounded" />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-text-2">Failed to load overview data.</p>
        <Button className="btn-brand" size="sm" onPress={() => fetchAll()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-text-1">Overview</h1>
          {refreshing && <span className="text-xs text-text-3 animate-pulse">Refreshing…</span>}
        </div>
        <p className="text-sm text-text-3">
          Operational snapshot for transactions, refunds, and lockers. Auto-refreshes every 30s.
        </p>
      </motion.div>

      <motion.div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} variants={cardVariants}>
            <Card className="border border-border-subtle bg-surface-bg-2 shadow-sm transition-shadow hover:shadow-md">
              <CardBody className="gap-1 p-4">
                <p className="text-xs uppercase tracking-wide text-text-3">{kpi.label}</p>
                <p className={`text-2xl font-semibold ${KPI_COLOR[i] ?? "text-brand-primary-800"}`}>
                  {kpi.value}
                </p>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="grid gap-4 xl:grid-cols-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.18 }}
      >
        <ResponsiveTable>
          <Table
            aria-label="Held orders"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[620px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-brand-primary-50",
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
              tr: "border-b border-border-subtle hover:bg-brand-primary-50",
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
      </motion.div>

      {errorSlots.length > 0 ? (
        <Card className="border border-status-danger-600/40 bg-surface-bg-2">
          <CardBody className="p-4 text-sm text-text-2">
            <p className="font-semibold text-status-danger-600">Locker alerts</p>
            {errorSlots.map((slot) => (
              <p key={slot.slotId}>
                {slot.slotId}: {slot.status} — {slot.lastEvent ?? "no recent event"}
              </p>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
