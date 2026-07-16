git # Enterprise Build Roadmap & Project Phases
## Vitafoam Mobile Commerce Platform Backend
**Architecture & Engineering Standard:** Domain-Driven Design (DDD), Clean Architecture, Outbox Pattern, Redis Session Management, and Asynchronous Microservice Topology.

---

## 🏛️ Core Architectural Mandates (Enforced Across All Phases)

1. **No CRUD Applications**: Every feature must model true business domain workflows (`InitiateCheckout`, `ReserveStock`, `ConfirmOrder`, `ClaimWarranty`).
2. **Domain-Driven Design (DDD) & Clean Layering**: Strict dependency chain:
   `Controller` → `Service` → `Repository` → `Mongoose Schema` / `Outbox Table`.
   *Services never communicate directly with Mongoose collections or third-party APIs.*
3. **Outbox Pattern for Domain Events**: Domain services write events (`OrderCreated`, `PaymentCompleted`) inside the exact same MongoDB ACID transaction as business data. The background `OutboxWorker` polls and emits them in-memory via NestJS `EventEmitter2` (`@nestjs/event-emitter`) with exponential retries and guaranteed zero-data-loss delivery.
4. **Redis-Backed Session Authentication**: **NO JWT REFRESH TOKENS**. Sessions are stored in high-speed Redis Hashes (`vitaform:session:{token}`) with multi-device tracking via Redis Sets (`vitaform:user:sessions:{userId}`).
5. **Pure Redis OTP Management**: OTP codes are hashed with SHA-256 and stored strictly inside Redis (`vitaform:otp:{type}:{identifier}`) with 5-minute TTLs and brute-force rate limiters (max 5 attempts). Never stored in MongoDB.
6. **Strategy Pattern for Providers**: AI (`Grok`, `OpenAI`, `Gemini`) and Payment (`Paystack`, `Flutterwave`, `Moniepoint`) integrations must use swappable strategies behind interfaces.
7. **EventEmitter + BullMQ Event Engine**: In our Modular Monolith, `EventEmitter2` handles in-process Domain Event Pub/Sub (`@OnEvent()`), while `BullMQ` (`QueueService`) handles heavy asynchronous computation, PDF invoice generation, scheduled timers, and rate-limited API jobs (`max 5/sec`).
8. **Layer Dependency Rules**:
   ```
   Controller → Service → Repository → Mongoose
                   ↓
               OutboxService → (Outbox saved in same Mongo transaction)
                                     ↓
                              OutboxWorker → EventEmitter2 → Listeners → BullMQ → Workers
   ```
   > Services NEVER import Mongoose models directly.
   > All external side effects go through the Outbox.

---

## 📈 Summary Status Table

| Phase | Title | Module Scope | Status |
| :---: | :--- | :--- | :---: |
| **Phase 1** | System Architecture & Folder Structure | Architecture, Schemas, Redis/MQ Topology, API Catalog | ✅ **Completed** |
| **Phase 2** | Project Bootstrap & Core Infrastructure | Config, Pino, Database, Cache, BullMQ, RabbitMQ, Outbox, Health | ✅ **Completed** |
| **Phase 3** | Authentication & Redis Session Management | `AuthModule`, `SessionService`, `OtpService`, `UsersModule` (Base) | ✅ **Completed** |
| **Phase 4** | Users, Profiles & Device Management | `UsersModule`, Address Management, FCM Device Tokens, Account Deletion | 🔄 **Next / Ready** |
| **Phase 5** | Products, Categories & Inventory | `ProductsModule`, `CategoriesModule`, `InventoryModule`, Variants, Trees | ⏳ **Pending** |
| **Phase 6** | Search Engine | `SearchModule`, Redis Autocomplete, Popular Queries, MongoDB Text Indexes | ⏳ **Pending** |
| **Phase 7** | AI Recommendation & Mattress Finder | `RecommendationModule`, `MattressFinderModule`, AI Strategy Pattern | ⏳ **Pending** |
| **Phase 8** | Shopping Cart & Checkout | `CartModule`, `CheckoutModule`, Redis Cart Engine, Coupon Application | ⏳ **Pending** |
| **Phase 9** | Orders & Outbox Events | `OrdersModule`, Order State Machine, Tracking, ACID Transactions | ⏳ **Pending** |
| **Phase 10** | Payments (Strategy Pattern) | `PaymentsModule`, Paystack/Flutterwave/Moniepoint Webhooks, Refunds | ⏳ **Pending** |
| **Phase 11** | Notifications & BullMQ Workers | `NotificationsModule`, FCM Push, SendGrid Email, Termii SMS Workers | ⏳ **Pending** |
| **Phase 12** | Support Chat & WebSocket Gateway | `SupportChatModule`, WebSocket Gateway, Real-Time Messaging | ⏳ **Pending** |
| **Phase 13** | Warranty, Dealers, Articles & Sleep Quiz | `WarrantyModule`, `DealersModule` (2dsphere), `ArticlesModule`, `SleepQuizModule` | ⏳ **Pending** |
| **Phase 14** | Admin Portal & Analytics | `AdminModule`, `AnalyticsModule`, Dashboard Metrics, Audit Logs, Settings | ⏳ **Pending** |
| **Phase 15** | Testing: Unit, Integration & E2E | Jest Unit Tests, Integration Tests (Mock Redis/MongoDB), E2E Test Suite | ⏳ **Pending** |
| **Phase 16** | Docker, CI/CD & Cloud Deployment | Dockerfile, GitHub Actions CI/CD, Kubernetes Manifests, Prometheus Metrics | ⏳ **Pending** |

