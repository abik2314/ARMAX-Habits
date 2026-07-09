import { sha256Hex } from '../_shared/crypto.ts'
import { errorResponse, HttpError, jsonResponse, optionsResponse, readJsonBody } from '../_shared/http.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'

async function readToken(request: Request) {
  if (request.method === 'GET') {
    return new URL(request.url).searchParams.get('linkToken') ?? ''
  }

  const body = await readJsonBody(request)
  return typeof body.linkToken === 'string' ? body.linkToken : ''
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    if (request.method !== 'GET' && request.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed')
    }

    const linkToken = await readToken(request)

    if (!linkToken) {
      throw new HttpError(400, 'linkToken is required')
    }

    const supabase = getSupabaseAdmin()
    const tokenHash = await sha256Hex(linkToken)
    const { data: linkRequest, error } = await supabase
      .from('link_requests')
      .select('id, status, expires_at, approved_by_telegram_account_id')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!linkRequest) {
      throw new HttpError(404, 'Link request not found')
    }

    let status = linkRequest.status

    if (status === 'pending' && new Date(linkRequest.expires_at).getTime() <= Date.now()) {
      status = 'expired'
      await supabase
        .from('link_requests')
        .update({ status, completed_at: new Date().toISOString() })
        .eq('id', linkRequest.id)
    }

    let accountUserId: string | undefined
    let telegramProfile: Record<string, unknown> | undefined

    if ((status === 'completed' || status === 'approved') && linkRequest.approved_by_telegram_account_id) {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('telegram_id, first_name, last_name, username, photo_url, language_code')
        .eq('id', linkRequest.approved_by_telegram_account_id)
        .maybeSingle()

      if (accountError) {
        throw accountError
      }

      if (account?.telegram_id) {
        accountUserId = `telegram:${account.telegram_id}`
        telegramProfile = {
          id: String(account.telegram_id),
          firstName: account.first_name,
          lastName: account.last_name,
          username: account.username,
          photoUrl: account.photo_url,
          languageCode: account.language_code,
        }
      }
    }

    return jsonResponse(request, {
      requestId: linkRequest.id,
      status,
      expiresAt: linkRequest.expires_at,
      accountUserId,
      telegramProfile,
    })
  } catch (error) {
    return errorResponse(request, error)
  }
})
