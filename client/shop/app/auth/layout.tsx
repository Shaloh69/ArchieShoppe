export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-primary-100 via-surface-bg-0 to-brand-teal-100 px-4">
      {children}
    </main>
  );
}
