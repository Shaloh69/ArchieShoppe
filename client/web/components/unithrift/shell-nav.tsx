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
  IconBarChart,
  IconBell,
  IconCreditCard,
  IconLayoutGrid,
  IconLockClosed,
  IconLogOut,
  IconMenu,
  IconSettings,
  IconShieldCheck,
  IconTag,
  IconUndo,
  IconUsers,
  SearchIcon,
} from "@/components/icons";
import { peso } from "@/lib/unithrift-format";
import { notifyInfo } from "@/lib/unithrift-toast";

export interface NavItem {
  label: string;
  href: string;
  shortLabel?: string;
  group?: "operations" | "governance";
}

// ── Icon map by route ─────────────────────────────────────────────
const NAV_ICON: Record<string, ReactNode> = {
  "/admin/overview":     <IconLayoutGrid size={15} />,
  "/admin/transactions": <IconCreditCard size={15} />,
  "/admin/refunds":      <IconUndo size={15} />,
  "/admin/lockers":      <IconLockClosed size={15} />,
  "/admin/listings":     <IconTag size={15} />,
  "/admin/users":        <IconUsers size={15} />,
  "/admin/reports":      <IconBarChart size={15} />,
  "/admin/audit":        <IconShieldCheck size={15} />,
  "/admin/settings":     <IconSettings size={15} />,
};

