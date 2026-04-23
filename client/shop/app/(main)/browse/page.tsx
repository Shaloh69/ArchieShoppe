"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { itemsApi, type ApiItem } from "@/lib/api-client";
import { categories } from "@/lib/unithrift-mocks";
import { peso } from "@/lib/unithrift-format";

export default function BrowsePage() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const debouncedQuery = useDebouncedValue(query, 300);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (category !== "all") params.category = category;
      if (debouncedQuery) params.q = debouncedQuery;
      const res = await itemsApi.browse(params);
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, debouncedQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <div className="sale-shimmer flex items-center justify-between rounded-2xl px-5 py-4 text-white shadow-md">
        <div>
          <p className="text-xs font-medium opacity-80">Student Marketplace</p>
          <h1 className="text-2xl font-bold">Find a Deal</h1>
          <p className="mt-0.5 text-sm opacity-90">Second-hand items at UCLM</p>
        </div>
        <span className="text-5xl">🛍️</span>
      </div>

      {/* Search */}
      <Input
        classNames={{
          inputWrapper: "bg-surface-bg-2 border border-border-strong shadow-sm",
          input: "text-text-1",
        }}
        placeholder="Search items..."
        startContent={
          <svg className="text-text-3" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        }
        value={query}
        onValueChange={setQuery}
      />

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {["all", ...categories].map((cat) => (
          <button
            key={cat}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              category === cat
                ? "border-brand-primary-600 bg-brand-primary-600 text-white"
                : "border-border-strong bg-surface-bg-2 text-text-2 hover:border-brand-primary-400"
            }`}
            onClick={() => setCategory(cat)}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-text-3">
          {items.length} item{items.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner color="warning" size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl">📦</p>
          <p className="mt-2 font-medium text-text-2">No items found</p>
          <p className="text-sm text-text-3">Try a different category or search</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <NextLink key={item.id} className="product-card block" href={`/item/${item.id}`}>
              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-bg-2 shadow-sm">
                <div className="relative aspect-square w-full overflow-hidden bg-surface-bg-3">
                  {item.imageUrl ? (
                    <img
                      alt={item.title}
                      className="h-full w-full object-cover"
                      src={`${process.env.NEXT_PUBLIC_API_URL}${item.imageUrl}`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-primary-200 to-brand-teal-100 text-4xl">
                      🏷️
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                    {item.condition}
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-text-1">
                    {item.title}
                  </p>
                  {item.seller?.fullName && (
                    <p className="mt-0.5 text-xs text-text-3">{item.seller.fullName}</p>
                  )}
                  <p className="mt-1.5 text-lg font-bold text-brand-primary-600">
                    {peso(Number(item.price))}
                  </p>
                </div>
              </div>
            </NextLink>
          ))}
        </div>
      )}
    </div>
  );
}
