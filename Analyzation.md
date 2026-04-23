# UniThrift — Full System Analysis

## 1. Project Overview

UniThrift is a smart kiosk marketplace with digital payment integration built for University of Cebu Lapu-Lapu and Mandaue (UCLM) students. It allows student sellers to list second-hand items in physical smart lockers and buyers to purchase them via a web app and kiosk touchscreen interface, eliminating unsafe face-to-face transactions and social media-based selling.

---

## 2. System Architecture

```
┌──────────────────────── RENDER FREE TIER ────────────────────────────┐
│                                                                        │
│   [Next.js 15 App]                    [Node.js/Express API]           │
│   /app/*  /admin/*  /kiosk/*   ←──→  REST + WebSocket (:3001)        │
│   Render Web Service (free)           Render Web Service (free)       │
│                                       + PayMongo webhooks             │
│                                       + node-cron hold-release job    │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │ Prisma ORM (mysql2)
                         ┌──────────▼──────────┐
                         │  Aiven MySQL (cloud) │
                         │  Free tier / 5 GB    │
                         └─────────────────────┘

┌──────────────────────── RENDER PAID TIER ────────────────────────────┐
│   Python FastAPI — Item Verification Service                          │
│   POST /api/v1/extract-features   (seller places item → store feats) │
│   POST /api/v1/verify             (buyer return refund → compare)    │
│   GET  /api/v1/health                                                 │
│   Render Web Service (Starter $7/mo)                                  │
│   Source: adapted from EngiRent AI Verification Service               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────── PHYSICAL KIOSK PC ───────────────────────────┐
│  Browser → /kiosk/* (same Next.js app, touch-optimised)              │
│  USB Cameras x6 → navigator.mediaDevices.getUserMedia()              │
│     cam[0]→S-01  cam[1]→S-02  cam[2]→S-03                           │
│     cam[3]→S-04  cam[4]→S-05  cam[5]→S-06                           │
│                                                                        │
│  ESP32 (WiFi) ──WebSocket──→ Node.js server (/ws/esp)                │
│     GPIO 4,5,16,17,18,19 → Relay x6 → Solenoid Lock x6              │
│     GPIO 32,33,34,35,36,39 ← Reed switch door sensors x6            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack Justification

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Already built; SSR/CSR hybrid; free Render hosting |
| UI Library | HeroUI v2 + Tailwind CSS 4 | Already integrated; rich component set |
| Backend | Node.js + Express + TypeScript | Fast to develop; strong ecosystem; free Render tier |
| ORM | Prisma | Type-safe queries; auto-migration; MySQL support |
| Database | MySQL on Aiven | Free tier; managed cloud; SSL by default |
| WebSocket | `ws` library | Lightweight; shares HTTP server with Express; native protocol |
| Auth | JWT (access 15min + refresh 7d) | Stateless; works across web and kiosk; HTTP-only cookie for refresh |
| Payments | PayMongo Checkout Sessions | Philippine payment rails (GCash, Maya, card); simple webhook |
| Item Verification | Python FastAPI + ResNet50/SIFT/SSIM | Adapted from EngiRent; proven hybrid CV pipeline |
| Firmware | Arduino/ESP32 + arduinoWebSockets | Standard ESP32 toolchain; WebSocket library stable |
| Camera | Browser getUserMedia | No local agent needed; USB cameras appear as video inputs |
| Scheduled Jobs | node-cron | Lightweight in-process scheduler; handles 24h hold releases |
| Validation | Zod | Runtime schema validation; TypeScript inference |
| Password Hash | bcryptjs | Pure JS; bcrypt algorithm; no native bindings needed on Render |

---

## 4. Database Schema

### Entity Relationship Summary

```
User ──< Item (seller)
User ──< Order (buyer)
User ──< Order (seller)
User ──< WalletTransaction
User ──< RefreshToken
User ──< PaymongoPayment
Item >── LockerSlot (one slot per active item)
Item >── LockerSubscriptionPlan
Order ──< OrderEvent
Order ──1 Refund
Refund ──< CameraCapture (via itemId/slotId)
LockerSlot ──< LockerEvent
LockerSlot ──< CameraCapture
```

### Tables

**users** — `id, email, passwordHash, fullName, role(BUYER|SELLER|ADMIN), walletBalance, isVerified`

**refresh_tokens** — `id, token(unique), userId, expiresAt`

**locker_slots** — `id, slotId(S-01…S-06, unique), status, lastEvent`

**locker_subscription_plans** — `id, name, durationDays, price, highlight`

**items** — `id, title, category, condition, price, description, imageUrl, extractedFeatures(JSON), sellerId, status, slotId(unique nullable), subscriptionPlanId, subscriptionEndsAt`

**orders** — `id, itemId, buyerId, sellerId, amount, status, slotId, personalCode(unique), holdEndsAt`

**order_events** — `id, orderId, event, actor, metadata(JSON)`

**wallet_transactions** — `id, userId, type, amount, referenceId, description`

**refunds** — `id, orderId(unique), buyerId, sellerId, amount, policy, buyerRefundAmount, sellerFeeAmount, status, classificationResult(JSON), adminNotes`

**camera_captures** — `id, slotId, itemId, captureType(PLACEMENT|RETURN), imagePath, classificationResult(JSON)`

**locker_events** — `id, slotId, eventType, source(ESP32|ADMIN|SYSTEM), metadata(JSON)`

**paymongo_payments** — `id, userId, checkoutSessionId(unique), amount, status`

**audit_logs** — `id, type(ORDER|ADMIN|LOCKER|IOT|AUTH), actor, entity, action, metadata(JSON)`

---

## 5. API Endpoints

### Auth `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login, set refresh cookie |
| POST | `/refresh` | cookie | Refresh access token |
| POST | `/logout` | Bearer | Revoke refresh token |
| GET | `/me` | Bearer | Get current user profile |

