create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('guest', 'telegram')),
  telegram_id bigint unique,
  first_name text,
  last_name text,
  username text,
  photo_url text,
  language_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_type_identity_check check (
    (type = 'guest' and telegram_id is null)
    or (type = 'telegram' and telegram_id is not null)
  )
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  device_id text not null,
  guest_id text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.link_requests (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  guest_account_id uuid not null references public.accounts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'expired', 'completed', 'failed')),
  expires_at timestamptz not null,
  approved_by_telegram_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  session_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stars_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  amount integer not null default 0,
  reason text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  operation text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists devices_device_id_key on public.devices(device_id);
create index if not exists devices_account_id_idx on public.devices(account_id);
create index if not exists devices_guest_id_idx on public.devices(guest_id);
create index if not exists link_requests_guest_account_id_idx on public.link_requests(guest_account_id);
create index if not exists link_requests_status_expires_at_idx on public.link_requests(status, expires_at);
create index if not exists sessions_account_id_idx on public.sessions(account_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);
create index if not exists habits_account_id_idx on public.habits(account_id);
create unique index if not exists habits_account_client_id_key
  on public.habits(account_id, (data->>'id'))
  where data->>'id' is not null and deleted_at is null;
create index if not exists habit_entries_account_id_idx on public.habit_entries(account_id);
create unique index if not exists habit_entries_account_habit_date_key
  on public.habit_entries(account_id, habit_id, date)
  where habit_id is not null;
create unique index if not exists achievements_account_client_id_key
  on public.achievements(account_id, (data->>'id'))
  where data->>'id' is not null;
create unique index if not exists stars_history_account_client_id_key
  on public.stars_history(account_id, (data->>'id'))
  where data->>'id' is not null;
