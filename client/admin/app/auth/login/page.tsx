"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { useAuth } from "@/contexts/auth-context";
import { notifyError } from "@/lib/unithrift-toast";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push("/overview");
    } catch (err) {
      notifyError({
        title: "Login failed",
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-brand-primary-950 px-4">
      {/* Background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#ee4d2d 1px,transparent 1px),linear-gradient(90deg,#ee4d2d 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-primary-600/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Logo / brand block */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-primary-700/60 bg-brand-primary-900 shadow-lg shadow-brand-primary-900/50">
            <svg
              fill="none"
              height="32"
              stroke="#ee4d2d"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              width="32"
            >
              <path
                d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2 2 4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-primary-500">
            UniThrift
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">
            Admin Console
          </h1>
          <p className="mt-1 text-sm text-brand-primary-400">
            Authorized personnel only
          </p>
        </div>

        {/* Form card */}
        <div className="overflow-hidden rounded-2xl border border-brand-primary-800/60 bg-brand-primary-900/80 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <div className="px-6 pb-6 pt-5">
            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                classNames={{
                  inputWrapper:
                    "bg-brand-primary-950/80 border border-brand-primary-700/60 data-[hover=true]:border-brand-primary-500 data-[focus=true]:border-brand-primary-400 transition-colors",
                  input: "text-white placeholder:text-brand-primary-500",
                  label: "text-brand-primary-300",
                }}
                label="Email address"
                labelPlacement="outside"
                placeholder="admin@uclm.edu"
                type="email"
                value={email}
                onValueChange={setEmail}
                startContent={
                  <svg
                    className="shrink-0 text-brand-primary-500"
                    fill="none"
                    height="15"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="15"
                  >
                    <rect height="16" rx="2" width="20" x="2" y="4" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                }
              />

              <Input
                classNames={{
                  inputWrapper:
                    "bg-brand-primary-950/80 border border-brand-primary-700/60 data-[hover=true]:border-brand-primary-500 data-[focus=true]:border-brand-primary-400 transition-colors",
                  input: "text-white placeholder:text-brand-primary-500",
                  label: "text-brand-primary-300",
                }}
                label="Password"
                labelPlacement="outside"
                placeholder="••••••••"
                type={showPass ? "text" : "password"}
                value={password}
                onValueChange={setPassword}
                startContent={
                  <svg
                    className="shrink-0 text-brand-primary-500"
                    fill="none"
                    height="15"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="15"
                  >
                    <rect height="11" rx="2" width="18" x="3" y="11" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
                endContent={
                  <button
                    type="button"
                    className="text-brand-primary-500 hover:text-brand-primary-300 transition-colors text-xs"
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                }
              />

              <Button
                className="mt-2 h-11 w-full rounded-xl bg-brand-primary-600 text-base font-semibold text-white shadow-lg shadow-brand-primary-600/20 transition-all hover:bg-brand-primary-500 active:scale-[0.98]"
                isLoading={loading}
                type="submit"
              >
                Sign in to Admin
              </Button>
            </form>
          </div>

          {/* Bottom accent bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-brand-primary-600/60 to-transparent" />
        </div>

        <p className="mt-6 text-center text-[11px] text-brand-primary-600">
          UniThrift v1.0 · UCLM Campus Marketplace
        </p>
      </motion.div>
    </div>
  );
}
