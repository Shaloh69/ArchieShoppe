import { AdminWorkspace } from "@/components/unithrift/shell-nav";
import { adminNav } from "@/config/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminWorkspace navItems={adminNav}>{children}</AdminWorkspace>;
}
