# Supabase Setup

Этот backend-этап готовит реальную привязку Telegram ID к данным ARMAX Habits через Supabase PostgreSQL и Supabase Edge Functions. Без реальных ключей деплой нельзя завершить, но все миграции, функции и frontend-интеграция уже лежат в репозитории.

## 1. Создать Supabase Project

1. Открой Supabase Dashboard и создай новый project.
2. Сохрани `Project URL`, `anon public key` и `service_role key`.
3. Убедись, что `service_role key` не добавляется во frontend/Vercel как `VITE_*`.

## 2. Применить SQL Migration

Через Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Или вручную открой SQL Editor и выполни файл:

```text
supabase/migrations/20260709000000_telegram_linking.sql
```

Миграция создаёт таблицы `accounts`, `devices`, `link_requests`, `sessions`, `habits`, `habit_entries`, `achievements`, `stars_history`, `user_settings`, `diary_entries`, `sync_events`, индексы, RLS и RPC `complete_telegram_link_request`.

## 3. Задать Environment Variables

Frontend/Vercel:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

`VITE_SUPABASE_URL` лучше задавать как корень проекта без `/rest/v1`. Frontend дополнительно срезает `/rest/v1` и `/functions/v1`, если они случайно попали в env.

Supabase Edge Functions secrets:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=<telegram-bot-token>
supabase secrets set TELEGRAM_BOT_USERNAME=<bot-username-without-at>
supabase secrets set APP_PUBLIC_URL=https://<your-vercel-domain>
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` обычно доступны внутри hosted Supabase Edge Functions автоматически. Если `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` запрещён как reserved name, это нормально: не задавай его вручную. Для локального `supabase functions serve` можно положить `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` в локальный `.env`, который игнорируется Git.

Опционально для защиты webhook:

```bash
supabase secrets set TELEGRAM_WEBHOOK_SECRET=<random-secret>
```

`TELEGRAM_BOT_TOKEN` и `SUPABASE_SERVICE_ROLE_KEY` нельзя добавлять в `.env` frontend bundle и нельзя называть с префиксом `VITE_`.

CORS helper принимает `APP_PUBLIC_URL`, `https://armax-habits.vercel.app` и localhost/127.0.0.1 для разработки.

## 4. Задеплоить Edge Functions

```bash
supabase functions deploy create-link-request --no-verify-jwt
supabase functions deploy get-link-status --no-verify-jwt
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy create-session --no-verify-jwt
supabase functions deploy sync-pull --no-verify-jwt
supabase functions deploy sync-push --no-verify-jwt
```

Публичные функции не доверяют frontend секретам: они используют service role только внутри Supabase Edge Runtime.

## 5. Настроить Telegram Webhook

Без `TELEGRAM_WEBHOOK_SECRET`:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook"
```

С webhook secret:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## 6. Проверить Create Link Request

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/create-link-request" \
  -H "Content-Type: application/json" \
  -H "apikey: <anon-key>" \
  -d '{
    "guestUserId": "guest:test-device",
    "deviceId": "device-test-device",
    "returnUrl": "https://example.com/profile",
    "snapshot": {
      "app": "ARMAX Habits",
      "version": 3,
      "exportedAt": "2026-07-09T00:00:00.000Z",
      "habits": []
    }
  }'
```

Ответ должен вернуть `linkToken`, `requestId`, `telegramUrl`, `expiresAt`.

## 7. Проверить Telegram Linking

1. Открой `telegramUrl`.
2. Бот должен показать сообщение: `ARMAX Habits запрашивает привязку этого профиля к вашему Telegram-аккаунту`.
3. Нажми `Подключить`.
4. В таблице `link_requests` статус должен стать `completed`.
5. В таблице `accounts` должен появиться или обновиться account `type = telegram` с `telegram_id`.
6. Данные guest account должны быть перенесены к Telegram account.

## 8. Проверить Sync Pull / Sync Push

Создать session после completed link:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/create-session" \
  -H "Content-Type: application/json" \
  -H "apikey: <anon-key>" \
  -d '{ "linkToken": "<raw-link-token>" }'
```

Pull:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sync-pull" \
  -H "Content-Type: application/json" \
  -H "x-armax-session: <session-token>" \
  -d '{}'
```

Push:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sync-push" \
  -H "Content-Type: application/json" \
  -H "x-armax-session: <session-token>" \
  -d '{ "snapshot": { "app": "ARMAX Habits", "version": 3, "exportedAt": "2026-07-09T00:00:00.000Z", "habits": [] } }'
```

Для Telegram Mini App на новом устройстве `create-session` также принимает signed `initData`. Frontend отправляет raw `initData`, Edge Function проверяет подпись через `TELEGRAM_BOT_TOKEN` и только после этого выдаёт session.
