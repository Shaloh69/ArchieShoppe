"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { shopNav } from "@/config/navigation";

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
      <rect height="7" rx="1" width="7" x="3" y="3" /><rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="14" /><rect height="7" rx="1" width="7" x="3" y="14" />
    </svg>
  ),
  plus: (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
      <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
    </svg>
  ),
  clock: (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  ),
  wallet: (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
      <rect height="14" rx="2" width="20" x="2" y="7" /><path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0" /><path d="M2 10h20" />
    </svg>
  ),
  list: (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
      <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  ),
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="min-h-screen pb-16">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-bg-1 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-xl font-bold text-brand-primary-600">UniThrift</span>
          <div className="flex items-center gap-3 text-sm text-text-2">
            {user ? (
              <>
                <span className="font-medium text-text-1">{user.fullName}</span>
                <span className="rounded-full bg-brand-primary-100 px-2 py-0.5 text-xs font-semibold text-brand-primary-700">
                  ₱{Number(user.walletBalance ?? 0).toFixed(2)}
                </span>
              </>
            ) : (
              <NextLink className="font-medium text-brand-primary-600" href="/auth/login">
                Log in
              </NextLink>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-2xl px-4 py-4">
        {children}
      </main>

      {/* Shopee-style bottom navigation */}
      <nav className="bottom-nav">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-1">
          {shopNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <NextLink
                key={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "text-brand-primary-600"
                    : "text-text-3 hover:text-text-2"
                }`}
                href={item.href}
              >
                <span className={active ? "text-brand-primary-600" : "text-text-3"}>
                  {ICONS[item.icon]}
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
