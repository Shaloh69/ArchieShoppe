"use client";

import { ReactNode, useMemo, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

import {
  IconLayoutGrid,
  IconCreditCard,
  IconUndo,
  IconLockClosed,
  IconTag,
  IconUsers,
  IconBarChart,
  IconShieldCheck,
  IconSettings,
  IconMenu,
  IconBell,
  IconLogOut,
} from "@/components/icons";
import { peso } from "@/lib/unithrift-format";
import { notifyInfo } from "@/lib/unithrift-toast";

export interface NavItem {
  label: string;
  href: string;
  shortLabel?: string;
  group?: "operations" | "governance";
}

const NAV_ICON: Record<string, ReactNode> = {
  "/overview":     <IconLayoutGrid size={15} />,
  "/transactions": <IconCreditCard size={15} />,
  "/refunds":      <IconUndo size={15} />,
  "/lockers":      <IconLockClosed size={15} />,
  "/listings":     <IconTag size={15} />,
  "/users":        <IconUsers size={15} />,
  "/reports":      <IconBarChart size={15} />,
  "/audit":        <IconShieldCheck size={15} />,
  "/settings":     <IconSettings size={15} />,
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const sidebarVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const sidebarItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

function SidebarNavLink({
  href,
  label,
  onNavigate,
}: NavItem & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  const icon = NAV_ICON[href];

  return (
    <motion.div variants={sidebarItemVariants}>
      <NextLink
        href={href}
        onClick={onNavigate}
        className={clsx(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "text-white"
            : "text-brand-primary-300 hover:bg-brand-primary-800/60 hover:text-white",
        )}
      >
        {active && (
          <motion.span
            layoutId="sidebar-indicator"
            className="absolute inset-0 rounded-lg bg-brand-primary-700"
            style={{ zIndex: -1 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        {icon && (
          <span className={clsx("shrink-0", active ? "text-white" : "text-brand-primary-400 group-hover:text-white")}>
            {icon}
          </span>
        )}
        {label}
      </NextLink>
    </motion.div>
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
    <header className="sticky top-0 z-40 border-b border-brand-primary-800/50 bg-brand-primary-950/95 px-3 py-3 backdrop-blur md:px-4">
      <div className="flex w-full items-center gap-3">
        <NextLink
          className="shrink-0 text-lg font-semibold text-brand-primary-100"
          href="/"
        >
          UniThrift
        </NextLink>

        {showInlineNav ? (
          <nav className="hidden items-center gap-2 xl:flex">
            {navItems.map((item) => (
              <SidebarNavLink key={item.href} {...item} />
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
                input: "text-white placeholder:text-brand-primary-400",
              }}
              placeholder="Search..."
              type="search"
            />
          ) : null}

          {typeof walletBalance === "number" ? (
            <Chip className="hidden bg-brand-primary-800 text-brand-primary-200 md:flex" radius="sm">
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
    <aside className="hidden border-r border-brand-primary-800/50 bg-brand-primary-950 lg:block">
      <div className="sticky top-[73px] h-[calc(100vh-73px)] w-64 p-4">
        <ScrollShadow className="h-full pr-2" orientation="vertical">
          <motion.div
            className="space-y-1"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
          >
            {navItems.map((item) => (
              <SidebarNavLink key={item.href} {...item} />
            ))}
          </motion.div>
        </ScrollShadow>
      </div>
    </aside>
  );
}

export function MobileBottomNav({ navItems }: { navItems: NavItem[] }) {
  const items = navItems.slice(0, 5);
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-primary-800/50 bg-brand-primary-950/95 p-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const icon = NAV_ICON[item.href];
          return (
            <NextLink
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 rounded-md px-1 py-2 text-[10px] transition-colors",
                active
                  ? "text-white"
                  : "text-brand-primary-400 hover:text-white",
              )}
            >
              {icon}
              {item.shortLabel || item.label}
            </NextLink>
          );
        })}
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
    <div className="flex h-full flex-col bg-brand-primary-950">
      <div className="flex items-center justify-between gap-2 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-primary-400">
            UniThrift
          </p>
          <p className="text-sm font-semibold text-white">Admin Console</p>
        </div>
        <Chip className="bg-brand-primary-800 text-brand-primary-200" size="sm">
          Ops
        </Chip>
      </div>

      <Divider className="bg-brand-primary-800/60" />

      <ScrollShadow className="h-full p-3" orientation="vertical">
        <motion.div
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
        >
          <Accordion
            defaultExpandedKeys={["operations", "governance"]}
            itemClasses={{
              content: "pb-2",
              heading: "text-brand-primary-400",
              trigger: "py-2 text-brand-primary-400 hover:text-brand-primary-200",
              title: "text-xs uppercase tracking-[0.15em] font-semibold text-brand-primary-400",
            }}
            selectionMode="multiple"
            variant="light"
          >
            <AccordionItem
              key="operations"
              aria-label="Operations"
              title="Operations"
            >
              <div className="space-y-0.5">
                {operations.map((item) => (
                  <SidebarNavLink key={item.href} {...item} onNavigate={onNavigate} />
                ))}
              </div>
            </AccordionItem>
            <AccordionItem
              key="governance"
              aria-label="Governance"
              title="Governance"
            >
              <div className="space-y-0.5">
                {governance.map((item) => (
                  <SidebarNavLink key={item.href} {...item} onNavigate={onNavigate} />
                ))}
              </div>
            </AccordionItem>
          </Accordion>
        </motion.div>

        <Divider className="my-3 bg-brand-primary-800/60" />

        <div className="space-y-2 rounded-lg border border-brand-primary-800/60 bg-brand-primary-900/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-brand-primary-400">
            Health Snapshot
          </p>
          <div className="flex flex-wrap gap-2">
            <Chip className="bg-status-warning-100 text-text-1" size="sm">
              Holds: 3
            </Chip>
            <Chip className="bg-status-danger-100 text-text-1" size="sm">
              Errors: 1
            </Chip>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-primary-400 transition-colors hover:bg-brand-primary-800/60 hover:text-white"
            onClick={() => notifyInfo({ title: "Logged out", description: "You have been signed out." })}
          >
            <IconLogOut size={15} />
            Sign out
          </button>
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
        <aside className="hidden border-r border-brand-primary-800/50 bg-brand-primary-950 lg:block">
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
          <DrawerContent className="border-r border-brand-primary-800/50 bg-brand-primary-950">
            <DrawerBody className="p-0">
              <AdminSidebarContent
                navItems={navItems}
                onNavigate={() => setIsMobileOpen(false)}
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-brand-primary-800/50 bg-brand-primary-950/92 px-3 py-3 backdrop-blur sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Tooltip content="Open navigation">
                <Button
                  isIconOnly
                  className="bg-brand-primary-800/80 text-white hover:bg-brand-primary-700 lg:hidden"
                  onPress={() => setIsMobileOpen(true)}
                >
                  <IconMenu size={18} />
                </Button>
              </Tooltip>

              <Input
                className="max-w-xl"
                classNames={{
                  inputWrapper:
                    "bg-brand-primary-900/80 border border-brand-primary-700/60 data-[hover=true]:border-brand-primary-500",
                  input: "text-white placeholder:text-brand-primary-400",
                }}
                placeholder="Search transactions, users, orders..."
                type="search"
              />

              <div className="ml-auto flex items-center gap-2">
                <AdminQuickActions className="hidden xl:flex" />

                <Badge color="danger" content="3">
                  <Button
                    isIconOnly
                    className="bg-brand-primary-800/80 text-white hover:bg-brand-primary-700"
                  >
                    <IconBell size={18} />
                  </Button>
                </Badge>

                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Avatar
                      classNames={{
                        base: "cursor-pointer bg-brand-cyan-600 text-white ring-2 ring-brand-primary-700",
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
