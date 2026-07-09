import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'
import { HttpError } from './http.ts'
import { sha256Hex } from './crypto.ts'

type JsonRecord = Record<string, unknown>
type SupabaseAdmin = SupabaseClient

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function dateFromKey(key: string, fallback?: unknown) {
  const candidate = key || asString(fallback)

  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return candidate
  }

  return null
}

function mergeSettingsPayload(snapshot: JsonRecord) {
  return {
    settings: asRecord(snapshot.settings),
    moodEntries: asRecord(snapshot.moodEntries),
    workLogs: asRecord(snapshot.workLogs),
    dailyReports: asRecord(snapshot.dailyReports),
    celebratedAchievements: Array.isArray(snapshot.celebratedAchievements) ? snapshot.celebratedAchievements : [],
    starBalance: typeof snapshot.starBalance === 'number' ? snapshot.starBalance : 0,
    syncQueue: Array.isArray(snapshot.syncQueue) ? snapshot.syncQueue : [],
  }
}

async function maybeSingle<T>(promise: PromiseLike<{ data: T | null; error: unknown }>) {
  const { data, error } = await promise

  if (error) {
    throw error
  }

  return data
}

export async function ensureGuestAccount(supabase: SupabaseAdmin, guestId: string, deviceId: string) {
  const deviceById = await maybeSingle<{ account_id: string }>(
    supabase.from('devices').select('account_id').eq('device_id', deviceId).maybeSingle(),
  )

  if (deviceById?.account_id) {
    await supabase
      .from('devices')
      .update({ guest_id: guestId, last_seen_at: new Date().toISOString() })
      .eq('device_id', deviceId)

    return deviceById.account_id
  }

  const deviceByGuest = await maybeSingle<{ account_id: string }>(
    supabase.from('devices').select('account_id').eq('guest_id', guestId).maybeSingle(),
  )

  if (deviceByGuest?.account_id) {
    await supabase.from('devices').insert({
      account_id: deviceByGuest.account_id,
      device_id: deviceId,
      guest_id: guestId,
    })

    return deviceByGuest.account_id
  }

  const account = await maybeSingle<{ id: string }>(
    supabase.from('accounts').insert({ type: 'guest' }).select('id').single(),
  )

  if (!account?.id) {
    throw new HttpError(500, 'Could not create guest account')
  }

  await supabase.from('devices').insert({
    account_id: account.id,
    device_id: deviceId,
    guest_id: guestId,
  })

  return account.id
}

async function upsertHabit(supabase: SupabaseAdmin, accountId: string, habit: JsonRecord) {
  const clientId = asString(habit.id)
  const now = new Date().toISOString()
  const existing = clientId
    ? await maybeSingle<{ id: string }>(
        supabase
          .from('habits')
          .select('id')
          .eq('account_id', accountId)
          .filter('data->>id', 'eq', clientId)
          .maybeSingle(),
      )
    : null

  const payload = {
    account_id: accountId,
    data: habit,
    deleted_at: asString(habit.deletedAt) || null,
    updated_at: asString(habit.updatedAt) || now,
  }

  if (existing?.id) {
    const { data, error } = await supabase.from('habits').update(payload).eq('id', existing.id).select('id').single()

    if (error) {
      throw error
    }

    return data.id as string
  }

  const { data, error } = await supabase
    .from('habits')
    .insert({ ...payload, created_at: asString(habit.createdAt) || now })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data.id as string
}

async function upsertHabitEntry(
  supabase: SupabaseAdmin,
  accountId: string,
  habitId: string,
  date: string,
  data: JsonRecord,
) {
  const existing = await maybeSingle<{ id: string }>(
    supabase
      .from('habit_entries')
      .select('id')
      .eq('account_id', accountId)
      .eq('habit_id', habitId)
      .eq('date', date)
      .maybeSingle(),
  )
  const payload = {
    account_id: accountId,
    habit_id: habitId,
    date,
    data,
    updated_at: asString(data.updatedAt) || asString(data.completedAt) || new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await supabase.from('habit_entries').update(payload).eq('id', existing.id)

    if (error) {
      throw error
    }

    return
  }

  const { error } = await supabase.from('habit_entries').insert({
    ...payload,
    created_at: asString(data.createdAt) || asString(data.completedAt) || new Date().toISOString(),
  })

  if (error) {
    throw error
  }
}

