"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

export default function KioskBuyLoginPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!identity.trim() || password.length < 6) {
      notifyError({
        title: "Login failed",
        description: "Provide valid credentials to continue.",
      });
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    setLoading(false);
    notifySuccess({
      title: "Kiosk login successful",
      description: "Welcome back. You can now browse available items.",
    });
    router.push("/kiosk/buy/browse");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center">
      <Card className="w-full border border-border-subtle bg-surface-bg-2">
        <CardBody className="gap-4 p-8">
          <h1 className="text-3xl font-semibold text-text-1">Buyer Login</h1>
          <Input
            classNames={{
              inputWrapper: "h-14 bg-surface-bg-3 border border-border-subtle",
            }}
            label="Username / Email"
            labelPlacement="outside"
            placeholder="Enter credentials"
            size="lg"
            value={identity}
            onValueChange={setIdentity}
          />
          <Input
            classNames={{
              inputWrapper: "h-14 bg-surface-bg-3 border border-border-subtle",
            }}
            label="Password"
            labelPlacement="outside"
            placeholder="Password"
            size="lg"
            type="password"
            value={password}
            onValueChange={setPassword}
          />
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <Button
              className="h-14 text-lg bg-surface-bg-3 text-text-1 hover:bg-surface-bg-1"
              onPress={() => router.push("/kiosk/welcome")}
            >
              Cancel
            </Button>
            <Button
              className="h-14 text-lg btn-cta"
              isLoading={loading}
              onPress={onLogin}
            >
              Login
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
