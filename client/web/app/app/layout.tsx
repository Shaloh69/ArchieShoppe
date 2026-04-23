"use client";

import {
  MobileBottomNav,
  AppSidebar,
  AppTopbar,
} from "@/components/unithrift/shell-nav";
import { webNav } from "@/config/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function WebAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const balance =
    typeof user?.walletBalance === "string"
      ? Number(user.walletBalance)
      : undefined;

  return (
    <div className="min-h-screen bg-surface-bg-0 pb-20 lg:pb-0">
      <AppTopbar navItems={webNav} walletBalance={balance} />
      <div className="grid w-full lg:grid-cols-[260px_minmax(0,1fr)]">
        <AppSidebar navItems={webNav} />
        <section className="min-h-[calc(100vh-73px)] min-w-0 p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </section>
      </div>
      <MobileBottomNav navItems={webNav} />
    </div>
  );
}
