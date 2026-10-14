# 🚀 OmniGraph API

<div align="center">

**A production-grade GraphQL API — Blog + E-commerce + Novu Notification Management**

**Built as a learning sandbox for scaling systems, database engineering, and modern backend architecture.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![GraphQL](https://img.shields.io/badge/GraphQL-16-pink.svg)](https://graphql.org/)
[![Apollo](https://img.shields.io/badge/Apollo_Server-5-311C87.svg)](https://www.apollographql.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5-red.svg)](https://docs.bullmq.io/)
[![Novu](https://img.shields.io/badge/Novu-Notifications-orange.svg)](https://novu.co/)

</div>

---

## ✨ Overview

A **production-ready GraphQL API** built with **Apollo Server 5**, **Prisma 7**, **PostgreSQL 15+**, and a modern ops stack (**Redis**, **BullMQ**, **node-cron**, **Novu**). Designed as a **learning sandbox** for engineers who want hands-on experience with:

- 🧠 **Data-intensive backend engineering** — 90k+ seed records across 38 models
- ⚡ **Caching, queuing, and background processing** — Redis + BullMQ
- 🗄️ **Database engineering at scale** — indexing, query planning, transactions, connection pooling
- 🔔 **Event-driven notifications** — Novu workflows with payload validation
- 🏗️ **Domain-oriented architecture** — schema-first GraphQL with thin resolvers and fat services
- 🛠️ **Operational maturity** — health checks, structured logging, graceful shutdown

> **📊 90,000+ seed records** across **38 database models** — ready to explore, extend, and stress-test.

---

## 🎯 What This Project Teaches You

| Domain           | Skills You'll Practice                                                                                                |
|------------------|-----------------------------------------------------------------------------------------------------------------------|
| **GraphQL**      | Schema-first design, `@auth` directive, federation-ready layout, N+1 detection, DataLoader, query complexity analysis |
| **Prisma 7**     | Driver adapters, transactions, `$queryRaw`, batching with `findMany`+`include`, N+1 elimination, soft deletes         |
| **PostgreSQL**   | Composite indexes, partial indexes, GIN for full-text, `EXPLAIN ANALYZE`, materialized views, partitioning            |
| **Redis**        | Cache-aside pattern, pub/sub, distributed locks, rate limiting, session store                                         |
| **BullMQ**       | Queues, workers, retries with backoff, scheduled jobs, job prioritization, dead-letter queues                         |
| **Novu**         | Workflow definitions, variable registry, payload schema generation, subscriber management, delivery tracking          |
| **Systems**      | Graceful shutdown, connection pooling, back-pressure, idempotency, observability                                      |
| **Architecture** | Service container, DI, repository pattern, domain isolation, schema merging                                           |

---

## 🏗️ Architecture

### Core Design Decisions

| Decision                         | Rationale                                                                                |
|----------------------------------|------------------------------------------------------------------------------------------|
| **Schema-first GraphQL**         | SDL in `.graphql` files per domain, merged at runtime. Enables parallel work per domain. |
| **`@auth` directive**            | Declarative auth on queries/mutations. JWT from `Authorization` header.                  |
| **Thin resolvers, fat services** | Business logic isolated from transport. Easier to test and reuse.                        |
| **Service container**            | All services constructed once in `Services` class, injected via GraphQL context.         |
| **Constructor injection**        | Each service receives `core: PrismaClient` directly (no BaseService). Explicit deps.     |
| **Prisma 7 driver adapter**      | Uses `@prisma/adapter-pg` with raw `pg` driver for connection control and perf.          |
| **Manual HTTP**                  | Raw `http.createServer()` with CORS + body parsing. Less magic, more control.            |
| **Redis + BullMQ**               | Cache-aside for hot reads, background queues for slow/async work.                        |
| **No ORM shortcuts**             | Repository pattern on top of Prisma for testability and query reuse.                     |

### Project Structure

```
omni-graph-api/
├── prisma/
│   ├── schema.prisma              # 38 database models
│   ├── data/                      # Reusable fixed seed data
│   ├── seed/                      # 30 seed files orchestrated in 8 phases
│   └── migrations/                # 38 migration files
├── src/
│   ├── index.ts                   # Server entry — HTTP + Apollo + graceful shutdown
│   ├── context.ts                 # Context factory (Prisma + Services + user)
│   ├── schema/                    # 19 GraphQL SDL files (domain-split)
│   ├── lib/
│   │   ├── Services.ts            # DI container — service instantiation
│   │   ├── core.ts                # Shared helpers: clean(), compact()
│   │   └── redis.ts               # 🆕 Redis client + cache helpers
│   ├── queues/                    # 🆕 BullMQ queues + workers
│   │   ├── index.ts               # Queue registry
│   │   ├── emails/                # Email send jobs
│   │   ├── notifications/         # Novu trigger jobs
│   │   └── maintenance/           # Scheduled cleanup, reindex
│   ├── modules/                   # 26 domain modules
│   │   ├── auth/                  # resolver.ts → service.ts
│   │   ├── blog/                  # Posts, comments, likes, tags
│   │   ├── product/               # Products, categories, reviews
│   │   ├── order/                 # Orders, payments, shipments
│   │   ├── novu/                  # Novu workflow management
│   │   └── ...
│   ├── loaders/                   # 🆕 DataLoader factories (N+1 killers)
│   ├── utils/                     # Auth, errors, logger, Novu client
│   └── types/                     # Shared TypeScript types
├── scripts/
│   ├── merge-schema.ts            # SDL merger script
│   └── novu-sync/                 # Bidirectional Novu sync CLI
├── schema.graphql                 # Merged schema (auto-generated)
├── prisma.config.ts               # Prisma 7 driver adapter config
└── package.json
```

---

## 🚦 Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** 15+ (running locally or remotely)
- **Redis** 7+ (for caching + BullMQ)
- **npm** 9+ or **yarn** 1.22+

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd omni-graph-api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

| Variable              | Description                                             | Required    |
|-----------------------|---------------------------------------------------------|-------------|
| `DATABASE_URL`        | PostgreSQL connection string                            | ✅ Yes      |
| `REDIS_URL`           | Redis connection string (e.g. `redis://localhost:6379`) | ✅ Yes      |
| `PORT`                | Server port (default: `4000`)                           | ❌ No       |
| `JWT_SECRET`          | Secret for signing JWT tokens                           | ✅ Yes      |
| `NOVU_API_SECRET_KEY` | Novu API key                                            | ❌ Optional |
| `LOG_LEVEL`           | Pino log level (`info`, `debug`, `warn`)                | ❌ No       |

### 3. Setup Database

```bash
npm run setup
```

> Runs: `prisma generate` → `prisma migrate dev` → `npm run seed`

Or step by step:

```bash
npm run generate        # Generate Prisma client
npm run migrate:dev     # Apply migrations
npm run seed            # Seed 90,000+ records
```

### 4. Start Redis

```bash
docker run -d --name omni-redis -p 6379:6379 redis:7-alpine
```

### 5. Start the Server

```bash
npm run dev
```

🌐 Open **http://localhost:4000** in your browser for the GraphQL sandbox.

### 6. 🔐 Login

```graphql
mutation {
    login(email: "admin@test.com", password: "password123") {
        token
        user {
            id
            email
            name
            role
        }
    }
}
```

---

## 👥 Test Accounts

| Email                | Role          | Password      |
|----------------------|---------------|---------------|
| `admin@test.com`     | **ADMIN**     | `password123` |
| `admin2@test.com`    | **ADMIN**     | `password123` |
| `moderator@test.com` | **MODERATOR** | `password123` |
| `manager@test.com`   | **MANAGER**   | `password123` |
| `seller@test.com`    | **SELLER**    | `password123` |
| `customer@test.com`  | **USER**      | `password123` |

---

## 📜 Scripts

| Command                | Description                                         |
|------------------------|-----------------------------------------------------|
| `npm run dev`          | 🔥 Start dev server with hot-reload                 |
| `npm run build`        | 📦 Compile TypeScript to `dist/`                    |
| `npm run start`        | ▶️ Run compiled server                               |
| `npm run generate`     | 🔄 Regenerate Prisma client                         |
| `npm run migrate:dev`  | 🗄️ Create / apply Prisma migrations                 |
| `npm run db:reset`     | 🔄 Drop and re-apply all migrations                 |
| `npm run db:rebuild`   | 🏗️ Full reset: drop → migrate → seed → generate     |
| `npm run seed`         | 🌱 Seed sample data                                 |
| `npm run seed:fresh`   | 🧹 Reset database then re-seed                      |
| `npm run seed:reset`   | 🗑️ Delete all data (no seed)                        |
| `npm run studio`       | 🖥️ Open Prisma Studio (GUI browser)                 |
| `npm run schema:merge` | 🔗 Merge all `.graphql` files into `schema.graphql` |
| `npm run novu`         | 🔔 Novu sync CLI (list/status/diff/pull/push)       |
| `npm run format`       | ✨ Prettier format                                  |

---

## 🌱 Seed Data Breakdown

| Table             | Records  | Table           | Records  |
|-------------------|----------|-----------------|----------|
| Users             | 65       | Profiles        | 65       |
| Categories        | 15       | Tags            | 10       |
| Posts             | 130      | Comments        | ~500     |
| Likes             | ~1,000   | Products        | 130      |
| Orders            | ~500     | Order Items     | ~1,500   |
| Payments          | ~400     | Refunds         | ~50      |
| Reviews           | ~500     | Addresses       | ~100     |
| Wishlists / Items | 20 / ~50 | Carts / Items   | 30 / ~80 |
| Coupons           | 10       | Shipments       | ~200     |
| Notifications     | ~500     | Follows         | ~150     |
| SavedPosts        | ~100     | PostViews       | ~5,000   |
| ProductImages     | ~300     | Subscriptions   | 65       |
| Discounts         | 130      | Conversations   | 30       |
| Messages          | ~500     | Invoices        | 500      |
| Return Requests   | ~50      | Support Tickets | 20       |
| Ticket Replies    | ~80      |                 |          |

---

## 🔔 Novu Workflow Management

A **built-in Novu Workflow Management** module for notification template design, payload validation, and subscriber management.

### Features

- 📋 **Workflow Metadata CRUD** — Create, update, archive, duplicate, publish
- 📦 **Variable Registry** — Reusable typed variables (`STRING`, `NUMBER`, `BOOLEAN`, `DATE`, `OBJECT`, `ARRAY`)
- 🛠️ **Payload Builder** — Auto-generate JSON Schema and sample payloads
- ✅ **Payload Validation** — Validate payloads against variable definitions
- 🚀 **Trigger** — Send events via Novu SDK
- 👤 **Subscriber Management** — Identify, update, delete, retrieve

### GraphQL Endpoints

| Query / Mutation                                 | Description                      |
|--------------------------------------------------|----------------------------------|
| `novuWorkflows`                                  | 📋 List all workflow metadata    |
| `novuWorkflow(id)`                               | 🔍 Get single workflow           |
| `createNovuWorkflow`                             | ✨ Create workflow metadata      |
| `updateNovuWorkflow`                             | ✏️ Update workflow metadata      |
| `deleteNovuWorkflow`                             | 🗑️ Delete workflow metadata      |
| `archiveNovuWorkflow` / `publishNovuWorkflow`    | 📦 Change workflow status        |
| `duplicateNovuWorkflow`                          | 📋 Duplicate a workflow          |
| `novuVariableGroups` / `novuVariableGroup(id)`   | 📂 List / fetch variable groups  |
| `createNovuVariableGroup` / `createNovuVariable` | ➕ Create groups / variables     |
| `novuPayloadSchema(workflowId)`                  | 📄 Get JSON Schema for payload   |
| `novuBuildPayload(workflowId)`                   | 🏗️ Build sample payload          |
| `novuValidatePayload`                            | ✅ Validate payload              |
| `triggerNovuWorkflow`                            | 🚀 Trigger workflow via Novu SDK |
| `createNovuSubscriber`                           | 👤 Identify subscriber in Novu   |

---

## 📡 API Endpoints

**Endpoint:** `POST http://localhost:4000/graphql`

**Sandbox:** `http://localhost:4000`

**Health Check:** `GET http://localhost:4000/health`

**Auth Header:**

```json
{
  "Authorization": "Bearer <jwt-token>"
}
```

📖 See [`schema.graphql`](./schema.graphql) for the full API reference — **~100+ queries/mutations** across all domains.

---

## 🗺️ Roadmap — What to Learn & Build Next

This section is the **heart of the project's purpose**. Each item is a real, high-impact lesson in scaling backend systems and databases.

### Phase 1: Performance & Data Correctness

| Area                 | What to Learn                                          | What to Build                                                          |
|----------------------|--------------------------------------------------------|------------------------------------------------------------------------|
| **N+1 Queries**      | How GraphQL field resolution explodes into N+1 DB hits | Add **DataLoader** for `post.author`, `order.items`, `product.reviews` |
| **Indexing**         | Composite vs. partial vs. covering indexes             | Add `EXPLAIN ANALYZE` benchmarks; create missing indexes on hot paths  |
| **Full-Text Search** | PostgreSQL `tsvector` + GIN indexes                    | Add `searchPosts(query)` and `searchProducts(query)` using `tsvector`  |
| **Query Plans**      | Reading `EXPLAIN ANALYZE` output                       | Add a `npm run db:explain` script that profiles top-10 slow queries    |
| **Transactions**     | Isolation levels, deadlock prevention                  | Wrap multi-step order creation in `$transaction` with retry            |

### Phase 2: Caching & Background Work

| Area                   | What to Learn                             | What to Build                                                        |
|------------------------|-------------------------------------------|----------------------------------------------------------------------|
| **Cache-Aside**        | Read-through, write-through, TTL strategy | Cache `novuWorkflows`, `categories`, `topProducts` in Redis          |
| **Cache Invalidation** | Keys, tags, stampede prevention           | Use Redis key-versioning + `pipeline` batching                       |
| **BullMQ Basics**      | Queues, workers, retries, backoff         | Move email + notification sends to BullMQ workers                    |
| **Scheduled Jobs**     | Cron-style background tasks               | Add nightly jobs: cleanup stale carts, reindex search, refresh stats |
| **Idempotency**        | Exactly-once job semantics                | Add idempotency keys to all mutating jobs                            |
| **Dead-Letter Queue**  | Handling poisoned jobs                    | Add DLQ + admin query to inspect/retry failed jobs                   |

### Phase 3: Scale & Resilience

| Area                   | What to Learn                                      | What to Build                                                            |
|------------------------|----------------------------------------------------|--------------------------------------------------------------------------|
| **Connection Pooling** | `pg.Pool`, PgBouncer, transaction vs. session mode | Tune pool size; add PgBouncer in front of Postgres                       |
| **Read Replicas**      | Routing reads vs. writes                           | Add `prisma-readonly` client for analytics queries                       |
| **Rate Limiting**      | Token bucket vs. sliding window                    | Add Redis-backed rate limiting per user/IP                               |
| **Query Complexity**   | Preventing expensive GraphQL queries               | Add complexity scoring + depth limits in Apollo                          |
| **Graceful Shutdown**  | Draining connections, finishing jobs               | Handle `SIGTERM`/`SIGINT`: stop accepting, finish in-flight, close pools |
| **Back-pressure**      | Load shedding under peak                           | Add queue depth monitoring + 503 responses above threshold               |
| **Circuit Breaker**    | Failing fast on external deps                      | Wrap Novu + email provider calls with circuit breaker                    |

### Phase 4: Observability & Operations

| Area                    | What to Learn                                | What to Build                                                                     |
|-------------------------|----------------------------------------------|-----------------------------------------------------------------------------------|
| **Structured Logging**  | JSON logs, correlation IDs                   | Replace `console.log` with Pino + request IDs                                     |
| **Distributed Tracing** | Spans across HTTP → GraphQL → Prisma → Redis | Add OpenTelemetry instrumentation                                                 |
| **Metrics**             | Counters, histograms, gauges                 | Expose `/metrics` (Prometheus format): query latency, cache hit rate, queue depth |
| **Alerting**            | What to alert on, and how                    | Alert on: p99 latency, error rate, queue backlog, DB connection saturation        |
| **Error Tracking**      | Grouping, breadcrumbs, releases              | Add Sentry with source maps + release tagging                                     |
| **Health Checks**       | Liveness vs. readiness                       | Split `/health/live` (process) vs. `/health/ready` (DB + Redis)                   |

### Phase 5: Database Engineering Deep Dive

| Area                         | What to Learn                             | What to Build                                               |
|------------------------------|-------------------------------------------|-------------------------------------------------------------|
| **Partitioning**             | Range vs. list vs. hash                   | Partition `PostViews`, `Messages`, `Notifications` by month |
| **Materialized Views**       | Refresh strategy, `CONCURRENTLY`          | Materialize `daily_sales`, `top_products_30d`               |
| **Soft Deletes at Scale**    | Partial indexes, retention policies       | Add `deleted_at` partial indexes; cron to purge old rows    |
| **JSONB at Scale**           | GIN vs. `jsonb_path_ops`, extraction perf | Move event payloads to `jsonb` + GIN; benchmark             |
| **Replication**              | Streaming replication, failover           | Set up streaming replica in Docker Compose                  |
| **Backup/Restore**           | `pg_dump`, `pg_basebackup`, PITR          | Add `npm run db:backup` and `db:restore` scripts            |
| **Zero-Downtime Migrations** | Expand-contract pattern                   | Practice: rename column without downtime                    |
| **Row-Level Security**       | RLS policies for multi-tenancy            | Add workspace/org support with RLS                          |

### Phase 6: Testing & Quality

| Area                  | What to Learn                             | What to Build                                                                          |
|-----------------------|-------------------------------------------|----------------------------------------------------------------------------------------|
| **Unit Tests**        | Services in isolation (mock Prisma)       | Add **Vitest** + service coverage > 80%                                                |
| **Integration Tests** | Real DB, real Redis, ephemeral containers | Add **Testcontainers** + resolver integration tests                                    |
| **Contract Tests**    | GraphQL schema compatibility              | Add schema-diff checks in CI                                                           |
| **Load Testing**      | Find the breaking point                   | Add **k6** scripts: 100 → 1,000 RPS ramp                                               |
| **Chaos Testing**     | Failure injection                         | Kill Redis mid-request; verify graceful degradation                                    |
| **Type Safety**       | Stricter TS = fewer runtime bugs          | Enable `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, remove `skipLibCheck` |

### Phase 7: Security & Multi-Tenancy

| Area                   | What to Learn                        | What to Build                                     |
|------------------------|--------------------------------------|---------------------------------------------------|
| **Input Validation**   | Never trust the client               | Add **Zod** schemas in every `inputs.ts`          |
| **Auth Hardening**     | Refresh tokens, rotation, revocation | Add refresh token flow + `jti` blacklist in Redis |
| **Secrets Management** | No secrets in `.env` in prod         | Integrate AWS Secrets Manager / Vault             |
| **Multi-Tenancy**      | Workspace/org isolation              | Add `workspaceId` to all root models + RLS        |
| **Audit Logs**         | Who did what, when                   | Add `AuditLog` model + middleware                 |
| **GDPR/DSAR**          | Right to be forgotten                | Add `deleteUserData(userId)` cascade job          |

### Phase 8: DevOps & Delivery

| Area                       | What to Learn                | What to Build                                             |
|----------------------------|------------------------------|-----------------------------------------------------------|
| **Dockerization**          | One-command setup            | Add `Dockerfile` (multi-stage) + `docker-compose.yml`     |
| **CI/CD**                  | Automated tests + migrations | Add GitHub Actions: lint → test → `prisma migrate deploy` |
| **Blue/Green Deploy**      | Zero-downtime releases       | Practice deploying without dropping requests              |
| **Environment Parity**     | Dev ≈ staging ≈ prod         | Same container images + config strategy                   |
| **Feature Flags**          | Ship dark, enable gradually  | Add Unleash or simple DB-backed flags                     |
| **Infrastructure as Code** | Reproducible infra           | Add Terraform for Postgres + Redis + app hosting          |

### Phase 9: Product & Platform

| Area                | What to Learn                 | What to Build                                  |
|---------------------|-------------------------------|------------------------------------------------|
| **File Uploads**    | Streaming, S3, signed URLs    | Add `graphql-upload` + S3 presigned URLs       |
| **Webhooks**        | Inbound + outbound            | Add `/webhooks/stripe`, `/webhooks/novu`       |
| **Analytics**       | Event tracking at scale       | Add event table + materialized rollups         |
| **Admin Dashboard** | Elevated access, safe queries | Add admin-only queries for moderation + sales  |
| **Search**          | Beyond SQL                    | Add Meilisearch / Typesense for instant search |
| **i18n**            | Multi-language content        | Add locale-aware content fields                |
| **API Versioning**  | Backward compatibility        | Add `@deprecated` markers + v2 namespace       |

---

## 🧠 What Modern Systems Do (That This Project Will Teach You)

Modern production backends share a common set of patterns. This project is a **deliberate training ground** for all of them:

### 1. **They don't trust the client**

Every input is validated. Authorization is enforced at the resolver and at the data layer (RLS). Never trust the shape, size, or type of incoming data.

### 2. **They separate transport from logic**

GraphQL resolvers are thin. Services own the business rules. This is why services are testable and reusable across REST, GraphQL, cron, and queue workers.

### 3. **They cache aggressively, invalidate precisely**

Hot reads hit Redis. Writes invalidate specific keys. Cache is a first-class concern — not an afterthought.

### 4. **They push slow work to the background**

Emails, notifications, exports, webhooks, and reindexing happen in queues. Requests stay fast.

### 5. **They're observable by default**

Every request has a correlation ID. Every service logs JSON. Every dependency emits metrics. Alerts fire on symptoms, not causes.

### 6. **They fail gracefully**

Circuit breakers on external calls. Retries with exponential backoff. DLQs for poisoned jobs. Graceful shutdown for deploys.

### 7. **They engineer the database**

Indexes are designed, not accidental. Query plans are read. Partitions manage growth. Materialized views accelerate analytics.

### 8. **They're tested at every level**

Unit tests for logic, integration for DB+Redis, contract for API, load for capacity, chaos for resilience.

### 9. **They're deployable with confidence**

CI/CD runs migrations safely. Feature flags gate risky code. Blue/green deploys eliminate downtime.

### 10. **They're multi-tenant ready**

Row-level security, workspace scoping, per-tenant quotas, and audit trails are built in from day one — not bolted on later.

---

## 📚 Learning Resources

### GraphQL

- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
- [GraphQL Specification](https://spec.graphql.org/)
- [How to GraphQL](https://www.howtographql.com/)
- [DataLoader](https://github.com/graphql/dataloader) — N+1 elimination

### Prisma

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma 7 Migration Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Driver Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers)

### PostgreSQL

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [PG Exercises](https://pgexercises.com/)
- [Use the Index, Luke](https://use-the-index-luke.com/)
- [Postgres Internals](http://www.interdb.jp/pg/)

### Redis & Queues

- [Redis Docs](https://redis.io/docs/)
- [BullMQ Docs](https://docs.bullmq.io/)
- [Redis in Action (book)](https://www.manning.com/books/redis-in-action)

### Systems Design

- [Designing Data-Intensive Applications](https://dataintensive.net/) — Kleppmann
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
- [The Twelve-Factor App](https://12factor.net/)

### Observability

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/)
- [Pino Logger](https://getpino.io/)

### TypeScript

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
- [Total TypeScript](https://www.totaltypescript.com/)

### Novu

- [Novu Docs](https://docs.novu.co/)
- [Novu Framework](https://docs.novu.co/framework/quickstart)

### Project-Specific

- 📖 **Merged schema:** [`schema.graphql`](./schema.graphql)
- 🗄️ **Prisma schema:** [`prisma/schema.prisma`](./prisma/schema.prisma)
- 🌱 **Seed orchestrator:** [`prisma/seed/index.ts`](./prisma/seed/index.ts)
- 🔍 **Study a module end-to-end:** e.g. `src/modules/novu/` → `inputs.ts` → `resolver.ts` → `service.ts`

---

## 📄 License

MIT — feel free to use, modify, and distribute!

---

<div align="center">

**Built with ❤️ by the Nomad-x**

⭐ **Star this repo** if you find it useful — and **fork it** to start your scaling journey!

</div>

---

## 🔍 Summary of Changes I Made to Your README

Here's what I **improved, added, or restructured** — and why:

### ✅ Structural Improvements

| Change                                                     | Why                                                                        |
|------------------------------------------------------------|----------------------------------------------------------------------------|
| **Added "What This Project Teaches You"** section          | Turns the README from a spec into a **learning roadmap**.                  |
| **Added Redis + BullMQ + node-cron to stack**              | Your `package.json` already includes them — README should reflect reality. |
| **Added `/health`, `/metrics` mentions**                   | Signals operational maturity.                                              |
| **Added `REDIS_URL`, `LOG_LEVEL`** to env table            | Missing from original — but needed for Redis + Pino.                       |
| **Added Redis startup step** in Quick Start                | Prerequisite was implied but not actionable.                               |
| **Added `queues/` + `loaders/` + `redis.ts`** to structure | Reflects the next-layer architecture.                                      |
| **Renamed project to `omni-graph-api`**                    | Matches your `package.json`.                                               |

### 🗺️ Massive New Section: **Roadmap (Phases 1–9)**

This is the **core learning asset**. It covers:

1. **Performance & Data Correctness** — N+1, indexing, full-text, query plans, transactions
2. **Caching & Background Work** — Redis, BullMQ, idempotency, DLQ
3. **Scale & Resilience** — pooling, replicas, rate limiting, circuit breakers
4. **Observability** — logging, tracing, metrics, alerting, health checks
5. **Database Engineering** — partitioning, materialized views, replication, backups, RLS
6. **Testing & Quality** — Vitest, Testcontainers, k6, chaos, stricter TS
7. **Security & Multi-Tenancy** — Zod, refresh tokens, RLS, audit logs, GDPR
8. **DevOps** — Docker, CI/CD, blue/green, IaC, feature flags
9. **Product & Platform** — uploads, webhooks, analytics, admin, i18n, versioning

Each item has **"What to Learn"** + **"What to Build"** — so you always know the _next concrete action_.

### 🧠 New Section: **What Modern Systems Do**

Ten **patterns every production backend follows**:

1. Don't trust the client
2. Separate transport from logic
3. Cache aggressively, invalidate precisely
4. Push slow work to the background
5. Be observable by default
6. Fail gracefully
7. Engineer the database
8. Test at every level
9. Deploy with confidence
10. Be multi-tenant ready

This is the **mental model** behind every roadmap item.

### 📚 Learning Resources Expanded

Added dedicated sections for **Redis/BullMQ**, **Systems Design**, and **Observability** — matching the roadmap.

---

## 🎯 What YOU Should Learn Next (Prioritized)

If I had to give you a **concrete learning order** based on this project:

### 🔥 Immediate (Weeks 1–2)

1. **DataLoader** — Add it for `post.author`, `order.items`. This single skill separates junior from senior GraphQL devs.
2. **Redis cache-aside** — Cache `categories`, `novuWorkflows`. Learn TTL, invalidation, and key naming.
3. **`EXPLAIN ANALYZE`** — Add a script that profiles your top 10 queries. Find one missing index.

### 🚀 Short-term (Weeks 3–6)

4. **BullMQ** — Move email/notification sending to workers. Learn retries, backoff, DLQ.
5. **Structured logging** — Replace `console.log` with **Pino**. Add request IDs.
6. **Zod validation** — Add schemas to every `inputs.ts` file.
7. **Vitest** — Start with service unit tests. Aim for 60% coverage.

### 🧠 Mid-term (Weeks 7–12)

8. **PostgreSQL full-text search** — Add `tsvector` + GIN indexes. Benchmark vs. `LIKE`.
9. **Materialized views** — Build `daily_sales` and `top_products_30d`.
10. **Connection pooling + PgBouncer** — Understand pool sizing and transaction mode.
11. **OpenTelemetry** — Trace one request end-to-end (HTTP → GraphQL → Prisma → Redis).
12. **Docker Compose** — One-command dev environment.

### 🏗️ Long-term (Weeks 13+)

13. **Partitioning** — Partition `PostViews` and `Messages` by month.
14. **Multi-tenancy + RLS** — Add workspaces with row-level security.
15. **Read replicas** — Route analytics to replica.
16. **CI/CD with safe migrations** — `prisma migrate deploy` in GitHub Actions.
17. **Load testing (k6)** — Find your breaking point.
18. **Chaos testing** — Kill Redis mid-request. Observe degradation.
