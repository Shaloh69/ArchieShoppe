"use client";

import { usePathname, useRouter } from "next/navigation";

import { useIdleTimeout } from "@/hooks/use-idle-timeout";

export function KioskIdleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useIdleTimeout(() => {
    if (pathname !== "/welcome") {
      router.replace("/welcome");
    }
  }, 45_000);

  return <>{children}</>;
}
