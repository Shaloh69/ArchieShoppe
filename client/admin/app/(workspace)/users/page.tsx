"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { usersApi, type ApiUser } from "@/lib/api-client";
import { peso, shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const roles = ["all", "BUYER", "SELLER", "ADMIN"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 300).toLowerCase();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.adminAll();
      setUsers(res.users);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(
    () =>
      users
        .filter((user) => (role === "all" ? true : user.role === role))
        .filter(
          (user) =>
            user.fullName.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            user.id.toLowerCase().includes(q),
        ),
    [users, q, role],
  );

  const selected = filtered.find((entry) => entry.id === selectedId) ?? null;

  const handleUpdate = async (
    userId: string,
    body: { role?: string; isVerified?: boolean },
    successMsg: string,
  ) => {
    try {
      await usersApi.update(userId, body);
      notifySuccess({ title: "User updated", description: successMsg });
      fetchUsers();
    } catch (e) {
      notifyError({
        title: "Update failed",
        description: (e as Error).message,
      });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Users</h1>
        <p className="text-sm text-text-2">
          Review user accounts, roles, and account-level controls.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          classNames={{
            inputWrapper: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Search"
          labelPlacement="outside"
          placeholder="Name, email, or ID..."
          value={query}
          onValueChange={setQuery}
        />
        <Select
          classNames={{
            trigger: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Role"
          labelPlacement="outside"
          selectedKeys={[role]}
          onSelectionChange={(keys) =>
            setRole(Array.from(keys)[0]?.toString() || "all")
          }
        >
          {roles.map((entry) => (
            <SelectItem key={entry}>
              {entry === "all" ? "All roles" : entry}
            </SelectItem>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        <ResponsiveTable>
          <Table
            aria-label="Users table"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[760px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-brand-primary-50",
              td: "text-text-2",
            }}
          >
            <TableHeader>
              <TableColumn>USER ID</TableColumn>
              <TableColumn>NAME</TableColumn>
              <TableColumn>EMAIL</TableColumn>
              <TableColumn>ROLE</TableColumn>
              <TableColumn>WALLET</TableColumn>
              <TableColumn>JOINED</TableColumn>
              <TableColumn>ACTION</TableColumn>
            </TableHeader>
            <TableBody
              items={filtered}
              emptyContent="No users found with current filters."
            >
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id.slice(0, 10)}…</TableCell>
                  <TableCell>{entry.fullName}</TableCell>
                  <TableCell>{entry.email}</TableCell>
                  <TableCell>{entry.role}</TableCell>
                  <TableCell>{peso(Number(entry.walletBalance))}</TableCell>
                  <TableCell>{shortDateTime(entry.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      className="btn-brand"
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
          <DrawerHeader className="text-text-1">User detail</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p>Name: {selected.fullName}</p>
                  <p>Email: {selected.email}</p>
                  <p>Role: {selected.role}</p>
                  <p>Verified: {selected.isVerified ? "Yes" : "No"}</p>
                  <p>Wallet: {peso(Number(selected.walletBalance))}</p>
                  <p>Joined: {shortDateTime(selected.createdAt)}</p>
                </div>
                <div className="grid gap-2">
                  {!selected.isVerified ? (
                    <Button
                      className="bg-status-success-600 text-white hover:brightness-110"
                      onPress={() =>
                        handleUpdate(
                          selected.id,
                          { isVerified: true },
                          "Account verified.",
                        )
                      }
                    >
                      Verify account
                    </Button>
                  ) : null}
                  <Button
                    className="btn-brand"
                    onPress={() =>
                      handleUpdate(
                        selected.id,
                        {
                          role: selected.role === "SELLER" ? "BUYER" : "SELLER",
                        },
                        `Role changed to ${selected.role === "SELLER" ? "BUYER" : "SELLER"}.`,
                      )
                    }
                  >
                    Toggle role
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
