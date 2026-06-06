# FlowPay — Multi-Vendor Payment Orchestration Platform

> A production-grade payment platform where customers pay, money auto-splits, and vendors get paid automatically — with full dashboards for Admin, Vendor, and Customer.

🌐 **Live Demo:** [https://flow-pay-umber-ten.vercel.app](https://flow-pay-umber-ten.vercel.app)

---

## 📌 What Is FlowPay?

FlowPay is a **multi-vendor payment orchestration system** — similar to how Swiggy, Razorpay, or Urban Company handle payments internally.

When a customer makes a payment:
- Platform automatically splits the amount (90% vendor / 10% platform)
- Fraud detection runs in real time
- Vendor payout is scheduled and processed automatically
- Every rupee is tracked with full audit trails

---

## 🎯 The Problem It Solves

Every marketplace platform needs to:
- Collect money from customers
- Split it between vendors and themselves
- Pay vendors automatically on a schedule
- Detect and handle fraudulent transactions
- Give each stakeholder their own dashboard

Building this from scratch is complex. FlowPay demonstrates exactly how this works end to end.

---

## 🚀 Live Demo

| Role | Email | Password |
|------|-------|----------|
| Admin | abhi@gmail.com | abhi123 |
| Vendor | hazara@gmail.com | hazara123 |
| Customer | monu@gmail.com | monu123 |

> ⚠️ All payments are in **Razorpay Test Mode** — no real money is involved.
>
> Test Card: `4100 2800 0000 1007` | Expiry: Any future date | CVV: Any 3 digits

---

## ✨ Features

### 👑 Admin
- Dashboard with total GMV, platform revenue, transaction counts
- Vendor onboarding approval / rejection
- Real-time transaction monitor with filters (status, date range, amount)
- Fraud alert management with fault attribution (Customer / Vendor / Both)
- Payout management — schedule, history, manual trigger
- Account deactivation for suspicious users

### 🏪 Vendor
- Onboarding flow with business and bank details
- Earnings dashboard — total earnings, pending payout, next payout date
- Transaction history (their cut only — platform fee hidden)
- Payout history with per-transaction breakdown
- Bank account update flow with admin notification

### 🛒 Customer
- Product listing and shop page
- Razorpay-powered checkout (Card / UPI / Netbanking)
- Payment status page
- Full order history with product details
- Refund request flow

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│         React.js + React Router + Recharts              │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────────┐
│                    EXPRESS SERVER                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Auth Routes │  │ Order Routes │  │ Admin Routes  │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Webhook Handler                      │   │
│  │  Signature Verify → Idempotency → Fraud Check    │   │
│  │  → Atomic Transaction → Payout Schedule          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐                      │
│  │  Bull Queue │  │  node-cron   │                      │
│  │  (Payouts)  │  │  (Scheduler) │                      │
│  └─────────────┘  └──────────────┘                      │
└──────┬──────────────────────┬───────────────────────────┘
       │                      │
┌──────▼──────┐      ┌────────▼────────┐
│ PostgreSQL  │      │     Redis        │
│  (Prisma)   │      │  Bull + Cache    │
└─────────────┘      └─────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Razorpay API    │
                    │  Payments/Payouts │
                    └───────────────────┘
```

---

## 💸 Payment Flow

```
1. Customer clicks "Buy Now"
         ↓
2. Backend creates Razorpay order
   Saves PENDING transaction in DB
         ↓
3. Customer pays via Razorpay popup
         ↓
4. Razorpay sends webhook to server
         ↓
5. Server verifies webhook signature
         ↓
6. Idempotency check
   (prevents duplicate processing)
         ↓
7. Fraud detection runs
   → Customer fault → vendor gets paid, customer flagged
   → Vendor fault   → vendor payout blocked
   → Clean          → normal flow
         ↓
8. Atomic PostgreSQL transaction:
   Transaction → SUCCESS
   Vendor pendingPayout += 90%
   Platform revenue += 10%
         ↓
9. Bull queue schedules payout
   node-cron triggers daily at 9am
         ↓
10. Vendor bank account credited ✅
```

---

## 🛡️ Fraud Detection System

Four rules run on every payment:

| Rule | Fault | Action |
|------|-------|--------|
| 5+ payments in 10 minutes | Customer | Flag customer, pay vendor |
| Amount > ₹1,00,000 | Both | Block payout, alert admin |
| New vendor receiving > ₹50,000 in 24hrs | Vendor | Block vendor payout |
| 3+ different cards from same IP | Customer | Flag customer, pay vendor |

> Fault attribution ensures innocent vendors are not penalized for customer-side fraud.

Redis tracks IP+card combinations with 24hr expiry using Sets.

---

## 🔐 Key Technical Concepts

**Webhook Idempotency**
Every webhook event is stored with a unique `webhookEventId`. Before processing, the system checks if this ID already exists — preventing duplicate payouts if Razorpay sends the same event twice.

**Atomic Transactions**
All financial DB operations (transaction update + vendor payout + platform revenue) happen inside a single PostgreSQL transaction. If any step fails, everything rolls back — no partial saves.

**Fault Attribution**
Fraud detection identifies whether fraud originates from the customer or vendor side, and blocks payouts accordingly — protecting innocent vendors from customer-side fraud.

**Distributed Job Queue**
Bull + Redis manages payout jobs. node-cron triggers the queue daily at 9am. Failed payouts retry automatically without resetting vendor balance.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React.js | UI — 3 role dashboards |
| Backend | Node.js + Express | REST API server |
| Database | PostgreSQL | Financial data storage |
| ORM | Prisma | Type-safe DB queries |
| Queue | BullMQ | Payout job management |
| Cache | Redis | Queue + fraud detection |
| Payments | Razorpay | Payment + payout API |
| Auth | JWT + bcrypt | Secure authentication |
| Scheduler | node-cron | Daily payout trigger |
| Email | Nodemailer | Payment notifications |
| Charts | Recharts | Analytics dashboards |
| Deployment | Railway + Vercel | Cloud hosting |

---

## 📁 Project Structure

```
flowpay/
├── client/                         # React frontend
│   └── src/
│       ├── pages/
│       │   ├── admin/              # Admin dashboards
│       │   ├── vendor/             # Vendor dashboards
│       │   └── customer/           # Customer pages
│       └── components/
│
└── server/                         # Express backend
    ├── prisma/
    │   └── schema.prisma           # Database schema
    ├── src/
    │   ├── routes/
    │   │   ├── auth.ts             # Login / Register
    │   │   ├── order.ts            # Payments + Webhook
    │   │   ├── admin.ts            # Admin APIs
    │   │   └── vendor.ts           # Vendor APIs
    │   ├── middleware/
    │   │   ├── authMiddleware.ts   # JWT + isActive check
    │   │   └── roleCheck.ts        # Role-based access
    │   ├── queues/
    │   │   ├── payoutQueue.ts      # Bull queue setup
    │   │   └── payoutWorker.ts     # Payout job logic
    │   ├── utils/
    │   │   ├── fraudCheck.ts       # Fraud detection
    │   │   └── mailer.ts           # Email notifications
    │   ├── config/
    │   │   └── redis.ts            # Redis connection
    │   └── index.ts                # Server entry point
```

---

## 🗄️ Database Schema

```
User ──────────────┐
  id               │
  name             │
  email            │     Transaction
  role             ├────── customerId
  isActive         │       vendorId
                   │       productId
Vendor ────────────┤       totalAmount
  userId ──────────┘       platformFee
  businessName             vendorAmount
  pendingPayout            status
  totalEarnings            isFlagged
  isApproved               webhookEventId
                           razorpayOrderId
Product                    razorpayPaymentId
  vendorId
  name              Payout
  price               vendorId
                      amount
FraudAlert          status
  userId            scheduledFor
  vendorId          processedAt
  faultType
  isResolved        Platform
                      totalRevenue
                      totalGMV
```

---

## ⚙️ Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/flowpay
cd flowpay

# Backend setup
cd server
npm install
cp .env.example .env
# Fill in your .env values

# Run database migrations
npx prisma migrate dev
npx prisma db seed

# Start backend
npm run dev

# Frontend setup
cd ../client
npm install
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/flowpay
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx
REDIS_URL=redis://default:password@*****
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

---

## 🚢 Deployment

| Service | Platform |
|---------|---------|
| Frontend | Vercel |
| Backend | Railway |
| Database | neondb PostgreSQl |
| Redis | upstash |

---

## 🎓 What This Project Demonstrates

| Concept | Implementation |
|---------|---------------|
| Payment systems | Razorpay order + webhook + payout API |
| Data integrity | PostgreSQL ACID transactions |
| Event-driven design | Webhook-based payment processing |
| Idempotency | Duplicate webhook prevention |
| Job queues | BullMQ payout scheduling |
| Fraud detection | 4-rule system with fault attribution |
| Role-based access | Admin / Vendor / Customer separation |
| Financial tracking | Every rupee traced end to end |
| Production patterns | Retry logic, audit logs, atomic updates |

---

## 📊 API Overview

```
Auth
  POST /api/auth/register
  POST /api/auth/login

Orders
  POST /api/orders/create
  POST /api/orders/verify
  POST /api/orders/webhook
  GET  /api/orders/status/:orderId
  GET  /api/orders/my-orders

Admin
  GET   /api/admin/transactions
  GET   /api/admin/flagged-transactions
  POST  /api/admin/flagged-transactions/:id/resolve
  GET   /api/admin/vendors/pending
  PATCH /api/admin/vendors/:id/approve
  PATCH /api/admin/users/:id/deactivate
  GET   /api/admin/payouts
  POST  /api/admin/payouts/trigger

Vendor
  POST  /api/vendor/onboard
  GET   /api/vendor/transactions
  GET   /api/vendor/payouts
  PATCH /api/vendor/bank-details
```

---

## 🤝 Contributing

Pull requests are welcome. For major changes please open an issue first.

---

## 📄 License

MIT

---

<div align="center">
  Built with ❤️ to demonstrate production-grade payment architecture
</div>
