import { KioskIdleGuard } from "@/components/unithrift/kiosk-idle-guard";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KioskIdleGuard>
      <main className="min-h-screen bg-gradient-to-b from-brand-primary-950 via-surface-bg-0 to-surface-bg-1 px-4 py-6 md:px-8">
        {children}
      </main>
    </KioskIdleGuard>
  );
}
