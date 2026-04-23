"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";

import { useAuth } from "@/contexts/auth-context";
import { itemsApi, type ApiItem } from "@/lib/api-client";
import { categories } from "@/lib/unithrift-mocks";
import { peso } from "@/lib/unithrift-format";

export default function KioskBuyBrowsePage() {
  const { user } = useAuth();
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (category !== "all") params.category = category;
      const res = await itemsApi.browse(params);
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const balance = Number(user?.walletBalance ?? 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-text-1">Browse Items</h1>
        <Chip
          className="bg-brand-primary-200 px-2 py-1 text-sm text-text-inverse"
          radius="sm"
        >
          Balance {peso(balance)}
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

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="border border-border-subtle bg-surface-bg-2"
            >
              <CardBody className="gap-3 p-5">
                {item.imageUrl ? (
                  <img
                    alt={item.title}
                    className="aspect-[16/10] w-full rounded-lg object-cover"
                    src={`${process.env.NEXT_PUBLIC_API_URL}${item.imageUrl}`}
                  />
                ) : (
                  <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-brand-primary-900 to-brand-primary-700" />
                )}
                <p className="text-xl font-semibold text-text-1">
                  {item.title}
                </p>
                <p className="text-sm text-text-2">{item.condition}</p>
                <p className="text-2xl font-semibold text-brand-primary-800">
                  {peso(Number(item.price))}
                </p>
                <Button
                  as={NextLink}
                  className="h-14 text-lg btn-cta"
                  href={`/kiosk/buy/item/${item.id}`}
                >
                  View
                </Button>
              </CardBody>
            </Card>
          ))}
          {items.length === 0 ? (
            <p className="col-span-full py-10 text-center text-text-2">
              No items available.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
