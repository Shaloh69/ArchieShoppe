import NextLink from "next/link";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

export default function KioskWelcomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center">
      <Card className="w-full border border-border-subtle bg-surface-bg-2">
        <CardBody className="gap-8 p-8 md:p-12">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-brand-primary-700">UniThrift Kiosk</p>
            <h1 className="mt-2 text-4xl font-semibold text-text-1 md:text-5xl">Choose Transaction</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              as={NextLink}
              className="kiosk-glow h-24 text-2xl font-semibold btn-cta"
              href="/kiosk/buy/login"
            >
              BUY
            </Button>
            <Button
              as={NextLink}
              className="kiosk-glow h-24 text-2xl font-semibold btn-cta"
              href="/kiosk/sell/code"
            >
              SELL
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

