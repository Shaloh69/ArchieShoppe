"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { useAuth } from "@/contexts/auth-context";
import { notifyError } from "@/lib/unithrift-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      router.push("/browse");
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
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary-600 shadow-lg text-3xl">
          🛍️
        </div>
        <h1 className="text-2xl font-bold text-text-1">UniThrift</h1>
        <p className="mt-1 text-sm text-text-3">UCLM Student Marketplace</p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-bg-2 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-text-1">Sign in</h2>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            classNames={{
              inputWrapper: "bg-surface-bg-3 border border-border-strong",
            }}
            label="Email"
            labelPlacement="outside"
            placeholder="you@uclm.edu"
            type="email"
            value={email}
            onValueChange={setEmail}
          />
          <Input
            classNames={{
              inputWrapper: "bg-surface-bg-3 border border-border-strong",
            }}
            label="Password"
            labelPlacement="outside"
            placeholder="••••••••"
            type="password"
            value={password}
            onValueChange={setPassword}
          />
          <Button
            className="mt-1 h-11 w-full text-base btn-cta"
            isLoading={loading}
            type="submit"
          >
            Log in
          </Button>
        </form>

        <p className="text-center text-sm text-text-3">
          No account?{" "}
          <NextLink
            className="font-medium text-brand-primary-600 hover:underline"
            href="/auth/register"
          >
            Register
          </NextLink>
        </p>
      </div>
    </div>
  );
}
