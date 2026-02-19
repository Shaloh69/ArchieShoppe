"use client";

import { AppTopbar } from "@/components/unithrift/shell-nav";
import { webNav } from "@/config/navigation";
import { walletBalance } from "@/lib/unithrift-mocks";

export function Navbar() {
  return <AppTopbar navItems={webNav} walletBalance={walletBalance} />;
}