---

## 🛠️ Detailed Breakdown of All 16 Phases

### ✅ Phase 1: System Architecture & Folder Structure (Completed)
* **Deliverables**:
  * Comprehensive folder structure map (`src/config/`, `src/common/`, `src/infrastructure/`, `src/modules/`).
  * Full MongoDB Schema specifications across 20+ enterprise domain collections with compound indexes and TTL cleanup.
  * Complete Redis Key topology (`vitaform:session:*`, `vitaform:otp:*`, `vitaform:lock:*`, `vitaform:cart:*`, `vitaform:rec:*`, `vitaform:search:*`).
  * BullMQ Queue specifications (8 background queues) and RabbitMQ Exchange (`vitaform.domain.events`) + DLX (`vitaform.dead.letter`) routing topologies.
  * Domain Event Catalog (30+ domain events mapped to producers and subscribers).
  * Full API Surface Design (100+ endpoints across all 25 domain modules).
  * Layer dependency rules, security pipeline architecture, deployment architecture (Kubernetes), and CI/CD pipeline specification.
  * Class diagrams (Core Infrastructure) and Sequence diagrams (Order Flow).

---

### ✅ Phase 2: Project Bootstrap & Core Infrastructure (Completed & Verified)
* **Deliverables**:
  * Package configuration (`package.json`) with NestJS v11, Mongoose 8, BullMQ 5, `ioredis`, `amqplib`, and Pino.
  * Typed Configuration Layer (`app`, `database`, `redis`, `rabbitmq`, `storage`, `ai`, `payment`, `firebase`) validated via Joi schemas upon startup.
  * Core Shared Utilities (`src/common/`): 50+ programmatic `ERROR_CODES`, 30+ `DOMAIN_EVENTS`, `BusinessException`, DTO envelopes, `hash.util.ts`, `token.util.ts`, `ParseMongoIdPipe`, and `SanitizePipe` (`sanitize-html` XSS protection).
  * Global Interceptors, Filters & Middleware: `GlobalExceptionFilter`, `TransformResponseInterceptor`, `LoggingInterceptor`, and `CorrelationIdMiddleware` (`X-Correlation-ID`).
  * Enterprise Infrastructure Modules (`src/infrastructure/`):
    * `AppLoggerModule` (Pino with automatic PII redaction for passwords, OTPs, card numbers, and authorization headers).
    * `DatabaseModule` (Mongoose pool `maxPoolSize: 10`, `w: 'majority'`, `retryWrites: true`).
    * `CacheModule` & `CacheService` (ioredis wrapper marked `@Global()`, 15 typed methods including `SET NX EX` distributed locks).
    * `QueueModule` & `QueueService` (BullMQ facade marked `@Global()`, initializing 8 background queues with exponential backoff).
    * `MessagingModule` & `MessagingService` (amqplib ChannelModel, topic exchange + DLX setup, auto-reconnect).
    * `OutboxModule` (`OutboxEvent` schema, `OutboxRepository`, `OutboxService`, and `OutboxWorker` polling every 5s with atomic batch claiming `status: PROCESSING` and 7-day TTL cleanup).
    * `HealthModule` (`/health`, `/health/live`, `/health/ready` probes for Kubernetes via `@nestjs/terminus`).
  * Application Root Bootstrap (`main.ts` & `app.module.ts`) with Helmet, strict CORS, `ThrottlerModule` rate limiting, `ValidationPipe` (`whitelist: true`), and Swagger UI (`/docs`).
  * Dockerized local stack (`docker-compose.yml` for MongoDB 7, Redis 7, and RabbitMQ 3.13 + Management UI).