### Items `/api/items`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Bearer | List active items (browse) |
| GET | `/:id` | Bearer | Get item detail |
| POST | `/` | Bearer | Create draft listing |
| PATCH | `/:id` | Bearer (owner) | Update listing |
| DELETE | `/:id` | Bearer (owner/admin) | Remove listing |
| POST | `/:id/image` | Bearer (owner) | Upload item image |
| GET | `/seller/mine` | Bearer | Get own listings |

### Wallet `/api/wallet`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Bearer | Balance + ledger |
| POST | `/topup` | Bearer | Create PayMongo checkout |
| GET | `/topup/status/:sessionId` | Bearer | Check payment status |

### Orders `/api/orders`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Bearer (buyer) | Purchase item (hold payment) |
| GET | `/` | Bearer | List own orders |
| GET | `/:id` | Bearer | Get order detail |
| POST | `/:id/validate-code` | — (kiosk) | Validate personal code at kiosk |
| POST | `/:id/cancel` | Bearer (buyer) | Cancel order (if not claimed) |

### Lockers `/api/lockers`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Bearer | List all slots |
| GET | `/available` | Bearer | List empty slots |
| GET | `/:slotId` | Bearer | Get slot detail |
| POST | `/:slotId/unlock` | Admin | Emergency admin unlock |
| POST | `/:slotId/lock` | Admin | Admin force lock |
| POST | `/:slotId/out-of-service` | Admin | Mark out of service |
| POST | `/:slotId/in-service` | Admin | Mark back in service |
| POST | `/:slotId/reconcile` | Admin | Reconcile slot state |
| POST | `/rent` | Bearer (seller) | Rent a slot for listing |

### Refunds `/api/refunds`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Bearer (buyer) | Request refund |
| GET | `/` | Admin | List all refunds |
| GET | `/:id` | Bearer | Get refund detail |
| POST | `/:id/approve` | Admin | Approve refund |
| POST | `/:id/deny` | Admin | Deny refund |

### Users `/api/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | List all users |
| GET | `/:id` | Admin | Get user detail |
| PATCH | `/:id/role` | Admin | Change user role |
| PATCH | `/:id/verify` | Admin | Verify user account |
| DELETE | `/:id` | Admin | Delete user |

