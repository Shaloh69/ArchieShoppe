import type { NavItem } from "@/components/unithrift/shell-nav";

export const webNav: NavItem[] = [
  { label: "Browse", shortLabel: "Browse", href: "/app/browse" },
  { label: "Wallet", shortLabel: "Wallet", href: "/app/wallet" },
  { label: "Sell", shortLabel: "Sell", href: "/app/sell" },
  { label: "History", shortLabel: "History", href: "/app/history" },
  { label: "Listings", shortLabel: "Listings", href: "/app/seller/listings" },
];

export const adminNav: NavItem[] = [
  {
    label: "Overview",
    shortLabel: "Overview",
    href: "/admin/overview",
    group: "operations",
  },
  {
    label: "Transactions",
    shortLabel: "Trans",
    href: "/admin/transactions",
    group: "operations",
  },
  {
    label: "Refunds",
    shortLabel: "Refunds",
    href: "/admin/refunds",
    group: "operations",
  },
  {
    label: "Lockers",
    shortLabel: "Lockers",
    href: "/admin/lockers",
    group: "operations",
  },
  {
    label: "Listings",
    shortLabel: "Listings",
    href: "/admin/listings",
    group: "operations",
  },
  {
    label: "Users",
    shortLabel: "Users",
    href: "/admin/users",
    group: "operations",
  },
  {
    label: "Reports",
    shortLabel: "Reports",
    href: "/admin/reports",
    group: "operations",
  },
  {
    label: "Audit",
    shortLabel: "Audit",
    href: "/admin/audit",
    group: "governance",
  },
];