* **Verification Status**: `npx tsc --noEmit` → `EXIT:0`; `npm run build` → `BUILD_EXIT:0`.

---

### ✅ Phase 3: Authentication & Redis Session Management (Completed & Verified)
* **Objective**: Build an enterprise-grade, zero-JWT session authentication and OTP management pipeline.
* **Key Components**:
  * **Minimal Users Bootstrap (`src/modules/users/`)**: Bootstrap `UserSchema` (`users` collection) and `UsersRepository` so auth can verify credentials (bcrypt 12 rounds), register accounts, and check verification flags in MongoDB.
  * **`SessionService` (`src/modules/auth/`)**:
    * Generates 48-byte secure random hex tokens (`token.util.ts`).
    * Stores session inside Redis Hash (`HSET vitaform:session:{token}`): `userId`, `role`, `permissions`, `deviceId`, `devicePlatform`, `ip`, `userAgent`, `lastActivity`, `createdAt`.
    * Tracks all user sessions via Redis Set (`SADD vitaform:user:sessions:{userId} {token}`).
    * Enforces device limits (`SESSION_MAX_DEVICES: 5`): automatically identifies and revokes oldest session when exceeded.
    * Implements remote device revocation and `logout-all` (O(1) multi-device cleanup using Redis pipeline).
  * **Pure Redis OTP Engine (`OtpService`)**:
    * Generates 6-digit OTPs, hashes them with SHA-256, and stores inside Redis (`SETEX vitaform:otp:{type}:{identifier} 300 {sha256Hash}`). Never in MongoDB.
    * Rate limiting & brute-force lockouts (`INCR vitaform:otp:attempts:{id}`). Locks for 1 hour after 5 failed attempts.
    * Supports: `phone-verify`, `email-verify`, `password-reset`, `login-2fa`.
  * **Security Guards (`src/common/guards/`)**:
    * `SessionAuthGuard`: Intercepts protected routes, validates session hash against Redis, updates `lastActivity` asynchronously without blocking HTTP response, and attaches `AuthenticatedRequest`.
    * `RolesGuard` & `PermissionsGuard`: Fine-grained RBAC checking `request.session.role` and `request.session.permissions`.
    * `WsAuthGuard`: WebSocket session validation for real-time channels.
  * **Endpoints & Swagger DTOs (`AuthController`)**:
    * `POST /api/v1/auth/register`
    * `POST /api/v1/auth/login`
    * `POST /api/v1/auth/logout`
    * `POST /api/v1/auth/logout-all`
    * `POST /api/v1/auth/resend-otp`
    * `POST /api/v1/auth/verify-phone`
    * `POST /api/v1/auth/verify-email`
    * `POST /api/v1/auth/forgot-password`
    * `POST /api/v1/auth/reset-password`
    * `GET /api/v1/auth/sessions` (list all active device sessions with IP, platform, last active)
    * `DELETE /api/v1/auth/sessions/:sessionId` (revoke a specific device session remotely)
  * **Event Emission**: Dispatches `UserRegistered` and `UserVerified` outbox events to RabbitMQ.

---

### 🔄 Phase 4: Users, Profiles & Device Management (Next / Ready)
* **Objective**: Build comprehensive user profile management, multi-address handling, device registration, and account deletion.
* **Key Components**:
  * **`UsersService` & `UsersRepository` (`src/modules/users/`)**:
    * Profile management (`updateProfile`, `deleteAccount`, avatar upload URLs via Cloudflare R2).
    * Address management (`addresses[]` embedded array): create, update, delete, set default.
    * Device Management (`devices[]` embedded array): register/update Firebase Cloud Messaging (FCM) device tokens, track `lastSeen`.
    * Sleep Profile & Preferences (`preferences` object): save `sleepPosition` (`side | back | stomach`), `bodyWeightKg`, `mattressPreference`, and notification settings.
  * **Endpoints & DTOs (`UsersController`)**:
    * `GET /api/v1/users/me`
    * `PATCH /api/v1/users/me`
    * `DELETE /api/v1/users/me` (account deletion with data retention policy)
    * `GET /api/v1/users/me/addresses`
    * `POST /api/v1/users/me/addresses`
    * `PATCH /api/v1/users/me/addresses/:id`
    * `DELETE /api/v1/users/me/addresses/:id`
    * `PATCH /api/v1/users/me/preferences`
    * `GET /api/v1/users/me/devices`
    * `DELETE /api/v1/users/me/devices/:deviceId`
  * **Event Emission**: Dispatches `UserProfileUpdated` outbox events.

