"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@heroui/input";
import { Skeleton } from "@heroui/skeleton";

import { useAuth } from "@/contexts/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { itemsApi, wishlistApi, type ApiItem } from "@/lib/api-client";
import { categories } from "@/lib/unithrift-mocks";
import { peso } from "@/lib/unithrift-format";
import { notifyError } from "@/lib/unithrift-toast";

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  Clothing: { emoji: "👗", color: "bg-pink-100 text-pink-700" },
  Electronics: { emoji: "📱", color: "bg-blue-100 text-blue-700" },
  Books: { emoji: "📚", color: "bg-amber-100 text-amber-700" },
  Accessories: { emoji: "👜", color: "bg-purple-100 text-purple-700" },
  "School Supplies": { emoji: "✏️", color: "bg-green-100 text-green-700" },
  Sports: { emoji: "⚽", color: "bg-cyan-100 text-cyan-700" },
  Food: { emoji: "🍱", color: "bg-orange-100 text-orange-700" },
  Other: { emoji: "📦", color: "bg-gray-100 text-gray-600" },
};

const CONDITION_COLOR: Record<string, string> = {
  NEW: "bg-brand-green-100 text-brand-green-700",
  LIKE_NEW: "bg-brand-teal-100 text-brand-teal-700",
  GOOD: "bg-brand-gold-100 text-brand-gold-700",
  FAIR: "bg-brand-primary-100 text-brand-primary-700",
};

const CONDITION_LABEL: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
};

type SortKey = "newest" | "price_asc" | "price_desc";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
];

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
  },
};

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-bg-1 shadow-sm">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3.5 w-4/5 rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
        <Skeleton className="h-5 w-1/2 rounded" />
      </div>
    </div>
  );
}