create index if not exists stars_history_account_created_at_idx on public.stars_history(account_id, created_at desc);
create unique index if not exists user_settings_account_id_key on public.user_settings(account_id);
create unique index if not exists diary_entries_account_date_key on public.diary_entries(account_id, date);
create index if not exists sync_events_account_created_at_idx on public.sync_events(account_id, created_at desc);
create index if not exists sync_events_entity_idx on public.sync_events(entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

drop trigger if exists habit_entries_set_updated_at on public.habit_entries;
create trigger habit_entries_set_updated_at
  before update on public.habit_entries
  for each row execute function public.set_updated_at();

drop trigger if exists achievements_set_updated_at on public.achievements;
create trigger achievements_set_updated_at
  before update on public.achievements
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

drop trigger if exists diary_entries_set_updated_at on public.diary_entries;
create trigger diary_entries_set_updated_at
  before update on public.diary_entries
  for each row execute function public.set_updated_at();

create or replace function public.complete_telegram_link_request(
  p_token_hash text,
  p_telegram_id bigint,
  p_first_name text default null,
  p_last_name text default null,
  p_username text default null,
  p_photo_url text default null,
  p_language_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_request public.link_requests%rowtype;
  v_telegram_account_id uuid;
begin
  select *
    into v_request
    from public.link_requests
   where token_hash = p_token_hash
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'failed', 'message', 'Link request not found');
  end if;

  if v_request.status = 'completed' and v_request.approved_by_telegram_account_id is not null then
    select id
      into v_telegram_account_id
      from public.accounts
     where id = v_request.approved_by_telegram_account_id;

    return jsonb_build_object(
      'ok', true,
      'status', 'completed',
      'accountId', v_telegram_account_id,
      'telegramId', p_telegram_id,
      'userId', 'telegram:' || p_telegram_id::text,
      'idempotent', true
    );
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'status', v_request.status, 'message', 'Link request is not pending');
  end if;

  if v_request.expires_at <= v_now then
    update public.link_requests
       set status = 'expired',
           completed_at = v_now
     where id = v_request.id;

    return jsonb_build_object('ok', false, 'status', 'expired', 'message', 'Link request expired');
  end if;

  insert into public.accounts (
    type,
    telegram_id,
    first_name,
    last_name,
    username,
    photo_url,
    language_code
  )
  values (
    'telegram',
    p_telegram_id,
    p_first_name,
    p_last_name,
    p_username,
    p_photo_url,
    p_language_code
  )
  on conflict (telegram_id) do update
    set type = 'telegram',
        first_name = coalesce(excluded.first_name, accounts.first_name),
        last_name = coalesce(excluded.last_name, accounts.last_name),
        username = coalesce(excluded.username, accounts.username),
        photo_url = coalesce(excluded.photo_url, accounts.photo_url),
        language_code = coalesce(excluded.language_code, accounts.language_code),
        updated_at = v_now
  returning id into v_telegram_account_id;

  if v_request.guest_account_id = v_telegram_account_id then
    update public.link_requests
       set status = 'completed',
           approved_by_telegram_account_id = v_telegram_account_id,
           completed_at = v_now
     where id = v_request.id;

    return jsonb_build_object(
      'ok', true,
      'status', 'completed',
      'accountId', v_telegram_account_id,
      'telegramId', p_telegram_id,
      'userId', 'telegram:' || p_telegram_id::text,
      'idempotent', true
    );
  end if;

  update public.habits as target
     set data = jsonb_set(
                  jsonb_set(
                    source.data || target.data,
                    '{completions}',
                    coalesce(source.data->'completions', '{}'::jsonb) || coalesce(target.data->'completions', '{}'::jsonb),
                    true
                  ),
                  '{subTaskCompletions}',
                  coalesce(source.data->'subTaskCompletions', '{}'::jsonb) || coalesce(target.data->'subTaskCompletions', '{}'::jsonb),
                  true
                ),
         updated_at = greatest(target.updated_at, source.updated_at, v_now)
    from public.habits as source
   where source.account_id = v_request.guest_account_id
     and target.account_id = v_telegram_account_id
     and target.deleted_at is null
     and source.deleted_at is null
     and (
       (source.data->>'id' is not null and target.data->>'id' = source.data->>'id')
       or (
         coalesce(trim(source.data->>'title'), '') <> ''
         and lower(trim(target.data->>'title')) = lower(trim(source.data->>'title'))
       )
     );

  update public.habits as source
     set account_id = v_telegram_account_id,
         updated_at = greatest(source.updated_at, v_now)
   where source.account_id = v_request.guest_account_id
     and source.deleted_at is null
     and not exists (
       select 1
         from public.habits as target
        where target.account_id = v_telegram_account_id
          and target.deleted_at is null
          and (
            (source.data->>'id' is not null and target.data->>'id' = source.data->>'id')
            or (
              coalesce(trim(source.data->>'title'), '') <> ''
              and lower(trim(target.data->>'title')) = lower(trim(source.data->>'title'))
            )
          )
     );

  update public.habits as source
     set deleted_at = coalesce(source.deleted_at, v_now),
         data = source.data || jsonb_build_object('mergedIntoAccountId', v_telegram_account_id::text),
         updated_at = v_now
   where source.account_id = v_request.guest_account_id
     and exists (
       select 1
         from public.habits as target
        where target.account_id = v_telegram_account_id
          and target.deleted_at is null
          and (
            (source.data->>'id' is not null and target.data->>'id' = source.data->>'id')
            or (
              coalesce(trim(source.data->>'title'), '') <> ''
              and lower(trim(target.data->>'title')) = lower(trim(source.data->>'title'))
            )
          )
     );

  update public.habit_entries as entry
     set account_id = v_telegram_account_id,
         updated_at = greatest(entry.updated_at, v_now)
   where entry.account_id = v_request.guest_account_id
     and exists (
       select 1
         from public.habits as habit
        where habit.id = entry.habit_id
          and habit.account_id = v_telegram_account_id
     )
     and not exists (
       select 1
         from public.habit_entries as target
        where target.account_id = v_telegram_account_id
          and target.habit_id = entry.habit_id
          and target.date = entry.date
     );

  update public.achievements as target
     set data = source.data || target.data,
         updated_at = greatest(target.updated_at, source.updated_at, v_now)
    from public.achievements as source
   where source.account_id = v_request.guest_account_id
     and target.account_id = v_telegram_account_id
     and source.data->>'id' is not null
     and target.data->>'id' = source.data->>'id';

  update public.achievements as source
     set account_id = v_telegram_account_id,
         updated_at = greatest(source.updated_at, v_now)
   where source.account_id = v_request.guest_account_id
     and not exists (
       select 1
         from public.achievements as target
        where target.account_id = v_telegram_account_id
          and source.data->>'id' is not null
          and target.data->>'id' = source.data->>'id'
     );

  update public.stars_history as source
     set account_id = v_telegram_account_id
   where source.account_id = v_request.guest_account_id
     and not exists (
       select 1
         from public.stars_history as target
        where target.account_id = v_telegram_account_id
          and (
            (source.data->>'id' is not null and target.data->>'id' = source.data->>'id')
            or (
              coalesce(source.reason, '') <> ''
              and coalesce(target.reason, '') = coalesce(source.reason, '')
              and target.amount = source.amount
              and target.created_at::date = source.created_at::date
            )
          )
     );

  insert into public.diary_entries (account_id, date, data, created_at, updated_at)
  select v_telegram_account_id, date, data, created_at, updated_at
    from public.diary_entries
   where account_id = v_request.guest_account_id
  on conflict (account_id, date) do update
    set data = excluded.data || diary_entries.data,
        updated_at = greatest(diary_entries.updated_at, excluded.updated_at, v_now);

  insert into public.user_settings (account_id, data, created_at, updated_at)
  select v_telegram_account_id, data, created_at, updated_at
    from public.user_settings
   where account_id = v_request.guest_account_id
  on conflict (account_id) do update
    set data = excluded.data || user_settings.data || jsonb_build_object('mergedGuestAccountId', v_request.guest_account_id::text),
        updated_at = greatest(user_settings.updated_at, excluded.updated_at, v_now);

  update public.devices
     set account_id = v_telegram_account_id,
         last_seen_at = v_now
   where account_id = v_request.guest_account_id;

  update public.link_requests
     set status = 'completed',
         approved_by_telegram_account_id = v_telegram_account_id,
         completed_at = v_now
   where id = v_request.id;

  insert into public.sync_events (account_id, entity_type, operation, data)
  values (
    v_telegram_account_id,
    'account',
    'merge_guest_to_telegram',
    jsonb_build_object(
      'guestAccountId', v_request.guest_account_id,
      'telegramAccountId', v_telegram_account_id,
      'linkRequestId', v_request.id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'completed',
    'accountId', v_telegram_account_id,
    'telegramId', p_telegram_id,
    'userId', 'telegram:' || p_telegram_id::text,
    'idempotent', false
  );
end;
$$;

alter table public.accounts enable row level security;
alter table public.devices enable row level security;
alter table public.link_requests enable row level security;
alter table public.sessions enable row level security;
alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;
alter table public.achievements enable row level security;
alter table public.stars_history enable row level security;
alter table public.user_settings enable row level security;
alter table public.diary_entries enable row level security;
alter table public.sync_events enable row level security;

revoke execute on function public.complete_telegram_link_request(text, bigint, text, text, text, text, text) from public;
grant execute on function public.complete_telegram_link_request(text, bigint, text, text, text, text, text) to service_role;