---

### ⏳ Phase 5: Products, Categories & Inventory (Pending)
> **Note:** Inventory is consolidated here from the original Phase 7 to enforce the correct dependency order: Products must exist before Inventory documents can reference them.

* **Objective**: Build the core commerce catalog — multi-variant products, hierarchical categories, and stock management — as a unified domain phase.
* **Key Components**:

  #### Categories (`src/modules/categories/`)
  * Materialized path indexing (`path: /mattresses/orthopedic/`) for fast tree traversal.
  * Full category tree cached in Redis (`vitaform:categories:tree`, TTL 1h) with cache invalidation on mutations.
  * Endpoints: `GET /api/v1/categories`, `GET /api/v1/categories/:slug`, `GET /api/v1/categories/:slug/products` + Admin CRUD.

  #### Products (`src/modules/products/`)
  * Rich product schema with embedded `variants[]` (SKU, dimensions, firmness `soft | medium | firm | extra-firm`, price, weight), `images[]` (url, alt, isPrimary), specifications, and warranty terms.
  * Product filters & sorting: category, firmness, price range, dimensions, sleep position suitability.
  * Related products (`GET /api/v1/products/:id/related`).
  * Single product caching (`vitaform:product:{id}`) and paginated list cache (`vitaform:products:list:{hash}`).
  * Endpoints: `GET /api/v1/products`, `GET /api/v1/products/:slug`, `GET /api/v1/products/:id/related` + Admin CRUD.
  * Event Emission: `ProductCreated`, `ProductUpdated`, `ProductDeleted` (triggers `search.queue` indexing).

  #### Inventory (`src/modules/inventory/`)
  * One document per SKU storing `quantity` (physical total), `reserved` (in-flight), virtual `available = quantity - reserved`, `reorderPoint`, `reorderQuantity`, `warehouse`, and `version` (optimistic lock).
  * **Distributed Checkout Lock** (`CacheService.setNx`): Acquires `vitaform:inventory:lock:{sku}` (30s TTL) before stock reservation to prevent concurrent over-selling.
  * **Optimistic Locking** via `version` field: `findOneAndUpdate({ sku, version: N }, { $inc: { quantity, version: 1 } })`.
  * Stock Reservation Workflow: `reserveStock`, `releaseStock`, `confirmStockDepletion` (all run inside MongoDB sessions).
  * Endpoints: `GET /api/v1/inventory/sku/:sku`, `GET /api/v1/inventory/low-stock`, `POST /api/v1/inventory/adjust` (Admin).
  * Event Emission: `StockReserved`, `StockReleased`, `StockDepleted`.

---

### ⏳ Phase 6: Search Engine (Pending)
* **Objective**: Provide sub-50ms autocomplete, typo-tolerant full-text search, and search history tracking.
* **Key Components** (`src/modules/search/`):
  * **MongoDB Text Indexes**: Compound text index on `name`, `description`, `tags`, and `variants.sku` with weighted scoring.
  * **Redis Autocomplete** (`vitaform:search:autocomplete:{prefix}`): Sorted sets storing top product titles for instant prefix matching.
  * **User Search History** (`vitaform:search:history:{userId}`): Redis List (`LPUSH / LTRIM` max 20 items).
  * **Popular Search Tracking** (`vitaform:search:popular`): Sorted set (`ZINCRBY`) incremented on every query.
  * **Background Search Indexer** (`SearchProcessor` BullMQ Worker): Listens to `search.queue` (`index-product`, `reindex-all`) triggered by `ProductCreated/Updated/Deleted` events.
  * **Endpoints**:
    * `GET /api/v1/search?q=&type=&page=&limit=`
    * `GET /api/v1/search/autocomplete?q=`
    * `GET /api/v1/search/popular`
    * `GET /api/v1/search/history`
    * `DELETE /api/v1/search/history`

---

