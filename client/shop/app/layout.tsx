import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";
import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: "UniThrift Shop",
  description: "Buy and sell second-hand items at UCLM",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#ee4d2d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen bg-surface-bg-0 text-text-1 font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
