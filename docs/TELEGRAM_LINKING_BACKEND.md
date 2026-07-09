# Telegram Linking Backend

ARMAX Habits cannot safely link a browser/PWA guest profile to a Telegram profile with frontend-only code. The frontend now calls a backend contract and shows a clear error when that backend is not configured.

## Required Environment

- `VITE_ARMAX_API_BASE_URL` on the frontend when the API is hosted outside the same origin.
- `TELEGRAM_BOT_TOKEN` on the backend only.
- A durable database for accounts, devices, link requests, sessions, habits, entries, settings, achievements, and merge operations.
- A cookie/session secret stored only in backend hosting environment variables.

## API Contract

### `POST /api/telegram/link/start`

Called by browser/PWA for a guest profile.

Request:

```json
{
  "guestUserId": "guest:550e8400-e29b-41d4-a716-446655440000",
  "deviceId": "device-550e8400-e29b-41d4-a716-446655440000",
  "returnUrl": "https://example.com/profile"
}
```

Backend requirements:

- Create a random one-time `linkToken`.
- Store only `token_hash`, not the raw token.
- Set expiry, for example 10 minutes.
- Bind the request to the guest account and device.
- Return a Telegram deep link.

Response:

```json
{
  "requestId": "linkreq_123",
  "status": "pending",
  "telegramUrl": "https://t.me/ARMAX_Habits_bot?start=link_token",
  "expiresAt": "2026-07-09T12:00:00.000Z",
  "pollingIntervalMs": 2500
}
```

### `GET /api/telegram/link/status?requestId=...`

Used by browser/PWA polling. Stop polling after `completed`, `declined`, `expired`, or `failed`.

Statuses:

- `pending`
- `approved`
- `declined`
- `expired`
- `completed`
- `failed`

### `POST /api/telegram/link/cancel`

Cancels a pending link request and invalidates the token.

Request:

```json
{
  "requestId": "linkreq_123"
}
```

### `POST /api/telegram/link/confirm`

Called only from trusted Telegram flow: bot webhook or Mini App backend verification.

Backend requirements:

- Verify Telegram authenticity with bot-provided data or Telegram initData signature.
- Verify token hash, expiry, status, and guest account ownership.
- Create or load `telegram:<telegramId>` account.
- Merge guest data into the Telegram account idempotently using `mergeOperationId`.
- Mark the guest account as linked.
- Invalidate the link token.
- Issue a secure browser session, preferably HttpOnly/Secure/SameSite cookie.

## Minimal Data Model

- `accounts`: `id`, `type`, `telegram_id`, `first_name`, `username`, `language_code`, timestamps.
- `devices`: `id`, `account_id`, `guest_id_hash`, timestamps.
- `link_requests`: `id`, `token_hash`, `guest_account_id`, `status`, `expires_at`, `approved_by_telegram_account_id`, timestamps.
- `habits`: `id`, `account_id`, `title`, timestamps.
- `habit_entries`: `id`, `habit_id`, `account_id`, `date`, `status`, timestamps.
- `account_merges`: `id`, `source_account_id`, `target_account_id`, `status`, timestamps.
- `sessions`: `id`, `account_id`, `expires_at`, `revoked_at`.

## Merge Rules

- Do not delete user data during merge.
- Deduplicate habits by stable id first, then normalized title when ids differ.
- Preserve the most complete habit metadata.
- Merge completion history by date and habit id.
- Keep the greater streak/stat value when both profiles have a value.
- Make merge idempotent with `mergeOperationId`.
- Never let a repeated confirmation duplicate habits or entries.

## Current Frontend Behavior

- Browser/PWA uses `guest:<uuid>`.
- Telegram Mini App uses `telegram:<telegramId>`.
- The "Подключить Telegram" button calls the API contract above.
- If the API is missing, the UI shows that backend linking is not configured.
- The frontend does not store a bot token and does not treat a Telegram deep link as confirmation.
