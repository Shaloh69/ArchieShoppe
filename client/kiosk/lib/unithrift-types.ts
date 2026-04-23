export type UserRole = "BUYER" | "SELLER" | "ADMIN";

export type OrderStatus =
  | "HELD"
  | "COMPLETED"
  | "REFUND_REQUESTED"
  | "REFUNDED"
  | "PARTIAL_REFUND"
  | "CANCELLED";

export type ItemStatus = "DRAFT" | "ACTIVE" | "SOLD" | "REMOVED" | "PENDING";

export type LockerStatus =
  | "EMPTY"
  | "OCCUPIED"
  | "LOCKED"
  | "UNLOCKED"
  | "ERROR"
  | "OUT_OF_SERVICE";

export type LockerSubscriptionPlanId =
  | "WEEKLY_1"
  | "WEEKLY_2"
  | "MONTHLY_1"
  | "MONTHLY_2"
  | "MONTHLY_3";

export type RefundPolicyPreview = "FULL" | "EIGHTY_PERCENT" | "DENY";

export interface Item {
  id: string;
  title: string;
  category: string;
  condition: "Like New" | "Good" | "Fair";
  price: number;
  sellerName: string;
  status: ItemStatus;
  description: string;
  slotId?: string;
  lockerSubscriptionPlanId?: LockerSubscriptionPlanId;
  lockerSubscriptionEndsAt?: string;
  updatedAt: string;
}

export interface OrderEvent {
  id: string;
  timestamp: string;
  event: string;
  details: string;
}

export interface Order {
  id: string;
  date: string;
  itemId: string;
  itemTitle: string;
  amount: number;
  status: OrderStatus;
  role: "buyer" | "seller";
  buyer: string;
  seller: string;
  slotId?: string;
  holdEndsAt?: string;
  events: OrderEvent[];
}

export interface WalletLedgerEntry {
  id: string;
  timestamp: string;
  type: "credit" | "debit" | "hold" | "release" | "refund" | "commission";
  amount: number;
  reference: string;
}

export interface Locker {
  slotId: string;
  status: LockerStatus;
  currentItem?: string;
  lastEvent: string;
  sensorSummary: string;
}

export interface LockerSubscriptionPlan {
  id: LockerSubscriptionPlanId;
  name: string;
  durationDays: number;
  price: number;
  highlight?: string;
}

export interface RefundRecord {
  id: string;
  orderId: string;
  buyer: string;
  seller: string;
  amount: number;
  requestedAt: string;
  policyPreview: RefundPolicyPreview;
  status: "REQUESTED" | "APPROVED" | "DENIED";
}

export interface AuditLog {
  id: string;
  time: string;
  type: "order" | "admin" | "locker" | "iot";
  actor: string;
  entity: string;
  action: string;
  metadata: string;
}
