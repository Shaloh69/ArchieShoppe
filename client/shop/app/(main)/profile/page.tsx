"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Skeleton } from "@heroui/skeleton";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";

import { useAuth } from "@/contexts/auth-context";
import { itemsApi, usersApi } from "@/lib/api-client";
import { peso } from "@/lib/unithrift-format";
import { notifySuccess, notifyError } from "@/lib/unithrift-toast";

const ROLE_META: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  BUYER: {
    label: "Buyer",
    color: "bg-brand-teal-100 text-brand-teal-700",
    emoji: "🛍️",
  },
  SELLER: {
    label: "Seller",
    color: "bg-brand-gold-100 text-brand-gold-700",
    emoji: "🏷️",
  },
  ADMIN: {
    label: "Admin",
    color: "bg-status-escrow-100 text-status-escrow-600",
    emoji: "🛡️",
  },
};

interface MenuRow {
  emoji: string;
  label: string;
  sub?: string;
  href?: string;
  danger?: boolean;
  action?: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, delay: i * 0.07, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export default function ProfilePage() {
  const { user, logout, refreshUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [listingCount, setListingCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPass, setEditPass] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Become a seller modal
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const res = await itemsApi.myListings();
      setListingCount(res.items.length);
    } catch {
      setListingCount(0);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      notifySuccess({ title: "Signed out", description: "See you next time!" });
      router.push("/auth/login");
    } catch {
      notifyError({ title: "Logout failed", description: "Please try again." });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleEditSave = async () => {
    if (!editName.trim() && !editPass) return;
    setEditSaving(true);
    try {
      const body: Record<string, string> = {};
      if (editName.trim()) body.fullName = editName.trim();
      if (editPass) body.newPassword = editPass;
      await usersApi.updateMe(body);
      await refreshUser();
      notifySuccess({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
      setEditOpen(false);
      setEditName("");
      setEditPass("");
    } catch (e) {
      notifyError({
        title: "Update failed",
        description: (e as Error).message,
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await usersApi.uploadAvatar(form);
      await refreshUser();
      notifySuccess({ title: "Avatar updated", description: "Looking great!" });
    } catch (err) {
      notifyError({
        title: "Upload failed",
        description: (err as Error).message,
      });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpgradeToSeller = async () => {
    setUpgrading(true);
    try {
      await usersApi.upgradeToSeller();
      await refreshUser();
      notifySuccess({
        title: "You're now a Seller! 🎉",
        description: "Start listing items from the Sell tab.",
      });
      setUpgradeOpen(false);
    } catch (e) {
      notifyError({
        title: "Upgrade failed",
        description: (e as Error).message,
      });
    } finally {
      setUpgrading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="text-5xl">👤</span>
        <p className="font-semibold text-text-1">Not signed in</p>
        <p className="text-sm text-text-3">Log in to view your profile</p>
        <NextLink
          className="rounded-xl bg-brand-primary-600 px-6 py-2.5 text-sm font-semibold text-white"
          href="/auth/login"
        >
          Log in
        </NextLink>
      </div>
    );
  }

  const roleMeta = ROLE_META[user.role] ?? ROLE_META.BUYER;
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  });

  const menuSections: { title: string; rows: MenuRow[] }[] = [
    {
      title: "Activity",
      rows: [
        {
          emoji: "🕒",
          label: "Purchase history",
          sub: "View past orders",
          href: "/history",
        },
        {
          emoji: "🏷️",
          label: "My listings",
          sub: "Manage your items",
          href: "/listings",
        },
        {
          emoji: "👜",
          label: "Wallet",
          sub: `Balance: ${peso(Number(user.walletBalance))}`,
          href: "/wallet",
        },
      ],
    },
    ...(user.role === "SELLER" || user.role === "ADMIN"
      ? [
          {
            title: "Selling",
            rows: [
              {
                emoji: "📦",
                label: "Locker subscription",
                sub: "View plan & status",
                href: "/listings",
              },
              {
                emoji: "🔑",
                label: "Seller codes",
                sub: "Past codes you used",
                href: "/listings",
              },
              {
                emoji: "➕",
                label: "List a new item",
                sub: "Start selling",
                href: "/sell",
              },
            ],
          },
        ]
      : []),
    {
      title: "Account",
      rows: [
        {
          emoji: "✏️",
          label: "Edit profile",
          sub: "Name, password, photo",
          action: () => {
            setEditName(user.fullName);
            setEditPass("");
            setEditOpen(true);
          },
        },
        ...(user.role === "BUYER"
          ? [
              {
                emoji: "🚀",
                label: "Become a Seller",
                sub: "Unlock selling features",
                action: () => setUpgradeOpen(true),
              },
            ]
          : []),
        {
          emoji: "🚪",
          label: "Sign out",
          sub: "Log out of your account",
          danger: true,
          action: handleLogout,
        },
      ],
    },
  ];

  return (
    <div className="space-y-4 pb-2">
      {/* Profile header card */}
      <motion.div
        custom={0}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-bg-1 shadow-sm">
          <div className="hero-gradient h-16 w-full" />
          <div className="px-5 pb-5">
            <div className="-mt-8 mb-3 flex items-end justify-between">
              {/* HeroUI Avatar with tap-to-upload */}
              <div className="relative">
                <button
                  className="relative"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  title="Change photo"
                >
                  <Avatar
                    src={user.avatarUrl}
                    name={user.fullName}
                    size="lg"
                    isBordered
                    classNames={{
                      base: "border-4 border-surface-bg-1 h-16 w-16 text-xl font-extrabold",
                    }}
                    showFallback
                  />
                  <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface-bg-1 bg-brand-primary-600 text-[10px] text-white">
                    {avatarUploading ? "…" : "✏"}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              {user.isVerified && (
                <span className="mb-1 flex items-center gap-1 rounded-full bg-brand-green-100 px-2.5 py-1 text-[11px] font-semibold text-brand-green-700">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-lg font-extrabold leading-tight text-text-1">
              {user.fullName}
            </p>
            <p className="text-xs text-text-3">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip
                className={`text-[11px] font-semibold ${roleMeta.color}`}
                size="sm"
                radius="full"
              >
                {roleMeta.emoji} {roleMeta.label}
              </Chip>
              <span className="text-[11px] text-text-4">
                Member since {memberSince}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        custom={1}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Wallet",
              value: loadingStats ? null : peso(Number(user.walletBalance)),
              emoji: "💰",
              color: "text-brand-green-600",
              href: "/wallet",
            },
            {
              label: "Listings",
              value: loadingStats ? null : String(listingCount ?? 0),
              emoji: "🏷️",
              color: "text-brand-primary-600",
              href: "/listings",
            },
            {
              label: "Role",
              value: roleMeta.label,
              emoji: roleMeta.emoji,
              color: "text-brand-gold-600",
              href: undefined,
            },
          ].map((stat) => (
            <NextLink
              key={stat.label}
              href={stat.href ?? "#"}
              className={`rounded-xl border border-border-subtle bg-surface-bg-1 p-3 text-center shadow-sm transition-all duration-150 ${stat.href ? "hover:border-brand-primary-300 hover:bg-brand-primary-50 active:scale-95" : "cursor-default"}`}
            >
              <span className="text-xl">{stat.emoji}</span>
              <div className="mt-1">
                {stat.value === null ? (
                  <Skeleton className="mx-auto h-5 w-12 rounded" />
                ) : (
                  <p className={`text-sm font-extrabold ${stat.color}`}>
                    {stat.value}
                  </p>
                )}
                <p className="text-[10px] text-text-4">{stat.label}</p>
              </div>
            </NextLink>
          ))}
        </div>
      </motion.div>

      {/* Menu sections */}
      {menuSections.map((section, si) => (
        <motion.div
          key={section.title}
          custom={si + 2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-text-4">
            {section.title}
          </p>
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-bg-1 shadow-sm">
            {section.rows.map((row, ri) => {
              const Inner = (
                <div
                  className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                    row.danger
                      ? "hover:bg-status-danger-100"
                      : "hover:bg-brand-primary-50"
                  } ${ri < section.rows.length - 1 ? "border-b border-border-subtle" : ""}`}
                >
                  <span className="text-xl">{row.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${row.danger ? "text-status-danger-600" : "text-text-1"}`}
                    >
                      {row.label}
                    </p>
                    {row.sub && (
                      <p className="text-[11px] text-text-4">{row.sub}</p>
                    )}
                  </div>
                  {!row.danger && (
                    <svg
                      className="text-text-4"
                      fill="none"
                      height="16"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="16"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  )}
                </div>
              );

              if (row.action) {
                return (
                  <button
                    key={row.label}
                    className="w-full text-left"
                    disabled={loggingOut}
                    onClick={row.action}
                  >
                    {loggingOut && row.danger ? (
                      <div className="flex items-center gap-3 px-4 py-3.5 text-status-danger-600">
                        <span className="text-xl">⏳</span>
                        <p className="text-sm font-medium">Signing out…</p>
                      </div>
                    ) : (
                      Inner
                    )}
                  </button>
                );
              }
              return (
                <NextLink key={row.label} href={row.href!}>
                  {Inner}
                </NextLink>
              );
            })}
          </div>
        </motion.div>
      ))}

      <p className="pt-2 text-center text-[10px] text-text-4">
        UniThrift v1.0 · UCLM Campus Marketplace
      </p>

      {/* Edit profile modal */}
      <Modal isOpen={editOpen} onOpenChange={setEditOpen}>
        <ModalContent className="border border-border-subtle bg-surface-bg-2 text-text-1">
          <ModalHeader>Edit profile</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              classNames={{
                inputWrapper: "bg-surface-bg-3 border border-border-strong",
              }}
              label="Full name"
              labelPlacement="outside"
              placeholder={user.fullName}
              value={editName}
              onValueChange={setEditName}
            />
            <Input
              classNames={{
                inputWrapper: "bg-surface-bg-3 border border-border-strong",
              }}
              label="New password"
              labelPlacement="outside"
              placeholder="Leave blank to keep current"
              type="password"
              value={editPass}
              onValueChange={setEditPass}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="btn-cta"
              isLoading={editSaving}
              isDisabled={!editName.trim() && !editPass}
              onPress={handleEditSave}
            >
              Save changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Become a Seller modal */}
      <Modal isOpen={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <ModalContent className="border border-border-subtle bg-surface-bg-2 text-text-1">
          <ModalHeader>Become a Seller 🚀</ModalHeader>
          <ModalBody className="space-y-3 text-sm text-text-2">
            <div className="flex justify-center py-2 text-5xl">🏷️</div>
            <p>
              As a seller you can list items, manage locker slots, and earn from
              your campus community.
            </p>
            <ul className="space-y-1.5 rounded-xl bg-surface-bg-3 p-3">
              <li className="flex items-center gap-2">
                <span className="text-brand-green-600">✓</span> List items for
                sale
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-green-600">✓</span> Assign locker
                slots
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-green-600">✓</span> Receive wallet
                payouts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-green-600">✓</span> You can still
                buy items
              </li>
            </ul>
            <p className="text-[11px] text-text-4">
              This upgrade is permanent and cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setUpgradeOpen(false)}>
              Not now
            </Button>
            <Button
              className="btn-cta"
              isLoading={upgrading}
              onPress={handleUpgradeToSeller}
            >
              Upgrade to Seller
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
