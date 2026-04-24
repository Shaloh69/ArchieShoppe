"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
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

import { StatusChip } from "@/components/unithrift/status-chip";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { refundsApi, type ApiRefund } from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function AdminRefundsPage() {
  const [tab, setTab] = useState("PENDING");
  const [refunds, setRefunds] = useState<ApiRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchRefunds = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await refundsApi.adminAll({ status });
      setRefunds(res.refunds);
    } catch {
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds(tab);
  }, [fetchRefunds, tab]);

  const visible = refunds;
  const selected = visible.find((entry) => entry.id === selectedId) ?? null;

  const handleProcess = async (approved: boolean) => {
    if (!selected) return;
    setProcessing(true);
    try {
      await refundsApi.process(selected.id, { approved });
      notifySuccess({
        title: approved ? "Refund approved" : "Refund denied",
        description: approved
          ? "Policy applied and payouts recalculated."
          : "Denial recorded in audit trail.",
      });
      setSelectedId(null);
      fetchRefunds(tab);
    } catch (e) {
      notifyError({
        title: "Process failed",
        description: (e as Error).message,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Refunds</h1>
        <p className="text-sm text-text-2">
          Policy: ≤12h full refund, ≤24h 75% refund, &gt;24h no refund, 10%
          commission on completion.
        </p>
      </div>

      <Tabs
        classNames={{
          tabList: "bg-surface-bg-2 border border-border-subtle",
          cursor: "bg-brand-primary-600",
        }}
        selectedKey={tab}
        onSelectionChange={(key) => setTab(String(key))}
      >
        <Tab key="PENDING" title="Pending" />
        <Tab key="APPROVED" title="Approved" />
        <Tab key="DENIED" title="Denied" />
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        <ResponsiveTable>
          <Table
            aria-label="Refund queue table"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[1040px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-brand-primary-50",
              td: "text-text-2",
            }}
          >
            <TableHeader>
              <TableColumn>REFUND ID</TableColumn>
              <TableColumn>ORDER ID</TableColumn>
              <TableColumn>BUYER</TableColumn>
              <TableColumn>SELLER</TableColumn>
              <TableColumn>AMOUNT</TableColumn>
              <TableColumn>REQUESTED AT</TableColumn>
              <TableColumn>POLICY</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ACTION</TableColumn>
            </TableHeader>
            <TableBody
              items={visible}
              emptyContent="No refund records in this tab."
            >
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id.slice(0, 10)}…</TableCell>
                  <TableCell>{entry.orderId.slice(0, 10)}…</TableCell>
                  <TableCell>
                    {entry.buyer?.fullName ?? entry.buyerId}
                  </TableCell>
                  <TableCell>
                    {entry.seller?.fullName ?? entry.sellerId}
                  </TableCell>
                  <TableCell>{peso(Number(entry.amount))}</TableCell>
                  <TableCell>{shortDateTime(entry.requestedAt)}</TableCell>
                  <TableCell>{entry.policy ?? "—"}</TableCell>
                  <TableCell>
                    <StatusChip kind="order" value={entry.status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      className="btn-brand"
                      size="sm"
                      onPress={() => setSelectedId(entry.id)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
      )}

      <Drawer
        isOpen={Boolean(selected)}
        placement="right"
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DrawerContent className="border-l border-border-subtle bg-surface-bg-2">
          <DrawerHeader className="text-text-1">Refund review</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Order ID: {selected.orderId}</p>
                  <p>Requested: {shortDateTime(selected.requestedAt)}</p>
                  <p>Policy: {selected.policy ?? "—"}</p>
                  <p>
                    Buyer refund: {peso(Number(selected.buyerRefundAmount))}
                  </p>
                  <p>Seller fee: {peso(Number(selected.sellerFeeAmount))}</p>
                </div>
                {tab === "PENDING" ? (
                  <div className="grid gap-2">
                    <Button
                      className="bg-status-success-600 text-white hover:brightness-110"
                      isLoading={processing}
                      onPress={() => handleProcess(true)}
                    >
                      Approve
                    </Button>
                    <Button
                      className="bg-status-danger-600 text-white hover:brightness-110"
                      isLoading={processing}
                      onPress={() => handleProcess(false)}
                    >
                      Deny
                    </Button>
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
