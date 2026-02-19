"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

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
        {children}
        <ToastProvider
          maxVisibleToasts={4}
          placement="top-right"
          toastProps={{
            classNames: {
              base: "bg-surface-bg-3 border border-border-strong text-text-1 shadow-2xl",
              title: "text-text-1",
              description: "text-text-2",
              closeButton:
                "bg-brand-primary-700 hover:bg-brand-primary-600 text-text-1",
              progressTrack: "bg-surface-bg-1",
              progressIndicator: "bg-brand-cyan-400",
            },
            motionProps: {
              initial: { opacity: 0, x: 30, scale: 0.97 },
              animate: { opacity: 1, x: 0, scale: 1 },
              exit: { opacity: 0, x: 20, scale: 0.97 },
              transition: {
                type: "spring",
                stiffness: 360,
                damping: 28,
              },
            },
            shouldShowTimeoutProgress: true,
            timeout: 4000,
            variant: "flat",
          }}
        />
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
