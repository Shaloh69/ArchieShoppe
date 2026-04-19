"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";

import { StatusChip } from "@/components/unithrift/status-chip";
import { ResponsiveTable } from "@/components/unithrift/responsive-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { peso } from "@/lib/unithrift-format";
import { items, myListings } from "@/lib/unithrift-mocks";
import { notifyInfo, notifySuccess } from "@/lib/unithrift-toast";

const moderationItems = [...items, ...myListings].map((item, idx) => ({
  ...item,
  flagged: idx % 3 === 0,
}));

const listingStatuses = ["all", "DRAFT", "ACTIVE", "SOLD", "REMOVED", "PENDING"];

export default function AdminListingsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(query, 300).toLowerCase();

  const filtered = useMemo(
    () =>
      moderationItems
        .filter((item) => (status === "all" ? true : item.status === status))
        .filter((item) => item.title.toLowerCase().includes(q)),
    [q, status],
  );

  const selected = filtered.find((item) => item.id === selectedId) || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Listings Moderation</h1>
        <p className="text-sm text-text-2">Approve, remove, or request edits to marketplace listings.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          label="Search"
          labelPlacement="outside"
          placeholder="Search listing title..."
          value={query}
          onValueChange={setQuery}
        />
        <Select
          classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
          label="Status"
          labelPlacement="outside"
          selectedKeys={[status]}
          onSelectionChange={(keys) => setStatus(Array.from(keys)[0]?.toString() || "all")}
        >
          {listingStatuses.map((entry) => (
            <SelectItem key={entry}>{entry === "all" ? "All statuses" : entry}</SelectItem>
          ))}
        </Select>
      </div>

      <ResponsiveTable>
        <Table
          aria-label="Admin listings moderation table"
          classNames={{
            base: "border border-border-subtle rounded-xl bg-surface-bg-2 min-w-[940px]",
            th: "bg-surface-bg-3 text-text-2",
            tr: "border-b border-border-subtle hover:bg-[#11203A]",
            td: "text-text-2",
          }}
        >
          <TableHeader>
            <TableColumn>ITEM ID</TableColumn>
            <TableColumn>TITLE</TableColumn>
            <TableColumn>SELLER</TableColumn>
            <TableColumn>PRICE</TableColumn>
            <TableColumn>SLOT</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>FLAGS</TableColumn>
            <TableColumn>ACTION</TableColumn>
          </TableHeader>
          <TableBody items={filtered} emptyContent="No listings match filters.">
            {(item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.sellerName}</TableCell>
                <TableCell>{peso(item.price)}</TableCell>
                <TableCell>{item.slotId ?? "N/A"}</TableCell>
                <TableCell>
                  <StatusChip kind="item" value={item.status} />
                </TableCell>
                <TableCell>{item.flagged ? "FLAGGED" : "OK"}</TableCell>
                <TableCell>
                  <Button
                    className="btn-brand"
                    size="sm"
                    onPress={() => setSelectedId(item.id)}
                  >
                    View
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
          <DrawerHeader className="text-text-1">Listing review</DrawerHeader>
          <DrawerBody>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border-subtle bg-surface-bg-3 p-3 text-sm text-text-2">
                  <p className="text-text-1">{selected.title}</p>
                  <p>Seller: {selected.sellerName}</p>
                  <p>Description: {selected.description}</p>
                  <p>Flags: {selected.flagged ? "Needs review" : "None"}</p>
                </div>
                <div className="grid gap-2">
                  <Button
                    className="bg-status-success-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifySuccess({
                        title: "Listing approved",
                        description: `${selected.id} is now approved.`,
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    className="bg-status-danger-600 text-white hover:brightness-110"
                    onPress={() =>
                      notifyInfo({
                        title: "Listing removed",
                        description: "Removal reason captured in moderation log.",
                      })
                    }
                  >
                    Remove
                  </Button>
                  <Button
                    className="btn-brand"
                    onPress={() =>
                      notifyInfo({
                        title: "Edit request sent",
                        description: "Seller notified to update listing details.",
                      })
                    }
                  >
                    Request edit
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

