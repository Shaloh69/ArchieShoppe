"use client";

import { ReactNode } from "react";
import { ScrollShadow } from "@heroui/scroll-shadow";
import clsx from "clsx";

export function ResponsiveTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ScrollShadow
      className={clsx("w-full max-w-full overflow-x-auto pb-1", className)}
      orientation="horizontal"
    >
      {children}
    </ScrollShadow>
  );
}
