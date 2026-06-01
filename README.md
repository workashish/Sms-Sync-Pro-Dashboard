# SMS Relay Dashboard

A full-stack, production-ready application to receive, categorize, and display SMS messages, OTPs, and bank transaction alerts in real-time. Designed to be a landing zone for incoming webhooks from SMS forwarders or mobile scraper applications.

## Features

- **Live Feed:** View all incoming messages in real-time as they arrive.
- **OTP Center:** Specifically designed to catch, filter, and allow easily copying of Two-Factor Authentication (2FA) and One-Time Password (OTP) messages.
- **Bank Activity:** Automatically categorizes deposits and payment alerts from banking SMS messages.
- **System Logs:** Live tracking view for incoming webhook requests, payloads, status, and HMAC signature validations for easy debugging and auditing.
- **Dark Mode Support:** Fully supports responsive dark/light mode toggling based on system preferences or manual override.
- **Secure Webhooks:** Supports HMAC SHA256 payload verification to protect your endpoints from unauthorized access.

## Architecture

This Next.js (App Router) application acts as a centralized dashboard and webhook listener.

- **Frontend:** Built with Next.js, React, and Tailwind CSS v4.
- **Backend:** Next.js Route Handlers (`/api/webhooks/incoming`) are used to accept and validate the incoming payloads. 
- **Database / Real-time Layer:** Supabase is integrated as the persistent store. When new messages are accepted by the Webhook Route Handler, they are saved to Postgres tables. The frontend subscribes to Postgres changes via Supabase Realtime Channels, allowing messages to appear instantly without refreshing the page.

### Environment Variables

Configure these in your `.env.local` or Next.js hosting environment (e.g. Vercel):

```env
# Database configuration for persistence and real-time frontend updates
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional but highly recommended: HMAC Signature Secret to secure the webhook endpoint
APP_HMAC_SECRET=your_secret_key
```

### Database Schema (Supabase)

The system relies on four Supabase Postgres tables:

1. **`messages`**: For standard SMS.
   - Headers: `id` (uuid), `sender` (text), `body` (text), `time` (text), `created_at` (timestamptz)
2. **`otp_messages`**: For 2FA/OTPs.
   - Headers: `id`, `sender`, `body`, `time`, `created_at`, `metadata` (jsonb)
3. **`bank_activity`**: For financial transactions.
   - Headers: `id`, `sender`, `body`, `time`, `created_at`, `metadata` (jsonb)
4. **`webhook_logs`**: For auditing webhook results.
   - Headers: `id`, `status` (text), `payload` (jsonb), `error` (text), `created_at` (timestamptz)

---

## Webhook Integration Guide

You can use applications like **Tasker**, **MacroDroid**, or **Apple Shortcuts** on your mobile device to intercept incoming SMS and POST them to this dashboard.

### Endpoint Setup

**URL:** `https://thesms.vercel.app/api/webhooks/incoming`
**Method:** `POST`
**Content-Type:** `application/json`

### Payload Formats and cURL Examples

The webhook accepts a JSON body. The behavior of the dashboard depends on the `type` field in your JSON.

#### 1. Standard Message (`type: "message"`)
Used for generic incoming SMS. Will appear in the main "Messages" feed.

```bash
curl -X POST https://thesms.vercel.app/api/webhooks/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "sender": "+12345678900",
    "body": "Hey, let'\''s grab lunch later!",
    "time": "12:34 PM"
  }'
```

#### 2. OTP/2FA Message (`type: "otp"`)
Used for verification codes. Will appear in the dedicated "OTP Center". You can provide the extracted code in the `metadata.code` object so it can be easily copied.

```bash
curl -X POST https://thesms.vercel.app/api/webhooks/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "type": "otp",
    "sender": "Google",
    "body": "G-492104 is your Google verification code.",
    "time": "08:15 AM",
    "metadata": {
      "code": "G-492104"
    }
  }'
```

#### 3. Bank Alert (`type: "bank"`)
Used for financial transactions. Will appear in the "Bank Activity" dashboard. Include extracted `amount` and `bank_type` ("DEPOSIT" or "PAYMENT") in `metadata`.

```bash
curl -X POST https://thesms.vercel.app/api/webhooks/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bank",
    "sender": "CHASE",
    "body": "Chase alert: A deposit of $1,500.00 was made to your checking account.",
    "time": "09:00 AM",
    "metadata": {
      "bank_type": "DEPOSIT",
      "amount": "1500.00"
    }
  }'
```

---

## Securing Your Webhook (HMAC)

If you configure `APP_HMAC_SECRET` in your environment, the server will reject requests that do not pass a valid `x-hmac-signature` (or `x-signature`) header. The signature should be generated using HMAC-SHA256 of the raw request body.

*Example in Node.js / JavaScript:*
```javascript
const crypto = require('crypto');
const secret = process.env.APP_HMAC_SECRET; // "your_secret_key"
const rawBody = JSON.stringify(payload);

const signature = crypto.createHmac('sha256', secret)
                        .update(rawBody)
                        .digest('hex');

// Send 'signature' in the 'x-hmac-signature' header.
```

### Response Codes

When your forwarder makes a request, the server will respond with:

- `201 Created`: Payload successfully received, validated, and saved to the database.
- `400 Bad Request`: The payload was rejected due to missing required fields (e.g., missing `sender` or `body`).
- `401 Unauthorized`: The `APP_HMAC_SECRET` was set, but the request lacked a valid `x-hmac-signature` header.
- `500 Internal Server Error`: An unexpected database insertion error or server fault occurred. Check **System Logs** on the dashboard.