async function upsertByClientId(
  supabase: SupabaseAdmin,
  table: 'achievements' | 'stars_history',
  accountId: string,
  item: JsonRecord,
) {
  const clientId = asString(item.id)
  const existing = clientId
    ? await maybeSingle<{ id: string }>(
        supabase
          .from(table)
          .select('id')
          .eq('account_id', accountId)
          .filter('data->>id', 'eq', clientId)
          .maybeSingle(),
      )
    : null
  const payload =
    table === 'stars_history'
      ? {
          account_id: accountId,
          amount: typeof item.amount === 'number' ? item.amount : 0,
          reason: asString(item.reason) || null,
          data: item,
          created_at: asString(item.date) || asString(item.createdAt) || new Date().toISOString(),
        }
      : {
          account_id: accountId,
          data: item,
          updated_at: asString(item.updatedAt) || asString(item.unlockedAt) || new Date().toISOString(),
        }

  if (existing?.id) {
    const { error } = await supabase.from(table).update(payload).eq('id', existing.id)

    if (error) {
      throw error
    }

    return
  }

  const { error } = await supabase.from(table).insert(payload)

  if (error) {
    throw error
  }
}

async function upsertDiaryEntry(supabase: SupabaseAdmin, accountId: string, date: string, entry: JsonRecord) {
  const existing = await maybeSingle<{ id: string }>(
    supabase.from('diary_entries').select('id').eq('account_id', accountId).eq('date', date).maybeSingle(),
  )
  const payload = {
    account_id: accountId,
    date,
    data: { ...entry, date },
    updated_at: asString(entry.updatedAt) || new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await supabase.from('diary_entries').update(payload).eq('id', existing.id)

    if (error) {
      throw error
    }

    return
  }

  const { error } = await supabase.from('diary_entries').insert({
    ...payload,
    created_at: asString(entry.createdAt) || new Date().toISOString(),
  })

  if (error) {
    throw error
  }
}

async function upsertSettings(supabase: SupabaseAdmin, accountId: string, snapshot: JsonRecord) {
  const existing = await maybeSingle<{ id: string }>(
    supabase.from('user_settings').select('id').eq('account_id', accountId).maybeSingle(),
  )
  const payload = {
    account_id: accountId,
    data: mergeSettingsPayload(snapshot),
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await supabase.from('user_settings').update(payload).eq('id', existing.id)

    if (error) {
      throw error
    }

    return
  }

  const { error } = await supabase.from('user_settings').insert(payload)

  if (error) {
    throw error
  }
}

export async function saveSnapshot(
  supabase: SupabaseAdmin,
  accountId: string,
  snapshotInput: unknown,
  operation = 'sync_push',
) {
  if (!isRecord(snapshotInput)) {
    return
  }

  const snapshot = snapshotInput
  const habitServerIds = new Map<string, string>()

  for (const habit of asArray(snapshot.habits)) {
    const serverHabitId = await upsertHabit(supabase, accountId, habit)
    const clientHabitId = asString(habit.id)

    if (clientHabitId) {
      habitServerIds.set(clientHabitId, serverHabitId)
    }

    const completions = asRecord(habit.completions)
    for (const [date, completion] of Object.entries(completions)) {
      if (isRecord(completion) && dateFromKey(date, completion.date)) {
        await upsertHabitEntry(supabase, accountId, serverHabitId, dateFromKey(date, completion.date)!, completion)
      }
    }
  }

  for (const [date, entry] of Object.entries(asRecord(snapshot.diaryEntries))) {
    if (isRecord(entry) && dateFromKey(date, entry.date)) {
      await upsertDiaryEntry(supabase, accountId, dateFromKey(date, entry.date)!, entry)
    }
  }

  for (const award of asArray(snapshot.awards)) {
    await upsertByClientId(supabase, 'achievements', accountId, award)
  }

  for (const transaction of asArray(snapshot.starHistory)) {
    await upsertByClientId(supabase, 'stars_history', accountId, transaction)
  }

  await upsertSettings(supabase, accountId, snapshot)

  await supabase.from('sync_events').insert({
    account_id: accountId,
    entity_type: 'snapshot',
    operation,
    data: {
      habitCount: habitServerIds.size,
      exportedAt: asString(snapshot.exportedAt) || null,
    },
  })
}

