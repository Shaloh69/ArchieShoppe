"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Skeleton } from "@heroui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Textarea } from "@heroui/input";

import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { cashoutsApi, type ApiCashoutRequest } from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const statusClass: Record<string, string> = {
  PENDING:    "bg-status-warning-100 text-status-warning-700",
  PROCESSING: "bg-status-info-100 text-status-info-700",
  PAID:       "bg-status-success-100 text-status-success-700",
  DENIED:     "bg-status-danger-100 text-status-danger-700",
};

const methodLabel: Record<string, string> = {
  GCASH: "GCash",
  MAYA:  "Maya",
  BANK:  "Bank Transfer",
};

export default function CashoutsPage() {
  const [requests, setRequests]   = useState<ApiCashoutRequest[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selected, setSelected]   = useState<ApiCashoutRequest | null>(null);
  const [action, setAction]       = useState<"approve" | "deny" | null>(null);
  const [notes, setNotes]         = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cashoutsApi.adminAll({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        limit: "50",
      } as Record<string, string>);
      setRequests(data.requests);
      setTotal(data.total);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = (req: ApiCashoutRequest, act: "approve" | "deny") => {
    setSelected(req);
    setAction(act);
    setNotes("");
  };

  const closeModal = () => {
    setSelected(null);
    setAction(null);
    setNotes("");
  };

  const confirm = async () => {
    if (!selected || !action) return;
    setSubmitting(true);
    try {
      if (action === "approve") {
        await cashoutsApi.approve(selected.id, notes || undefined);
        notifySuccess({
          title: "Cashout approved",
          description: `₱${Number(selected.amount).toFixed(2)} marked as paid to ${selected.accountNumber}.`,
        });
      } else {
        await cashoutsApi.deny(selected.id, notes || undefined);
        notifySuccess({
          title: "Cashout denied",
          description: "Funds returned to user wallet.",
        });
      }
      closeModal();
      fetchAll();
    } catch (e) {
      notifyError({ title: "Action failed", description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-1">Cashouts</h1>
            {pendingCount > 0 && statusFilter === "PENDING" && (
              <Badge color="danger" content={pendingCount} shape="circle" size="sm">
                <span />
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-3">
            Review and process user cashout requests. Manually send funds then approve.
          </p>
        </div>
        <Button size="sm" variant="flat" onPress={fetchAll}>
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(["PENDING", "PAID", "DENIED"] as const).map((s) => (
          <Card key={s} className="border border-border-subtle bg-surface-bg-2">
            <CardBody className="p-4">
              <p className="text-xs uppercase tracking-wide text-text-3">{s}</p>
              <p className="text-2xl font-semibold text-text-1">
                {loading ? "—" : requests.filter((r) => r.status === s).length}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          classNames={{ trigger: "bg-surface-bg-2 border border-border-subtle max-w-[180px]" }}
          label="Status filter"
          labelPlacement="outside"
          selectedKeys={[statusFilter]}
          onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string)}
        >
          <SelectItem key="ALL">All</SelectItem>
          <SelectItem key="PENDING">Pending</SelectItem>
          <SelectItem key="PAID">Paid</SelectItem>
          <SelectItem key="DENIED">Denied</SelectItem>
        </Select>
        <p className="mt-5 text-sm text-text-3">{total} total</p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <p className="py-16 text-center text-sm text-text-3">No cashout requests found.</p>
      ) : (
        <ResponsiveTable>
          <Table
            aria-label="Cashout requests"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-brand-primary-50",
              td: "text-text-2",
            }}
          >
            <TableHeader>
              <TableColumn>Requested</TableColumn>
              <TableColumn>User</TableColumn>
              <TableColumn>Amount</TableColumn>
              <TableColumn>Method</TableColumn>
              <TableColumn>Account</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody items={requests}>
              {(req) => (
                <TableRow key={req.id}>
                  <TableCell>{shortDateTime(req.requestedAt)}</TableCell>
                  <TableCell>
                    <span className="block font-medium text-text-1">
                      {req.user?.fullName ?? "—"}
                    </span>
                    <span className="text-xs text-text-3">{req.user?.email}</span>
                  </TableCell>
                  <TableCell className="font-semibold text-text-1">
                    {peso(Number(req.amount))}
                  </TableCell>
                  <TableCell>{methodLabel[req.method] ?? req.method}</TableCell>
                  <TableCell>
                    <span className="block">{req.accountName}</span>
                    <span className="font-mono text-xs text-text-3">{req.accountNumber}</span>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" className={statusClass[req.status] ?? "bg-surface-bg-3"}>
                      {req.status}
                    </Chip>
                    {req.adminNotes && (
                      <p className="mt-1 text-xs text-text-3">{req.adminNotes}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-status-success-600 text-white hover:bg-status-success-700"
                          onPress={() => openModal(req, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          className="bg-status-danger-600 text-white hover:bg-status-danger-700"
                          onPress={() => openModal(req, "deny")}
                        >
                          Deny
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-3">
                        {req.processedAt ? shortDateTime(req.processedAt) : "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
      )}

      {/* Confirm modal */}
      <Modal isOpen={!!selected} onClose={closeModal} size="sm">
        <ModalContent>
          <ModalHeader className="text-text-1">
            {action === "approve" ? "Approve Cashout" : "Deny Cashout"}
          </ModalHeader>
          <ModalBody className="space-y-3">
            {selected && (
              <>
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm">
                  <p className="font-semibold text-text-1">{peso(Number(selected.amount))}</p>
                  <p className="text-text-2">
                    {methodLabel[selected.method]} → {selected.accountName}
                  </p>
                  <p className="font-mono text-xs text-text-3">{selected.accountNumber}</p>
                </div>
                {action === "approve" && (
                  <p className="text-xs text-status-warning-600">
                    ⚠ Make sure you have already sent {peso(Number(selected.amount))} to{" "}
                    {selected.accountNumber} before approving.
                  </p>
                )}
                <Textarea
                  classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
                  label="Admin notes (optional)"
                  labelPlacement="outside"
                  placeholder={
                    action === "approve"
                      ? "e.g. Sent via GCash, ref: 12345"
                      : "e.g. Invalid account number"
                  }
                  value={notes}
                  onValueChange={setNotes}
                />
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={closeModal}>
              Cancel
            </Button>
            <Button
              className={action === "approve"
                ? "bg-status-success-600 text-white"
                : "bg-status-danger-600 text-white"}
              isLoading={submitting}
              onPress={confirm}
            >
              {action === "approve" ? "Confirm Approve" : "Confirm Deny"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
