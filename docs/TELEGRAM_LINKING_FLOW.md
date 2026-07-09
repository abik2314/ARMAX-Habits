# Telegram Linking Flow

## Guest To Telegram

1. Browser/PWA создаёт стабильный `guest:<uuid>`.
2. Пользователь нажимает `Подключить Telegram`.
3. Frontend отправляет `guestId`, `deviceId` и текущий snapshot в `create-link-request`.
4. Edge Function создаёт guest account, сохраняет snapshot, генерирует одноразовый `linkToken`, хранит только `token_hash` и возвращает deep link.
5. Пользователь открывает Telegram bot по ссылке `https://t.me/<BOT_USERNAME>?start=link_<token>`.
6. Bot показывает запрос привязки с кнопками `Подключить` и `Отказаться`.
7. При подтверждении `telegram-webhook` получает update напрямую от Telegram, создаёт или находит `telegram:<telegramId>`, запускает idempotent merge и помечает request `completed`.
8. Browser/PWA polling видит `completed`, вызывает `create-session`, получает session token, делает `sync-pull` и переключает локальный userId на `telegram:<telegramId>`.

## Потеря Телефона И Новое Устройство

Если пользователь открывает ARMAX Habits внутри Telegram Mini App на новом устройстве, frontend отправляет raw Telegram `initData` в `create-session`.

Edge Function:

1. Проверяет подпись `initData` через `TELEGRAM_BOT_TOKEN`.
2. Извлекает Telegram user id только после успешной проверки.
3. Находит account `telegram:<telegramId>`.
4. Выдаёт session token.
5. Frontend делает `sync-pull` и восстанавливает привычки, календарь, достижения, звёзды, настройки, фон, аватар и дневник из Supabase.

Если пользователь открывает обычный browser/PWA на новом устройстве, сначала создаётся новый guest profile. Чтобы объединить его с тем же Telegram account, пользователь снова нажимает `Подключить Telegram` и подтверждает привязку в Telegram.

## Что Синхронизируется

Backend хранит:

- habits: привычки, подзадачи, completion history, path progress;
- habit_entries: дневные отметки, извлечённые из habit completions;
- achievements: awards/achievements;
- stars_history: история начисления звёзд;
- user_settings: настройки, профиль, фон, mood, work logs, daily reports, sync queue metadata;
- diary_entries: дневник по датам;
- sync_events: журнал sync/merge операций.

`sync-pull` возвращает snapshot в формате `ExportedHabitData`, чтобы текущий Zustand store мог импортировать данные без переписывания приложения.

## Merge Rules

Merge guest -> Telegram выполняется в PostgreSQL RPC `complete_telegram_link_request`:

- link token проверяется по SHA-256 hash;
- expired/declined/completed запросы не выполняют повторный merge;
- Telegram account создаётся по `telegram_id` или переиспользуется;
- привычки дедуплицируются по `data.id`, затем по нормализованному title;
- completion maps и subtask completion maps для совпавших привычек объединяются;
- achievements дедуплицируются по `data.id`;
- stars_history переносится без повторного начисления одинаковых записей;
- diary entries объединяются по date;
- settings объединяются осторожно: существующие Telegram settings выигрывают при конфликте;
- devices переводятся на Telegram account;
- операция оставляет sync event.

## Ограничения

- Без Supabase keys и Telegram bot token нельзя проверить реальный webhook и деплой.
- HttpOnly cookie выставляется Edge Function, но при cross-origin Vercel -> Supabase браузеры могут ограничивать third-party cookies. Поэтому frontend также использует session token в `x-armax-session`.
- Frontend считает backend готовым только когда в build доступны `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
- Настоящее удаление/отключение Telegram account не реализовано: текущий этап только создаёт привязку, session и sync.
- Conflict resolution сейчас deterministic и conservative; для сложных конфликтов UI выбора версии можно добавить отдельным этапом.