function rowsToRecord(rows: { date: string; data: unknown }[]) {
  return Object.fromEntries(rows.map((row) => [row.date, { ...asRecord(row.data), date: row.date }]))
}

export async function buildSnapshot(supabase: SupabaseAdmin, accountId: string) {
  const [
    habitsResult,
    diaryResult,
    achievementsResult,
    starsResult,
    settingsResult,
  ] = await Promise.all([
    supabase.from('habits').select('data').eq('account_id', accountId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('diary_entries').select('date, data').eq('account_id', accountId).order('date', { ascending: true }),
    supabase.from('achievements').select('data').eq('account_id', accountId).order('updated_at', { ascending: false }),
    supabase.from('stars_history').select('amount, reason, data, created_at').eq('account_id', accountId).order('created_at', { ascending: false }),
    supabase.from('user_settings').select('data').eq('account_id', accountId).maybeSingle(),
  ])

  for (const result of [habitsResult, diaryResult, achievementsResult, starsResult, settingsResult]) {
    if (result.error) {
      throw result.error
    }
  }

  const settingsPayload = asRecord(settingsResult.data?.data)
  const starHistory = (starsResult.data ?? []).map((row) => ({
    ...asRecord(row.data),
    amount: typeof row.amount === 'number' ? row.amount : asRecord(row.data).amount,
    reason: row.reason ?? asRecord(row.data).reason,
    date: asString(asRecord(row.data).date) || row.created_at,
  }))
  const serverStarBalance = starHistory.reduce(
    (total, item) => total + (typeof item.amount === 'number' ? item.amount : 0),
    0,
  )

  return {
    app: 'ARMAX Habits',
    version: 3,
    exportedAt: new Date().toISOString(),
    habits: (habitsResult.data ?? []).map((row) => row.data),
    moodEntries: asRecord(settingsPayload.moodEntries),
    diaryEntries: rowsToRecord((diaryResult.data ?? []) as { date: string; data: unknown }[]),
    workLogs: asRecord(settingsPayload.workLogs),
    settings: asRecord(settingsPayload.settings),
    celebratedAchievements: Array.isArray(settingsPayload.celebratedAchievements)
      ? settingsPayload.celebratedAchievements
      : [],
    starBalance: typeof settingsPayload.starBalance === 'number' ? settingsPayload.starBalance : serverStarBalance,
    starHistory,
    awards: (achievementsResult.data ?? []).map((row) => row.data),
    dailyReports: asRecord(settingsPayload.dailyReports),
    syncQueue: [],
  }
}

function tokenFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return ''
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('armax_session='))
    ?.slice('armax_session='.length) ?? ''
}

export function readSessionToken(request: Request, body?: JsonRecord) {
  const explicitSession =
    request.headers.get('x-armax-session')?.trim()
    || tokenFromCookie(request.headers.get('cookie'))
    || asString(body?.sessionToken)

  if (explicitSession) {
    return explicitSession
  }

  const authorization = request.headers.get('authorization') ?? ''

  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim()
  }

  return ''
}

export async function getSessionAccount(supabase: SupabaseAdmin, sessionToken: string) {
  if (!sessionToken) {
    throw new HttpError(401, 'Session token is required')
  }

  const sessionHash = await sha256Hex(sessionToken)
  const session = await maybeSingle<{ account_id: string; expires_at: string; revoked_at: string | null }>(
    supabase
      .from('sessions')
      .select('account_id, expires_at, revoked_at')
      .eq('session_hash', sessionHash)
      .maybeSingle(),
  )

  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    throw new HttpError(401, 'Session expired or revoked')
  }

  const account = await maybeSingle<{
    id: string
    telegram_id: number | string | null
    first_name: string | null
    last_name: string | null
    username: string | null
    photo_url: string | null
    language_code: string | null
  }>(supabase.from('accounts').select('*').eq('id', session.account_id).maybeSingle())

  if (!account?.telegram_id) {
    throw new HttpError(401, 'Telegram account is required')
  }

  return {
    accountId: account.id,
    userId: `telegram:${account.telegram_id}`,
    telegramId: String(account.telegram_id),
    firstName: account.first_name,
    lastName: account.last_name,
    username: account.username,
    photoUrl: account.photo_url,
    languageCode: account.language_code,
  }
}
