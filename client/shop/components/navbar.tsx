"use client";

import { AppTopbar } from "@/components/unithrift/shell-nav";
import { shopNav } from "@/config/navigation";

export function Navbar() {
  return <AppTopbar navItems={shopNav} walletBalance={0} />;
}
