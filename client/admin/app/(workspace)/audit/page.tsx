"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Button } from "@heroui/button";

import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { reportsApi, type ApiAuditLog } from "@/lib/api-client";
import { shortDateTime } from "@/lib/unithrift-format";

const types = ["all", "order", "admin", "locker", "iot"];

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 300).toLowerCase();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.auditLogs();
      setLogs(res.logs);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = useMemo(
    () =>
      logs
        .filter((log) => (type === "all" ? true : log.type === type))
        .filter(
          (log) =>
            log.actor.toLowerCase().includes(q) ||
            log.entity.toLowerCase().includes(q) ||
            log.action.toLowerCase().includes(q),
        ),
    [logs, q, type],
  );

  const selected = filtered.find((entry) => entry.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Audit</h1>
        <p className="text-sm text-text-2">
          Read-only event logs for order, admin, locker, and IoT actions.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          classNames={{
            inputWrapper: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Search actor/entity/action"
          labelPlacement="outside"
          placeholder="Search logs..."
          value={query}
          onValueChange={setQuery}
        />
        <Select
          classNames={{
            trigger: "bg-surface-bg-3 border border-border-subtle",
          }}
          label="Type"
          labelPlacement="outside"
          selectedKeys={[type]}
          onSelectionChange={(keys) =>
            setType(Array.from(keys)[0]?.toString() || "all")
          }
        >
          {types.map((entry) => (
            <SelectItem key={entry}>
              {entry === "all" ? "All types" : entry}
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
            aria-label="Audit log table"
            classNames={{
              base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[980px]",
              th: "bg-surface-bg-3 text-text-2",
              tr: "border-b border-border-subtle hover:bg-brand-primary-50",
              td: "text-text-2",
            }}
          >
            <TableHeader>
              <TableColumn>TIME</TableColumn>
              <TableColumn>TYPE</TableColumn>
              <TableColumn>ACTOR</TableColumn>
              <TableColumn>ENTITY</TableColumn>
              <TableColumn>ACTION</TableColumn>
              <TableColumn>VIEW</TableColumn>
            </TableHeader>
            <TableBody items={filtered} emptyContent="No logs match filters.">
              {(entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{shortDateTime(entry.createdAt)}</TableCell>
                  <TableCell>{entry.type}</TableCell>
                  <TableCell>{entry.actor}</TableCell>
                  <TableCell>{entry.entity}</TableCell>
                  <TableCell>{entry.action}</TableCell>
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
          <DrawerHeader className="text-text-1">Audit metadata</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-xs text-text-2">
                {JSON.stringify(selected.metadata, null, 2)}
              </pre>
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
