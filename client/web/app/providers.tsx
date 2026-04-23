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
                base: "bg-surface-bg-2 border border-border-subtle shadow-xl rounded-xl backdrop-blur",
                title: "text-text-1 font-semibold text-sm",
                description: "text-text-3 text-xs mt-0.5",
                closeButton: "text-text-3 hover:text-text-1 bg-surface-bg-3 rounded-md",
                progressTrack: "bg-surface-bg-3 rounded-full h-0.5",
                progressIndicator: "bg-brand-primary-600 rounded-full",
              },
              motionProps: {
                initial: { opacity: 0, x: 24, scale: 0.95, filter: "blur(4px)" },
                animate: { opacity: 1, x: 0,  scale: 1,    filter: "blur(0px)" },
                exit:    { opacity: 0, x: 16, scale: 0.97 },
                transition: {
                  type: "spring",
                  stiffness: 420,
                  damping: 32,
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
