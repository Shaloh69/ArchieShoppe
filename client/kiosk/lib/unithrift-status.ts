import {
  ItemStatus,
  LockerStatus,
  OrderStatus,
  RefundPolicyPreview,
} from "@/lib/unithrift-types";

const baseChip =
  "border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase";

export const orderStatusClass: Record<OrderStatus, string> = {
  HELD: `${baseChip} border-status-escrow-600/35 bg-status-escrow-100 text-text-inverse`,
  COMPLETED: `${baseChip} border-status-success-600/35 bg-status-success-100 text-text-inverse`,
  REFUND_REQUESTED: `${baseChip} border-status-warning-600/35 bg-status-warning-100 text-text-inverse`,
  REFUNDED: `${baseChip} border-status-info-600/35 bg-status-info-100 text-text-inverse`,
  PARTIAL_REFUND: `${baseChip} border-status-info-600/35 bg-status-info-100 text-text-inverse`,
  CANCELLED: `${baseChip} border-status-danger-600/35 bg-status-danger-100 text-text-inverse`,
};

export const itemStatusClass: Record<ItemStatus, string> = {
  DRAFT: `${baseChip} border-border-strong bg-surface-bg-3 text-text-2`,
  ACTIVE: `${baseChip} border-status-success-600/35 bg-status-success-100 text-text-inverse`,
  SOLD: `${baseChip} border-status-info-600/35 bg-status-info-100 text-text-inverse`,
  REMOVED: `${baseChip} border-status-danger-600/35 bg-status-danger-100 text-text-inverse`,
  PENDING: `${baseChip} border-status-warning-600/35 bg-status-warning-100 text-text-inverse`,
};

export const lockerStatusClass: Record<LockerStatus, string> = {
  EMPTY: `${baseChip} border-border-strong bg-surface-bg-3 text-text-2`,
  OCCUPIED: `${baseChip} border-status-info-600/35 bg-status-info-100 text-text-inverse`,
  LOCKED: `${baseChip} border-status-warning-600/35 bg-status-warning-100 text-text-inverse`,
  UNLOCKED: `${baseChip} border-status-success-600/35 bg-status-success-100 text-text-inverse`,
  ERROR: `${baseChip} border-status-danger-600/35 bg-status-danger-100 text-text-inverse`,
  OUT_OF_SERVICE: `${baseChip} border-status-danger-600/35 bg-status-danger-100 text-text-inverse`,
};

export const refundPreviewClass: Record<RefundPolicyPreview, string> = {
  FULL: `${baseChip} border-status-success-600/35 bg-status-success-100 text-text-inverse`,
  EIGHTY_PERCENT: `${baseChip} border-status-warning-600/35 bg-status-warning-100 text-text-inverse`,
  DENY: `${baseChip} border-status-danger-600/35 bg-status-danger-100 text-text-inverse`,
};