### Reports `/api/reports`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/overview` | Admin | KPI metrics |
| GET | `/sales` | Admin | Sales by date |
| GET | `/commissions` | Admin | Commission breakdown |
| GET | `/refunds` | Admin | Refund summary |
| GET | `/payouts` | Admin | Seller payout summary |

### Webhooks `/api/webhooks`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/paymongo` | Signature | PayMongo payment events |

---

## 6. WebSocket Protocol

### Connection Paths
- `ws://server/ws/esp` — ESP32 hardware (no JWT, identified by deviceId)
- `ws://server/ws/admin?token=<jwt>` — Admin browser (JWT required, ADMIN role)

### ESP32 → Server Messages
```json
{ "type": "IDENTIFY",    "deviceId": "Kiosk-1" }
{ "type": "HEARTBEAT",   "deviceId": "Kiosk-1", "timestamp": 1234567890 }
{ "type": "DOOR_OPENED", "slotId": "S-01", "timestamp": 1234567890 }
{ "type": "DOOR_CLOSED", "slotId": "S-01", "timestamp": 1234567890 }
{ "type": "COMMAND_ACK", "commandId": "uuid", "slotId": "S-01", "success": true }
{ "type": "SENSOR_DUMP", "slots": [{ "slotId": "S-01", "locked": true, "doorClosed": true }] }
```

### Server → ESP32 Messages
```json
{ "type": "UNLOCK", "commandId": "uuid", "slotId": "S-01", "durationMs": 5000 }
{ "type": "LOCK",   "commandId": "uuid", "slotId": "S-01" }
{ "type": "PING" }
```

### Server → Admin Browser Messages
```json
{ "type": "LOCKER_UPDATE",    "slotId": "S-01", "status": "UNLOCKED", "item": "..." }
{ "type": "NEW_ORDER",        "orderId": "...", "itemTitle": "...", "buyer": "..." }
{ "type": "REFUND_REQUEST",   "refundId": "...", "orderId": "...", "amount": 500 }
{ "type": "LOCKER_ERROR",     "slotId": "S-01", "error": "actuator_timeout" }
{ "type": "ESP_CONNECTED",    "deviceId": "Kiosk-1" }
{ "type": "ESP_DISCONNECTED", "deviceId": "Kiosk-1" }
{ "type": "HOLD_EXPIRING",    "orderId": "...", "itemTitle": "...", "hoursLeft": 1 }
{ "type": "ORDER_COMPLETED",  "orderId": "...", "sellerPayout": 450 }
```

---

## 7. Authentication & Security

### JWT Flow
1. `POST /api/auth/login` → returns `{ accessToken }` in body + sets `refresh_token` in HTTP-only, Secure, SameSite=Strict cookie
2. Client stores access token in React context (memory, not localStorage — cleared on tab close)
3. Every API request: `Authorization: Bearer <accessToken>`
4. On 401: client calls `POST /api/auth/refresh` (sends cookie automatically) → gets new access token
5. `POST /api/auth/logout` deletes refresh token from DB + clears cookie

### Token Specs
| Token | Secret | Expiry | Storage |
|---|---|---|---|
| Access | `ACCESS_TOKEN_SECRET` | 15 minutes | React context (memory) |
| Refresh | `REFRESH_TOKEN_SECRET` | 7 days | MySQL `refresh_tokens` + HTTP-only cookie |

### Security Measures
- Passwords: bcrypt with cost factor 12
- Webhook: HMAC-SHA256 signature verification (PayMongo)
- CORS: restricted to known origins (CLIENT_URL env var)
- Helmet: standard HTTP security headers
- Zod: all incoming request bodies validated
- SQL injection: impossible via Prisma parameterised queries
- Rate limiting: `express-rate-limit` on auth routes (5 req/15min)
- Admin routes: double-checked via `adminOnly` middleware (role === ADMIN)
- API key: Python server protected by `X-API-Key` header (internal secret)

---

## 8. Payment Flow (PayMongo)

