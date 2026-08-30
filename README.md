# ONG — Full-stack Email Job Scheduler

ReachInbox / Outbox Labs intern assignment: a production-style scheduler that accepts send requests, queues them with **BullMQ + Redis (no cron)**, delivers via **Ethereal** (fake SMTP), survives process restarts, rate-limits per sender, notifies Slack, indexes into Elasticsearch, and exposes an ONG inbox UI (React + Vite) that follows the Figma.

Monorepo: [`backend/`](backend/) (Express + worker) and [`frontend/`](frontend/).

---

## How to run the backend (Express, Redis, MySQL, BullMQ worker)

**Need:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) running, Node 20+.

```bash
docker compose up -d
cd backend
copy .env.example .env
# fill GOOGLE_* and SLACK_* (see Environment below)
npm install
npx prisma migrate deploy
npm run dev
```

In a **second** terminal — this process is what actually sends mail:

```bash
cd backend
npm run worker
```

| Service | URL / port |
|---|---|
| Express API | http://localhost:4000 |
| Health | http://localhost:4000/api/health — expect `mysql`, `redis`, `elasticsearch` all `true` |
| BullMQ dashboard | http://localhost:4000/admin/queues |
| MySQL | `localhost:3307` (host 3307 so it does not clash with a local MySQL on 3306) |
| Redis | `localhost:6379` (AOF persistence enabled in Compose) |
| Elasticsearch | http://localhost:9200 |

`docker compose up -d` starts MySQL, Redis, and Elasticsearch. The API and worker run on the host (`npm run dev` / `npm run worker`).

---

## How to run the frontend

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:5173**

Login with Google. Email/password on the card is visual only (Figma). After login: Scheduled / Sent lists, Compose, search, Slack in the profile menu.

---

## Ethereal Email and environment variables

**Ethereal is automatic.** On first Compose the API calls `nodemailer.createTestAccount()` and stores SMTP credentials on a `Sender` row. You do not create an Ethereal account by hand. Mail never hits a real inbox. The worker logs a preview URL, e.g. `https://ethereal.email/message/...`.

Copy [`backend/.env.example`](backend/.env.example) → `backend/.env`.

