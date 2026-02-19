"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export default function KioskSellCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const appendDigit = (digit: string) => {
    setCode((prev) => (prev.length >= 6 ? prev : `${prev}${digit}`));
  };

  const verifyCode = () => {
    if (code.length !== 6) {
      notifyError({
        title: "Invalid code",
        description: "Seller code must be 6 digits.",
      });
      return;
    }

    notifySuccess({
      title: "Code verified",
      description: "Proceeding to assigned slot.",
    });
    router.push(`/kiosk/sell/slot?code=${code}&slot=S-05&item=Linen%20Polo`);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center">
      <Card className="w-full border border-border-subtle bg-surface-bg-2">
        <CardBody className="space-y-5 p-8">
          <h1 className="text-3xl font-semibold text-text-1">Enter Seller Code</h1>
          <Input
            classNames={{
              input: "text-center text-4xl tracking-[0.6em] text-text-1",
              inputWrapper: "h-20 bg-surface-bg-3 border border-border-subtle",
            }}
            maxLength={6}
            value={code}
            onValueChange={(value) =>
              setCode(value.replace(/\D/g, "").slice(0, 6))
            }
          />
          <div className="grid grid-cols-3 gap-3">
            {keypad.map((digit) => (
              <Button
                key={digit}
                className="h-16 text-2xl bg-brand-primary-500 text-white hover:bg-brand-primary-400"
                onPress={() => appendDigit(digit)}
              >
                {digit}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              className="h-14 text-lg bg-surface-bg-3 text-text-1 hover:bg-surface-bg-1"
              onPress={() => setCode((prev) => prev.slice(0, -1))}
            >
              Backspace
            </Button>
            <Button
              className="h-14 text-lg bg-surface-bg-3 text-text-1 hover:bg-surface-bg-1"
              onPress={() => router.push("/kiosk/welcome")}
            >
              Cancel
            </Button>
            <Button
              className="h-14 text-lg bg-brand-cyan-600 text-white hover:brightness-110"
              onPress={verifyCode}
            >
              Verify
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