### ⏳ Phase 7: AI Recommendation & Mattress Finder Engine (Pending)
* **Objective**: Build an AI-powered sleep profile analyzer and recommendation engine using swappable AI providers (Strategy Pattern).
* **Key Components**:
  * **Strategy Pattern (`AiProviderStrategy`)**: Defines `generateRecommendations(userProfile, catalogSummary)` and `analyzeSleepQuiz(answers)`.
    * `GrokAiStrategy`: Integrates xAI `grok-2-latest` API.
    * `OpenAiStrategy`: Integrates `GPT-4o`.
    * `GeminiAiStrategy`: Integrates `@google/generative-ai` (`gemini-2.5-pro`).
    * `AiProviderFactory`: Swaps provider via `AI_PROVIDER` config with zero code change.
  * **`SleepQuizModule` (`src/modules/sleep-quiz/`)**: Stores quiz answers, calculated `recommendedFirmness`, `recommendedSkus[]`, and AI rationale summary. Enqueues `sleep-quiz-processing` BullMQ job for asynchronous AI analysis. Endpoints: `GET /api/v1/sleep-quiz/questions`, `POST /api/v1/sleep-quiz/submit`, `GET /api/v1/sleep-quiz/result/:id`.
  * **`RecommendationModule` (`src/modules/recommendation/`)**: Hybrid scoring (rule-based orthopedic matching + LLM semantic explanation). Caches personalized recommendations in Redis (`vitaform:rec:{userId}`, TTL 24h). Sorted set trending matrix (`vitaform:rec:trending`, updated by checkout events). Endpoints: `GET /api/v1/recommendations/me`, `GET /api/v1/recommendations/popular`, `GET /api/v1/recommendations/trending`, `POST /api/v1/recommendations/trigger`.
  * **`MattressFinderModule`**: `POST /api/v1/mattress-finder/query`, `GET /api/v1/mattress-finder/options`.

---

### ⏳ Phase 8: Shopping Cart & Checkout (Pending)
* **Objective**: Implement a high-speed Redis cart engine and orchestrate the end-to-end checkout flow including coupon application and fee calculation.
* **Key Components**:

  #### Cart (`src/modules/cart/`)
  * Pure Redis Hash engine (`vitaform:cart:{userId}`): zero MongoDB overhead. Fields are `cartItemId` (`{sku}_{variantId}`), values are serialized JSON items.
  * 30-day rolling TTL (`EXPIRE 2592000`) reset on every update.
  * Stock availability check (`CartService.addItem`) and real-time price verification.
  * Cart calculation: `subTotal`, `discountAmount`, `taxAmount` (VAT), `shippingFee` estimation, `totalAmount`.
  * Coupon application directly on cart: `POST /api/v1/cart/apply-coupon`, `DELETE /api/v1/cart/coupon`.
  * Endpoints: `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH /api/v1/cart/items/:itemId`, `DELETE /api/v1/cart/items/:itemId`, `DELETE /api/v1/cart`.

  #### Checkout (`src/modules/checkout/`)
  * `POST /api/v1/checkout/initiate` — ACID transaction: acquires distributed SKU locks, calls `InventoryService.reserveStock()`, applies coupon discount, creates Order, clears Redis cart, and writes `OrderCreated` outbox event.
  * `POST /api/v1/checkout/calculate-fees` — Preview shipping + tax without committing.
  * `POST /api/v1/checkout/validate-address` — Address validation before order submission.

---

### ⏳ Phase 9: Orders & Outbox Events (Pending)
* **Objective**: Build the immutable order record system with strict state machine transitions and order tracking.
* **Key Components** (`src/modules/orders/`):
  * **`orders` Collection Schema**: Immutable records — `orderNumber` (`VF-2026-XXXXX`), `lineItems[]` (frozen price snapshots), `address` snapshot, `billingAddress`, `paymentSummary`, `orderStatus`, and `statusHistory[]` (`status`, `changedAt`, `changedBy`, `note`).
  * **Strict Order State Machine** (`order-status.enum.ts`):
    * Forward path: `PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED`
    * Cancellation: `PENDING` / `CONFIRMED` → `CANCELLED`
    * Returns: `DELIVERED` → `RETURN_REQUESTED` → `REFUNDED`
    * Any invalid transition throws `BusinessException('Invalid order status transition')`.
  * **Endpoints**:
    * `GET /api/v1/orders` (customer: own orders)
    * `GET /api/v1/orders/:id`
    * `GET /api/v1/orders/:id/tracking`
    * `POST /api/v1/orders/:id/cancel`
    * `GET /api/v1/orders` (admin: all orders with filters)
    * `PATCH /api/v1/orders/:id/status` (admin)
    * `GET /api/v1/orders/export` (admin: CSV export)

