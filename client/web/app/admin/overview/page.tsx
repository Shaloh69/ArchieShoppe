"use client";

import { Card, CardBody } from "@heroui/card";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";

import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { StatusChip } from "@/components/unithrift/status-chip";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { adminMetrics, lockers, orders, refunds } from "@/lib/unithrift-mocks";

const kpis = [
  { label: "Held orders expiring soon", value: adminMetrics.expiringHolds.toString() },
  { label: "Refund requests pending", value: adminMetrics.pendingRefunds.toString() },
  { label: "Locker errors", value: adminMetrics.lockerErrors.toString() },
  { label: "Today's sales", value: peso(adminMetrics.todaysSales) },
  { label: "Today's commission", value: peso(adminMetrics.todaysCommission) },
];

export default function AdminOverviewPage() {
  const expiringHolds = orders.filter((entry) => entry.status === "HELD").slice(0, 10);
  const refundQueue = refunds.filter((entry) => entry.status === "REQUESTED").slice(0, 10);
  const lockerErrors = lockers.filter((entry) => entry.status === "ERROR");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Overview</h1>
        <p className="text-sm text-text-2">Operational snapshot for transactions, refunds, and lockers.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border border-border-subtle bg-surface-bg-2">
            <CardBody className="gap-1 p-4">
              <p className="text-xs uppercase tracking-wide text-text-3">{kpi.label}</p>
              <p className="text-2xl font-semibold text-brand-primary-800">{kpi.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ResponsiveTable>
          <Table
            aria-label="Expiring holds"
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
            <TableBody items={expiringHolds} emptyContent="No urgent issues">
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id}</TableCell>
                  <TableCell>{entry.itemTitle}</TableCell>
                  <TableCell>{entry.holdEndsAt ? shortDateTime(entry.holdEndsAt) : "N/A"}</TableCell>
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
              <TableColumn>ORDER</TableColumn>
              <TableColumn>REQUESTED</TableColumn>
              <TableColumn>PREVIEW</TableColumn>
            </TableHeader>
            <TableBody items={refundQueue} emptyContent="No urgent issues">
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id}</TableCell>
                  <TableCell>{entry.orderId}</TableCell>
                  <TableCell>{shortDateTime(entry.requestedAt)}</TableCell>
                  <TableCell>
                    <StatusChip kind="refund-preview" value={entry.policyPreview} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>

      {lockerErrors.length > 0 ? (
        <Card className="border border-status-danger-600/40 bg-surface-bg-2">
          <CardBody className="p-4 text-sm text-text-2">
            <p className="font-semibold text-status-danger-600">Locker alerts</p>
            {lockerErrors.map((entry) => (
              <p key={entry.slotId}>
                {entry.slotId}: {entry.sensorSummary}
              </p>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

