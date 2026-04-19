"use client";

import { ReactNode } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";

interface StateBlockProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyBlock({
  title,
  description,
  actionLabel,
  onAction,
}: StateBlockProps) {
  return (
    <Card className="border border-border-subtle bg-surface-bg-2">
      <CardBody className="flex items-center justify-center gap-4 p-8 text-center">
        <div>
          <h3 className="text-lg font-semibold text-text-1">{title}</h3>
          <p className="mt-2 max-w-lg text-sm text-text-2">{description}</p>
          {actionLabel && onAction ? (
            <Button
              className="focus-ring btn-cta mt-4"
              onPress={onAction}
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

export function ErrorBlock({
  title,
  description,
  actionLabel,
  onAction,
}: StateBlockProps) {
  return (
    <Card className="border border-status-danger-600/60 bg-surface-bg-2">
      <CardBody className="flex items-center justify-center gap-4 p-8 text-center">
        <div>
          <h3 className="text-lg font-semibold text-status-danger-600">{title}</h3>
          <p className="mt-2 max-w-lg text-sm text-text-2">{description}</p>
          {actionLabel && onAction ? (
            <Button
              className="focus-ring mt-4 bg-status-danger-600 text-white hover:brightness-110"
              onPress={onAction}
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={`skeleton-row-${i}`}
          className="h-12 w-full rounded-lg bg-surface-bg-3"
        />
      ))}
    </div>
  );
}

export function CardFrame({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border border-border-subtle bg-surface-bg-2">
      <CardBody className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-1">{title}</h3>
            {subtitle ? <p className="text-sm text-text-2">{subtitle}</p> : null}
          </div>
          {right}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

