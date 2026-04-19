"use client";

import { ReactNode, useMemo, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Drawer, DrawerBody, DrawerContent } from "@heroui/drawer";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Tooltip } from "@heroui/tooltip";
import clsx from "clsx";

import { peso } from "@/lib/unithrift-format";
import { notifyInfo } from "@/lib/unithrift-toast";

export interface NavItem {
  label: string;
  href: string;
  shortLabel?: string;
  group?: "operations" | "governance";
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  shortLabel,
  compact = false,
  onNavigate,
}: NavItem & {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <NextLink
      className={clsx(
        "group flex items-center rounded-md transition-colors",
        compact ? "justify-center px-1 py-2 text-[11px]" : "justify-start px-3 py-2 text-sm",
        active
          ? "bg-brand-primary-700 text-white"
          : "text-text-2 hover:bg-brand-primary-100 hover:text-brand-primary-900",
      )}
      href={href}
      onClick={onNavigate}
    >
      {compact ? shortLabel || label : label}
    </NextLink>
  );
}

export function AppTopbar({
  navItems,
  walletBalance,
  showSearch = true,
  showInlineNav = false,
}: {
  navItems: NavItem[];
  walletBalance?: number;
  showSearch?: boolean;
  showInlineNav?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-brand-primary-950/95 px-3 py-3 backdrop-blur md:px-4">
      <div className="flex w-full items-center gap-3">
        <NextLink className="shrink-0 text-lg font-semibold text-brand-primary-100" href="/">
          UniThrift
        </NextLink>

        {showInlineNav ? (
          <nav className="hidden items-center gap-2 xl:flex">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex min-w-0 items-center gap-2 md:gap-3">
          {showSearch ? (
            <Input
              className="hidden w-[260px] lg:flex xl:w-[320px]"
              classNames={{
                inputWrapper:
                  "bg-brand-primary-900 border border-brand-primary-700 data-[hover=true]:border-brand-primary-400",
                input: "text-white",
              }}
              placeholder="Search..."
              type="search"
            />
          ) : null}

          {typeof walletBalance === "number" ? (
            <Chip className="hidden bg-brand-peach-100 text-text-1 md:flex" radius="sm">
              {peso(walletBalance)}
            </Chip>
          ) : null}

          <Avatar
            classNames={{ base: "bg-brand-cyan-600 text-white", name: "font-semibold" }}
            name="U"
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}

export function AppSidebar({ navItems }: { navItems: NavItem[] }) {
  return (
    <aside className="hidden border-r border-border-subtle bg-surface-bg-1 lg:block">
      <div className="sticky top-[73px] h-[calc(100vh-73px)] w-64 p-4">
        <ScrollShadow className="h-full pr-2" orientation="vertical">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </ScrollShadow>
      </div>
    </aside>
  );
}

export function MobileBottomNav({ navItems }: { navItems: NavItem[] }) {
  const items = navItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-surface-bg-1/95 p-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => (
          <NavLink key={item.href} compact {...item} />
        ))}
      </div>
    </nav>
  );
}

export function AdminQuickActions({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <Button
        className="btn-cta"
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
        className="btn-brand"
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

function AdminSidebarContent({
  navItems,
  onNavigate,
}: {
  navItems: NavItem[];
  onNavigate?: () => void;
}) {
  const operations = useMemo(
    () => navItems.filter((item) => item.group !== "governance"),
    [navItems],
  );
  const governance = useMemo(
    () => navItems.filter((item) => item.group === "governance"),
    [navItems],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-primary-700">
            UniThrift
          </p>
          <p className="text-sm font-semibold text-text-1">Admin Console</p>
        </div>
        <Chip className="bg-status-warning-100 text-text-inverse" size="sm">
          Ops
        </Chip>
      </div>

      <Divider className="bg-border-subtle" />

      <ScrollShadow className="h-full p-3" orientation="vertical">
        <Accordion
          defaultExpandedKeys={["operations"]}
          itemClasses={{
            content: "pb-2",
            heading: "text-text-2",
            trigger: "py-2",
          }}
          selectionMode="multiple"
          variant="light"
        >
          <AccordionItem key="operations" aria-label="Operations" title="Operations">
            <div className="space-y-1">
              {operations.map((item) => (
                <NavLink key={item.href} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </AccordionItem>
          <AccordionItem key="governance" aria-label="Governance" title="Governance">
            <div className="space-y-1">
              {governance.map((item) => (
                <NavLink key={item.href} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </AccordionItem>
        </Accordion>

        <Divider className="my-3 bg-border-subtle" />

        <div className="space-y-2 rounded-lg border border-border-subtle bg-brand-primary-50 p-3">
          <p className="text-xs uppercase tracking-wide text-text-3">
            Health Snapshot
          </p>
          <div className="flex flex-wrap gap-2">
            <Chip className="bg-status-warning-100 text-text-inverse" size="sm">
              Holds: 3
            </Chip>
            <Chip className="bg-status-danger-100 text-text-inverse" size="sm">
              Errors: 1
            </Chip>
          </div>
        </div>
      </ScrollShadow>
    </div>
  );
}

export function AdminWorkspace({
  navItems,
  children,
}: {
  navItems: NavItem[];
  children: ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-bg-0">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border-subtle bg-surface-bg-1 lg:block">
          <div className="sticky top-0 h-screen">
            <AdminSidebarContent navItems={navItems} />
          </div>
        </aside>

        <Drawer
          isOpen={isMobileOpen}
          placement="left"
          size="sm"
          onOpenChange={setIsMobileOpen}
        >
          <DrawerContent className="border-r border-border-subtle bg-surface-bg-1">
            <DrawerBody className="p-0">
              <AdminSidebarContent
                navItems={navItems}
                onNavigate={() => setIsMobileOpen(false)}
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-border-subtle bg-brand-primary-950/92 px-3 py-3 backdrop-blur sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Tooltip content="Open navigation">
                <Button
                  isIconOnly
                  className="bg-brand-primary-800 text-white lg:hidden"
                  onPress={() => setIsMobileOpen(true)}
                >
                  M
                </Button>
              </Tooltip>

              <Input
                className="max-w-xl"
                classNames={{
                  inputWrapper:
                    "bg-brand-primary-900 border border-brand-primary-700 data-[hover=true]:border-brand-primary-400",
                  input: "text-white",
                }}
                placeholder="Search transactions, users, orders..."
                type="search"
              />

              <div className="ml-auto flex items-center gap-2">
                <AdminQuickActions className="hidden xl:flex" />

                <Badge color="danger" content="3">
                  <Button isIconOnly className="bg-brand-primary-800 text-white">
                    !
                  </Button>
                </Badge>

                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Avatar
                      classNames={{
                        base: "cursor-pointer bg-brand-cyan-600 text-white",
                      }}
                      name="A"
                      size="sm"
                    />
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Admin actions"
                    className="bg-surface-bg-2 text-text-1"
                    onAction={(key) =>
                      notifyInfo({
                        title: "Action queued",
                        description: `Selected action: ${String(key)}.`,
                      })
                    }
                  >
                    <DropdownItem key="profile">Profile</DropdownItem>
                    <DropdownItem key="preferences">Preferences</DropdownItem>
                    <DropdownItem key="logout">Logout</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </header>

          <div className="p-3 sm:p-4 md:p-6 xl:p-8">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

