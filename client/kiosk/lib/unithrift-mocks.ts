import {
  AuditLog,
  Item,
  LockerSubscriptionPlan,
  Locker,
  Order,
  RefundRecord,
  WalletLedgerEntry,
} from "@/lib/unithrift-types";

export const walletBalance = 940;

export const categories = ["Clothing", "Accessories", "Shoes", "Tech"];
export const conditions = ["Like New", "Good", "Fair"] as const;
export const lockerSubscriptionPlans: LockerSubscriptionPlan[] = [
  {
    id: "WEEKLY_1",
    name: "1 Week",
    durationDays: 7,
    price: 149,
    highlight: "Starter",
  },
  {
    id: "WEEKLY_2",
    name: "2 Weeks",
    durationDays: 14,
    price: 279,
    highlight: "Better value",
  },
  {
    id: "MONTHLY_1",
    name: "1 Month",
    durationDays: 30,
    price: 549,
    highlight: "Most picked",
  },
  {
    id: "MONTHLY_2",
    name: "2 Months",
    durationDays: 60,
    price: 999,
    highlight: "Growth",
  },
  {
    id: "MONTHLY_3",
    name: "3 Months",
    durationDays: 90,
    price: 1399,
    highlight: "Best long-term",
  },
];

export const items: Item[] = [
  {
    id: "itm-1001",
    title: "Uniqlo Overshirt",
    category: "Clothing",
    condition: "Like New",
    price: 650,
    sellerName: "Ana C.",
    status: "ACTIVE",
    description: "Navy overshirt, size M, lightly worn.",
    slotId: "S-03",
    updatedAt: "2026-02-18T09:20:00Z",
  },
  {
    id: "itm-1002",
    title: "Canvas Tote Bag",
    category: "Accessories",
    condition: "Good",
    price: 320,
    sellerName: "Mark P.",
    status: "ACTIVE",
    description: "Large tote with inner pockets.",
    slotId: "S-07",
    updatedAt: "2026-02-18T11:15:00Z",
  },
  {
    id: "itm-1003",
    title: "Retro Running Shoes",
    category: "Shoes",
    condition: "Fair",
    price: 980,
    sellerName: "Sonia L.",
    status: "ACTIVE",
    description: "US 9, minor outsole wear.",
    slotId: "S-12",
    updatedAt: "2026-02-18T12:30:00Z",
  },
  {
    id: "itm-1004",
    title: "Wireless Mouse",
    category: "Tech",
    condition: "Good",
    price: 450,
    sellerName: "Jules T.",
    status: "PENDING",
    description: "2.4Ghz dongle, rechargeable.",
    slotId: "S-14",
    updatedAt: "2026-02-18T13:40:00Z",
  },
];

export const myListings: Item[] = [
  {
    id: "itm-m01",
    title: "Linen Polo",
    category: "Clothing",
    condition: "Like New",
    price: 590,
    sellerName: "You",
    status: "ACTIVE",
    description: "Cream linen polo, size L.",
    slotId: "S-05",
    lockerSubscriptionPlanId: "MONTHLY_1",
    lockerSubscriptionEndsAt: "2026-03-19T10:00:00Z",
    updatedAt: "2026-02-18T10:00:00Z",
  },
  {
    id: "itm-m02",
    title: "Casual Belt",
    category: "Accessories",
    condition: "Good",
    price: 240,
    sellerName: "You",
    status: "DRAFT",
    description: "Brown belt, 36in.",
    updatedAt: "2026-02-17T07:30:00Z",
  },
  {
    id: "itm-m03",
    title: "Sneakers",
    category: "Shoes",
    condition: "Fair",
    price: 780,
    sellerName: "You",
    status: "SOLD",
    description: "Daily pair, cleaned.",
    slotId: "S-09",
    lockerSubscriptionPlanId: "WEEKLY_2",
    lockerSubscriptionEndsAt: "2026-02-22T15:22:00Z",
    updatedAt: "2026-02-16T15:22:00Z",
  },
];

