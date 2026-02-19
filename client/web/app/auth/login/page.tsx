"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";

import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function LoginPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identity?: string; password?: string }>({});

  const onSubmit = async () => {
    const nextErrors: { identity?: string; password?: string } = {};

    if (!identity.trim()) nextErrors.identity = "Email or username is required.";
    if (password.length < 6) nextErrors.password = "Password must be at least 6 characters.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 850));
    setLoading(false);

    if (identity.toLowerCase().includes("invalid")) {
      notifyError({
        title: "Invalid credentials",
        description: "Please review your email/username and password.",
      });
      return;
    }

    notifySuccess({
      title: "Login successful",
      description: rememberMe
        ? "Session persistence enabled."
        : "Session will end after this browser session.",
    });
    router.push("/app/browse");
  };

  return (
    <Card className="w-full max-w-md border border-border-subtle bg-surface-bg-2">
      <CardHeader className="flex flex-col items-start gap-1 p-6 pb-3">
        <h1 className="text-2xl font-semibold text-text-1">Sign in</h1>
        <p className="text-sm text-text-2">Access UniThrift web and kiosk-linked flows.</p>
      </CardHeader>
      <CardBody className="gap-4 p-6">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          errorMessage={errors.identity}
          isInvalid={Boolean(errors.identity)}
          label="Email or Username"
          labelPlacement="outside"
          placeholder="you@school.edu"
          value={identity}
          onValueChange={setIdentity}
        />
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
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
          className="focus-ring bg-brand-primary-600 text-white hover:bg-brand-primary-500 active:bg-brand-primary-700"
          isLoading={loading}
          onPress={onSubmit}
        >
          Sign In
        </Button>
        <p className="text-sm text-text-2">
          No account yet?{" "}
          <NextLink className="text-brand-primary-400 hover:text-brand-primary-300" href="/auth/register">
            Register
          </NextLink>
        </p>
      </CardBody>
    </Card>
  );
}