### Wallet Top-Up
```
1. POST /api/wallet/topup { amount }
   → Server creates PayMongo Checkout Session
   → Returns { checkoutUrl, sessionId }

2. Client redirects to PayMongo checkout (GCash / Maya / card)

3. User completes payment on PayMongo

4. PayMongo sends POST /api/webhooks/paymongo
   → Server verifies HMAC-SHA256 signature
   → Finds PaymongoPayment record
   → Credits user.walletBalance
   → Creates WalletTransaction (type: TOP_UP)
   → Broadcasts wallet update to user session

5. Client GET /api/wallet/topup/status/:sessionId to confirm
```

### Commission Structure
- Platform takes **10%** commission on every completed sale
- On hold release: seller receives `amount × 0.90`, platform keeps `amount × 0.10`

### Refund Policy Engine
| Time Since Purchase | Buyer Receives | Seller Keeps |
|---|---|---|
| < 12 hours (item unaltered) | 90–100% | 0–10% |
| 12–24 hours (item unaltered) | 70–80% | 20–30% |
| > 24 hours OR item altered | 0% | 100% (less platform commission) |

---

## 9. Locker Management System

### Slot States
```
EMPTY → (seller rents) → LOCKED → (seller enters code at kiosk) → OCCUPIED
OCCUPIED → (buyer enters code at kiosk) → UNLOCKED → (door opens/closes) → EMPTY
OCCUPIED → (buyer requests refund, returns item) → UNLOCKED → OCCUPIED (relisted) / EMPTY
LOCKED / OCCUPIED → (admin) → OUT_OF_SERVICE
```

### Code Generation
- 6-character alphanumeric code (uppercase)
- Character set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I confusion)
- Generated using `crypto.randomBytes(6)` — cryptographically secure
- Stored hashed in DB, compared at kiosk via direct lookup

### Auto-Hold Release (node-cron)
- Runs every 5 minutes
- Finds all orders with `status = HELD` and `holdEndsAt < NOW()`
- For each expired order:
  1. Update order → `COMPLETED`
  2. Credit seller wallet (90% after 10% platform commission)
  3. Create `WalletTransaction(SELLER_PAYOUT)`
  4. Update item → `SOLD`
  5. Update locker slot → `EMPTY`
  6. Create `AuditLog` entry
  7. Broadcast `ORDER_COMPLETED` to admin WebSocket

---

## 10. Item Classification System (Python Server)

### Source
Adapted from **EngiRent AI Verification Service** (located at `EngiRent/server/python_server/services/ml/`)

### Changes Made for UniThrift
- Renamed service to "UniThrift Item Verification Service"
- Added `X-API-Key` header authentication middleware
- Changed upload dir to `/tmp/unithrift_uploads`
- Updated CORS origins to include kiosk and web URLs
- Kept all CV/ML logic identical (no changes to feature extractors)

### Verification Pipeline
```
1. Quality Gate     → reject blurry/dark images (Laplacian blur + brightness check)
2. pHash Pre-filter → reject obvious mismatches cheaply (perceptual hash)
3. Traditional CV   → color histograms (HSV), spatial pyramid, shape (Hu moments),
                       texture (LBP), HOG, ORB keypoint descriptors
4. SIFT + RANSAC    → geometric keypoint matching with geometric verification
5. SSIM             → structural similarity index
6. ResNet50 (DL)    → 2048-dim deep feature vectors (ImageNet pretrained)
7. OCR              → serial number detection and cross-matching (pytesseract)
8. Hybrid Score     → weighted combination → trimmed-mean aggregation → decision
```

### Decision Thresholds
| Score | Decision | Action |
|---|---|---|
| ≥ 85% | APPROVED | Auto-approve refund |
| 60–84% | PENDING | Flag for admin manual review |
| < 60% | RETRY / REJECTED | Auto-deny refund |

### Integration Points
- **Seller places item**: `POST /api/v1/extract-features` → features stored as JSON in `items.extractedFeatures`
- **Buyer return for refund**: `POST /api/v1/verify` with stored features + new kiosk images → result stored in `refunds.classificationResult`

---

## 11. ESP32 Firmware Design

