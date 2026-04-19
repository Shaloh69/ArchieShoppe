"use client";

import { Chip } from "@heroui/chip";

import {
  itemStatusClass,
  lockerStatusClass,
  orderStatusClass,
  refundPreviewClass,
} from "@/lib/unithrift-status";
import {
  ItemStatus,
  LockerStatus,
  OrderStatus,
  RefundPolicyPreview,
} from "@/lib/unithrift-types";

type ChipKind = "order" | "item" | "locker" | "refund-preview";

interface StatusChipProps {
  kind: ChipKind;
  value: OrderStatus | ItemStatus | LockerStatus | RefundPolicyPreview;
}

export function StatusChip({ kind, value }: StatusChipProps) {
  const className =
    kind === "order"
      ? orderStatusClass[value as OrderStatus]
      : kind === "item"
        ? itemStatusClass[value as ItemStatus]
        : kind === "locker"
          ? lockerStatusClass[value as LockerStatus]
          : refundPreviewClass[value as RefundPolicyPreview];

  return (
    <Chip className={className} radius="sm" size="sm" variant="flat">
      {String(value).replace("_", " ")}
    </Chip>
  );
}

