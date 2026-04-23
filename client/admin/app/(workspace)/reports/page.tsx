"use client";

import { useMemo, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Tab, Tabs } from "@heroui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { peso, shortDate } from "@/lib/unithrift-format";

const reportRows = {
  sales: [
    { key: "2026-02-16", a: 15, b: 7150 },
    { key: "2026-02-17", a: 18, b: 8220 },
    { key: "2026-02-18", a: 14, b: 6840 },
  ],
  commission: [
    { key: "2026-02-16", a: 715, b: 0 },
    { key: "2026-02-17", a: 822, b: 0 },
    { key: "2026-02-18", a: 684, b: 0 },
  ],
  refunds: [
    { key: "2026-02-16", a: 2, b: 410 },
    { key: "2026-02-17", a: 1, b: 180 },
    { key: "2026-02-18", a: 1, b: 650 },
  ],
  payouts: [
    { key: "2026-02-16", a: 8, b: 3900 },
    { key: "2026-02-17", a: 10, b: 4380 },
    { key: "2026-02-18", a: 9, b: 3620 },
  ],
};

export default function AdminReportsPage() {
  const [tab, setTab] = useState<keyof typeof reportRows>("sales");

  const rows = useMemo(() => reportRows[tab], [tab]);
  const sumA = rows.reduce((acc, row) => acc + row.a, 0);
  const sumB = rows.reduce((acc, row) => acc + row.b, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Reports</h1>
        <p className="text-sm text-text-2">
          Sales, commission, refunds, and seller payout reporting.
        </p>
      </div>

      <Tabs
        classNames={{
          tabList: "bg-surface-bg-2 border border-border-subtle",
          cursor: "bg-brand-primary-600",
        }}
        selectedKey={tab}
        onSelectionChange={(key) =>
          setTab(String(key) as keyof typeof reportRows)
        }
      >
        <Tab key="sales" title="Sales" />
        <Tab key="commission" title="Commission" />
        <Tab key="refunds" title="Refunds" />
        <Tab key="payouts" title="Seller Payouts" />
      </Tabs>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="p-4">
            <p className="text-xs uppercase tracking-wide text-text-3">
              Primary total
            </p>
            <p className="text-2xl font-semibold text-viz-1">{sumA}</p>
          </CardBody>
        </Card>
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="p-4">
            <p className="text-xs uppercase tracking-wide text-text-3">
              Amount total
            </p>
            <p className="text-2xl font-semibold text-viz-2">{peso(sumB)}</p>
          </CardBody>
        </Card>
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="p-4">
            <p className="text-xs uppercase tracking-wide text-text-3">Trend</p>
            <p className="text-2xl font-semibold text-viz-3">Stable</p>
          </CardBody>
        </Card>
      </div>

      <ResponsiveTable>
        <Table
          aria-label="Reports table"
          classNames={{
            base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[620px]",
            th: "bg-surface-bg-3 text-text-2",
            tr: "border-b border-border-subtle hover:bg-brand-primary-50",
            td: "text-text-2",
          }}
        >
          <TableHeader>
            <TableColumn>DATE</TableColumn>
            <TableColumn>PRIMARY</TableColumn>
            <TableColumn>AMOUNT</TableColumn>
          </TableHeader>
          <TableBody items={rows}>
            {(row) => (
              <TableRow key={row.key}>
                <TableCell>{shortDate(`${row.key}T00:00:00Z`)}</TableCell>
                <TableCell>{row.a}</TableCell>
                <TableCell>{peso(row.b)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ResponsiveTable>
    </div>
  );
}
