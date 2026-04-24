import { AdminWorkspace } from "@/components/unithrift/shell-nav";
import { adminNav } from "@/config/navigation";
import { PageTransition } from "./page-transition";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminWorkspace navItems={adminNav}>
      <PageTransition>{children}</PageTransition>
    </AdminWorkspace>
  );
}
