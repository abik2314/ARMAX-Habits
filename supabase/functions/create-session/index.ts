import { createRandomToken, sha256Hex } from '../_shared/crypto.ts'
import { errorResponse, HttpError, jsonResponse, optionsResponse, readJsonBody } from '../_shared/http.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'
import { verifyTelegramInitData } from '../_shared/telegramAuth.ts'

const sessionTtlSeconds = 60 * 60 * 24 * 30

async function createSessionForAccount(request: Request, supabase: ReturnType<typeof getSupabaseAdmin>, account: {
  id: string
  telegram_id: number | string
  first_name?: string | null
  last_name?: string | null
  username?: string | null
  photo_url?: string | null
  language_code?: string | null
}) {
  const sessionToken = createRandomToken(36)
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000).toISOString()
  const { error: sessionError } = await supabase.from('sessions').insert({
    account_id: account.id,
    session_hash: await sha256Hex(sessionToken),
    expires_at: expiresAt,
  })

  if (sessionError) {
    throw sessionError
  }

  return jsonResponse(
    request,
    {
      sessionToken,
      expiresAt,
      account: {
        id: account.id,
        userId: `telegram:${account.telegram_id}`,
        telegramId: String(account.telegram_id),
        firstName: account.first_name,
        lastName: account.last_name,
        username: account.username,
        photoUrl: account.photo_url,
        languageCode: account.language_code,
      },
    },
    200,
    {
      'Set-Cookie': `armax_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${sessionTtlSeconds}`,
    },
  )
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    if (request.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed')
    }

    const body = await readJsonBody(request)
    const linkToken = typeof body.linkToken === 'string' ? body.linkToken : ''
    const initData = typeof body.initData === 'string' ? body.initData : ''
    const supabase = getSupabaseAdmin()

    if (initData) {
      const telegramUser = await verifyTelegramInitData(initData)
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .upsert(
          {
            type: 'telegram',
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name ?? null,
            last_name: telegramUser.last_name ?? null,
            username: telegramUser.username ?? null,
            photo_url: telegramUser.photo_url ?? null,
            language_code: telegramUser.language_code ?? null,
          },
          { onConflict: 'telegram_id' },
        )
        .select('id, telegram_id, first_name, last_name, username, photo_url, language_code')
        .single()

      if (accountError) {
        throw accountError
      }

      return await createSessionForAccount(request, supabase, account)
    }

    if (!linkToken) {
      throw new HttpError(400, 'linkToken or initData is required')
    }

    const tokenHash = await sha256Hex(linkToken)
    const { data: linkRequest, error } = await supabase
      .from('link_requests')
      .select('id, status, approved_by_telegram_account_id')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!linkRequest || linkRequest.status !== 'completed' || !linkRequest.approved_by_telegram_account_id) {
      throw new HttpError(409, 'Telegram link is not completed')
    }

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, telegram_id, first_name, last_name, username, photo_url, language_code')
      .eq('id', linkRequest.approved_by_telegram_account_id)
      .maybeSingle()

    if (accountError) {
      throw accountError
    }

    if (!account?.telegram_id) {
      throw new HttpError(409, 'Telegram account is missing')
    }

    return await createSessionForAccount(request, supabase, account)
  } catch (error) {
    return errorResponse(request, error)
  }
})
