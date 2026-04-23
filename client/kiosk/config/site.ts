export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "UniThrift",
  description:
    "Smart locker thrift marketplace for buyers, sellers, kiosk operations, and admins.",
  navItems: [
    {
      label: "Browse",
      href: "/app/browse",
    },
    {
      label: "Wallet",
      href: "/app/wallet",
    },
    {
      label: "History",
      href: "/app/history",
    },
    {
      label: "Sell",
      href: "/app/sell",
    },
    {
      label: "My Listings",
      href: "/app/seller/listings",
    },
  ],
  navMenuItems: [
    {
      label: "Overview",
      href: "/admin/overview",
    },
    {
      label: "Transactions",
      href: "/admin/transactions",
    },
    {
      label: "Refunds",
      href: "/admin/refunds",
    },
    {
      label: "Lockers",
      href: "/admin/lockers",
    },
    {
      label: "Listings",
      href: "/admin/listings",
    },
    {
      label: "Users",
      href: "/admin/users",
    },
    {
      label: "Reports",
      href: "/admin/reports",
    },
    {
      label: "Audit",
      href: "/admin/audit",
    },
  ],
  links: {
    github: "https://github.com/",
    twitter: "https://twitter.com/",
    docs: "https://www.heroui.com/docs",
    discord: "https://discord.gg/9b6yyZKmH4",
    sponsor: "https://www.heroui.com/",
  },
};
