# Vitafoam Mobile Commerce Platform — Enterprise Backend API

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-v11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB_Atlas-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/RabbitMQ_CloudAMQP-4.2-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ" />
  <img src="https://img.shields.io/badge/Upstash_Redis-Serverless-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/BullMQ-v5-FF0055?style=for-the-badge" alt="BullMQ" />
  <img src="https://img.shields.io/badge/Render-Live_Production-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render" />
</p>

---

## 🌐 Live Production Environments (Render)

| Service | Live URL | Description |
| :--- | :--- | :--- |
| **📚 Interactive Swagger UI** | [https://vitaformapi.onrender.com/docs](https://vitaformapi.onrender.com/docs) | Complete OpenAPI documentation with `X-Session-Token` auth and progressive tag filtering |
| **📡 Primary API Base URL** | [https://vitaformapi.onrender.com/api/v1](https://vitaformapi.onrender.com/api/v1) | Base endpoint for all mobile & web commerce HTTP requests |
| **❤️ Live Health & Diagnostics** | [https://vitaformapi.onrender.com/health](https://vitaformapi.onrender.com/health) | Real-time diagnostics monitoring MongoDB Atlas, CloudAMQP, Upstash Redis, and Memory |

---

## 🏗️ Architectural Highlights

The **Vitafoam Mobile Commerce Platform** is engineered for high throughput, zero-trust security, and horizontal scalability across cloud infrastructure:

1. **ACID Transactional Outbox Pattern**:
   Every state modification (`UserRegistered`, `OrderPlaced`, `PaymentVerified`) is committed atomically within a Mongoose transaction alongside an `outbox_events` record. An asynchronous background `OutboxWorker` polls every 5s to guarantee at-least-once domain event publication to CloudAMQP RabbitMQ without dual-write failures.
2. **Multi-Channel Asynchronous Notifications (`NotificationsModule`)**:
   Powered by **BullMQ & Upstash Serverless Redis**. When verification codes or transactional alerts are triggered, jobs are pushed instantly into high-concurrency queues (`email.queue`, `sms.queue`, `notification.queue`) and processed by:
   - **`EmailWorker`**: Renders templates & dispatches via Nodemailer SMTP / SendGrid (with instant developer console banners).
   - **`SmsWorker`**: Dispatches real SMS via Termii API / Twilio.
   - **`PushWorker`**: Delivers lock-screen alerts to physical iOS & Android devices via Firebase Cloud Messaging (`firebase-admin`).
3. **Zero-Trust Security & RBAC Guard Chain**:
   All endpoints enforce strict input sanitization (`SanitizePipe`), tiered rate limiting (`ThrottlerModule`), session token verification (`SessionAuthGuard`), role checking (`RolesGuard`), and fine-grained permission authorization (`PermissionsGuard`).
4. **Progressive OpenAPI Documentation**:
   The Swagger document dynamically inspects registered route trees (`main.ts`) and automatically prunes unbuilt/future phase tags, ensuring frontend developers only see 100% functional, live endpoints right now (`Auth` & `Health`).

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20+ (`v24.14+` recommended)
- **Package Manager**: `npm` or `pnpm`

### 2. Installation & Configuration
Clone the repository and install dependencies:
```bash
git clone https://github.com/sirlawglobal/vitaFormApi.git
cd vitaFormApi
npm install
```

Make sure your `.env` file is present at the project root with your credentials (see `.env.example`).

### 3. Start Development Server
Run the application locally with watch mode / hot-reloading:
```bash
npm run start:dev
```
Once started, your local endpoints will be available at:
- **API Base**: `http://localhost:3000/api/v1`
- **Swagger Docs**: `http://localhost:3000/docs`
- **Health Check**: `http://localhost:3000/health`

---

## 📋 Progressive Roadmap & Implementation Status

For our detailed 14-phase implementation plan, see [PROJECT_PHASES.md](./PROJECT_PHASES.md).

| Phase | Module | Status | Highlights |
| :---: | :--- | :---: | :--- |
| **1 & 2** | Core Infrastructure | ✅ **Live** | NestJS v11, Pino Logging, CloudAMQP RabbitMQ, Upstash Redis over TLS, Outbox Polling Worker, Terminus Diagnostics |
| **3** | Authentication & RBAC | ✅ **Live** | Customer Registration, Login (`session-token`), OTP verification, Password resets, Zero-trust session revocation (`auth.sessions`) |
| **11 (Early)** | BullMQ Notifications | ✅ **Live** | `EmailWorker`, `SmsWorker`, and `PushWorker` consumers actively handling verification codes and real-time Dev Banners |
| **4 – 10** | Commerce Engine | ⏳ Pending | User Profiles, Product Catalog, Inventory Reservation, Cart, Checkout, Orders, Payment Gateway Webhooks (Paystack/Flutterwave) |
| **12 – 14** | Personalization & Admin | ⏳ Pending | Support Chat WebSockets, Mattress Finder / Sleep Quiz, Warranty Registration, Geospatial Dealer Locator, Analytics Engine |

---

## 🧪 Testing

```bash
# Type verification
npm run typecheck

# Unit tests
npm run test

# End-to-End (e2e) tests
npm run test:e2e
```

---

## 📄 License & Ownership
Copyright © 2026 **Vitafoam Nigeria Plc / Sirlaw Global**. All rights reserved.
