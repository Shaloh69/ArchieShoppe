"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";

import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { reportsApi, type ApiDailyRow } from "@/lib/api-client";
import { peso, shortDate } from "@/lib/unithrift-format";
import { notifyError } from "@/lib/unithrift-toast";

const DAY_OPTIONS = [7, 30, 90] as const;
type DayRange = (typeof DAY_OPTIONS)[number];

type MetricKey = "sales" | "commission" | "refunds" | "payouts";

const METRICS: {
  key: MetricKey;
  label: string;
  countField: keyof ApiDailyRow;
  amountField: keyof ApiDailyRow;
  color: string;
}[] = [
  {
    key: "sales",
    label: "Sales",
    countField: "sales_count",
    amountField: "sales_total",
    color: "#ee4d2d",
  },
  {
    key: "commission",
    label: "Commission",
    countField: "commission_count",
    amountField: "commission_total",
    color: "#0ea5e9",
  },
  {
    key: "refunds",
    label: "Refunds",
    countField: "refund_count",
    amountField: "refund_total",
    color: "#f59e0b",
  },
  {
    key: "payouts",
    label: "Seller Payouts",
    countField: "payout_count",
    amountField: "payout_total",
    color: "#10b981",
  },
];

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const [days, setDays] = useState<DayRange>(30);
  const [metric, setMetric] = useState<MetricKey>("sales");
  const [rows, setRows] = useState<ApiDailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (d: DayRange) => {
    setLoading(true);
    try {
      const res = await reportsApi.daily(d);
      setRows(res.rows);
    } catch (err) {
      notifyError({
        title: "Failed to load reports",
        description: (err as Error).message,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [fetchData, days]);

  const currentMetric = METRICS.find((m) => m.key === metric)!;

  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        date: row.date.slice(5),
        count: row[currentMetric.countField] as number,
        amount: row[currentMetric.amountField] as number,
      })),
    [rows, currentMetric],
  );

  const totalCount = useMemo(
    () => rows.reduce((s, r) => s + (r[currentMetric.countField] as number), 0),
    [rows, currentMetric],
  );
  const totalAmount = useMemo(
    () =>
      rows.reduce((s, r) => s + (r[currentMetric.amountField] as number), 0),
    [rows, currentMetric],
  );
  const avgPerDay = rows.length > 0 ? totalAmount / rows.length : 0;

  const handleExport = () => {
    const headers = ["Date", "Count", "Amount (₱)"];
    const csvRows = rows.map((r) => [
      r.date,
      String(r[currentMetric.countField]),
      String((r[currentMetric.amountField] as number).toFixed(2)),
    ]);
    downloadCsv(`reports-${metric}-${days}d.csv`, headers, csvRows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">Reports</h1>
          <p className="text-sm text-text-2">
            Sales, commission, refunds, and seller payout reporting.
          </p>
        </div>
        <Button
          className="btn-brand"
          size="sm"
          isDisabled={loading}
          onPress={handleExport}
        >
          Export CSV
        </Button>
      </div>

      {/* Day range selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-3">Period:</span>
        {DAY_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${days === d ? "bg-brand-primary-600 text-white" : "bg-surface-bg-3 text-text-2 border border-border-subtle hover:bg-surface-bg-2"}`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Metric tabs */}
      <Tabs
        classNames={{
          tabList: "bg-surface-bg-2 border border-border-subtle",
          cursor: "bg-brand-primary-600",
        }}
        selectedKey={metric}
        onSelectionChange={(key) => setMetric(String(key) as MetricKey)}
      >
        {METRICS.map((m) => (
          <Tab key={m.key} title={m.label} />
        ))}
      </Tabs>

      {/* KPI cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card
              key={i}
              className="border border-border-subtle bg-surface-bg-2"
            >
              <CardBody className="gap-2 p-4">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-border-subtle bg-surface-bg-2">
            <CardBody className="p-4">
              <p className="text-xs uppercase tracking-wide text-text-3">
                Total transactions
              </p>
              <p className="text-2xl font-semibold text-brand-primary-700">
                {totalCount.toLocaleString()}
              </p>
            </CardBody>
          </Card>
          <Card className="border border-border-subtle bg-surface-bg-2">
            <CardBody className="p-4">
              <p className="text-xs uppercase tracking-wide text-text-3">
                Total amount
              </p>
              <p className="text-2xl font-semibold text-brand-cyan-700">
                {peso(totalAmount)}
              </p>
            </CardBody>
          </Card>
          <Card className="border border-border-subtle bg-surface-bg-2">
            <CardBody className="p-4">
              <p className="text-xs uppercase tracking-wide text-text-3">
                Avg / day
              </p>
              <p className="text-2xl font-semibold text-brand-indigo-600">
                {peso(avgPerDay)}
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Bar chart */}
      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-text-3">
            Daily {currentMetric.label} — Amount ({days}d)
          </p>
          {loading ? (
            <Skeleton className="h-52 w-full rounded-lg" />
          ) : chartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-text-3">
              No data for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={208}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border-subtle, #e5e7eb)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-text-3, #9ca3af)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-text-3, #9ca3af)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    `₱${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                  }
                />
                <ReTooltip
                  contentStyle={{
                    background: "var(--color-surface-bg-2, #fff)",
                    border: "1px solid var(--color-border-subtle, #e5e7eb)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    name === "amount" ? peso(Number(value ?? 0)) : (value ?? 0),
                    name === "amount" ? "Amount" : "Count",
                  ]}
                />
                <Bar
                  dataKey="amount"
                  fill={currentMetric.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      {/* Count chart */}
      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-text-3">
            Daily {currentMetric.label} — Count ({days}d)
          </p>
          {loading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : chartData.length === 0 ? null : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border-subtle, #e5e7eb)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-text-3, #9ca3af)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-text-3, #9ca3af)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ReTooltip
                  contentStyle={{
                    background: "var(--color-surface-bg-2, #fff)",
                    border: "1px solid var(--color-border-subtle, #e5e7eb)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [value ?? 0, "Count"]}
                />
                <Bar
                  dataKey="count"
                  fill={`${currentMetric.color}99`}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      {/* Daily breakdown table */}
      <ResponsiveTable>
        <Table
          aria-label="Daily breakdown"
          classNames={{
            base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[500px]",
            th: "bg-surface-bg-3 text-text-2",
            tr: "border-b border-border-subtle hover:bg-brand-primary-50",
            td: "text-text-2",
          }}
        >
          <TableHeader>
            <TableColumn>DATE</TableColumn>
            <TableColumn>COUNT</TableColumn>
            <TableColumn>AMOUNT</TableColumn>
          </TableHeader>
          <TableBody
            items={[...rows].reverse()}
            isLoading={loading}
            loadingContent={<Spinner size="lg" />}
            emptyContent="No data for this period."
          >
            {(row) => (
              <TableRow key={row.date}>
                <TableCell>{shortDate(`${row.date}T00:00:00Z`)}</TableCell>
                <TableCell>
                  {(row[currentMetric.countField] as number).toLocaleString()}
                </TableCell>
                <TableCell>
                  {peso(row[currentMetric.amountField] as number)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ResponsiveTable>
    </div>
  );
}