function HeartButton({
  itemId,
  initialSaved,
  initialCount,
  onToggle,
}: {
  itemId: string;
  initialSaved: boolean;
  initialCount: number;
  onToggle?: (saved: boolean) => void;
}) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      notifyError({
        title: "Login required",
        description: "Sign in to save items.",
      });
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    setCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try {
      await wishlistApi.toggle(itemId);
      onToggle?.(next);
    } catch {
      setSaved(!next);
      setCount((c) => (!next ? c + 1 : Math.max(0, c - 1)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold shadow-sm backdrop-blur-sm transition-all duration-150 active:scale-90"
      onClick={toggle}
    >
      <motion.span
        animate={{ scale: saved ? [1, 1.35, 1] : 1 }}
        transition={{ duration: 0.25 }}
        className={saved ? "text-red-500" : "text-gray-400"}
        style={{ lineHeight: 1 }}
      >
        {saved ? "♥" : "♡"}
      </motion.span>
      {count > 0 && <span className="text-text-2">{count}</span>}
    </button>
  );
}

// Store recently viewed in localStorage
function recordRecentlyViewed(item: ApiItem) {
  try {
    const raw = localStorage.getItem("ut_recent") ?? "[]";
    const ids: string[] = JSON.parse(raw);
    const next = [item.id, ...ids.filter((id) => id !== item.id)].slice(0, 10);
    localStorage.setItem("ut_recent", JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export default function BrowsePage() {
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sortBy: sort };
      if (category !== "all") params.category = category;
      if (debouncedQuery) params.search = debouncedQuery;
      const res = await itemsApi.browse(params);
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, sort, debouncedQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26 }}
        className="hero-gradient relative overflow-hidden rounded-2xl px-5 py-5 text-white shadow-md"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-4 right-12 h-16 w-16 rounded-full bg-brand-gold-400/20 blur-xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-80">
            Student Marketplace · UCLM
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold leading-tight">
            Find a Deal
          </h1>
          <p className="mt-1 text-sm opacity-90">
            Second-hand items — priced by students, for students
          </p>
        </div>
        <span className="pointer-events-none absolute bottom-3 right-5 select-none text-5xl opacity-80">
          🛍️
        </span>
      </motion.div>

      {/* Search + filter toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.06 }}
        className="flex gap-2"
      >
        <Input
          classNames={{
            inputWrapper:
              "bg-surface-bg-1 border border-border-strong shadow-sm hover:border-brand-primary-400 transition-colors flex-1",
            input: "text-text-1 placeholder:text-text-4",
          }}
          placeholder="Search items…"
          startContent={
            <svg
              className="shrink-0 text-text-4"
              fill="none"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="16"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          }
          value={query}
          onValueChange={setQuery}
        />
        <button
          className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-all ${showFilters ? "border-brand-primary-500 bg-brand-primary-50 text-brand-primary-600" : "border-border-strong bg-surface-bg-1 text-text-2"}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <svg
            fill="none"
            height="14"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="14"
          >
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="8" x2="16" y1="12" y2="12" />
            <line x1="12" x2="12" y1="18" y2="18" />
          </svg>
          Filter
        </button>
      </motion.div>

      {/* Sort strip (always visible) */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: "none" }}
      >
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-text-4">
          Sort:
        </span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
              sort === opt.key
                ? "border-brand-primary-600 bg-brand-primary-600 text-white"
                : "border-border-strong bg-surface-bg-1 text-text-2 hover:border-brand-primary-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
            category === "all"
              ? "border-brand-primary-600 bg-brand-primary-600 text-white shadow-sm"
              : "border-border-strong bg-surface-bg-1 text-text-2 hover:border-brand-primary-400 hover:bg-brand-primary-50"
          }`}
          onClick={() => setCategory("all")}
        >
          All
        </button>
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = category === cat;
          return (
            <button
              key={cat}
              className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "border-brand-primary-600 bg-brand-primary-600 text-white shadow-sm"
                  : "border-border-strong bg-surface-bg-1 text-text-2 hover:border-brand-primary-400 hover:bg-brand-primary-50"
              }`}
              onClick={() => setCategory(cat)}
            >
              <span className="text-base leading-none">{meta?.emoji}</span>
              {cat}
            </button>
          );
        })}
      </motion.div>

      {/* Count */}
      {!loading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-text-4"
        >
          {items.length} item{items.length !== 1 ? "s" : ""} found
        </motion.p>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-16 text-center"
        >
          <p className="text-4xl">📦</p>
          <p className="mt-2 font-semibold text-text-2">No items found</p>
          <p className="mt-1 text-sm text-text-4">
            Try a different category or search term
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          {items.map((item) => (
            <motion.div key={item.id} variants={cardVariants}>
              <NextLink
                className="block"
                href={`/item/${item.id}`}
                onClick={() => recordRecentlyViewed(item)}
              >
                <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-bg-1 shadow-sm">
                  {/* Image */}
                  <div className="relative aspect-square w-full overflow-hidden bg-surface-bg-3">
                    {item.imageUrl ? (
                      <img
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        src={
                          item.imageUrl.startsWith("http")
                            ? item.imageUrl
                            : `${process.env.NEXT_PUBLIC_API_URL}${item.imageUrl}`
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-primary-100 to-brand-gold-50 text-4xl">
                        {CATEGORY_META[item.category ?? ""]?.emoji ?? "🏷️"}
                      </div>
                    )}
                    {/* Condition badge */}
                    <span
                      className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${CONDITION_COLOR[item.condition ?? ""] ?? "bg-black/40 text-white"}`}
                    >
                      {CONDITION_LABEL[item.condition ?? ""] ?? item.condition}
                    </span>
                    {/* Heart/save button */}
                    <HeartButton
                      itemId={item.id}
                      initialSaved={item.isSaved ?? false}
                      initialCount={item.savedCount ?? 0}
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-text-1">
                      {item.title}
                    </p>
                    {item.seller?.fullName && (
                      <p className="mt-0.5 truncate text-[11px] text-text-4">
                        {item.seller.fullName}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-base font-extrabold text-brand-primary-600">
                        {peso(Number(item.displayPrice ?? item.price))}
                      </p>
                      {item.displayPrice &&
                        item.displayPrice !== Number(item.price) && (
                          <p className="text-[10px] text-text-4 line-through">
                            {peso(Number(item.price))}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              </NextLink>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
