import { KioskIdleGuard } from "@/components/unithrift/kiosk-idle-guard";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KioskIdleGuard>
      <main className="min-h-screen bg-gradient-to-b from-brand-primary-950 via-surface-bg-0 to-surface-bg-1 px-3 py-4 sm:px-4 md:px-8 md:py-6">
        <div className="mx-auto w-full max-w-[1700px]">{children}</div>
      </main>
    </KioskIdleGuard>
  );
}

