# SMS Sync Pro Dashboard

Next.js dashboard for the companion Android app. Database access is server-only. The browser uses authenticated API routes and refreshes every five seconds. This is a single-owner dashboard with a shared login password, not a multi-tenant product.

## Setup

Use Node.js 22+ and run `npm ci`. Copy `.env.example` to `.env.local`, supply the Supabase URL/service-role key, a strong dashboard password, an optional separate random session secret, and HMAC/AES values matching the phone. The owner's requested installation defaults are public placeholder strings; choose unique values in both app Settings and server configuration before using a private production deployment.

Review and run `supabase/schema.sql` before deploying this version. The migration runs in one transaction, preserves existing message rows, creates missing tables/functions, enables RLS and revokes public/anonymous/authenticated access to project tables and views. `SUPABASE_SERVICE_ROLE_KEY` must never use a `NEXT_PUBLIC_` prefix. Run `supabase/security_audit.sql` to check permissions and review any legacy SECURITY DEFINER functions that could expose messages independently of table RLS.

Run `npm run dev` and open http://localhost:3000. Production should use HTTPS. Vercel authentication and actual project credentials are required to deploy; neither is available in this workspace.

`DASHBOARD_ORIGIN` is optional and should be set to the public HTTPS origin if a reverse proxy rewrites Host. `AUTH_TRUST_PROXY` must remain false unless the ingress overwrites X-Forwarded-For. Vercel is recognized automatically. Untrusted direct deployments share one rate-limit scope rather than trusting spoofed IP headers.

## Authentication and data access

Sessions have random IDs, signed expiry and a seven-day lifetime. API handlers verify the signature, expiry and active database session. Logout revokes the session server-side. Password/session-secret changes invalidate signatures. Login limits are stored atomically in PostgreSQL, shared across server instances: ten attempts per scope and 1,000 globally per fifteen-minute window. Cross-origin mutations are rejected, request bodies are bounded, and database failures fail closed.

Service-role credentials never enter browser code. Private tables, union views, sessions, rate-limit records and export snapshots deny anonymous/authenticated database roles. The application API provides access only after dashboard authentication.

## Ingestion and protocol

Configure the phone's rule to `https://<dashboard-domain>/api/webhooks/incoming`. The HMAC secret is required; the endpoint returns 503 when not configured. Optional AES-GCM passwords must match exactly.

Version 1 requires `schema_version: 1`, a stable UUID `id`, a millisecond `timestamp` and explicit `encryption` (`none` or `aes-256-gcm-pbkdf2-sha256-v1`). It accepts `sender`, `body`, `type` and `metadata`. Legacy `message`/`device_model` payloads remain compatible. Legacy messages without a stable ID or precise timestamp cannot provide retry idempotency and receive fresh IDs rather than incorrectly collapsing independent arrivals.

HMAC verifies the original UTF-8 body. Encrypted envelopes use `saltHex:ivHex:ciphertextAndTagHex`, PBKDF2-HMAC-SHA256 (10,000 iterations, 32-byte key), AES-256-GCM, a 12-byte IV and a 16-byte tag. Invalid JSON, schemas, decryption, signatures or batch entries are rejected before writing. Maximum request size is 1 MB and batch size is 100.

Message writes and redacted audit logs commit in one database transaction. Global delivery-ID tombstones protect against retry duplicates across categories and prevent deleted messages from reappearing. Tombstones retain only IDs/timestamps, not message content. Parsed OTPs and amounts come from context-aware parsing, not the first number in a message.

The Bharat Taxi OTP endpoint requires login and only accepts messages received within the last five minutes; offline arrival of an old OTP does not make it fresh.

## Inbox, analytics, exports and privacy

Pagination, search and unread/reminder filtering run in the database, covering all retained records. Message order uses original receipt timestamps; Live Feed/notifications use arrival order. Analytics aggregates the complete dataset into seven daily buckets using the browser's timezone. Long bodies collapse by default and can be expanded.

Exports use an authenticated snapshot ticket and a backpressure-aware JSON stream in batches of 100. The browser downloads directly instead of holding the entire dataset in a Blob. Exports contain `{ export_date, records }`; every record includes `_table`. Tickets are bound to the initiating session and expire after one hour. An interrupted/expired snapshot does not silently produce a complete-looking partial JSON file. Purge is a transaction across all message/log tables and export staging data.

Message and audit content follows a thirty-day retention policy. Cleanup runs on ingestion and authenticated access (at most hourly); old content is removed before ordinary resumed dashboard use. Minimal delivery-ID tombstones remain to preserve idempotency. This does not automatically change a deployment provider's independent backup retention.

Browser notifications are opt-in and request browser permission. Notification text hides sender/message/OTP contents. Provider/browser restrictions can prevent OS notification delivery; permission must be granted by the user.

## Verification

- `npm run typecheck`
- `npm test` (database test is explicitly skipped unless TEST_DATABASE_URL is set)
- `npm run build`
- `npm run test:integration` after building, with an isolated PostgreSQL test database
- `npm audit`

For SQL-backed tests, create roles `anon`, `authenticated`, `service_role BYPASSRLS`, apply `supabase/schema.sql`, and set TEST_DATABASE_URL to that disposable database. Integration tests run a local PostgREST-compatible gateway on port 4319 and the dashboard on 4318. They perform real PostgreSQL queries/RLS checks; they do not prove a live Supabase project's configuration or Vercel deployment.

`node tests/emulator-server.mjs` exposes the local dashboard on port 4320 and the SQL gateway on 4321 for emulator fixtures. It uses synthetic credentials and the owner's placeholder HMAC/AES defaults. Run only against a disposable test database; do not point it at production. GitHub CI creates its own PostgreSQL service and runs the migration, tests, build and audit.
