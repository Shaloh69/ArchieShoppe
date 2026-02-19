import NextLink from "next/link";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";

const entryPoints = [
  {
    title: "Buyer + Seller Web App",
    description: "Browse items, manage wallet, buy/sell flows, and listing management.",
    href: "/app/browse",
    cta: "Open Web App",
  },
  {
    title: "Kiosk Interface",
    description: "Touch-first buy and sell flows with timeout-safe navigation.",
    href: "/kiosk/welcome",
    cta: "Open Kiosk",
  },
  {
    title: "Admin Console",
    description: "Transactions, refunds, lockers, moderation, users, reporting, and audit.",
    href: "/admin/overview",
    cta: "Open Admin",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-primary-950 via-surface-bg-0 to-surface-bg-1 px-6 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-border-strong bg-brand-primary-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-brand-primary-300">
            UniThrift 2026
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-text-1 md:text-5xl">
            Smart Locker Thrift Platform
          </h1>
          <p className="mt-4 max-w-3xl text-base text-text-2 md:text-lg">
            Full UI implementation scaffold with HeroUI components, operational status
            chips, and role-specific flows for web, kiosk, and admin.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {entryPoints.map((entry) => (
            <Card
              key={entry.href}
              className="border border-border-subtle bg-surface-bg-2 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary-400"
            >
              <CardBody className="flex h-full justify-between gap-6 p-6">
                <div>
                  <h2 className="text-xl font-semibold text-text-1">{entry.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-text-2">
                    {entry.description}
                  </p>
                </div>
                <Button
                  as={NextLink}
                  className="focus-ring bg-brand-primary-600 font-medium text-text-1 hover:bg-brand-primary-500 active:bg-brand-primary-700"
                  href={entry.href}
                >
                  {entry.cta}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
