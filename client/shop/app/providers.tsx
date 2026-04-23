"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth-context";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <AuthProvider>
          {children}
          <ToastProvider
            maxVisibleToasts={4}
            placement="top-right"
            toastProps={{
              classNames: {
                base: "bg-surface-bg-1 border border-border-subtle text-text-1 shadow-xl rounded-xl",
                title: "font-semibold text-text-1",
                description: "text-text-3",
                closeButton: "text-text-3 hover:text-text-1",
                progressTrack: "bg-surface-bg-3",
                progressIndicator: "bg-brand-primary-600",
              },
              motionProps: {
                initial: { opacity: 0, y: -10, scale: 0.96 },
                animate: { opacity: 1, y: 0, scale: 1 },
                exit: { opacity: 0, y: -8, scale: 0.97 },
                transition: {
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                },
              },
              shouldShowTimeoutProgress: true,
              timeout: 4000,
              variant: "flat",
            }}
          />
        </AuthProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
