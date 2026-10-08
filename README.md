# SMS Sync Pro — Dashboard

The companion web dashboard receives SMS Sync Pro webhooks, verifies authentication, decrypts message bodies, and stores messages transactionally in Supabase PostgreSQL. Its authenticated interface provides general messages, OTPs, bank activity, a live feed, webhook logs, analytics, exports and privacy controls.

| Project | Link |
| --- | --- |
| Dashboard source | [Sms-Sync-Pro-Dashboard](https://github.com/workashish/Sms-Sync-Pro-Dashboard) |
| Android source and APKs | [Sms-Sync-Pro-Android-app](https://github.com/workashish/Sms-Sync-Pro-Android-app) |
| Owner's dashboard URL | [thesms.vercel.app](https://thesms.vercel.app) |
| Incoming webhook | `https://thesms.vercel.app/api/webhooks/incoming` |
| Application model | Single owner, shared dashboard password and revocable browser sessions |
| Current stack | Next.js 15, React 18, TypeScript, Tailwind CSS, Supabase client, PostgreSQL |

A published URL is not proof that its environment/database migration is complete. Follow the setup steps below. The browser uses authenticated server APIs; it does not receive the Supabase privileged key.

## Contents

- [Features and boundaries](#features-and-boundaries)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Supabase schema and migration](#supabase-schema-and-migration)
- [Vercel deployment workflow](#vercel-deployment-workflow)
- [Android configuration compatibility](#android-configuration-compatibility)
- [Login, sessions and access control](#login-sessions-and-access-control)
- [Webhook ingestion workflow](#webhook-ingestion-workflow)
- [API reference](#api-reference)
- [Dashboard pages and data behavior](#dashboard-pages-and-data-behavior)
- [Exports, deletion and retention](#exports-deletion-and-retention)
- [Privacy and security boundaries](#privacy-and-security-boundaries)
- [Repository map](#repository-map)
- [Testing and CI](#testing-and-ci)
- [Troubleshooting](#troubleshooting)
- [Operations and future modules](#operations-and-future-modules)

## Features and boundaries

Implemented:

- Password login with signed seven-day sessions and database-backed expiry/revocation.
- Shared PostgreSQL login-attempt limits across application instances.
- Raw-body HMAC verification and optional AES-GCM message decryption.
- Versioned webhook envelopes and compatibility handling for older senders.
- Complete batch validation before transactional message/audit writes.
- Global delivery-ID deduplication, including protection against reappearance after deletion.
- Server-side pagination/search/unread/reminder filtering and atomic flag changes.
- Separate message, OTP, bank, live feed and redacted webhook-log pages.
- Full retained-data category counts and seven-day timezone-aware analytics.
- Session-owned snapshot exports streamed in bounded pages.
- Content deletion, transactional purge and automatic 30-day retention maintenance.
- Opt-in browser notifications with private notification text.
- Responsive navigation, accessible mobile menu controls and expandable long messages.

The current product is not multi-tenant and has no per-user permissions, device pairing or native desktop client. Bank/OTP parsing uses heuristics; it does not verify bank balances, transactions or OTP validity with the originating provider. Live updates currently use **five-second polling**, not WebSockets, Supabase Realtime or APNs.

## Architecture

```mermaid
flowchart TD
    Phone[Android forwarding app] -->|HTTPS JSON and HMAC| Webhook[Incoming webhook API]
    Webhook --> Normalize[Validate, decrypt and normalize entire batch]
    Normalize --> Ingest[Transactional ingest_messages RPC]
    Ingest --> Ledger[Permanent delivery-ID ledger]
    Ingest --> Messages[Messages, OTPs and bank activity]
    Ingest --> Audit[Redacted webhook logs]
    Browser[Browser dashboard] --> Middleware[Signed-cookie middleware]
    Middleware --> API[Authenticated server API handlers]
    API --> Session[Session and revocation checks]
    Session --> Service[Server-only Supabase client]
    Service --> DB[PostgreSQL tables, view and RPCs]
    Messages --> DB
    Ledger --> DB
    Audit --> DB
    API -->|Paginated data and aggregates| Browser
```

`lib/supabase.ts` creates the server-only privileged client. `middleware.ts` checks cookie signatures/expiry before pages and protected APIs. API handlers independently validate active database sessions, so middleware is not the sole protection. Webhook ingestion uses HMAC authentication rather than the browser cookie.

The deployment has three distinct configuration layers: application source on GitHub, runtime environment on Vercel, and schema/privileges in Supabase. Updating one does not automatically update the others.

## Quick start

Requirements: Node.js **22+**, npm, and a Supabase project. SQL-backed automated tests use PostgreSQL **17**.

```sh
git clone https://github.com/workashish/Sms-Sync-Pro-Dashboard.git
cd Sms-Sync-Pro-Dashboard
npm ci
cp .env.example .env.local
```

Then:

1. Fill `.env.local` with the server database URL/key and dashboard password.
2. Review and run the **complete** [supabase/schema.sql](supabase/schema.sql) in that project's Supabase SQL Editor.
3. Run [supabase/security_audit.sql](supabase/security_audit.sql) and inspect privilege/legacy-function results.
4. Set HMAC/AES variables to values matching the Android APK.
5. Start locally:

   ```sh
   npm run dev
   ```

6. Open `http://localhost:3000`, log in with `DASHBOARD_PASSWORD`, and test with synthetic data.

For a local production build:

```sh
npm run typecheck
npm run build
npm start
```

Production should be served over HTTPS. A successful build does not validate production database credentials or automatically apply the schema.

## Environment variables

See [.env.example](.env.example). Never commit `.env.local` or secret values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Project API URL, such as `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged **server-only** database API key for that same project |
| `DASHBOARD_PASSWORD` | Yes | Shared owner password; required for login/protected routes |
| `APP_HMAC_SECRET` | For ingestion | Must match the Android packaged HMAC value exactly |
| `APP_AES_PASSWORD` | For encrypted ingestion | Must match the Android packaged AES password exactly |
| `DASHBOARD_SESSION_SECRET` | Optional | Additional session-signing secret; password is also part of the signing key |
| `DASHBOARD_ORIGIN` | Optional | Public origin used by request-origin checks, e.g. `https://thesms.vercel.app` |
| `AUTH_TRUST_PROXY` | Optional; default false | Trust forwarded client IP only behind an ingress that overwrites it |
| `NEXT_PUBLIC_SUPABASE_URL` | Legacy fallback | Used for URL only when `SUPABASE_URL` is absent; prefer the server variable |
| `TEST_DATABASE_URL` | SQL tests only | Connection URL to a **disposable** PostgreSQL test database |

The code expects the privileged key under `SUPABASE_SERVICE_ROLE_KEY`. A server secret key or compatible legacy service-role key belongs here; an anon/publishable key cannot perform the service-only operations. Do not prefix this secret with `NEXT_PUBLIC_`. A browser anon key is not required by the dashboard's current architecture.

`VERCEL=1` is detected automatically for trusted proxy handling. On other deployments leave `AUTH_TRUST_PROXY=false` unless the proxy replaces client-supplied forwarding headers. Untrusted direct deployments share one login-limit scope.

Do not include a path or trailing application route in `DASHBOARD_ORIGIN`; use the scheme and host. Password/session-secret rotation invalidates existing cookie signatures. Server environment changes require a new deployment/restart.

## Supabase schema and migration

Run the whole script, not only the message table definitions. It includes table alterations, views, service-only functions, grants and a final PostgREST schema reload notification. Some functions are replaced later in the script; the final definitions are the effective implementation.

The script executes within `BEGIN`/`COMMIT`, creates missing objects, preserves existing message rows during migration, adds/backfills receipt timestamps and enables RLS. It revokes inherited PUBLIC/anon/authenticated privileges on application objects and grants required operations to `service_role`. It changes access privileges, so another application that previously queried these tables anonymously must migrate to authorized server access.

For a self-hosted/disposable PostgreSQL environment, the Supabase roles must exist and PostgreSQL must support security-invoker views; tests use PostgreSQL 17. Supabase provides the roles already.

### Tables and view

| Object | Purpose |
| --- | --- |
| `messages` | General messages |
| `otp_messages` | OTP-classified messages |
| `bank_activity` | Bank-classified messages |
| `webhook_logs` | Redacted successful-ingestion audit entries |
| `message_receipts` | Global message UUID/timestamp tombstones for duplicate protection |
| `dashboard_sessions` | Random session IDs, expiry and revocation |
| `login_attempts` | Atomic per-scope/global login counters |
| `export_jobs` | Export owner session, total records and one-hour expiry |
| `export_snapshots` | Ordered snapshot records staged for streaming |
| `maintenance_runs` | Shared hourly maintenance claim |
| `all_messages` | Security-invoker union view over all three message categories, with `_table` discriminator |

Message rows contain `id`, `sender`, decrypted `body`, `time`, `received_at`, `metadata` and `created_at`. `received_at` records original message time; `created_at` records server arrival time. Legacy rows are backfilled from arrival time when their original receipt time is unavailable.

```mermaid
erDiagram
    DASHBOARD_SESSIONS ||--o{ EXPORT_JOBS : owns
    EXPORT_JOBS ||--o{ EXPORT_SNAPSHOTS : stages
    MESSAGE_RECEIPTS ||--o| MESSAGES : deduplicates
    MESSAGE_RECEIPTS ||--o| OTP_MESSAGES : deduplicates
    MESSAGE_RECEIPTS ||--o| BANK_ACTIVITY : deduplicates
```

These are logical relationships; the diagram does not imply foreign-key constraints absent from the SQL. One delivery identity is stored in one category. Purging content retains the identity ledger.

### Database functions

| RPC | Used for |
| --- | --- |
| `consume_login_attempt` | Shared rate-limit counters and expired auth-state cleanup |
| `ingest_messages` | Message-ID claim, category insertion and redacted audit in one transaction |
| `set_message_flag` | Atomic unread/reminder JSON metadata update |
| `query_message_page` | Category/search/flag filtering, count and bounded page |
| `dashboard_analytics` | Complete counts and seven daily timezone buckets |
| `start_export`, `export_page`, `finish_export` | Session-owned snapshot creation, 100-record pages and cleanup |
| `purge_dashboard` | Transactional deletion of message/log/export content |
| `prune_dashboard_data` | Shared maintenance with one-hour cooldown |
| `export_dashboard` | SQL aggregate export helper; current HTTP export uses snapshot streaming instead |

Functions use `security invoker` and explicit search paths. Service-role-only execute grants protect them. The audit script also helps identify older SECURITY DEFINER functions that could expose data independently of table RLS; applying the new script does not automatically remove every unrelated legacy object.

## Vercel deployment workflow

```mermaid
flowchart LR
    Review[Review source and configuration] --> Migrate[Apply full Supabase schema]
    Migrate --> Audit[Check database privileges]
    Audit --> Env[Set Vercel Production environment]
    Env --> Deploy[Deploy dashboard repository]
    Deploy --> Login[Test login and protected routes]
    Login --> Ingest[Test synthetic signed encrypted webhook]
    Ingest --> Read[Verify inbox, analytics and export]
```

1. Import/link **this dashboard repository** to a Vercel project.
2. Apply the schema to the database referenced by the production Supabase URL.
3. Set required environment variables for **Production**, including a strong dashboard password. Set `DASHBOARD_ORIGIN=https://thesms.vercel.app` for the owner's public deployment if needed.
4. Configure webhook secrets matching the installed APK.
5. Deploy or redeploy the latest source after changing environment variables.
6. Confirm login, invalid-password rejection, webhook receipt, data pages and export with synthetic data.

If GitHub integration triggers automatic deployments, schema changes still require a separate database migration. Preview deployments should use isolated data/secrets rather than sharing production unintentionally.

## Android configuration compatibility

Android 2.2.1 fixes these values in the APK:

- Official GitHub update URL.
- HMAC secret from `app/src/main/assets/default_config.json`.
- AES password from the same packaged asset.

Settings and imports cannot change them. Current owner-requested APK values require:

```env
APP_HMAC_SECRET=YOUR_HMAC_SECRET_KEY
APP_AES_PASSWORD=YOUR_AES_PASSWORD
```

Those strings are public placeholders. To use private values, change the Android packaged asset, build/publish a same-key APK with a higher versionCode, and configure matching dashboard variables. Changing only the server will break ingestion from existing APKs. The current server supports one HMAC/AES pair, not per-device key rotation or overlapping key versions.

The default Android webhook rule targets `https://thesms.vercel.app/api/webhooks/incoming`. A different deployment needs an editable rule target or a revised packaged default. Updating the dashboard does not alter phone rules.

## Login, sessions and access control

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as Login API
    participant DB as PostgreSQL
    B->>API: Same-origin password POST
    API->>API: Check configuration and origin
    API->>DB: consume_login_attempt
    DB-->>API: Allowed or rate limited
    API->>API: Validate bounded JSON and compare password
    API->>DB: Insert random session UUID and expiry
    API-->>B: HttpOnly signed dashboard_auth cookie
    B->>API: Protected API with cookie
    API->>API: Verify signature and seven-day expiry
    API->>DB: Check active non-revoked session
    API->>DB: Maintenance and requested data operation
    API-->>B: Private response
```

The token format is `v1.<sessionUUID>.<expiryMilliseconds>.<HMAC-SHA256>`. The signing secret combines `DASHBOARD_SESSION_SECRET` (if set), a separator, and `DASHBOARD_PASSWORD`; rotating either invalidates signatures. Cookie flags are HttpOnly, SameSite Strict, path `/`, seven-day lifetime, and Secure in production.

Login counters allow **10 attempts per scope** and **1,000 globally** within a **15-minute** window. Attempts are counted before password validation. Counters are database-backed rather than per-process memory. The server derives a hashed scope from the trusted client address, or uses the shared unproxied scope.

Protected handlers check the session row for expiry/revocation. Logout revokes the database session before clearing the cookie and reports a failure if revocation cannot be completed. Database failures fail closed. Mutating browser routes enforce origin checks; request body limits and strict validation bound inputs.

## Webhook ingestion workflow

```mermaid
sequenceDiagram
    participant A as Android
    participant API as Incoming webhook
    participant Parse as Protocol parser
    participant DB as PostgreSQL
    A->>API: Raw JSON with x-hmac-signature
    API->>API: Enforce 1 MiB and valid UTF-8
    API->>API: Verify HMAC over exact raw body
    API->>Parse: Parse complete object or array
    Parse->>Parse: Validate every entry and decrypt body
    Parse->>Parse: Derive normalized metadata and stable identity
    Parse-->>API: Validated batch
    API->>DB: ingest_messages(entries, redacted audit)
    DB->>DB: Claim global delivery IDs and insert new rows
    DB->>DB: Save redacted audit and prune old content
    DB-->>API: Transaction commits or rolls back
    API-->>A: Success or bounded error response
```

### Envelope and headers

```json
{
  "schema_version": 1,
  "id": "2c9d7a0a-7d69-4e61-8a8b-2c11a69723fa",
  "encryption": "aes-256-gcm-pbkdf2-sha256-v1",
  "type": "otp",
  "sender": "BANK",
  "body": "saltHex:ivHex:ciphertextAndTagHex",
  "timestamp": 1791417600000,
  "time": "2026-10-08T00:00:00.000Z",
  "metadata": { "device_model": "Pixel" }
}
```

The illustrative body is not decryptable ciphertext. Version 1 requires a UUID `id`, numeric millisecond `timestamp` and explicit `encryption`. Supported encryption values are `none` and `aes-256-gcm-pbkdf2-sha256-v1`. Optional `type` must be `message`, `otp` or `bank`; otherwise classification is derived. The server respects valid explicit categories while deriving extracted fields from decrypted text.

| Header | Meaning |
| --- | --- |
| `Content-Type: application/json` | Standard sender content type |
| `x-hmac-signature` | Hex HMAC-SHA256 of exact raw UTF-8 body; base64 digests and the `x-signature` header are accepted for compatibility |
| `Idempotency-Key` | Android sends the delivery UUID; current database deduplication uses envelope IDs, not this header alone |

Use **1–100 entries**, either one object or an array, with a total request limit of **1 MiB**. Streaming body checks apply even when Content-Length is absent or inaccurate. UTF-8 must be valid. Sender/body/metadata/schema/type/identity constraints are validated before any database write.

AES uses PBKDF2-HMAC-SHA256, **10,000 iterations**, a **32-byte key**, **16-byte salt**, **12-byte IV**, and **16-byte GCM authentication tag** appended to ciphertext. HMAC verification happens before JSON processing/decryption. Parsing or decryption failure rejects the whole request; SQL write failure rolls back the whole transaction.

### Duplicate and legacy behavior

Versioned senders should preserve the same UUID for every retry. `message_receipts` claims that identity globally, preventing duplicates across categories and preventing deleted messages from returning on replay. The API's `processed` value is the number of validated entries, **not necessarily newly inserted rows**; a duplicate retry can succeed without creating another message.

Legacy `message` and top-level `device_model` fields are accepted. Without an explicit ID, a sufficiently precise original timestamp permits a derived identity; otherwise a fresh UUID avoids wrongly collapsing independent arrivals. Legacy senders without stable identities cannot provide reliable retry idempotency. Device model is descriptive metadata, not an authenticated device identity.

## API reference

Browser APIs require the dashboard cookie except login/logout handling. The webhook requires HMAC. Mutations additionally require an allowed origin. These endpoints are not a public unauthenticated data API.

| Method | Route | Behavior |
| --- | --- | --- |
| POST | `/api/auth/login` | `{ "password": "..." }`; rate check, password validation, session cookie |
| POST | `/api/auth/logout` | Revoke current signed session and clear cookie |
| POST | `/api/webhooks/incoming` | Signed single/batch ingestion |
| GET | `/api/data/[table]` | Paginated rows and count |
| PATCH | `/api/data/[table]` | `{ "id": "UUID", "key": "is_unread", "value": false }`; also `is_reminder` |
| DELETE | `/api/data/[table]` | `{ "id": "UUID" }`; content deletion |
| GET | `/api/analytics?timezone=Asia%2FKolkata` | Counts and daily buckets |
| POST | `/api/export` | Create session-owned snapshot; returns `{ "id": "UUID" }` |
| GET | `/api/export?id=UUID` | Download snapshot as streamed JSON |
| POST | `/api/purge` | Transactionally purge message/log/export content |
| GET | `/api/otp/bharat-taxi` | Latest eligible Bharat/Sahakar Taxi four-digit OTP |
| GET | `/api/debug` | Returns 404; no public configuration debug endpoint |

### Data-page parameters

Allowed tables: `messages`, `otp_messages`, `bank_activity`, `webhook_logs`, `all_messages`. The union view is GET-only. Webhook logs support listing/deletion, not message flags.

| Parameter | Constraint/use |
| --- | --- |
| `limit` | Default 12, integer 1–500 |
| `offset` | Non-negative safe integer |
| `search` | Up to 128 characters; sender/body matching on message categories |
| `unread=true` | Only unread messages |
| `reminder=true` | Only reminder-flagged messages |
| `arrival=true` | Arrival ordering for `all_messages`, used by live feed/notifications |

Example: `/api/data/messages?limit=12&offset=0&search=payment&unread=true`. Response is `{ "data": [...], "count": totalMatchingRows }`. Message IDs are UUIDs. Flag updates modify only one JSON key atomically rather than replacing all metadata.

### Important HTTP responses

| Status | Typical meaning |
| --- | --- |
| 200 | Operation accepted/succeeded |
| 400 | Invalid JSON/schema/encryption/request parameters |
| 401 | Invalid password, missing active session, or invalid webhook signature |
| 403 | Browser origin rejected |
| 404 | Unknown route/table, unavailable export or no eligible OTP |
| 413 | Body exceeds the relevant route's limit |
| 429 | Login rate limit; Retry-After is 900 seconds |
| 500 | Storage/data/export operation failed |
| 503 | Login/secret configuration or database login/revocation service unavailable |

Login JSON is bounded to 8 KiB; data mutations use a 2 KiB body limit. A webhook 2xx means the database RPC completed. Rejected webhook attempts are not inserted as successful ingestion logs.

## Dashboard pages and data behavior

| Page | Purpose |
| --- | --- |
| `/login` | Owner login and service-error feedback |
| `/` | General message inbox, search, pagination and flags |
| `/otp` | OTP category and extracted code view |
| `/bank` | Bank activity and extracted contextual amounts |
| `/live` | Recent arrivals across categories |
| `/logs` | Redacted webhook audit entries |
| `/analytics` | Counts and seven-day category charts |
| `/settings` | Browser preferences, exports and destructive content actions |

Ordinary inboxes sort by **original receipt time**. Live/notification queries sort by **server arrival time**, so delayed offline messages appear as new arrivals without becoming fresh OTPs. Analytics uses the browser's requested timezone, aggregates all retained rows, and is not based on the first 500 messages.

Long text collapses with an expansion control. Mobile navigation hides closed items from accessibility traversal, handles Escape and focus restoration. Browser pages refresh on five-second intervals; background throttling can delay them.

The Bharat Taxi API requires login and filters original `received_at` to the last **five minutes**. It recognizes Bharat Taxi/Sahakar Taxi text and returns a four-digit code where available. A recently uploaded old OTP is not considered fresh.

### Browser notifications

Notifications are opt-in, require browser permission, and contain a generic new-message notice rather than sender/body/OTP text. The first poll establishes a baseline without notifying historical content. The component compares the latest arrival and uses localStorage to reduce duplicate alerts across tabs.

It is not guaranteed to issue one notification per message during a burst, and it is not a browser-independent background push service. Closing the page, browser throttling, denied permissions, Focus modes and provider restrictions affect notifications. A native macOS companion is future work.

## Exports, deletion and retention

### Snapshot export

```mermaid
flowchart LR
    Start[Authenticated export POST] --> Snapshot[Database snapshot and session-owned ticket]
    Snapshot --> Download[GET export with ticket]
    Download --> Pages[Read ordered pages of 100]
    Pages --> Stream[Backpressure-aware JSON download]
    Stream --> Verify[Check streamed count against snapshot total]
    Verify --> Cleanup[Finish and remove staged export]
```

Tickets expire after **one hour** and are bound to the creating session. Export JSON is `{ "export_date": "...", "records": [...] }`; each record includes `_table`. It includes the three message categories, not authentication tables, identity tombstones or webhook logs.

The browser downloads directly rather than building the entire export in memory. The server checks totals; errors/expiry cause an interrupted stream rather than a complete-looking successful partial JSON file. Consumers should reject incomplete JSON. Snapshot staging consumes temporary database storage; cancellation/completion and maintenance clean it up.

### Deletion and purge

Individual deletion removes content by table/UUID. Purge deletes general messages, OTPs, bank activity, webhook logs and export staging/jobs in one transaction. Both preserve `message_receipts`; replaying an old delivery cannot restore removed content. Purge does not log out sessions or reset login counters.

### Retention

Message/log content follows **30-day** retention based on arrival (`created_at`). Ingestion removes expired content; authenticated use invokes shared maintenance with a one-hour cooldown. Maintenance also cleans expired export/auth/rate-limit state. It is not a scheduled cron job running during complete inactivity: stale content may remain until the next ingestion/authenticated maintenance opportunity.

Permanent ID tombstones store UUIDs/timestamps without bodies and can grow over time. Provider database backups have their own retention; application deletion does not automatically delete provider-managed backups. Configure those independently.

## Privacy and security boundaries

- Supabase privileged credentials remain server-only; browser APIs authorize every data request.
- RLS, table/view grants and RPC execute grants deny direct anon/authenticated access to application data.
- Request-origin checks, session signatures, revocation and shared rate limits protect browser workflows.
- Webhook signatures cover the raw request; encrypted bodies are authenticated before use.
- Audit payloads redact message bodies and metadata. Message tables intentionally contain decrypted text for browsing/search/parsing.
- Passwords/API keys must remain in server configuration. Exports contain sensitive plaintext; protect downloaded files.
- HMAC/AES are currently shared deployment values. UUID deduplication is not a general replay-expiry protocol or per-device authorization system.

This system is **not end-to-end encrypted against the dashboard/database operator**. The server knows the AES password. HTTPS protects transport; body encryption does not hide sender, timestamp or optional device metadata from the server.

## Repository map

| Path | Responsibility |
| --- | --- |
| `app/*/page.tsx` | Dashboard pages |
| `app/api/auth/` | Login/logout handlers |
| `app/api/webhooks/incoming/route.ts` | Bounded signed ingestion |
| `app/api/data/[table]/route.ts` | Authorized pagination/deletion/flags |
| `app/api/analytics/`, `export/`, `purge/` | Aggregate/export/privacy APIs |
| `app/api/otp/bharat-taxi/` | Specialized fresh-OTP endpoint |
| `middleware.ts` | Signed-cookie page/API gate |
| `lib/auth.ts`, `lib/session.ts` | Origin checks, signing, expiry and database session checks |
| `lib/supabase.ts` | Server-only privileged client |
| `lib/webhook.ts`, `lib/message-parser.ts` | HMAC/decryption, normalization and contextual extraction |
| `lib/request.ts` | Bounded JSON reading |
| `lib/data-client.ts` | Browser API calls |
| `components/` | Layout/navigation, message bodies and notifications |
| `supabase/schema.sql` | Complete transactional migration and RPC definitions |
| `supabase/security_audit.sql` | Read-only privilege/legacy function inspection |
| `tests/` | Unit, SQL, HTTP integration and emulator fixtures |
| `.github/workflows/verify.yml` | CI checks with disposable PostgreSQL |
| `docs/` | Historical audit/acceptance evidence and screenshots |

## Testing and CI

### Lightweight checks

```sh
npm ci
npm run typecheck
npm test
npm run build
npm audit
```

Without `TEST_DATABASE_URL`, the database test is explicitly skipped. A green lightweight run does not prove SQL behavior.

### PostgreSQL-backed checks

Use a disposable database. Integration tests intentionally purge test data and auth state; **never point TEST_DATABASE_URL at production**.

Create roles `anon`, `authenticated` and `service_role BYPASSRLS` if they do not already exist. Apply the complete schema using an administrator/test owner:

```sh
export TEST_DATABASE_URL='postgresql://test-owner:password@localhost:5432/sms_test'
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
npm test
npm run build
npm run test:integration
```

The integration runner starts a local PostgREST-compatible database gateway on **4319** and Next.js on **4318**. It exercises real PostgreSQL transactions and role behavior through HTTP, including login/logout, CSRF, middleware bypass attempts, encrypted ingestion, malformed requests, deduplication, pagination, analytics and export.

The gateway is a test adapter, not live Supabase. Verify deployment-specific PostgREST/schema-cache/project configuration separately.

### Android emulator fixture

After preparing the isolated database and building the dashboard:

```sh
node tests/emulator-server.mjs
```

This exposes the dashboard on **4320** and SQL gateway on **4321**, using synthetic fixture credentials and the owner's placeholder HMAC/AES values. Android emulator access uses `http://10.0.2.2:4320`. Debug Android builds permit HTTP webhook fixtures; release delivery requires HTTPS. Stop the fixture after testing.

### GitHub CI

[Verify dashboard](.github/workflows/verify.yml) uses Node 22 and a PostgreSQL 17 service. It creates test roles, applies the schema, runs typecheck/tests/build/HTTP integration, and performs npm audit. The committed lockfile controls installed versions.

Recorded acceptance includes **nine unit/SQL tests**, production build/typecheck, SQL-backed HTTP integration, permission denial/rollback/deduplication, 600-message pagination and 601-record export, browser/mobile layout checks and zero reported npm vulnerabilities at the recorded run. These are time-specific results, not guarantees of future dependency audit status or a production deployment.

See [acceptance evidence](docs/EMULATOR_TEST_RESULTS.md), [audit](docs/PROJECT_AUDIT.md) and [checklist](docs/WORK_CHECKLIST.md).

## Troubleshooting

### “Login service unavailable. Check database setup.”

This is a **503 database/configuration failure**, not the invalid-password response. The handler can fail while creating the server client, calling `consume_login_attempt`, or inserting `dashboard_sessions`.

1. Confirm the deployment has `SUPABASE_URL` and a privileged server key under **`SUPABASE_SERVICE_ROLE_KEY`**, both from the same project.
2. Run the complete current [schema.sql](supabase/schema.sql) in that project. Older message-only schemas do not supply the login/session RPCs.
3. Inspect the SQL result. If it fails, resolve the displayed SQL error; the transaction must commit successfully.
4. Ensure the Supabase project is available and the API can access the public application schema.
5. Save Vercel Production variables and **redeploy**; existing deployments do not automatically acquire edited environment values.
6. Retry login with the configured dashboard password.

A read-only SQL check can confirm key objects exist:

```sql
select
  to_regclass('public.dashboard_sessions') as sessions,
  to_regclass('public.login_attempts') as attempts,
  to_regprocedure('public.consume_login_attempt(text)') as login_rpc,
  to_regprocedure('public.prune_dashboard_data()') as maintenance_rpc;
```

Non-null results confirm object existence, not credentials or correct permissions. The login route intentionally returns a generic database error rather than database internals; if unresolved, inspect database/API diagnostics and share error codes without keys/passwords. Do not disable RLS or remove session checks to bypass this error.

### Other issues

| Symptom | Likely checks |
| --- | --- |
| “Dashboard login is not configured.” | Missing `DASHBOARD_PASSWORD` |
| “Invalid password” | Use the current deployed environment password |
| 403 at login/mutation | Public origin, Host/proxy configuration and `DASHBOARD_ORIGIN` |
| 429 at login | Wait 15 minutes; shared-scope/global limits also count failed attempts |
| Login works but data APIs return Unauthorized | Session expiry/revocation, database session access or maintenance RPC missing/failing |
| Webhook 503 authentication not configured | Missing `APP_HMAC_SECRET` |
| Webhook 401 | Matching HMAC values; sign exact bytes without reformatting JSON |
| Webhook 400 | Envelope/schema/UUID/timestamp, matching AES, valid UTF-8 and batch bounds |
| Webhook 500 | Supabase key/URL, full migration, RPC grants and database availability |
| Missing messages after deleting and replaying | Expected tombstone protection; use a new identity only for a genuinely new event |
| Old offline message appears in Live but not fresh OTP API | Arrival time and original receipt time have different purposes |
| Browser notifications absent | Opt-in setting, permission, open page, background throttling and latest-arrival limitation |
| Export unavailable/incomplete | Session ownership/expiry, one-hour ticket, database/network interruption; start a new export |
| Error hint mentions an ANON key | Legacy wording in the specialized OTP route; the current client still requires the privileged server key |

## Operations and future modules

Back up the database through the provider, document restore procedures, protect server secrets, monitor failed requests and keep Supabase grants/schema aligned with deployed source. Run the read-only security audit after migration and review legacy exposure. Test production changes with synthetic messages before relying on real forwarding.

Native macOS Messages-style inbox/notifications, APNs, per-device pairing/revocation, multi-user accounts, richer rule automation and remote configuration are proposed future modules. They are **not implemented** in this repository. The current browser notification system should not be described as a native macOS background push app.
