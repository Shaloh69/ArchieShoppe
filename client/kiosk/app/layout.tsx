import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";
import { KioskIdleGuard } from "@/components/unithrift/kiosk-idle-guard";
import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: "UniThrift Kiosk",
  description: "UniThrift smart locker kiosk",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#040d14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body className={clsx("min-h-screen bg-surface-bg-0 text-text-1 font-sans antialiased", fontSans.variable)}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <KioskIdleGuard>
            <main className="min-h-screen bg-gradient-to-b from-surface-bg-0 via-surface-bg-1 to-surface-bg-2 px-3 py-4 sm:px-4 md:px-8 md:py-6">
              <div className="mx-auto w-full max-w-[1700px]">{children}</div>
            </main>
          </KioskIdleGuard>
        </Providers>
      </body>
    </html>
  );
}
