"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { peso } from "@/lib/unithrift-format";
import { notifyInfo, notifySuccess } from "@/lib/unithrift-toast";

const users = [
  { id: "usr-1", name: "You", role: "SELLER", status: "ACTIVE", wallet: 940 },
  { id: "usr-2", name: "Ana C.", role: "SELLER", status: "ACTIVE", wallet: 520 },
  { id: "usr-3", name: "Paolo M.", role: "BUYER", status: "ACTIVE", wallet: 310 },
  { id: "usr-4", name: "Jun R.", role: "BUYER", status: "DISABLED", wallet: 120 },
];

const roles = ["all", "BUYER", "SELLER", "ADMIN"];
const statuses = ["all", "ACTIVE", "DISABLED"];

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 300).toLowerCase();

  const filtered = useMemo(
    () =>
      users
        .filter((user) => (role === "all" ? true : user.role === role))
        .filter((user) => (status === "all" ? true : user.status === status))
        .filter(
          (user) =>
            user.name.toLowerCase().includes(q) || user.id.toLowerCase().includes(q),
        ),
    [q, role, status],
  );

  const selected = filtered.find((entry) => entry.id === selectedId) || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Users</h1>
        <p className="text-sm text-text-2">Review user accounts, roles, and account-level controls.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          label="Search"
          labelPlacement="outside"
          placeholder="Name or ID..."
          value={query}
          onValueChange={setQuery}
        />
        <Select
          classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
          label="Role"
          labelPlacement="outside"
          selectedKeys={[role]}
          onSelectionChange={(keys) => setRole(Array.from(keys)[0]?.toString() || "all")}
        >
          {roles.map((entry) => (
            <SelectItem key={entry}>{entry === "all" ? "All roles" : entry}</SelectItem>
          ))}
        </Select>
        <Select
          classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
          label="Status"
          labelPlacement="outside"
          selectedKeys={[status]}
          onSelectionChange={(keys) => setStatus(Array.from(keys)[0]?.toString() || "all")}
        >
          {statuses.map((entry) => (
            <SelectItem key={entry}>{entry === "all" ? "All statuses" : entry}</SelectItem>
          ))}
        </Select>
      </div>

      <Table
        aria-label="Users table"
        classNames={{
          base: "border border-border-subtle rounded-xl bg-surface-bg-2",
          th: "bg-surface-bg-3 text-text-2",
          tr: "border-b border-border-subtle hover:bg-[#11203A]",
          td: "text-text-2",
        }}
      >
        <TableHeader>
          <TableColumn>USER ID</TableColumn>
          <TableColumn>NAME</TableColumn>
          <TableColumn>ROLE</TableColumn>
          <TableColumn>STATUS</TableColumn>
          <TableColumn>WALLET</TableColumn>
          <TableColumn>ACTION</TableColumn>
        </TableHeader>
        <TableBody items={filtered} emptyContent="No users found with current filters.">
          {(entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.id}</TableCell>
              <TableCell>{entry.name}</TableCell>
              <TableCell>{entry.role}</TableCell>
              <TableCell>{entry.status}</TableCell>
              <TableCell>{peso(entry.wallet)}</TableCell>
              <TableCell>
                <Button
                  className="bg-brand-primary-700 text-text-1 hover:bg-brand-primary-600"
                  size="sm"
                  onPress={() => setSelectedId(entry.id)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Drawer
        isOpen={Boolean(selected)}
        placement="right"
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DrawerContent className="border-l border-border-subtle bg-surface-bg-2">
          <DrawerHeader className="text-text-1">User detail</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Name: {selected.name}</p>
                  <p>Role: {selected.role}</p>
                  <p>Status: {selected.status}</p>
                  <p>Wallet: {peso(selected.wallet)}</p>
                </div>
                <div className="grid gap-2">
                  <Button
                    className="bg-status-danger-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifyInfo({
                        title: "User disabled",
                        description: "Account disabled with admin reason.",
                      })
                    }
                  >
                    Disable
                  </Button>
                  <Button
                    className="bg-status-success-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifySuccess({
                        title: "User enabled",
                        description: "Account status restored.",
                      })
                    }
                  >
                    Enable
                  </Button>
                  <Button
                    className="bg-brand-indigo-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifyInfo({
                        title: "Seller codes invalidated",
                        description: "Outstanding seller codes revoked.",
                      })
                    }
                  >
                    Invalidate seller codes
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
