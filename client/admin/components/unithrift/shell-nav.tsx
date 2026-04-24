"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Drawer, DrawerBody, DrawerContent } from "@heroui/drawer";
import {
  Dropdown, DropdownItem, DropdownMenu, DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Skeleton } from "@heroui/skeleton";
import { Tooltip } from "@heroui/tooltip";
import clsx from "clsx";

import {
  IconLayoutGrid, IconCreditCard, IconUndo, IconLockClosed,
  IconTag, IconUsers, IconBarChart, IconShieldCheck, IconSettings,
  IconMenu, IconBell, IconLogOut,
} from "@/components/icons";
import { useAuth } from "@/contexts/auth-context";
import { reportsApi } from "@/lib/api-client";
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

function SidebarNavLink({ href, label, onNavigate }: NavItem & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active   = isActivePath(pathname, href);
  const icon     = NAV_ICON[href];

  return (
    <motion.div variants={sidebarItemVariants}>
      <NextLink
        href={href}
        onClick={onNavigate}
        className={clsx(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "text-white" : "text-brand-primary-300 hover:bg-brand-primary-800/60 hover:text-white",
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

function HealthSnapshot() {
  const [data,    setData]    = useState<{ holds: number; refunds: number; errors: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const [overviewRes, lockersRes] = await Promise.all([
        reportsApi.overview(),
        import("@/lib/api-client").then(m => m.lockersApi.all()),
      ]);
      const errors = lockersRes.slots.filter(s => s.status === "ERROR" || s.status === "OUT_OF_SERVICE").length;
      setData({
        holds:   overviewRes.overview.pendingRefunds,   // pending refunds as "refunds"
        refunds: overviewRes.overview.pendingRefunds,
        errors,
      });
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2 rounded-lg border border-brand-primary-800/60 bg-brand-primary-900/40 p-3">
      <p className="text-[10px] uppercase tracking-wide text-brand-primary-400">Health Snapshot</p>
      {loading ? (
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Chip
            size="sm"
            className={data && data.refunds > 0 ? "bg-status-warning-100 text-status-warning-700" : "bg-brand-primary-800 text-brand-primary-300"}
          >
            Refunds: {data?.refunds ?? 0}
          </Chip>
          <Chip
            size="sm"
            className={data && data.errors > 0 ? "bg-status-danger-100 text-status-danger-700" : "bg-brand-primary-800 text-brand-primary-300"}
          >
            Errors: {data?.errors ?? 0}
          </Chip>
        </div>
      )}
    </div>
  );
}

function AdminSidebarContent({ navItems, onNavigate }: { navItems: NavItem[]; onNavigate?: () => void }) {
  const router  = useRouter();
  const { user, logout } = useAuth();

  const operations = useMemo(() => navItems.filter(item => item.group !== "governance"), [navItems]);
  const governance  = useMemo(() => navItems.filter(item => item.group === "governance"),  [navItems]);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    router.push("/auth/login");
  };

  return (
    <div className="flex h-full flex-col bg-brand-primary-950">
      {/* Brand */}
      <div className="flex items-center justify-between gap-2 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-primary-400">UniThrift</p>
          <p className="text-sm font-semibold text-white">Admin Console</p>
        </div>
        <Chip className="bg-brand-primary-800 text-brand-primary-200" size="sm">Ops</Chip>
      </div>

      <Divider className="bg-brand-primary-800/60" />

      <ScrollShadow className="flex-1 overflow-y-auto p-3" orientation="vertical">
        <motion.div variants={sidebarVariants} initial="hidden" animate="visible">
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
            <AccordionItem key="operations" aria-label="Operations" title="Operations">
              <div className="space-y-0.5">
                {operations.map(item => <SidebarNavLink key={item.href} {...item} onNavigate={onNavigate} />)}
              </div>
            </AccordionItem>
            <AccordionItem key="governance" aria-label="Governance" title="Governance">
              <div className="space-y-0.5">
                {governance.map(item => <SidebarNavLink key={item.href} {...item} onNavigate={onNavigate} />)}
              </div>
            </AccordionItem>
          </Accordion>
        </motion.div>

        <Divider className="my-3 bg-brand-primary-800/60" />

        <HealthSnapshot />
      </ScrollShadow>

      {/* User + sign out */}
      <Divider className="bg-brand-primary-800/60" />
      <div className="p-3 space-y-2">
        {user && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar
              name={user.fullName}
              size="sm"
              classNames={{ base: "bg-brand-primary-600 text-white shrink-0", name: "font-semibold text-[11px]" }}
            />
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold text-white">{user.fullName}</p>
              <p className="truncate text-[10px] text-brand-primary-400">{user.email}</p>
            </div>
          </div>
        )}
        <button
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-primary-400 transition-colors hover:bg-status-danger-900/40 hover:text-status-danger-400"
          onClick={handleLogout}
        >
          <IconLogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AdminQuickActions({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <Button
        className="btn-cta"
        size="sm"
        onPress={() => notifyInfo({ title: "Snapshot generated", description: "Operational snapshot generated for today." })}
      >
        Create Snapshot
      </Button>
      <Button
        className="btn-brand"
        size="sm"
        onPress={() => notifyInfo({ title: "Audit export queued", description: "Audit export request added to processing queue." })}
      >
        Export Audit
      </Button>
    </div>
  );
}

export function AdminWorkspace({ navItems, children }: { navItems: NavItem[]; children: ReactNode }) {
  const router             = useRouter();
  const { user, logout }   = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    router.push("/auth/login");
  };

  const initials = user?.fullName
    ? user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  return (
    <div className="min-h-screen bg-surface-bg-0">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-brand-primary-800/50 bg-brand-primary-950 lg:block">
          <div className="sticky top-0 h-screen">
            <AdminSidebarContent navItems={navItems} />
          </div>
        </aside>

        {/* Mobile drawer */}
        <Drawer isOpen={isMobileOpen} placement="left" size="sm" onOpenChange={setIsMobileOpen}>
          <DrawerContent className="border-r border-brand-primary-800/50 bg-brand-primary-950">
            <DrawerBody className="p-0">
              <AdminSidebarContent navItems={navItems} onNavigate={() => setIsMobileOpen(false)} />
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* Main content */}
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
                  inputWrapper: "bg-brand-primary-900/80 border border-brand-primary-700/60 data-[hover=true]:border-brand-primary-500",
                  input: "text-white placeholder:text-brand-primary-400",
                }}
                placeholder="Search transactions, users, orders..."
                type="search"
              />

              <div className="ml-auto flex items-center gap-2">
                <AdminQuickActions className="hidden xl:flex" />

                <Tooltip content={`${user?.fullName ?? "Admin"} · ${user?.email ?? ""}`}>
                  <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                      <Avatar
                        name={initials}
                        size="sm"
                        classNames={{
                          base: "cursor-pointer bg-brand-primary-600 text-white ring-2 ring-brand-primary-700 hover:ring-brand-primary-400 transition-all",
                          name: "font-semibold",
                        }}
                      />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Admin menu" className="bg-surface-bg-2 text-text-1">
                      <DropdownItem key="info" isReadOnly className="cursor-default opacity-60">
                        <p className="text-xs font-semibold">{user?.fullName}</p>
                        <p className="text-[10px] text-text-3">{user?.email}</p>
                      </DropdownItem>
                      <DropdownItem key="logout" className="text-status-danger-600" onPress={handleLogout}>
                        Sign out
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </Tooltip>
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
