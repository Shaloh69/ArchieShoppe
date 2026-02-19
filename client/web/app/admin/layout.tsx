import {
  AdminQuickActions,
  AppSidebar,
  AppTopbar,
} from "@/components/unithrift/shell-nav";
import { adminNav } from "@/config/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-bg-0">
      <AppTopbar navItems={adminNav} showSearch walletBalance={undefined} />
      <div className="mx-auto flex max-w-[1600px]">
        <AppSidebar navItems={adminNav} />
        <section className="min-h-[calc(100vh-73px)] flex-1 p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-text-3">Operational controls and audit trail</p>
            <AdminQuickActions />
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
