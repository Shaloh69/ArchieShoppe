"use client";

import { useMemo, useState } from "react";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";
import { Button } from "@heroui/button";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { auditLogs } from "@/lib/unithrift-mocks";
import { shortDateTime } from "@/lib/unithrift-format";

const types = ["all", "order", "admin", "locker", "iot"];

export default function AdminAuditPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 300).toLowerCase();

  const filtered = useMemo(
    () =>
      auditLogs
        .filter((log) => (type === "all" ? true : log.type === type))
        .filter(
          (log) =>
            log.actor.toLowerCase().includes(q) ||
            log.entity.toLowerCase().includes(q) ||
            log.action.toLowerCase().includes(q),
        ),
    [q, type],
  );

  const selected = filtered.find((entry) => entry.id === selectedId) || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Audit</h1>
        <p className="text-sm text-text-2">Read-only event logs for order, admin, locker, and IoT actions.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          label="Search actor/entity/action"
          labelPlacement="outside"
          placeholder="Search logs..."
          value={query}
          onValueChange={setQuery}
        />
        <Select
          classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
          label="Type"
          labelPlacement="outside"
          selectedKeys={[type]}
          onSelectionChange={(keys) => setType(Array.from(keys)[0]?.toString() || "all")}
        >
          {types.map((entry) => (
            <SelectItem key={entry}>{entry === "all" ? "All types" : entry}</SelectItem>
          ))}
        </Select>
      </div>

      <Table
        aria-label="Audit log table"
        classNames={{
          base: "border border-border-subtle rounded-xl bg-surface-bg-2",
          th: "bg-surface-bg-3 text-text-2",
          tr: "border-b border-border-subtle hover:bg-[#11203A]",
          td: "text-text-2",
        }}
      >
        <TableHeader>
          <TableColumn>TIME</TableColumn>
          <TableColumn>TYPE</TableColumn>
          <TableColumn>ACTOR</TableColumn>
          <TableColumn>ENTITY</TableColumn>
          <TableColumn>ACTION</TableColumn>
          <TableColumn>METADATA</TableColumn>
          <TableColumn>VIEW</TableColumn>
        </TableHeader>
        <TableBody items={filtered} emptyContent="No logs match filters.">
          {(entry) => (
            <TableRow key={entry.id}>
              <TableCell>{shortDateTime(entry.time)}</TableCell>
              <TableCell>{entry.type}</TableCell>
              <TableCell>{entry.actor}</TableCell>
              <TableCell>{entry.entity}</TableCell>
              <TableCell>{entry.action}</TableCell>
              <TableCell className="max-w-44 truncate">{entry.metadata}</TableCell>
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
          <DrawerHeader className="text-text-1">Audit metadata</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-xs text-text-2">
                {selected.metadata}
              </pre>
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
