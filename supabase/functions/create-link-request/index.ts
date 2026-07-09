import { createRandomToken, sha256Hex } from '../_shared/crypto.ts'
import { errorResponse, HttpError, jsonResponse, optionsResponse, readJsonBody } from '../_shared/http.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'
import { ensureGuestAccount, saveSnapshot } from '../_shared/sync.ts'

function normalizeGuestId(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, 'guestId is required')
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
    const guestId = normalizeGuestId(body.guestId ?? body.guestUserId)
    const deviceId = typeof body.deviceId === 'string' && body.deviceId.trim() ? body.deviceId.trim() : guestId
    const botUsername = Deno.env.get('TELEGRAM_BOT_USERNAME')?.replace(/^@/, '').trim()

    if (!botUsername) {
      throw new HttpError(503, 'Telegram bot username is not configured')
    }

    const supabase = getSupabaseAdmin()
    const guestAccountId = await ensureGuestAccount(supabase, guestId, deviceId)

    if (body.snapshot) {
      await saveSnapshot(supabase, guestAccountId, body.snapshot, 'create_link_request_snapshot')
    }

    await supabase
      .from('link_requests')
      .update({ status: 'expired', completed_at: new Date().toISOString() })
      .eq('guest_account_id', guestAccountId)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    const linkToken = createRandomToken()
    const tokenHash = await sha256Hex(linkToken)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('link_requests')
      .insert({
        token_hash: tokenHash,
        guest_account_id: guestAccountId,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    return jsonResponse(request, {
      requestId: data.id,
      linkToken,
      status: 'pending',
      telegramUrl: `https://t.me/${botUsername}?start=link_${linkToken}`,
      expiresAt,
      pollingIntervalMs: 2500,
    })
  } catch (error) {
    return errorResponse(request, error)
  }
})
