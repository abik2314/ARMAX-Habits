# Telegram Linking Backend

ARMAX Habits теперь использует Supabase Edge Functions для настоящей привязки browser/PWA guest profile к Telegram account. Старый frontend-only или same-origin `/api/telegram/...` contract заменён на:

- `create-link-request`
- `get-link-status`
- `telegram-webhook`
- `create-session`
- `sync-pull`
- `sync-push`

Подробная настройка находится в [SUPABASE_SETUP.md](./SUPABASE_SETUP.md), а пользовательский и merge flow описан в [TELEGRAM_LINKING_FLOW.md](./TELEGRAM_LINKING_FLOW.md).

Frontend хранит только публичные Supabase env:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend secrets остаются только в Supabase Edge Functions:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `APP_PUBLIC_URL`

После successful linking основным локальным userId становится `telegram:<telegramId>`. Guest data не удаляется из localStorage: приложение переключается на отдельный scoped storage key и подтягивает server snapshot через `sync-pull`.
