"use client";

import { useMemo, useState } from "react";
import NextLink from "next/link";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { motion } from "framer-motion";

import { StatusChip } from "@/components/unithrift/status-chip";
import { EmptyBlock } from "@/components/unithrift/state-block";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { categories, conditions, items } from "@/lib/unithrift-mocks";
import { peso } from "@/lib/unithrift-format";

const sortOptions = [
  { key: "latest", label: "Latest" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
];
const categoryOptions = ["all", ...categories];
const conditionOptions = ["all", ...conditions];

export default function BrowsePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [condition, setCondition] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  const query = useDebouncedValue(search, 350).toLowerCase();

  const filteredItems = useMemo(() => {
    const next = items
      .filter((item) => item.status === "ACTIVE")
      .filter((item) => item.title.toLowerCase().includes(query))
      .filter((item) => (category === "all" ? true : item.category === category))
      .filter((item) => (condition === "all" ? true : item.condition === condition));

    if (sortBy === "price-asc") next.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") next.sort((a, b) => b.price - a.price);

    return next;
  }, [category, condition, query, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setCondition("all");
    setSortBy("latest");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text-1">Browse</h1>
        <p className="text-sm text-text-2">Available items in lockers, ready for purchase.</p>
      </div>

      <Card className="border border-border-subtle bg-surface-bg-2">
        <CardBody className="grid gap-3 md:grid-cols-4">
          <Input
            classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
            label="Search"
            labelPlacement="outside"
            placeholder="Item name..."
            type="search"
            value={search}
            onValueChange={setSearch}
          />
          <Select
            classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
            label="Category"
            labelPlacement="outside"
            selectedKeys={[category]}
            onSelectionChange={(keys) => setCategory(Array.from(keys)[0]?.toString() || "all")}
          >
            {categoryOptions.map((entry) => (
              <SelectItem key={entry}>
                {entry === "all" ? "All categories" : entry}
              </SelectItem>
            ))}
          </Select>
          <Select
            classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
            label="Condition"
            labelPlacement="outside"
            selectedKeys={[condition]}
            onSelectionChange={(keys) => setCondition(Array.from(keys)[0]?.toString() || "all")}
          >
            {conditionOptions.map((entry) => (
              <SelectItem key={entry}>
                {entry === "all" ? "All conditions" : entry}
              </SelectItem>
            ))}
          </Select>
          <Select
            classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
            label="Sort"
            labelPlacement="outside"
            selectedKeys={[sortBy]}
            onSelectionChange={(keys) => setSortBy(Array.from(keys)[0]?.toString() || "latest")}
          >
            {sortOptions.map((entry) => (
              <SelectItem key={entry.key}>{entry.label}</SelectItem>
            ))}
          </Select>
        </CardBody>
      </Card>

      {filteredItems.length === 0 ? (
        <EmptyBlock
          actionLabel="Clear filters"
          description="Try broadening your search, category, or condition filters."
          title="No items found"
          onAction={clearFilters}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
            >
              <Card className="h-full border border-border-subtle bg-surface-bg-2 transition-all duration-250 hover:-translate-y-1 hover:border-brand-primary-400">
                <CardBody className="gap-3 p-5">
                  <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-brand-primary-900 to-brand-primary-700" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-text-1">{item.title}</h3>
                      <p className="text-sm text-text-2">{item.sellerName}</p>
                    </div>
                    <StatusChip kind="item" value="ACTIVE" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-2">{item.condition}</span>
                    <span className="text-xl font-semibold text-brand-primary-300">{peso(item.price)}</span>
                  </div>
                </CardBody>
                <CardFooter className="p-5 pt-0">
                  <Button
                    as={NextLink}
                    className="focus-ring w-full bg-brand-primary-600 text-white hover:bg-brand-primary-500"
                    href={`/app/item/${item.id}`}
                  >
                    View
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
