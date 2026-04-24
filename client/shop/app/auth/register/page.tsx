"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { useAuth } from "@/contexts/auth-context";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const INPUT_WRAP =
  "bg-surface-bg-3 border border-border-strong focus-within:border-brand-primary-400 transition-colors";

const ROLES = [
  {
    value: "BUYER",
    label: "Buyer",
    emoji: "🛍️",
    desc: "Browse and purchase items",
  },
  {
    value: "SELLER",
    label: "Seller",
    emoji: "🏷️",
    desc: "List and sell your items",
  },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("BUYER");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = confirm === "" || password === confirm;
  const isStrong = password.length >= 8;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      notifyError({
        title: "Fill in all fields",
        description: "Full name, email, and password are required.",
      });
      return;
    }
    if (!isStrong) {
      notifyError({
        title: "Password too short",
        description: "Use at least 8 characters.",
      });
      return;
    }
    if (password !== confirm) {
      notifyError({
        title: "Passwords don't match",
        description: "Re-enter the same password in both fields.",
      });
      return;
    }

    setLoading(true);
    try {
      await register(fullName.trim(), email.trim(), password, role);
      notifySuccess({
        title: "Account created!",
        description: "You can now log in with your credentials.",
      });
      router.push("/auth/login");
    } catch (err) {
      notifyError({
        title: "Registration failed",
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="w-full max-w-sm space-y-6"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary-600 text-3xl shadow-lg">
          🎓
        </div>
        <h1 className="text-2xl font-extrabold text-text-1">Create account</h1>
        <p className="mt-1 text-sm text-text-3">
          Join the UCLM Student Marketplace
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-border-subtle bg-surface-bg-1 p-6 shadow-sm">
        <form className="space-y-4" onSubmit={onSubmit}>
          {/* Full name */}
          <Input
            classNames={{ inputWrapper: INPUT_WRAP }}
            label="Full name"
            labelPlacement="outside"
            placeholder="Juan dela Cruz"
            value={fullName}
            onValueChange={setFullName}
          />

          {/* Email */}
          <Input
            classNames={{ inputWrapper: INPUT_WRAP }}
            label="Email"
            labelPlacement="outside"
            placeholder="you@uclm.edu"
            type="email"
            value={email}
            onValueChange={setEmail}
          />

          {/* Password */}
          <div className="space-y-1">
            <Input
              classNames={{ inputWrapper: INPUT_WRAP }}
              label="Password"
              labelPlacement="outside"
              placeholder="Min. 8 characters"
              type={showPass ? "text" : "password"}
              value={password}
              onValueChange={setPassword}
              endContent={
                <button
                  type="button"
                  className="text-text-4 hover:text-text-2 transition-colors text-xs"
                  onClick={() => setShowPass((v) => !v)}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              }
            />
            {/* Strength indicator */}
            {password.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-1 w-8 rounded-full transition-colors duration-200 ${
                        password.length >= lvl * 4
                          ? lvl === 1
                            ? "bg-status-danger-600"
                            : lvl === 2
                              ? "bg-status-warning-600"
                              : "bg-brand-green-600"
                          : "bg-border-strong"
                      }`}
                    />
                  ))}
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    password.length >= 12
                      ? "text-brand-green-600"
                      : password.length >= 8
                        ? "text-status-warning-600"
                        : "text-status-danger-600"
                  }`}
                >
                  {password.length >= 12
                    ? "Strong"
                    : password.length >= 8
                      ? "Good"
                      : "Weak"}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <Input
              classNames={{
                inputWrapper: `${INPUT_WRAP} ${
                  !passwordsMatch ? "!border-status-danger-600" : ""
                }`,
              }}
              label="Confirm password"
              labelPlacement="outside"
              placeholder="Repeat your password"
              type="password"
              value={confirm}
              onValueChange={setConfirm}
            />
            {!passwordsMatch && (
              <p className="text-[11px] text-status-danger-600">
                Passwords don't match
              </p>
            )}
          </div>

          {/* Role picker */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-2">I want to…</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-xl border p-3 text-left transition-all duration-150 ${
                    role === r.value
                      ? "border-brand-primary-500 bg-brand-primary-50 ring-2 ring-brand-primary-200/60"
                      : "border-border-subtle bg-surface-bg-3 hover:border-brand-primary-300"
                  }`}
                >
                  <span className="text-xl">{r.emoji}</span>
                  <p
                    className={`mt-1 text-sm font-semibold ${role === r.value ? "text-brand-primary-700" : "text-text-1"}`}
                  >
                    {r.label}
                  </p>
                  <p className="text-[11px] text-text-4">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="btn-cta mt-2 h-11 w-full rounded-xl text-base font-semibold"
            isLoading={loading}
            isDisabled={!passwordsMatch || !isStrong}
            type="submit"
          >
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-3">
          Already have an account?{" "}
          <NextLink
            className="font-semibold text-brand-primary-600 hover:underline"
            href="/auth/login"
          >
            Log in
          </NextLink>
        </p>
      </div>

      {/* Terms note */}
      <p className="text-center text-[11px] text-text-4 px-2">
        By creating an account you agree to the UniThrift Terms of Service and
        Privacy Policy.
      </p>
    </motion.div>
  );
}
