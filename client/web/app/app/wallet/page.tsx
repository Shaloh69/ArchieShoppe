"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Tabs, Tab } from "@heroui/tabs";
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
import {
  walletApi,
  type ApiWalletTxn,
  type ApiCashoutRequest,
} from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

// Lazy-load the QR renderer to avoid SSR issues
const QRCode = dynamic(() => import("react-qr-code"), {
  ssr: false,
  loading: () => <div className="h-48 w-48 animate-pulse rounded-lg bg-surface-bg-3" />,
});

const ledgerChipClass: Record<string, string> = {
  TOP_UP:         "bg-status-success-100 text-status-success-700",
  REFUND:         "bg-status-info-100 text-status-info-700",
  PARTIAL_REFUND: "bg-status-info-100 text-status-info-700",
  RELEASE:        "bg-status-info-100 text-status-info-700",
  SELLER_PAYOUT:  "bg-status-success-100 text-status-success-700",
  PURCHASE:       "bg-status-danger-100 text-status-danger-700",
  HOLD:           "bg-status-warning-100 text-status-warning-700",
  COMMISSION:     "bg-status-warning-100 text-status-warning-700",
  SLOT_RENTAL:    "bg-status-warning-100 text-status-warning-700",
  CASHOUT:        "bg-brand-primary-100 text-brand-primary-700",
  CASHOUT_RETURN: "bg-status-success-100 text-status-success-700",
};

const cashoutStatusClass: Record<string, string> = {
  PENDING:    "bg-status-warning-100 text-status-warning-700",
  PROCESSING: "bg-status-info-100 text-status-info-700",
  PAID:       "bg-status-success-100 text-status-success-700",
  DENIED:     "bg-status-danger-100 text-status-danger-700",
};