export const orders: Order[] = [
  {
    id: "ord-501",
    date: "2026-02-18T09:30:00Z",
    itemId: "itm-1001",
    itemTitle: "Uniqlo Overshirt",
    amount: 650,
    status: "HELD",
    role: "buyer",
    buyer: "You",
    seller: "Ana C.",
    slotId: "S-03",
    holdEndsAt: "2026-02-19T09:30:00Z",
    events: [
      {
        id: "ev-1",
        timestamp: "2026-02-18T09:30:00Z",
        event: "Order Created",
        details: "Payment hold initialized.",
      },
      {
        id: "ev-2",
        timestamp: "2026-02-18T09:31:20Z",
        event: "Unlock Issued",
        details: "Locker S-03 unlock command queued.",
      },
    ],
  },
  {
    id: "ord-477",
    date: "2026-02-15T11:40:00Z",
    itemId: "itm-0901",
    itemTitle: "Windbreaker Jacket",
    amount: 730,
    status: "COMPLETED",
    role: "buyer",
    buyer: "You",
    seller: "Mico V.",
    slotId: "S-02",
    events: [
      {
        id: "ev-3",
        timestamp: "2026-02-15T11:40:00Z",
        event: "Order Created",
        details: "Wallet debit succeeded.",
      },
      {
        id: "ev-4",
        timestamp: "2026-02-15T11:43:40Z",
        event: "Door Opened",
        details: "Item claimed by buyer.",
      },
    ],
  },
  {
    id: "ord-610",
    date: "2026-02-17T08:50:00Z",
    itemId: "itm-m03",
    itemTitle: "Sneakers",
    amount: 780,
    status: "COMPLETED",
    role: "seller",
    buyer: "Paolo M.",
    seller: "You",
    slotId: "S-09",
    events: [
      {
        id: "ev-5",
        timestamp: "2026-02-17T08:50:00Z",
        event: "Order Created",
        details: "Seller release pending hold period.",
      },
      {
        id: "ev-6",
        timestamp: "2026-02-17T08:57:00Z",
        event: "Completed",
        details: "Funds released minus commission.",
      },
    ],
  },
];

export const walletLedger: WalletLedgerEntry[] = [
  {
    id: "lg-1",
    timestamp: "2026-02-18T09:30:00Z",
    type: "hold",
    amount: -650,
    reference: "ord-501",
  },
  {
    id: "lg-2",
    timestamp: "2026-02-17T08:57:00Z",
    type: "credit",
    amount: 702,
    reference: "ord-610",
  },
  {
    id: "lg-3",
    timestamp: "2026-02-16T07:10:00Z",
    type: "credit",
    amount: 1000,
    reference: "wallet-topup",
  },
  {
    id: "lg-4",
    timestamp: "2026-02-15T11:40:00Z",
    type: "debit",
    amount: -730,
    reference: "ord-477",
  },
];

export const lockers: Locker[] = [
  {
    slotId: "S-01",
    status: "EMPTY",
    lastEvent: "2026-02-18T09:22:00Z",
    sensorSummary: "Door closed, occupancy false",
  },
  {
    slotId: "S-02",
    status: "LOCKED",
    currentItem: "Windbreaker Jacket",
    lastEvent: "2026-02-15T11:43:40Z",
    sensorSummary: "Door opened then closed",
  },
  {
    slotId: "S-03",
    status: "UNLOCKED",
    currentItem: "Uniqlo Overshirt",
    lastEvent: "2026-02-18T09:31:20Z",
    sensorSummary: "Unlock command acknowledged",
  },
  {
    slotId: "S-04",
    status: "ERROR",
    lastEvent: "2026-02-18T09:40:00Z",
    sensorSummary: "Actuator timeout",
  },
  {
    slotId: "S-05",
    status: "OCCUPIED",
    currentItem: "Linen Polo",
    lastEvent: "2026-02-18T10:00:00Z",
    sensorSummary: "Occupancy true",
  },
];

export const refunds: RefundRecord[] = [
  {
    id: "ref-2201",
    orderId: "ord-501",
    buyer: "You",
    seller: "Ana C.",
    amount: 650,
    requestedAt: "2026-02-18T12:10:00Z",
    policyPreview: "FULL",
    status: "REQUESTED",
  },
  {
    id: "ref-2202",
    orderId: "ord-450",
    buyer: "Jun R.",
    seller: "Miko L.",
    amount: 420,
    requestedAt: "2026-02-18T02:00:00Z",
    policyPreview: "EIGHTY_PERCENT",
    status: "APPROVED",
  },
  {
    id: "ref-2203",
    orderId: "ord-410",
    buyer: "Lea C.",
    seller: "Kane D.",
    amount: 390,
    requestedAt: "2026-02-14T02:00:00Z",
    policyPreview: "DENY",
    status: "DENIED",
  },
];

export const auditLogs: AuditLog[] = [
  {
    id: "au-1",
    time: "2026-02-18T09:31:20Z",
    type: "locker",
    actor: "system",
    entity: "locker:S-03",
    action: "unlock_issued",
    metadata: '{"source":"kiosk","orderId":"ord-501"}',
  },
  {
    id: "au-2",
    time: "2026-02-18T12:10:00Z",
    type: "order",
    actor: "user:you",
    entity: "order:ord-501",
    action: "refund_requested",
    metadata: '{"elapsedHours":2.67}',
  },
  {
    id: "au-3",
    time: "2026-02-18T12:20:00Z",
    type: "admin",
    actor: "admin:maria",
    entity: "refund:ref-2201",
    action: "review_opened",
    metadata: '{"policy":"<=12h full"}',
  },
];

export const adminMetrics = {
  expiringHolds: 3,
  pendingRefunds: 2,
  lockerErrors: 1,
  todaysSales: 6840,
  todaysCommission: 684,
};
