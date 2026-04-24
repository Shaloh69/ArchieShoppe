"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/contexts/auth-context";
import { usersApi } from "@/lib/api-client";
import { notifySuccess, notifyError } from "@/lib/unithrift-toast";

const SESSION_KEY = "ut_seller_banner_shown";

export function BecomeSellerBanner() {
  const pathname    = usePathname();
  const { user, refreshUser } = useAuth();
  const [visible,   setVisible]   = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    // Only show to BUYER users who haven't seen it this session
    if (!user || user.role !== "BUYER") return;
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Show on a random page visit (50% chance per page change)
    if (Math.random() < 0.5) {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  }, [pathname, user]);

  const dismiss = () => setVisible(false);

  const upgrade = async () => {
    setUpgrading(true);
    try {
      await usersApi.upgradeToSeller();
      await refreshUser();
      notifySuccess({ title: "You're now a Seller! 🎉", description: "Start listing from the Profile tab." });
      setVisible(false);
    } catch (e) {
      notifyError({ title: "Upgrade failed", description: (e as Error).message });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed bottom-16 left-0 right-0 z-50 mx-auto max-w-2xl px-3"
        >
          <div className="relative overflow-hidden rounded-2xl border border-brand-gold-300 bg-gradient-to-r from-brand-gold-50 to-brand-primary-50 p-4 shadow-lg">
            {/* Dismiss */}
            <button
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-xs text-text-2 transition-colors hover:bg-black/20"
              onClick={dismiss}
            >
              ×
            </button>

            <div className="flex items-center gap-3 pr-6">
              <span className="text-3xl">🏷️</span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-text-1">Become a Seller</p>
                <p className="text-xs text-text-3">List your items and earn within the UCLM marketplace</p>
              </div>
              <button
                disabled={upgrading}
                className="shrink-0 rounded-xl bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 disabled:opacity-60"
                onClick={upgrade}
              >
                {upgrading ? "…" : "Join"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
