import { MobileBottomNav, AppSidebar, AppTopbar } from "@/components/unithrift/shell-nav";
import { webNav } from "@/config/navigation";
import { walletBalance } from "@/lib/unithrift-mocks";

export default function WebAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-bg-0 pb-20 lg:pb-0">
      <AppTopbar navItems={webNav} walletBalance={walletBalance} />
      <div className="mx-auto flex max-w-[1480px]">
        <AppSidebar navItems={webNav} />
        <section className="min-h-[calc(100vh-73px)] flex-1 p-4 md:p-6">{children}</section>
      </div>
      <MobileBottomNav navItems={webNav} />
    </div>
  );
}
