"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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

// ── Animation variants ────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden:  { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.28, ease: "easeOut" } },
};
const tableVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ── KPI Skeleton ──────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <Card className="border border-border-subtle bg-surface-bg-2">
      <CardBody className="gap-2 p-4">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </CardBody>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<ApiOverview | null>(null);
  const [heldOrders, setHeldOrders] = useState<ApiOrder[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<ApiRefund[]>([]);
  const [errorSlots, setErrorSlots] = useState<ApiLockerSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
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
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const kpis = overview
    ? [
        { label: "Active items",      value: overview.activeItems.toString(),                     color: "text-brand-primary-700" },
        { label: "Refunds pending",   value: overview.pendingRefunds.toString(),                  color: "text-status-warning-600" },
        { label: "Occupied slots",    value: `${overview.occupiedSlots} / ${overview.totalSlots}`, color: "text-brand-cyan-600" },
        { label: "Total orders",      value: overview.totalOrders.toString(),                     color: "text-brand-indigo-600" },
        { label: "Platform revenue",  value: peso(Number(overview.platformRevenue)),               color: "text-status-success-700" },
      ]
    : [];

  const tableRowCls = {
    base: "border border-border-subtle rounded-xl bg-surface-bg-2",
    th: "bg-surface-bg-3 text-text-3 text-xs font-semibold uppercase tracking-wide",
    tr: "border-b border-border-subtle transition-colors hover:bg-brand-primary-50",
    td: "text-text-2 text-sm py-3",
  };

  if (error) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center gap-3 py-20 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-lg font-semibold text-text-1">Failed to load overview</p>
        <p className="text-sm text-text-3">The API may be offline or you may not be authenticated.</p>
        <button
          className="mt-2 rounded-lg bg-brand-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-800 transition-colors"
          onClick={fetchAll}
        >
          Retry
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-1">Overview</h1>
        <p className="text-sm text-text-3">
          Operational snapshot — transactions, refunds, and lockers.
        </p>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {kpis.map((kpi) => (
            <motion.div key={kpi.label} variants={cardVariants}>
              <Card className="card-elevate border border-border-subtle bg-surface-bg-2">
                <CardBody className="gap-1.5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
                    {kpi.label}
                  </p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Tables */}
      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="border border-border-subtle bg-surface-bg-2">
              <CardBody className="space-y-3 p-4">
                <Skeleton className="h-4 w-32 rounded-md" />
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full rounded-lg" />
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          className="grid gap-4 xl:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={tableVariants}>
            <ResponsiveTable>
              <Table aria-label="Held orders" classNames={tableRowCls}>
                <TableHeader>
                  <TableColumn>Order ID</TableColumn>
                  <TableColumn>Item</TableColumn>
                  <TableColumn>Hold ends</TableColumn>
                  <TableColumn>Status</TableColumn>
                </TableHeader>
                <TableBody items={heldOrders} emptyContent="No held orders">
                  {(entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">{entry.id.slice(0, 12)}…</TableCell>
                      <TableCell>{entry.item?.title ?? entry.itemId}</TableCell>
                      <TableCell>{entry.holdEndsAt ? shortDateTime(entry.holdEndsAt) : "N/A"}</TableCell>
                      <TableCell><StatusChip kind="order" value={entry.status} /></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ResponsiveTable>
          </motion.div>

          <motion.div variants={tableVariants}>
            <ResponsiveTable>
              <Table aria-label="Refund queue" classNames={tableRowCls}>
                <TableHeader>
                  <TableColumn>Refund ID</TableColumn>
                  <TableColumn>Order ID</TableColumn>
                  <TableColumn>Requested</TableColumn>
                  <TableColumn>Policy</TableColumn>
                </TableHeader>
                <TableBody items={pendingRefunds} emptyContent="No pending refunds">
                  {(entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">{entry.id.slice(0, 12)}…</TableCell>
                      <TableCell className="font-mono text-xs">{entry.orderId.slice(0, 12)}…</TableCell>
                      <TableCell>{shortDateTime(entry.requestedAt)}</TableCell>
                      <TableCell>{entry.policy ?? "—"}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ResponsiveTable>
          </motion.div>
        </motion.div>
      )}

      {/* Locker alerts */}
      {!loading && errorSlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-status-danger-600/30 bg-status-danger-100/30">
            <CardBody className="p-4 text-sm">
              <p className="mb-2 font-semibold text-status-danger-700">
                Locker alerts ({errorSlots.length})
              </p>
              <div className="space-y-1">
                {errorSlots.map((slot) => (
                  <p key={slot.slotId} className="text-text-2">
                    <span className="font-medium">{slot.slotId}</span>:{" "}
                    <StatusChip kind="locker" value={slot.status} /> —{" "}
                    <span className="text-text-3">{slot.lastEvent ?? "no recent event"}</span>
                  </p>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
