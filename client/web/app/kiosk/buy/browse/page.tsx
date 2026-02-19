"use client";

import { useMemo, useState } from "react";
import NextLink from "next/link";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";

import { categories, items, walletBalance } from "@/lib/unithrift-mocks";
import { peso } from "@/lib/unithrift-format";

export default function KioskBuyBrowsePage() {
  const [category, setCategory] = useState("all");

  const visible = useMemo(
    () =>
      items
        .filter((item) => item.status === "ACTIVE")
        .filter((item) => (category === "all" ? true : item.category === category)),
    [category],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-text-1">Browse Items</h1>
        <Chip className="bg-brand-primary-200 px-2 py-1 text-sm text-text-inverse" radius="sm">
          Balance {peso(walletBalance)}
        </Chip>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className={`h-12 px-6 text-lg ${
            category === "all"
              ? "bg-brand-primary-500 text-white"
              : "bg-surface-bg-2 text-text-2 hover:bg-surface-bg-3"
          }`}
          onPress={() => setCategory("all")}
        >
          All
        </Button>
        {categories.map((entry) => (
          <Button
            key={entry}
            className={`h-12 px-6 text-lg ${
              category === entry
                ? "bg-brand-primary-500 text-white"
                : "bg-surface-bg-2 text-text-2 hover:bg-surface-bg-3"
            }`}
            onPress={() => setCategory(entry)}
          >
            {entry}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => (
          <Card key={item.id} className="border border-border-subtle bg-surface-bg-2">
            <CardBody className="gap-3 p-5">
              <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-brand-primary-900 to-brand-primary-700" />
              <p className="text-xl font-semibold text-text-1">{item.title}</p>
              <p className="text-sm text-text-2">{item.condition}</p>
              <p className="text-2xl font-semibold text-brand-primary-300">{peso(item.price)}</p>
              <Button
                as={NextLink}
                className="h-14 text-lg bg-brand-primary-500 text-white hover:bg-brand-primary-400"
                href={`/kiosk/buy/item/${item.id}`}
              >
                View
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