---

### ⏳ Phase 10: Payments (Strategy Pattern) (Pending)
* **Objective**: Multi-provider, idempotent payment gateway with cryptographic webhook verification.
* **Key Components** (`src/modules/payments/`):
  * **Strategy Interface** (`PaymentProviderStrategy`): `initializePayment`, `verifyTransaction`, `processRefund`, `verifyWebhookSignature`.
  * **Concrete Strategies**: `PaystackStrategy` (HMAC SHA-512 on `x-paystack-signature`), `FlutterwaveStrategy` (`verif-hash`), `MoniepointStrategy`.
  * **`PaymentProviderFactory`**: Dynamically injects correct strategy from config.
  * **`payments` Collection Schema**: `paymentReference`, `orderId`, `userId`, `amount`, `currency` (NGN), `provider`, `status` (`PENDING | SUCCESS | FAILED | REFUNDED`), raw `gatewayResponse`.
  * **Idempotent Webhook Pipeline**:
    1. Cryptographic signature verification.
    2. Distributed lock (`setNx lock:payment:ref_{ref}` 15s) to deduplicate concurrent webhook deliveries.
    3. Idempotency check: if already `SUCCESS`, return `200 OK` without reprocessing.
    4. On success: transition Payment → `SUCCESS`, Order → `CONFIRMED`, `InventoryService.confirmStockDepletion()`, emit `PaymentCompleted` + `OrderConfirmed` outbox events.
    5. On failure: transition Payment → `FAILED`, Order → `CANCELLED`, `InventoryService.releaseStock()`, emit `PaymentFailed` outbox event.
  * **Endpoints**:
    * `POST /api/v1/payments/initiate`
    * `POST /api/v1/payments/verify`
    * `GET /api/v1/payments/:id`
    * `POST /api/v1/payments/webhook/:provider` (Paystack | Flutterwave | Moniepoint)
    * `POST /api/v1/payments/:id/refund` (admin)

---

### ⏳ Phase 11: Notifications & BullMQ Workers (Pending)
* **Objective**: Build a multi-channel notification dispatch system with FCM Push, SendGrid Email, and Termii SMS BullMQ workers.
* **Key Components** (`src/modules/notifications/`):
  * **`notifications` Collection Schema**: `userId`, `type` (`ORDER | PAYMENT | PROMO | SYSTEM`), `title`, `body`, `data`, `isRead`, `createdAt`, **90-day TTL index**.
  * **`NotificationProcessor`** (BullMQ Worker): Consumes `notification.queue`. Fans out to FCM (iOS/Android push via Firebase Admin SDK to all registered `user.devices[].fcmToken`).
  * **`EmailProcessor`** (BullMQ Worker): Consumes `email.queue`. Renders HTML templates, generates PDF attachments, dispatches via SendGrid with rate limiting (`limiter: max 5/sec`).
  * **`SmsProcessor`** (BullMQ Worker): Consumes `sms.queue`. Dispatches via Termii API with rate limiting.
  * **Endpoints**:
    * `GET /api/v1/notifications`
    * `PATCH /api/v1/notifications/:id/read`
    * `PATCH /api/v1/notifications/read-all`
    * `DELETE /api/v1/notifications/:id`
    * `POST /api/v1/notifications/register-device`
  * **Wishlist & Reviews**: Also delivered in this phase.
    * **`WishlistModule`**: One doc per user. `GET/POST /api/v1/wishlist`, `DELETE /api/v1/wishlist/:productId`, `POST /api/v1/wishlist/move-to-cart`.
    * **`ReviewsModule`**: Verified buyer enforcement (checks order history), rating aggregation pipeline, admin moderation (`approve/reject`). Dispatches `ReviewSubmitted` + `ReviewApproved` outbox events.

---

### ⏳ Phase 12: Support Chat & WebSocket Gateway (Pending)
* **Objective**: Real-time customer-to-agent support chat system with WebSocket gateway, typing indicators, and read receipts.
* **Key Components** (`src/modules/support-chat/`):
  * **`SupportChatGateway`** (`@WebSocketGateway({ namespace: 'support' })`): Protected by `WsAuthGuard`.
  * **`conversations` & `messages` Collections**: Tracks tickets (`status: OPEN | ASSIGNED | CLOSED`).
  * **Real-Time Events**:
    * Client emits: `join-conversation`, `leave-conversation`, `send-message`, `typing`, `stop-typing`, `message-seen`
    * Server broadcasts: `message.new`, `typing`, `stop-typing`, `delivered`, `conversation.updated`
  * **REST Endpoints (`SupportChatController`)**:
    * `GET /api/v1/chat/conversations`
    * `GET /api/v1/chat/conversations/:id`
    * `POST /api/v1/chat/conversations`
    * `GET /api/v1/chat/conversations/:id/messages`
    * `POST /api/v1/chat/conversations/:id/messages`
    * `POST /api/v1/chat/conversations/:id/close`