// ─── QR Ph Section ─────────────────────────────────────────────────────────────
function QrPhSection({ onPaid }: { onPaid: () => void }) {
  const [amount, setAmount]       = useState("500");
  const [loading, setLoading]     = useState(false);
  const [qrData, setQrData]       = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [sourceId, setSourceId]   = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [paid, setPaid]           = useState(false);
  const [expired, setExpired]     = useState(false);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  useEffect(() => () => stopPoll(), []);

  const startPoll = (sid: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const { status } = await walletApi.checkQrPhStatus(sid);
        if (status === "chargeable" || status === "consumed") {
          stopPoll();
          setPaid(true);
          onPaid();
        } else if (status === "expired") {
          stopPoll();
          setExpired(true);
        }
      } catch { /* silent */ }
    }, 4000);
  };

  const generate = async () => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val < 100) {
      notifyError({ title: "Invalid amount", description: "Minimum is ₱100." });
      return;
    }
    setLoading(true);
    setQrData(null);
    setSourceId(null);
    setPaid(false);
    setExpired(false);
    try {
      const res = await walletApi.createQrPh(Math.round(val * 100));
      setSourceId(res.sourceId);
      setQrData(res.qrCode);
      setCheckoutUrl(res.checkoutUrl);
      setExpiresAt(res.expiresAt);
      startPoll(res.sourceId);
    } catch (e) {
      notifyError({ title: "Failed to generate QR", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopPoll();
    setQrData(null);
    setSourceId(null);
    setPaid(false);
    setExpired(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-2">
        Generate a dynamic QR code for InstaPay / PESONet. Scan with any banking app.
        QR expires after 5 minutes.
      </p>

      {!qrData && !paid && (
        <div className="flex items-end gap-3">
          <Input
            classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
            label="Amount (₱)"
            labelPlacement="outside"
            min={100}
            placeholder="500"
            type="number"
            value={amount}
            onValueChange={setAmount}
          />
          <Button className="btn-cta mt-6 shrink-0" isLoading={loading} onPress={generate}>
            Generate QR
          </Button>
        </div>
      )}

      {qrData && !paid && !expired && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-white p-6">
          <p className="text-sm font-medium text-text-2">
            Scan to pay <span className="font-bold text-text-1">{peso(Number(amount))}</span>
          </p>
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <QRCode value={qrData} size={192} />
          </div>
          {expiresAt && (
            <p className="text-xs text-text-3">
              Expires: {new Date(expiresAt).toLocaleTimeString()}
            </p>
          )}
          {checkoutUrl && (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-primary-500 underline"
            >
              Open PayMongo page instead
            </a>
          )}
          <div className="flex items-center gap-2 text-xs text-text-3">
            <Spinner size="sm" />
            Waiting for payment…
          </div>
          <Button size="sm" variant="flat" onPress={reset}>
            Cancel
          </Button>
        </div>
      )}

      {paid && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-status-success-400 bg-status-success-50 p-6 text-center">
          <p className="text-lg font-semibold text-status-success-700">Payment received!</p>
          <p className="text-sm text-status-success-600">
            {peso(Number(amount))} has been credited to your wallet.
          </p>
          <Button size="sm" className="btn-cta" onPress={reset}>
            New QR
          </Button>
        </div>
      )}

      {expired && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-status-danger-400 bg-status-danger-50 p-6 text-center">
          <p className="font-semibold text-status-danger-700">QR code expired</p>
          <Button size="sm" className="btn-cta" onPress={reset}>
            Generate new QR
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Cashout Section ───────────────────────────────────────────────────────────
function CashoutSection({ onRequested }: { onRequested: () => void }) {
  const { user } = useAuth();
  const [amount, setAmount]           = useState("");
  const [method, setMethod]           = useState("GCASH");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading]         = useState(false);
  const [cashouts, setCashouts]       = useState<ApiCashoutRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const balance = Number(user?.walletBalance ?? 0);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await walletApi.myCashouts();
      setCashouts(data.requests);
    } catch { setCashouts([]); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const submit = async () => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val < 100) {
      notifyError({ title: "Invalid amount", description: "Minimum cashout is ₱100." });
      return;
    }
    if (val > balance) {
      notifyError({ title: "Insufficient balance", description: `Your balance is ${peso(balance)}.` });
      return;
    }
    if (!accountNumber.trim() || !accountName.trim()) {
      notifyError({ title: "Missing details", description: "Enter account number and name." });
      return;
    }
    setLoading(true);
    try {
      await walletApi.requestCashout({ amount: val, method, accountNumber, accountName });
      notifySuccess({ title: "Cashout requested", description: "Admin will process it within 1–2 business days." });
      setAmount("");
      setAccountNumber("");
      setAccountName("");
      onRequested();
      fetchHistory();
    } catch (e) {
      notifyError({ title: "Request failed", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-2">
        Withdraw wallet credits to your GCash, Maya, or bank account. Minimum ₱100.
        Processed within 1–2 business days.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          description={`Available: ${peso(balance)}`}
          label="Amount (₱)"
          labelPlacement="outside"
          min={100}
          placeholder="500"
          type="number"
          value={amount}
          onValueChange={setAmount}
        />
        <Select
          classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
          label="Cashout method"
          labelPlacement="outside"
          selectedKeys={[method]}
          onSelectionChange={(keys) => setMethod(Array.from(keys)[0] as string)}
        >
          <SelectItem key="GCASH">GCash</SelectItem>
          <SelectItem key="MAYA">Maya</SelectItem>
          <SelectItem key="BANK">Bank Transfer</SelectItem>
        </Select>
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          label="Account number / mobile number"
          labelPlacement="outside"
          placeholder="09XX XXX XXXX"
          value={accountNumber}
          onValueChange={setAccountNumber}
        />
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          label="Account name"
          labelPlacement="outside"
          placeholder="Full name as registered"
          value={accountName}
          onValueChange={setAccountName}
        />
      </div>

      <Button className="btn-cta" isLoading={loading} onPress={submit}>
        Request Cashout
      </Button>

      {/* History */}
      <div className="pt-2">
        <p className="mb-2 text-sm font-medium text-text-1">Cashout history</p>
        {historyLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : cashouts.length === 0 ? (
          <p className="text-sm text-text-3">No cashout requests yet.</p>
        ) : (
          <ResponsiveTable>
            <Table aria-label="Cashout history" removeWrapper>
              <TableHeader>
                <TableColumn>Date</TableColumn>
                <TableColumn>Amount</TableColumn>
                <TableColumn>Method</TableColumn>
                <TableColumn>Account</TableColumn>
                <TableColumn>Status</TableColumn>
              </TableHeader>
              <TableBody>
                {cashouts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-text-2">{shortDateTime(c.requestedAt)}</TableCell>
                    <TableCell className="font-semibold text-text-1">{peso(Number(c.amount))}</TableCell>
                    <TableCell className="text-text-2">{c.method}</TableCell>
                    <TableCell className="text-text-2">
                      <span className="block">{c.accountName}</span>
                      <span className="text-xs text-text-3">{c.accountNumber}</span>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" className={cashoutStatusClass[c.status] ?? "bg-surface-bg-3"}>
                        {c.status}
                      </Chip>
                      {c.adminNotes && (
                        <p className="mt-1 text-xs text-text-3">{c.adminNotes}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        )}
      </div>
    </div>
  );
}

// ─── Main Wallet Page ──────────────────────────────────────────────────────────
export default function WalletPage() {
  const router  = useRouter();
  const { user, refreshUser } = useAuth();
  const [topupAmount, setTopupAmount] = useState("500");
  const [txns, setTxns]               = useState<ApiWalletTxn[]>([]);
  const [loading, setLoading]         = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await walletApi.transactions();
      setTxns(data.transactions);
    } catch { setTxns([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  // Handle return from PayMongo checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topup = params.get("topup");
    if (topup === "success") {
      notifySuccess({ title: "Top-up successful", description: "Balance has been credited." });
      refreshUser();
      fetchTxns();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (topup === "failed") {
      notifyError({ title: "Top-up failed", description: "Payment was not completed." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchTxns, refreshUser]);

  const onTopup = async () => {
    const value = Number(topupAmount);
    if (!Number.isFinite(value) || value < 100) {
      notifyError({ title: "Invalid amount", description: "Minimum top-up is ₱100." });
      return;
    }
    setTopupLoading(true);
    try {
      const origin = window.location.origin;
      const session = await walletApi.topUp({
        amount: Math.round(value * 100),
        successUrl: `${origin}/app/wallet?topup=success`,
        cancelUrl:  `${origin}/app/wallet?topup=cancelled`,
      });
      router.push(session.checkoutUrl);
    } catch (e) {
      notifyError({ title: "Top-up failed", description: (e as Error).message });
    } finally {
      setTopupLoading(false);
    }
  };

  const balance = Number(user?.walletBalance ?? 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Wallet</h1>
        <p className="text-sm text-text-2">Balance, top-up, cashout, and transaction ledger.</p>
      </div>

      {/* Balance card */}
      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="gap-1 p-6">
          <p className="text-sm uppercase tracking-wide text-text-2">Available balance</p>
          <p className="text-4xl font-semibold text-text-1">{peso(balance)}</p>
        </CardBody>
      </Card>

      {/* Top-up / QR Ph / Cashout tabs */}
      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="p-4 sm:p-6">
          <Tabs aria-label="Wallet actions" color="primary" variant="underlined">
            {/* QR Ph Tab */}
            <Tab key="qrph" title="QR Ph (InstaPay)">
              <div className="mt-4">
                <QrPhSection
                  onPaid={() => { refreshUser(); fetchTxns(); }}
                />
              </div>
            </Tab>

            {/* Checkout (GCash / Card) Tab */}
            <Tab key="checkout" title="GCash / Card / Maya">
              <div className="mt-4 space-y-4">
                <p className="text-sm text-text-2">
                  Pay via GCash, credit/debit card, or Maya through a PayMongo checkout page.
                </p>
                <div className="flex items-end gap-3">
                  <Input
                    classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
                    label="Amount (₱)"
                    labelPlacement="outside"
                    min={100}
                    placeholder="500"
                    type="number"
                    value={topupAmount}
                    onValueChange={setTopupAmount}
                  />
                  <Button className="btn-cta mt-6 shrink-0" isLoading={topupLoading} onPress={onTopup}>
                    Top-up
                  </Button>
                </div>
                <p className="text-xs text-text-3">Powered by PayMongo. Min ₱100 · Max ₱10,000.</p>
              </div>
            </Tab>

            {/* Cashout Tab */}
            <Tab key="cashout" title="Cash Out">
              <div className="mt-4">
                <CashoutSection
                  onRequested={() => { refreshUser(); fetchTxns(); }}
                />
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>

      {/* Transaction ledger */}
      <div>
        <p className="mb-3 text-base font-semibold text-text-1">Transaction history</p>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : txns.length === 0 ? (
          <EmptyBlock title="No transactions yet" description="Your transaction history will appear here." />
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
                    <TableCell className="text-text-2">{shortDateTime(t.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="sm" className={ledgerChipClass[t.type] ?? "bg-surface-bg-3"}>
                        {t.type.replace("_", " ")}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-text-2">{t.description ?? "—"}</TableCell>
                    <TableCell className="font-semibold text-text-1">{peso(Number(t.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        )}
      </div>
    </div>
  );
}
