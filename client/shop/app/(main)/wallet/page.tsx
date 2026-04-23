"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import { EmptyBlock } from "@/components/unithrift/state-block";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { useAuth } from "@/contexts/auth-context";
import { walletApi, type ApiWalletTxn } from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const ledgerChipClass: Record<string, string> = {
  TOP_UP: "bg-status-success-100 text-text-inverse",
  REFUND: "bg-status-info-100 text-text-inverse",
  PARTIAL_REFUND: "bg-status-info-100 text-text-inverse",
  RELEASE: "bg-status-info-100 text-text-inverse",
  SELLER_PAYOUT: "bg-status-success-100 text-text-inverse",
  PURCHASE: "bg-status-danger-100 text-text-inverse",
  HOLD: "bg-status-escrow-100 text-text-inverse",
  COMMISSION: "bg-status-warning-100 text-text-inverse",
  SLOT_RENTAL: "bg-status-warning-100 text-text-inverse",
};

export default function WalletPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [topupAmount, setTopupAmount] = useState("500");
  const [txns, setTxns] = useState<ApiWalletTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await walletApi.transactions();
      setTxns(data.transactions);
    } catch {
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onTopup = async () => {
    const value = Number(topupAmount);
    if (!Number.isFinite(value) || value < 100) {
      notifyError({
        title: "Invalid amount",
        description: "Minimum top-up is ₱1 (100 centavos).",
      });
      return;
    }
    setTopupLoading(true);
    try {
      const origin = window.location.origin;
      const session = await walletApi.topUp({
        amount: Math.round(value * 100),
        successUrl: `${origin}/app/wallet?topup=success`,
        cancelUrl: `${origin}/app/wallet?topup=cancelled`,
      });
      router.push(session.checkoutUrl);
    } catch (e) {
      notifyError({
        title: "Top-up failed",
        description: (e as Error).message,
      });
    } finally {
      setTopupLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("topup") === "success") {
      notifySuccess({
        title: "Top-up successful",
        description: "Balance has been credited.",
      });
      refreshUser();
      fetchData();
    }
  }, [fetchData, refreshUser]);

  const balance = Number(user?.walletBalance ?? 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Wallet</h1>
        <p className="text-sm text-text-2">
          Balance, top-up, and transaction ledger.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="gap-4 p-6">
            <p className="text-sm uppercase tracking-wide text-text-2">
              Available balance
            </p>
            <p className="text-4xl font-semibold text-text-1">
              {peso(balance)}
            </p>
          </CardBody>
        </Card>
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="gap-4 p-6">
            <p className="text-sm uppercase tracking-wide text-text-2">
              Top-up via PayMongo
            </p>
            <div className="flex gap-3">
              <Input
                classNames={{
                  inputWrapper: "bg-surface-bg-3 border border-border-subtle",
                }}
                label="Amount (₱)"
                labelPlacement="outside"
                min={1}
                placeholder="500"
                type="number"
                value={topupAmount}
                onValueChange={setTopupAmount}
              />
              <Button
                className="focus-ring btn-cta mt-6 shrink-0"
                isLoading={topupLoading}
                onPress={onTopup}
              >
                Top-up
              </Button>
            </div>
            <p className="text-xs text-text-3">
              GCash, card, Maya — powered by PayMongo.
            </p>
          </CardBody>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : txns.length === 0 ? (
        <EmptyBlock
          title="No transactions yet"
          description="Your transaction history will appear here."
        />
      ) : (
        <ResponsiveTable>
          <Table aria-label="Wallet transactions" removeWrapper>
            <TableHeader>
              <TableColumn>Date</TableColumn>
              <TableColumn>Type</TableColumn>
              <TableColumn>Description</TableColumn>
              <TableColumn>Amount</TableColumn>
            </TableHeader>
            <TableBody>
              {txns.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-text-2">
                    {shortDateTime(t.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      className={ledgerChipClass[t.type] ?? "bg-surface-bg-3"}
                    >
                      {t.type}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-text-2">
                    {t.description ?? "—"}
                  </TableCell>
                  <TableCell className="font-semibold text-text-1">
                    {peso(Number(t.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTable>
      )}
    </div>
  );
}