---

### ⏳ Phase 13: Warranty, Dealers, Articles & Sleep Quiz (Pending)
* **Objective**: Build after-sales warranty management, geospatial dealer locator, content blog articles, and complete the sleep quiz backend (bridging to Phase 7 AI).

  #### Warranty (`src/modules/warranty/`)
  * `warranties` Collection: `serialNumber`, `productId`, `userId`, `orderId`, `dealerId`, `purchaseDate`, `warrantyPeriodYears`, `expiresAt`, `status` (`ACTIVE | EXPIRED | VOIDED | CLAIM_PENDING`), `claims[]` history.
  * Serial number verification & registration. Warranty claim filing with image evidence (R2 URLs).
  * **Automated Expiry Cron** (`WarrantyExpiryProcessor` BullMQ Repeatable Job, `pattern: '0 0 * * *'`): Checks warranties expiring within 30 days, emits `WarrantyExpiring` outbox events.
  * Endpoints: `GET/POST /api/v1/warranty/me`, `POST /api/v1/warranty/register`, `GET /api/v1/warranty/:id`, `POST /api/v1/warranty/:id/claim` + Admin management.

  #### Dealers (`src/modules/dealers/`)
  * `dealers` Collection with GeoJSON `location` field and `{ location: '2dsphere' }` index.
  * `$geoNear` aggregation pipeline (`DealersRepository.findNearby`): filters `isActive: true`, calculates `distanceMeters`, bounds within `maxDistanceMeters` (default 25km).
  * Redis geospatial cache (`vitaform:dealers:{lat}:{lng}:{radius}`, TTL 30min).
  * Endpoints: `GET /api/v1/dealers?lat=&lng=&radius=&state=`, `GET /api/v1/dealers/:id` + Admin CRUD.

  #### Articles (`src/modules/articles/`)
  * `articles` Collection: text indexes on `title` + `content`, indexed `slug`, `status` (`draft | published`).
  * Category-filtered browsing, Redis cache (6h TTL).
  * Endpoints: `GET /api/v1/articles`, `GET /api/v1/articles/:slug`, `GET /api/v1/articles/category/:category` + Admin CRUD with `PATCH /:id/publish`.

---

### ⏳ Phase 14: Admin Portal & Analytics (Pending)
* **Objective**: Build the admin dashboard, platform analytics, audit logging, system settings, and complete promotions/coupons management.

  #### Admin Module (`src/modules/admin/`)
  * Dashboard overview: `GET /api/v1/admin/dashboard`.
  * User management: `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/status`, `PATCH /api/v1/admin/users/:id/role`.
  * Audit logs: `GET /api/v1/admin/audit-logs` (365-day TTL collection, indexed on `userId` + `action`).
  * Settings management: `GET/PATCH /api/v1/admin/settings`.

  #### Analytics Module (`src/modules/analytics/`)
  * `analytics_events` Collection: high-throughput time-series ingestion (`PRODUCT_VIEW | ADD_TO_CART | CHECKOUT_START | PURCHASE`), 90-day TTL.
  * `AnalyticsProcessor` BullMQ Worker: batch-inserts via `insertMany` to eliminate write latency.
  * Dashboard metrics via MongoDB Aggregation Pipelines (Total Revenue, Conversion Rate, Top Products, DAU).
  * Endpoints: `POST /api/v1/analytics/track`, `GET /api/v1/analytics/dashboard`, `GET /api/v1/analytics/products/:id`, `GET /api/v1/analytics/users`, `GET /api/v1/analytics/revenue`, `GET /api/v1/analytics/funnel`.

  #### Promotions & Coupons (`src/modules/promotions/`)
  * `coupons` Collection: `code`, `discountType` (`PERCENTAGE | FIXED_AMOUNT`), `discountValue`, `minOrderAmount`, `maxDiscountAmount`, `usageLimitTotal`, `usageLimitPerUser`, `applicableCategoryIds[]`, `applicableProductIds[]`, `startDate`, `expiresAt`.
  * High-speed Redis validation (`vitaform:coupon:{code}`, `vitaform:coupon:used:{code}:{userId}`).
  * Endpoints: `GET /api/v1/promotions/active`, `POST /api/v1/coupons/validate` + Admin full CRUD for both promotions and coupons.

