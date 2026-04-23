"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";

import { itemsApi, type ApiItem } from "@/lib/api-client";
import { peso } from "@/lib/unithrift-format";

export default function KioskBuyItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await itemsApi.getById(params.id);
        if (res.item.status !== "ACTIVE") {
          setNotFound(true);
          return;
        }
        setItem(res.item);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center">
        <Card className="w-full border border-status-danger-600/50 bg-surface-bg-2">
          <CardBody className="gap-4 p-8 text-center">
            <p className="text-2xl font-semibold text-status-danger-600">
              Item unavailable
            </p>
            <Button
              className="h-14 text-lg btn-cta"
              onPress={() => router.push("/buy/browse")}
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
          {item.imageUrl ? (
            <img
              alt={item.title}
              className="aspect-[4/3] w-full rounded-xl object-cover"
              src={item.imageUrl?.startsWith("http") ? item.imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${item.imageUrl}`}
            />
          ) : (
            <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-brand-primary-900 to-brand-primary-700" />
          )}
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-text-1">{item.title}</h1>
            <p className="text-lg text-text-2">{item.condition}</p>
            <p className="text-4xl font-semibold text-brand-primary-800">
              {peso(Number(item.price))}
            </p>
            <p className="text-base text-text-2">{item.description}</p>
            <Button
              className="kiosk-glow h-16 w-full text-xl btn-cta"
              onPress={() =>
                router.push(`/buy/confirm?itemId=${item.id}`)
              }
            >
              Confirm purchase
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