| Variable | Required | What it does |
|---|---|---|
| `DATABASE_URL` | yes | `mysql://root:root@localhost:3307/ong_mail` |
| `REDIS_URL` | yes | `redis://localhost:6379` |
| `ELASTICSEARCH_URL` | yes | `http://localhost:9200` |
| `SESSION_SECRET` | yes | Long random string for the session cookie |
| `FRONTEND_URL` | yes | `http://localhost:5173` (CORS + OAuth redirects) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes (login) | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) — Web client. JS origin `http://localhost:5173`. Redirect `http://localhost:4000/auth/google/callback` |
| `GOOGLE_CALLBACK_URL` | yes | `http://localhost:4000/auth/google/callback` |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | for Connect Slack | [Slack apps](https://api.slack.com/apps) — redirect `http://localhost:4000/auth/slack/callback`, scopes `incoming-webhook`, `chat:write` |
| `SLACK_CALLBACK_URL` | for Connect Slack | `http://localhost:4000/auth/slack/callback` |
| `WORKER_CONCURRENCY` | no | Default `4` — parallel job processors |
| `MIN_DELAY_MS` | no | Default `2000` — min 2 seconds between sends (BullMQ limiter) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | no | Hourly cap; overflow is **delayed**, never dropped |

Never commit `.env`.

---

## Architecture overview

```
Browser (React :5173)
    → Express API (:4000)
         → MySQL          source of truth: User, Campaign, EmailJob
         → Redis (AOF)    sessions + BullMQ delayed set + hourly counters
         → Elasticsearch  search copy (subject / body / recipient)
    → Worker (separate Node process)
         → BullMQ
         → Ethereal SMTP
         → Slack (when a sender hits the hourly cap)
```

### How scheduling works

1. Compose (or `POST /api/campaigns`) sends subject, HTML body, recipients, `startTime`, `delayMs`, `hourlyLimit`.
2. MySQL gets one `Campaign` and one `EmailJob` per recipient.  
   `scheduledAt = startTime + index * delayMs`.
3. Each row is a BullMQ delayed job: `jobId = emailJob.id`, `delay = max(0, scheduledAt - now)`.
4. There is **no cron**, no `node-cron`, no OS crontab. Redis holds the delay; the worker fires when it expires.
5. The worker skips `status === sent` (idempotency). Unique `(campaignId, recipient)` plus the BullMQ `jobId` prevent duplicates.

### How persistence on restart is handled

- **MySQL** still has every row (`scheduled` / `delayed` / `sent` / `failed`).
- **Redis AOF** (`--appendonly yes` in Compose) keeps delayed jobs and session keys across a Redis container restart.
- On API and worker boot, `reconcileMissingJobs` loads MySQL rows still `scheduled` or `delayed` and re-enqueues any job missing from Redis.
- Rows already `sent` are never queued again.

Demo: stop API + worker → start both → a job whose `scheduledAt` is still in the future still sends at the right time.

### How rate limiting and concurrency are implemented

| Knob | Mechanism | Behavior |
|---|---|---|
| `WORKER_CONCURRENCY` | BullMQ `Worker({ concurrency })` | Several jobs can run in parallel; counters are in Redis, not memory |
| `MIN_DELAY_MS` (default 2000) | BullMQ `limiter: { max: 1, duration }` | At most one send per 2s on that worker (provider throttle) |
| Hourly cap | Redis `INCR rate:{senderId}:{utcHour}` | If over the cap: `DECR` the slot, mark row `delayed`, `moveToDelayed` to the next UTC hour. **Not failed, not dropped** |
| Slack | `SETNX notify:{senderId}:{hour}` | One live Slack message per sender per hour. If Slack is not connected, skip — no crash |

Campaign `hourlyLimit` can be lower than `MAX_EMAILS_PER_HOUR_PER_SENDER`. 1000 emails at the same start time are staggered by `delayMs`; extras past the hourly cap roll into the next hour.

---

## Features implemented (mapped to the brief)

### Backend

| Brief item | Implementation |
|---|---|
| **Scheduler** | `POST /api/campaigns` → MySQL rows + BullMQ delayed jobs. `npm run worker` sends via Ethereal. No cron. |
| **Persistence** | MySQL ledger + Redis AOF + boot reconcile. Restart does not replay Day 1 or resend `sent` mail. |
| **Rate limiting** | Redis hourly counter per sender; overflow delayed to next hour. Min delay via BullMQ limiter. |
| **Concurrency** | Configurable `WORKER_CONCURRENCY`; Redis counters are safe with multiple worker processes. |
| Slack | Real OAuth (`/auth/slack`) + `chat.postMessage` / webhook on cap hit. |
| Search | Elasticsearch index + `GET /api/emails?q=` (`must` + `filter`). MySQL fallback if ES is down. |
| Queue visibility | Bull Board at `/admin/queues`. |
| Idempotency | Unique recipient per campaign + job id + skip-if-sent. |

### Frontend

| Brief item | Implementation |
|---|---|
| **Login** | Real Google OAuth. Figma email/password fields are display-only. Header/profile shows name, email, avatar. Logout in the profile menu. |
| **Dashboard** | ONG sidebar, Scheduled / Sent counts, search (Elasticsearch), refresh. List rows (not a spreadsheet table) matching Figma: To, status badge, subject + snippet, star. Loading and empty states. |
| **Compose** | Full page: From (Ethereal sender), To chips, Upload List (CSV/txt + count), subject, delay, hourly limit, contentEditable body, Send / Send Later popover. |
| **Scheduled / Sent** | Separate views; orange clock badge vs gray Sent / Failed. Click through to email detail. |
| Slack | Connect / Disconnect in the profile dropdown (not drawn in Figma; required by the brief). |

---

## Assumptions, shortcuts, trade-offs

- Emails go to **Ethereal**, not Gmail. That is what the assignment asks for.
- Login email/password is Figma-only; there is no password user table.
- Slack is in the profile menu, not a dedicated Figma control.
- Star is `localStorage` only. Figma folder/delete icons are not wired.
- Compose formatting is a small contentEditable (B/I/U), not a full rich-text engine.
- MySQL is published on **3307** on the host so it does not fight an existing local MySQL on 3306.
- Session store is a small ioredis wrapper (connect-redis + ioredis produced `ERR syntax error` on SET).
- Bull Board on `/admin/queues` is open on localhost for the demo (do not expose it on the public internet without auth).
- Search falls back to MySQL `contains` if Elasticsearch is unreachable.