const APP_NAV_ICON: Record<string, ReactNode> = {
  "/app/browse":           <IconTag size={14} />,
  "/app/wallet":           <IconCreditCard size={14} />,
  "/app/sell":             <IconTag size={14} />,
  "/app/history":          <IconUndo size={14} />,
  "/app/seller/listings":  <IconLayoutGrid size={14} />,
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Sidebar NavLink ───────────────────────────────────────────────
function SidebarNavLink({
  href,
  label,
  onNavigate,
}: NavItem & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  const icon = NAV_ICON[href];

  return (
    <motion.div
      whileHover={{ x: active ? 0 : 3 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    >
      <NextLink
        className={clsx(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
          active
            ? "bg-white/10 text-white"
            : "text-brand-primary-300 hover:bg-white/6 hover:text-white",
        )}
        href={href}
        onClick={onNavigate}
      >
        {/* Active left bar */}
        <AnimatePresence>
          {active && (
            <motion.span
              key="indicator"
              layoutId="sidebar-indicator"
              className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-brand-primary-400"
              initial={{ opacity: 0, scaleY: 0.5 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </AnimatePresence>

        {icon && (
          <span
            className={clsx(
              "shrink-0 transition-colors duration-150",
              active ? "text-brand-primary-400" : "text-brand-primary-400/60 group-hover:text-brand-primary-400",
            )}
          >
            {icon}
          </span>
        )}
        {label}
      </NextLink>
    </motion.div>
  );
}

// ── App (shop) NavLink ────────────────────────────────────────────
function NavLink({
  href,
  label,
  shortLabel,
  compact = false,
  onNavigate,
}: NavItem & { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  const icon = APP_NAV_ICON[href];

  return (
    <NextLink
      className={clsx(
        "group flex items-center gap-2 rounded-md transition-colors",
        compact
          ? "flex-col justify-center px-1 py-2 text-[11px] gap-0.5"
          : "justify-start px-3 py-2 text-sm",
        active
          ? "bg-brand-primary-100 text-brand-primary-800 font-medium"
          : "text-text-2 hover:bg-surface-bg-3 hover:text-text-1",
      )}
      href={href}
      onClick={onNavigate}
    >
      {icon && (
        <span className={clsx("shrink-0", active ? "text-brand-primary-600" : "text-text-3 group-hover:text-text-2")}>
          {icon}
        </span>
      )}
      {compact ? shortLabel || label : label}
    </NextLink>
  );
}

// ── App Topbar ────────────────────────────────────────────────────
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
        <NextLink
          className="shrink-0 text-lg font-semibold text-white"
          href="/"
        >
          UniThrift
        </NextLink>

        {showInlineNav && (
          <nav className="hidden items-center gap-1 xl:flex">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        )}

        <div className="ml-auto flex min-w-0 items-center gap-2 md:gap-3">
          {showSearch && (
            <Input
              className="hidden w-[260px] lg:flex xl:w-[320px]"
              classNames={{
                inputWrapper:
                  "bg-white/8 border border-white/15 data-[hover=true]:border-white/30",
                input: "text-white placeholder:text-white/40",
              }}
              placeholder="Search..."
              startContent={<SearchIcon className="text-white/40" />}
              type="search"
            />
          )}

          {typeof walletBalance === "number" && (
            <Chip
              className="hidden bg-brand-peach-100 text-text-1 font-medium md:flex"
              radius="sm"
              size="sm"
            >
              {peso(walletBalance)}
            </Chip>
          )}

          <Avatar
            classNames={{ base: "bg-brand-cyan-600 text-white ring-2 ring-white/20", name: "font-semibold" }}
            name="U"
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}

// ── App Sidebar ───────────────────────────────────────────────────
export function AppSidebar({ navItems }: { navItems: NavItem[] }) {
  return (
    <aside className="hidden border-r border-border-subtle bg-surface-bg-1 lg:block">
      <div className="sticky top-[73px] h-[calc(100vh-73px)] w-64 p-4">
        <ScrollShadow className="h-full pr-2" orientation="vertical">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </ScrollShadow>
      </div>
    </aside>
  );
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────
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

// ── Admin Quick Actions ───────────────────────────────────────────
export function AdminQuickActions({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <Button
        className="btn-cta text-xs"
        size="sm"
        onPress={() =>
          notifyInfo({
            title: "Snapshot generated",
            description: "Operational snapshot generated for today.",
          })
        }
      >
        Snapshot
      </Button>
      <Button
        className="btn-brand text-xs"
        size="sm"
        onPress={() =>
          notifyInfo({
            title: "Export queued",
            description: "Audit export added to processing queue.",
          })
        }
      >
        Export Audit
      </Button>
    </div>
  );
}

// ── Admin Sidebar Content ─────────────────────────────────────────
const sidebarVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};
const sidebarItemVariants = {
  hidden:   { opacity: 0, x: -12 },
  visible:  { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

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
    <motion.div
      className="flex h-full flex-col bg-brand-primary-950"
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Logo / Brand */}
      <motion.div
        className="flex items-center justify-between gap-2 px-4 py-4"
        variants={sidebarItemVariants}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-primary-400">
            UniThrift
          </p>
          <p className="text-sm font-bold text-white">Admin Console</p>
        </div>
        <Chip
          className="border border-status-warning-600/40 bg-status-warning-100/10 text-status-warning-200"
          size="sm"
          variant="flat"
        >
          Ops
        </Chip>
      </motion.div>

      <motion.div variants={sidebarItemVariants}>
        <Divider className="bg-white/8" />
      </motion.div>

      <ScrollShadow className="flex-1 px-3 py-3" orientation="vertical">
        <Accordion
          defaultExpandedKeys={["operations", "governance"]}
          itemClasses={{
            base: "gap-0",
            content: "pb-2 pt-1",
            heading: "py-0",
            trigger: "py-2 px-1 text-brand-primary-300/70 hover:text-brand-primary-200 data-[open=true]:text-brand-primary-200",
            title: "text-xs font-semibold uppercase tracking-wider",
            indicator: "text-brand-primary-400",
          }}
          selectionMode="multiple"
          variant="light"
        >
          <AccordionItem
            key="operations"
            aria-label="Operations"
            title="Operations"
          >
            <motion.div
              className="space-y-0.5"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
            >
              {operations.map((item) => (
                <motion.div key={item.href} variants={sidebarItemVariants}>
                  <SidebarNavLink {...item} onNavigate={onNavigate} />
                </motion.div>
              ))}
            </motion.div>
          </AccordionItem>

          <AccordionItem
            key="governance"
            aria-label="Governance"
            title="Governance"
          >
            <motion.div
              className="space-y-0.5"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
            >
              {governance.map((item) => (
                <motion.div key={item.href} variants={sidebarItemVariants}>
                  <SidebarNavLink {...item} onNavigate={onNavigate} />
                </motion.div>
              ))}
            </motion.div>
          </AccordionItem>
        </Accordion>

        {/* Health Snapshot */}
        <motion.div variants={sidebarItemVariants}>
          <Divider className="my-3 bg-white/8" />
          <div className="rounded-xl border border-white/8 bg-white/5 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-brand-primary-400">
              Health Snapshot
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                className="border border-status-warning-600/30 bg-status-warning-100/10 text-status-warning-200"
                size="sm"
                variant="flat"
              >
                Holds: 3
              </Chip>
              <Chip
                className="border border-status-danger-600/30 bg-status-danger-100/10 text-status-danger-200"
                size="sm"
                variant="flat"
              >
                Errors: 1
              </Chip>
            </div>
          </div>
        </motion.div>
      </ScrollShadow>
    </motion.div>
  );
}

// ── Admin Workspace (full layout) ─────────────────────────────────
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
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-0 h-screen shadow-[2px_0_12px_0_rgb(0_0_0/0.12)]">
            <AdminSidebarContent navItems={navItems} />
          </div>
        </aside>

        {/* Mobile drawer */}
        <Drawer
          isOpen={isMobileOpen}
          placement="left"
          size="xs"
          onOpenChange={setIsMobileOpen}
        >
          <DrawerContent className="p-0">
            <DrawerBody className="p-0">
              <AdminSidebarContent
                navItems={navItems}
                onNavigate={() => setIsMobileOpen(false)}
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* Main area */}
        <section className="min-w-0 flex flex-col">
          {/* Top header */}
          <header className="sticky top-0 z-30 border-b border-white/8 bg-brand-primary-950/95 px-3 py-2.5 backdrop-blur sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Tooltip content="Open navigation">
                <Button
                  isIconOnly
                  className="bg-white/10 text-white hover:bg-white/18 lg:hidden"
                  size="sm"
                  onPress={() => setIsMobileOpen(true)}
                >
                  <IconMenu size={18} />
                </Button>
              </Tooltip>

              <Input
                className="max-w-xl"
                classNames={{
                  inputWrapper:
                    "bg-white/8 border border-white/15 data-[hover=true]:border-white/30",
                  input: "text-white placeholder:text-white/40",
                }}
                placeholder="Search transactions, users, orders…"
                startContent={<SearchIcon className="text-white/40" />}
                type="search"
              />

              <div className="ml-auto flex items-center gap-2">
                <AdminQuickActions className="hidden xl:flex" />

                <Badge color="danger" content="3" size="sm">
                  <Button
                    isIconOnly
                    className="bg-white/10 text-white hover:bg-white/18"
                    size="sm"
                  >
                    <IconBell size={17} />
                  </Button>
                </Badge>

                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Avatar
                      classNames={{
                        base: "cursor-pointer bg-brand-cyan-600 ring-2 ring-white/20",
                      }}
                      name="A"
                      size="sm"
                    />
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Admin actions"
                    classNames={{ base: "bg-surface-bg-2 shadow-xl", list: "gap-0.5" }}
                    onAction={(key) =>
                      notifyInfo({
                        title: "Action queued",
                        description: `Selected: ${String(key)}`,
                      })
                    }
                  >
                    <DropdownItem key="profile" className="text-text-1">Profile</DropdownItem>
                    <DropdownItem key="preferences" className="text-text-1">Preferences</DropdownItem>
                    <DropdownItem
                      key="logout"
                      className="text-status-danger-600"
                      startContent={<IconLogOut size={14} />}
                    >
                      Logout
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </header>

          <div className="flex-1 p-3 sm:p-5 md:p-6 xl:p-8">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
