"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";
import { Tab, Tabs } from "@heroui/tabs";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";

import { StatusChip } from "@/components/unithrift/status-chip";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { refunds } from "@/lib/unithrift-mocks";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function AdminRefundsPage() {
  const [tab, setTab] = useState("REQUESTED");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => refunds.filter((entry) => entry.status === tab), [tab]);
  const selected = visible.find((entry) => entry.id === selectedId) || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Refunds</h1>
        <p className="text-sm text-text-2">
          Policy: â‰¤12h full refund, â‰¤24h 80% refund, &gt;24h no refund, 10% commission on completion.
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
        <Tab key="REQUESTED" title="Requested" />
        <Tab key="APPROVED" title="Processed" />
        <Tab key="DENIED" title="Denied" />
      </Tabs>

      <ResponsiveTable>
        <Table
          aria-label="Refund queue table"
          classNames={{
            base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[1040px]",
            th: "bg-surface-bg-3 text-text-2",
            tr: "border-b border-border-subtle hover:bg-[#11203A]",
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
            <TableColumn>PREVIEW</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTION</TableColumn>
          </TableHeader>
          <TableBody items={visible} emptyContent="No refund records in this tab.">
            {(entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.id}</TableCell>
                <TableCell>{entry.orderId}</TableCell>
                <TableCell>{entry.buyer}</TableCell>
                <TableCell>{entry.seller}</TableCell>
                <TableCell>{peso(entry.amount)}</TableCell>
                <TableCell>{shortDateTime(entry.requestedAt)}</TableCell>
                <TableCell>
                  <StatusChip kind="refund-preview" value={entry.policyPreview} />
                </TableCell>
                <TableCell>{entry.status}</TableCell>
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
                  <p>Buyer gets: {peso(selected.policyPreview === "DENY" ? 0 : selected.amount)}</p>
                  <p>
                    Seller gets:{" "}
                    {peso(
                      selected.policyPreview === "FULL"
                        ? 0
                        : selected.policyPreview === "EIGHTY_PERCENT"
                          ? Math.round(selected.amount * 0.2)
                          : selected.amount,
                    )}
                  </p>
                  <p>Admin commission impact: {peso(Math.round(selected.amount * 0.1))}</p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Evidence panel</p>
                  <p>Door events: open â†’ close</p>
                  <p>Occupancy changes captured</p>
                </div>
                <div className="grid gap-2">
                  <Button
                    className="bg-status-success-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifySuccess({
                        title: "Refund approved",
                        description: "Policy logic applied and payouts recalculated.",
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    className="bg-status-danger-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifyError({
                        title: "Refund denied",
                        description: "Denial reason captured in audit trail.",
                      })
                    }
                  >
                    Deny
                  </Button>
                  <Button
                    className="btn-brand"
                    onPress={() =>
                      notifySuccess({
                        title: "Override applied",
                        description: "Custom buyer/seller settlement stored with reason.",
                      })
                    }
                  >
                    Override
                  </Button>
                </div>
              </div>
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

