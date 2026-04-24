import type { NavItem } from "@/components/unithrift/shell-nav";

export const adminNav: NavItem[] = [
  {
    label: "Overview",
    shortLabel: "Overview",
    href: "/overview",
    group: "operations",
  },
  {
    label: "Transactions",
    shortLabel: "Trans",
    href: "/transactions",
    group: "operations",
  },
  {
    label: "Refunds",
    shortLabel: "Refunds",
    href: "/refunds",
    group: "operations",
  },
  {
    label: "Cashouts",
    shortLabel: "Cashouts",
    href: "/cashouts",
    group: "operations",
  },
  {
    label: "Lockers",
    shortLabel: "Lockers",
    href: "/lockers",
    group: "operations",
  },
  {
    label: "Monitor",
    shortLabel: "Monitor",
    href: "/monitor",
    group: "operations",
  },
  {
    label: "Listings",
    shortLabel: "Listings",
    href: "/listings",
    group: "operations",
  },
  { label: "Users", shortLabel: "Users", href: "/users", group: "operations" },
  {
    label: "Reports",
    shortLabel: "Reports",
    href: "/reports",
    group: "operations",
  },
  { label: "Audit", shortLabel: "Audit", href: "/audit", group: "governance" },
  {
    label: "Settings",
    shortLabel: "Settings",
    href: "/settings",
    group: "governance",
  },
];
