"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";

import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const roles = [
  { key: "BUYER", label: "Buyer" },
  { key: "SELLER", label: "Seller" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("BUYER");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Name is required.";
    if (!email.includes("@")) nextErrors.email = "A valid email is required.";
    if (password.length < 6) nextErrors.password = "Password must be at least 6 characters.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      notifyError({
        title: "Validation failed",
        description: "Please complete all required fields correctly.",
      });
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 950));
    setLoading(false);

    notifySuccess({
      title: "Account created",
      description: `${role === "SELLER" ? "Seller" : "Buyer"} account has been initialized.`,
    });
    router.push("/auth/login");
  };

  return (
    <Card className="w-full max-w-md border border-border-subtle bg-surface-bg-2">
      <CardHeader className="flex flex-col items-start gap-1 p-6 pb-3">
        <h1 className="text-2xl font-semibold text-text-1">Create account</h1>
        <p className="text-sm text-text-2">Set up your UniThrift account role and profile.</p>
      </CardHeader>
      <CardBody className="gap-4 p-6">
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          errorMessage={errors.name}
          isInvalid={Boolean(errors.name)}
          label="Full Name"
          labelPlacement="outside"
          placeholder="Juan Dela Cruz"
          value={name}
          onValueChange={setName}
        />
        <Input
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
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
          classNames={{ inputWrapper: "bg-surface-bg-3 border border-border-subtle" }}
          errorMessage={errors.password}
          isInvalid={Boolean(errors.password)}
          label="Password"
          labelPlacement="outside"
          minLength={6}
          placeholder="At least 6 characters"
          type="password"
          value={password}
          onValueChange={setPassword}
        />
        <Select
          classNames={{ trigger: "bg-surface-bg-3 border border-border-subtle" }}
          label="Role"
          labelPlacement="outside"
          selectedKeys={[role]}
          onSelectionChange={(keys) => setRole(Array.from(keys)[0]?.toString() || "BUYER")}
        >
          {roles.map((item) => (
            <SelectItem key={item.key}>{item.label}</SelectItem>
          ))}
        </Select>
        <Button
          className="focus-ring bg-brand-primary-600 text-white hover:bg-brand-primary-500 active:bg-brand-primary-700"
          isLoading={loading}
          onPress={onSubmit}
        >
          Register
        </Button>
        <p className="text-sm text-text-2">
          Already have an account?{" "}
          <NextLink className="text-brand-primary-400 hover:text-brand-primary-300" href="/auth/login">
            Sign in
          </NextLink>
        </p>
      </CardBody>
    </Card>
  );
}