### Hardware
| Component | Details |
|---|---|
| MCU | ESP32 (WiFi + Bluetooth built-in) |
| Relays | 6× SPDT relay modules (active LOW) |
| Solenoid Locks | 6× 12V DC solenoid locks |
| Door Sensors | 6× Reed switch (NO type) + 10kΩ external pullup |
| Power | 12V DC supply → 12V for solenoids, USB-to-5V step-down for ESP32 |

### GPIO Mapping
| Slot | Relay Pin | Door Sensor Pin |
|---|---|---|
| S-01 | GPIO 4 | GPIO 32 |
| S-02 | GPIO 5 | GPIO 33 |
| S-03 | GPIO 16 | GPIO 34 |
| S-04 | GPIO 17 | GPIO 35 |
| S-05 | GPIO 18 | GPIO 36 |
| S-06 | GPIO 19 | GPIO 39 |

> Note: GPIO 34–39 are input-only (no internal pullup). Use 10kΩ external pullup to 3.3V.

### Libraries
- `arduinoWebSockets` (Links2004) — WebSocket client
- `ArduinoJson` v7 — JSON serialization
- `WiFi.h` — built-in ESP32 WiFi

### State Machine
```
INIT → WiFi connecting → WiFi connected → WS connecting → WS connected (IDENTIFY sent)
                                                          ↓
                                          Heartbeat loop (every 25s)
                                          Command listener
                                          Door ISR (interrupt on change)
                                          ↓
                                    WS disconnected → reconnect backoff (5s→10s→20s→60s max)
```

### Relay Control Logic
```cpp
void unlockSlot(int slotIndex, int durationMs) {
  digitalWrite(RELAY_PINS[slotIndex], LOW);  // Active LOW — energize
  delay(durationMs);
  digitalWrite(RELAY_PINS[slotIndex], HIGH); // De-energize — spring returns
}
```

---

## 12. Camera Integration

### Approach
Browser `navigator.mediaDevices.getUserMedia()` — kiosk browser accesses USB cameras directly.

### Slot-to-Camera Mapping
```typescript
const SLOT_CAMERA_MAP: Record<string, number> = {
  "S-01": 0, "S-02": 1, "S-03": 2,
  "S-04": 3, "S-05": 4, "S-06": 5,
}
```

### Capture Flow
```
1. enumerate devices → mediaDevices.enumerateDevices()
2. filter videoinput devices → ordered by index
3. getUserMedia({ video: { deviceId: { exact: devices[index].deviceId } } })
4. draw video frame to <canvas>
5. canvas.toBlob("image/jpeg", 0.92)
6. FormData.append("kiosk_images", blob, "capture.jpg")
7. POST to Python server /api/v1/extract-features OR /api/v1/verify
8. parse JSON response → update item/refund in DB via Node API
```

---

## 13. Auto-Migration & Seeding Strategy

### On Server Startup (`src/startup.ts`)
```
1. execSync("npx prisma migrate deploy")
   → Applies all pending Prisma migrations from prisma/migrations/
   → Idempotent — safe to run on every startup
   → Works on both fresh and existing databases

2. Check prisma.lockerSlot.count()
   → If 0: run seedDatabase()
   → Idempotent — only seeds once on fresh DB
```

### Seed Contents
- 6 locker slots (S-01 to S-06, all EMPTY)
- 5 subscription plans (WEEKLY_1, WEEKLY_2, MONTHLY_1, MONTHLY_2, MONTHLY_3)
- 1 admin user (email/password from env vars)
- 1 demo seller
- 1 demo buyer

### Auto-Schema-Update
When the Prisma schema changes:
1. Developer runs `npx prisma migrate dev --name <migration_name>` locally
2. This generates a SQL migration file in `prisma/migrations/`
3. On next Render deploy, startup runs `prisma migrate deploy` → applies the new migration automatically

---

## 14. Deployment Architecture

### Render Services
| Service | Type | Tier | URL |
|---|---|---|---|
| Next.js App | Web Service | Free | `unithrift.onrender.com` |
| Node.js API | Web Service | Free | `unithrift-api.onrender.com` |
| Python AI | Web Service | Starter ($7) | `unithrift-classify.onrender.com` |

### Environment Variables

