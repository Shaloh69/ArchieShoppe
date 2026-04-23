"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";

import { useAuth } from "@/contexts/auth-context";
import { notifyError } from "@/lib/unithrift-toast";

export default function AdminLoginPage() {
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
      router.push("/overview");
    } catch (err) {
      notifyError({ title: "Login failed", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm border border-border-subtle bg-surface-bg-2 shadow-lg">
      <CardBody className="gap-5 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-1">UniThrift Admin</h1>
          <p className="mt-1 text-sm text-text-3">Administrators only</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
            label="Email"
            labelPlacement="outside"
            placeholder="admin@uclm.edu"
            type="email"
            value={email}
            onValueChange={setEmail}
          />
          <Input
            classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
            label="Password"
            labelPlacement="outside"
            placeholder="••••••••"
            type="password"
            value={password}
            onValueChange={setPassword}
          />
          <Button
            className="h-11 w-full text-base btn-brand"
            isLoading={loading}
            type="submit"
          >
            Sign in
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
