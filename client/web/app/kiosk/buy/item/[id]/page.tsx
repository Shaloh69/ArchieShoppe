"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";

import { items } from "@/lib/unithrift-mocks";
import { peso } from "@/lib/unithrift-format";

export default function KioskBuyItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const item = useMemo(
    () => items.find((entry) => entry.id === params.id && entry.status === "ACTIVE"),
    [params.id],
  );

  if (!item) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center">
        <Card className="w-full border border-status-danger-600/50 bg-surface-bg-2">
          <CardBody className="gap-4 p-8 text-center">
            <p className="text-2xl font-semibold text-status-danger-600">Item unavailable</p>
            <Button
              className="h-14 text-lg bg-brand-primary-500 text-white hover:bg-brand-primary-400"
              onPress={() => router.push("/kiosk/buy/browse")}
            >
              Back to browse
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl items-center">
      <Card className="w-full border border-border-subtle bg-surface-bg-2">
        <CardBody className="grid gap-5 p-8 md:grid-cols-2">
          <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-brand-primary-900 to-brand-primary-700" />
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-text-1">{item.title}</h1>
            <p className="text-lg text-text-2">{item.condition}</p>
            <p className="text-4xl font-semibold text-brand-primary-300">{peso(item.price)}</p>
            <p className="text-base text-text-2">{item.description}</p>
            <Button
              className="kiosk-glow h-16 w-full text-xl bg-brand-primary-500 text-white hover:bg-brand-primary-400"
              onPress={() => router.push(`/kiosk/buy/confirm?itemId=${item.id}`)}
            >
              Confirm purchase
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
