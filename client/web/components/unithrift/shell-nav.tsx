"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import clsx from "clsx";

import { notifyInfo } from "@/lib/unithrift-toast";
import { peso } from "@/lib/unithrift-format";

export interface NavItem {
  label: string;
  href: string;
}

function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <NextLink
      className={clsx(
        "rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-brand-primary-700 text-text-1"
          : "text-text-2 hover:bg-surface-bg-2 hover:text-text-1",
      )}
      href={href}
    >
      {label}
    </NextLink>
  );
}

export function AppTopbar({
  navItems,
  walletBalance,
  showSearch = true,
}: {
  navItems: NavItem[];
  walletBalance?: number;
  showSearch?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-brand-primary-950/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1480px] items-center gap-3">
        <NextLink className="shrink-0 text-lg font-semibold text-brand-primary-100" href="/">
          UniThrift
        </NextLink>
        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {showSearch ? (
            <Input
              className="hidden w-72 md:flex"
              classNames={{
                inputWrapper: "bg-surface-bg-1 border border-border-subtle",
                input: "text-text-1",
              }}
              placeholder="Search..."
              type="search"
            />
          ) : null}
          {typeof walletBalance === "number" ? (
            <Chip className="bg-brand-primary-200 text-text-inverse" radius="sm">
              Balance {peso(walletBalance)}
            </Chip>
          ) : null}
          <Avatar
            classNames={{
              base: "bg-brand-cyan-600 text-white",
              name: "font-semibold",
            }}
            name="UT"
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}

export function AppSidebar({ navItems }: { navItems: NavItem[] }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border-subtle bg-surface-bg-1 p-4 lg:block">
      <div className="space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
    </aside>
  );
}

export function MobileBottomNav({ navItems }: { navItems: NavItem[] }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-surface-bg-1/95 p-2 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-2">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
    </nav>
  );
}

export function AdminQuickActions() {
  return (
    <div className="hidden items-center gap-2 xl:flex">
      <Button
        className="bg-brand-cyan-600 text-white hover:brightness-110"
        size="sm"
        onPress={() =>
          notifyInfo({
            title: "Snapshot generated",
            description: "Operational snapshot generated for today.",
          })
        }
      >
        Create Snapshot
      </Button>
      <Button
        className="bg-brand-indigo-600 text-white hover:brightness-110"
        size="sm"
        onPress={() =>
          notifyInfo({
            title: "Audit export queued",
            description: "Audit export request added to processing queue.",
          })
        }
      >
        Export Audit
      </Button>
    </div>
  );
}