**Node.js API Server**
```
PORT=3001
NODE_ENV=production
DATABASE_URL=mysql://...@aiven.../unithrift?ssl=true
ACCESS_TOKEN_SECRET=<32+ random chars>
REFRESH_TOKEN_SECRET=<32+ random chars>
PAYMONGO_SECRET_KEY=sk_live_...
PAYMONGO_WEBHOOK_SECRET=whsec_...
PYTHON_SERVER_URL=https://unithrift-classify.onrender.com
PYTHON_API_KEY=<internal shared secret>
CLIENT_URL=https://unithrift.onrender.com
ADMIN_EMAIL=admin@unithrift.edu.ph
ADMIN_PASSWORD=<strong password>
UPLOAD_DIR=/tmp/uploads
```

**Next.js App**
```
NEXT_PUBLIC_API_URL=https://unithrift-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://unithrift-api.onrender.com
```

**Python AI Server**
```
ML_APP_NAME=UniThrift Item Verification Service
ML_DEBUG=false
ML_UPLOAD_DIR=/tmp/unithrift_uploads
API_KEY=<same as PYTHON_API_KEY above>
```

### Free Tier Sleep Workaround
Render free tier spins down after 15 minutes of inactivity. Add an external ping service (UptimeRobot — free) to `GET https://unithrift-api.onrender.com/api/health` every 14 minutes to keep the server awake.

---

## 15. Known Limitations & Future Improvements

| Limitation | Current Workaround | Future Fix |
|---|---|---|
| Render free sleeps | UptimeRobot ping | Upgrade to paid tier |
| Item images lost on redeploy | Ephemeral `/tmp/uploads` | Cloudinary / S3 CDN |
| Single kiosk support | Hardcoded `Kiosk-1` device ID | Device registry table + admin panel |
| Wallet withdrawal | Balance shown only | PayMongo Disbursements API |
| Camera mapping fixed | `cam[index]` hardcoded | Admin-configurable camera mapping page |
| No email notifications | Manual check only | SendGrid/Resend email service |
| No two-factor auth | Password only | TOTP (authenticator app) |
| Python server cold start | ~30s on Render paid | Keep-alive request on Node startup |

---

## 16. File Structure

```
ArchieShoppe/
├── Analyzation.md
├── client/web/               Next.js 15 app (existing + updated)
│   ├── contexts/
│   │   └── auth-context.tsx  JWT auth state + auto-refresh
│   ├── lib/
│   │   └── api-client.ts     Typed fetch wrapper with auth + retry
│   ├── hooks/
│   │   ├── use-ws.ts         WebSocket client for admin
│   │   └── use-camera.ts     getUserMedia + frame capture
│   └── app/...               All pages updated with real API calls
├── server/                   Node.js/Express API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── config/           env.ts, db.ts
│       ├── utils/            jwt.ts, codeGenerator.ts, upload.ts
│       ├── middleware/       auth.ts, adminOnly.ts, errorHandler.ts
│       ├── services/         authService, walletService, orderService,
│       │                     lockerService, refundService,
│       │                     paymongoService, classificationService
│       ├── routes/           auth, items, wallet, orders, lockers,
│       │                     refunds, users, reports, webhooks
│       ├── ws/               wsServer.ts, espHandler.ts,
│       │                     broadcaster.ts, adminHandler.ts
│       ├── jobs/             holdRelease.ts (node-cron)
│       ├── startup.ts        auto-migrate + auto-seed
│       └── index.ts          bootstrap
├── python_server/            FastAPI AI verification (adapted from EngiRent)
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/schemas.py
│   │   ├── routers/verification.py
│   │   ├── features/         deep.py, sift.py, traditional.py, phash.py
│   │   ├── comparison/       hybrid.py, similarity.py
│   │   └── utils/            image.py, quality.py, background.py, ocr.py
│   └── requirements.txt
└── esp32/
    └── unithrift_kiosk/
        ├── unithrift_kiosk.ino
        ├── config.h
        ├── ws_client.h / .cpp
        ├── relay_control.h / .cpp
        └── door_sensor.h / .cpp
```
