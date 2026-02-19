"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";

import { EmptyBlock } from "@/components/unithrift/state-block";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { walletBalance, walletLedger } from "@/lib/unithrift-mocks";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const ledgerChipClass: Record<string, string> = {
  credit: "bg-status-success-100 text-text-inverse",
  debit: "bg-status-danger-100 text-text-inverse",
  hold: "bg-status-escrow-100 text-text-inverse",
  release: "bg-status-info-100 text-text-inverse",
  refund: "bg-status-info-100 text-text-inverse",
  commission: "bg-status-warning-100 text-text-inverse",
};

export default function WalletPage() {
  const router = useRouter();
  const [topupAmount, setTopupAmount] = useState("500");
  const [localDelta, setLocalDelta] = useState(0);

  const balance = walletBalance + localDelta;
  const sortedLedger = useMemo(
    () => [...walletLedger].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [],
  );

  const onTopup = () => {
    const value = Number(topupAmount);

    if (!Number.isFinite(value) || value <= 0) {
      notifyError({
        title: "Invalid amount",
        description: "Please enter a valid positive top-up amount.",
      });
      return;
    }

    setLocalDelta((prev) => prev + value);
    notifySuccess({
      title: "Funds added",
      description: `${peso(value)} added to wallet (sandbox mode).`,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Wallet</h1>
        <p className="text-sm text-text-2">Balance, top-up, and transaction ledger.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="gap-3 p-6">
            <p className="text-sm text-text-2">Current balance</p>
            <p className="text-4xl font-semibold text-brand-primary-300">{peso(balance)}</p>
            <p className="text-xs text-text-3">
              Includes held, completed, and sandbox top-up effects.
            </p>
          </CardBody>
        </Card>

        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardBody className="gap-3 p-6">
            <Input
              classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
              label="Sandbox top-up amount"
              labelPlacement="outside"
              placeholder="500"
              type="number"
              value={topupAmount}
              onValueChange={setTopupAmount}
            />
            <Button
              className="focus-ring bg-brand-primary-600 text-white hover:bg-brand-primary-500"
              onPress={onTopup}
            >
              Add funds
            </Button>
            <p className="text-xs text-status-warning-600">
              Prototype note: top-up is demo-only and not connected to real payment rails.
            </p>
          </CardBody>
        </Card>
      </div>

      {sortedLedger.length === 0 ? (
        <EmptyBlock
          actionLabel="Browse items"
          description="No ledger records yet. Start by purchasing an item."
          title="No wallet activity"
          onAction={() => router.push("/app/browse")}
        />
      ) : (
        <Table
          aria-label="Wallet ledger"
          classNames={{
            base: "border border-border-subtle rounded-xl bg-surface-bg-2",
            th: "bg-surface-bg-3 text-text-2",
            tr: "border-b border-border-subtle hover:bg-[#11203A]",
            td: "text-text-2",
          }}
        >
          <TableHeader>
            <TableColumn>DATE/TIME</TableColumn>
            <TableColumn>TYPE</TableColumn>
            <TableColumn>AMOUNT</TableColumn>
            <TableColumn>REFERENCE</TableColumn>
          </TableHeader>
          <TableBody items={sortedLedger}>
            {(row) => (
              <TableRow key={row.id}>
                <TableCell>{shortDateTime(row.timestamp)}</TableCell>
                <TableCell>
                  <Chip className={ledgerChipClass[row.type] ?? "bg-surface-bg-3 text-text-2"} size="sm">
                    {row.type}
                  </Chip>
                </TableCell>
                <TableCell className={row.amount >= 0 ? "text-status-success-600" : "text-status-danger-600"}>
                  {row.amount >= 0 ? "+" : "-"}
                  {peso(Math.abs(row.amount))}
                </TableCell>
                <TableCell>{row.reference}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
