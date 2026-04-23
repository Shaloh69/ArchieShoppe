"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";

import { useAuth } from "@/contexts/auth-context";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const onSubmit = async () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "Email is required.";
    if (password.length < 6)
      nextErrors.password = "Password must be at least 6 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      notifySuccess({
        title: "Login successful",
        description: rememberMe
          ? "Session persistence enabled."
          : "Session active for this tab.",
      });
      router.push("/app/browse");
    } catch (e) {
      notifyError({
        title: "Login failed",
        description: (e as Error).message ?? "Invalid credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-border-subtle bg-surface-bg-2">
      <CardHeader className="flex flex-col items-start gap-1 p-6 pb-3">
        <h1 className="text-2xl font-semibold text-text-1">Sign in</h1>
        <p className="text-sm text-text-2">
          Access UniThrift web and kiosk-linked flows.
        </p>
      </CardHeader>
      <CardBody className="gap-4 p-6">
        <Input
          classNames={{
            inputWrapper: "bg-surface-bg-3 border border-border-subtle",
          }}
          errorMessage={errors.email}
          isInvalid={Boolean(errors.email)}
          label="Email"
          labelPlacement="outside"
          placeholder="you@school.edu"
          type="email"
          value={email}
          onValueChange={setEmail}
        />
        <Input
          classNames={{
            inputWrapper: "bg-surface-bg-3 border border-border-subtle",
          }}
          errorMessage={errors.password}
          isInvalid={Boolean(errors.password)}
          label="Password"
          labelPlacement="outside"
          minLength={6}
          placeholder="Enter your password"
          type="password"
          value={password}
          onValueChange={setPassword}
        />
        <Checkbox
          classNames={{ label: "text-text-2 text-sm" }}
          isSelected={rememberMe}
          onValueChange={setRememberMe}
        >
          Remember me
        </Checkbox>
        <Button
          className="focus-ring btn-cta"
          isLoading={loading}
          onPress={onSubmit}
        >
          Sign In
        </Button>
        <p className="text-sm text-text-2">
          No account yet?{" "}
          <NextLink
            className="text-brand-primary-700 hover:text-brand-primary-800"
            href="/auth/register"
          >
            Register
          </NextLink>
        </p>
      </CardBody>
    </Card>
  );
}
