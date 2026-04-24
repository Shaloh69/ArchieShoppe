"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { useAuth } from "@/contexts/auth-context";
import { shopNav } from "@/config/navigation";
import { BecomeSellerBanner } from "@/components/unithrift/become-seller-banner";

const ICONS_OUTLINE: Record<string, React.ReactNode> = {
  grid: (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="14" />
      <rect height="7" rx="1.5" width="7" x="3" y="14" />
    </svg>
  ),
  plus: (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  clock: (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  wallet: (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <rect height="14" rx="2" width="20" x="2" y="7" />
      <circle cx="17" cy="14" r="1" fill="currentColor" />
      <path d="M2 10h20" />
    </svg>
  ),
  list: (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <path d="M9 6h12M9 12h12M9 18h12" />
      <circle cx="4" cy="6"  r="1.2" fill="currentColor" />
      <circle cx="4" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4" cy="18" r="1.2" fill="currentColor" />
    </svg>
  ),
  person: (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
};

const ICONS_FILLED: Record<string, React.ReactNode> = {
  grid: (
    <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="14" />
      <rect height="7" rx="1.5" width="7" x="3" y="14" />
    </svg>
  ),
  plus: (
    <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="12" fill="currentColor" r="9" />
      <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" />
    </svg>
  ),
  clock: (
    <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <path clipRule="evenodd" d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3zm1 5.5a1 1 0 0 0-2 0V12c0 .27.107.52.293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8.5z" fillRule="evenodd" />
    </svg>
  ),
  wallet: (
    <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <rect height="14" rx="2" width="20" x="2" y="7" />
      <circle cx="17" cy="14" fill="white" r="1" />
      <rect fill="white" height="1" rx="0.5" width="20" x="2" y="10" />
    </svg>
  ),
  list: (
    <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <rect height="2" rx="1" width="12" x="9" y="5" />
      <rect height="2" rx="1" width="12" x="9" y="11" />
      <rect height="2" rx="1" width="12" x="9" y="17" />
      <circle cx="4" cy="6"  r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="4" cy="18" r="1.5" />
    </svg>
  ),
  person: (
    <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  // Hide "Sell" tab from BUYER role — only SELLER and ADMIN can see it
  const visibleNav = shopNav.filter((item) => {
    if (item.href === "/sell") return user?.role === "SELLER" || user?.role === "ADMIN";
    return true;
  });

  return (
    <div className="min-h-screen pb-[58px]">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-bg-1/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="bg-gradient-to-r from-brand-primary-600 to-brand-primary-500 bg-clip-text text-xl font-extrabold text-transparent">
            UniThrift
          </span>
          <div className="flex items-center gap-3 text-sm text-text-2">
            {user ? (
              <>
                <span className="hidden font-medium text-text-1 sm:block">{user.fullName}</span>
                <span className="flex items-center gap-1 rounded-full bg-brand-primary-100 px-3 py-1 text-xs font-semibold text-brand-primary-700">
                  <span className="text-[10px]">₱</span>
                  {Number(user.walletBalance ?? 0).toFixed(2)}
                </span>
              </>
            ) : (
              <NextLink
                className="rounded-full bg-brand-primary-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-700"
                href="/auth/login"
              >
                Log in
              </NextLink>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <motion.main
        className="mx-auto max-w-2xl px-4 py-4"
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.main>

      {/* Become a Seller banner — shows once per session for BUYER users */}
      <BecomeSellerBanner />

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-0.5 py-1">
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <NextLink
                key={item.href}
                className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-brand-primary-600" : "text-text-4 hover:text-text-2"
                }`}
                href={item.href}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute -top-px left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-brand-primary-600"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`transition-transform duration-150 ${active ? "scale-110" : ""}`}>
                  {active ? ICONS_FILLED[item.icon] : ICONS_OUTLINE[item.icon]}
                </span>
                <span className={active ? "font-semibold" : ""}>{item.label}</span>
              </NextLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
