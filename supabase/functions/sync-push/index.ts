import { errorResponse, HttpError, jsonResponse, optionsResponse, readJsonBody } from '../_shared/http.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'
import { ensureGuestAccount, getSessionAccount, readSessionToken, saveSnapshot } from '../_shared/sync.ts'

function normalizeGuestId(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return ''
  }

  const trimmed = value.trim()
  return trimmed.startsWith('guest:') ? trimmed : `guest:${trimmed.replace(/^device-/, '')}`
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

    if (!body.snapshot) {
      throw new HttpError(400, 'snapshot is required')
    }

    const supabase = getSupabaseAdmin()
    let accountId = ''
    let accountUserId = ''
    const sessionToken = readSessionToken(request, body)

    if (sessionToken) {
      const account = await getSessionAccount(supabase, sessionToken)
      accountId = account.accountId
      accountUserId = account.userId
    } else {
      const guestId = normalizeGuestId(body.guestId ?? body.guestUserId)
      const deviceId = typeof body.deviceId === 'string' && body.deviceId.trim() ? body.deviceId.trim() : guestId

      if (!guestId) {
        throw new HttpError(401, 'Session token or guestId is required')
      }

      accountId = await ensureGuestAccount(supabase, guestId, deviceId)
      accountUserId = guestId
    }

    await saveSnapshot(supabase, accountId, body.snapshot, 'sync_push')

    return jsonResponse(request, {
      ok: true,
      accountUserId,
    })
  } catch (error) {
    return errorResponse(request, error)
  }
})