---

### ⏳ Phase 15: Testing — Unit, Integration & E2E (Pending)
* **Objective**: Achieve minimum 80% test coverage across all domain modules with mocked infrastructure dependencies.
* **Key Components**:
  * **Unit Tests** (`test/unit/`): Jest tests for all Services and Repositories with mocked MongoDB sessions, mocked `CacheService`, mocked `QueueService`, and mocked `OutboxService`. Every business logic path (state machine transitions, OTP hashing, coupon validation, stock locking) covered.
  * **Integration Tests** (`test/integration/`): Tests running against real in-memory MongoDB (`mongodb-memory-server`) and Redis mock (`ioredis-mock`). Validates full Controller → Service → Repository flows.
  * **E2E Tests** (`test/e2e/`): Supertest-powered HTTP request tests against a live NestJS app instance covering full user journeys: Register → Verify → Login → Browse → Add to Cart → Checkout → Payment Webhook → Order Delivered.
  * **CI Integration**: Tests run automatically on every pull request via GitHub Actions.

---

### ⏳ Phase 16: Docker, CI/CD & Cloud Deployment (Pending)
* **Objective**: Containerize the application, automate testing and deployment pipelines, and configure production cloud infrastructure.
* **Key Components**:
  * **Dockerfile**: Multi-stage build (`node:22-alpine`) — `builder` stage compiles TypeScript, `production` stage runs the compiled `/dist` with minimal footprint.
  * **`docker-compose.prod.yml`**: Full production stack with replicas, resource limits, and healthchecks.
  * **GitHub Actions CI/CD** (`.github/workflows/`):
    * `ci.yml`: Triggers on every push/PR. Jobs: `lint` (ESLint + Prettier) → `type-check` (`tsc --noEmit`) → `test` (Jest unit + integration) → `build` (`nest build`) → `docker` (build & push image to registry).
    * `cd.yml`: Triggers on merge to `main`. Jobs: Deploy to staging → run E2E tests → approval gate → deploy to production (`kubectl apply`).
  * **Kubernetes Manifests**: API Deployment (3 replicas), OutboxWorker Deployment (1 replica), BullMQ Worker Deployment, HorizontalPodAutoscaler, Services, Ingress, ConfigMaps, and Secrets.
  * **Prometheus Metrics** (`GET /metrics`): Expose NestJS request duration, queue depths, outbox lag, and Redis cache hit rates for Grafana dashboards.
  * **Production Infrastructure**: MongoDB Atlas M10+, Redis Cluster, CloudAMQP RabbitMQ, Cloudflare R2 + CDN.

---

## 🔒 Complete Security Pipeline (Applied to Every Request)
```
Request
  ↓ CORS (origin whitelist)
  ↓ Helmet (CSP, HSTS, X-Frame-Options security headers)
  ↓ ThrottlerGuard (rate limiter — 10 req/s short, 50 req/10s medium)
  ↓ CorrelationIdMiddleware (inject X-Correlation-ID for distributed tracing)
  ↓ LoggingInterceptor (structured Pino log with method, path, duration)
  ↓ SessionAuthGuard (validate Redis session hash — bypassed by @Public())
  ↓ RolesGuard (RBAC: customer | admin | support | dealer)
  ↓ PermissionsGuard (fine-grained permission strings)
  ↓ ValidationPipe (whitelist: true, forbidNonWhitelisted: true, transform: true)
  ↓ SanitizePipe (recursive sanitize-html XSS stripping)
  ↓ Controller → Service → Repository
  ↓ AuditLogInterceptor (writes to audit_logs collection)
  ↓ TransformResponseInterceptor (standard { success, data, error, correlationId, timestamp } envelope)
```

---

## 🚀 Verification & Quality Assurance Gate
Every single phase, before transitioning to the next, must successfully pass:
1. **Zero TypeScript Errors**: `npx tsc --noEmit` → `EXIT:0`.
2. **Clean Production Bundle**: `npm run build` → `BUILD_EXIT:0`.
3. **Walkthrough & Verification Log**: Updated `walkthrough.md` with file links, architectural decisions, and verification proof.
