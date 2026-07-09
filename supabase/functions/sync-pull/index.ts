import { errorResponse, HttpError, jsonResponse, optionsResponse } from '../_shared/http.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'
import { buildSnapshot, getSessionAccount, readSessionToken } from '../_shared/sync.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    if (request.method !== 'GET' && request.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed')
    }

    const supabase = getSupabaseAdmin()
    const sessionToken = readSessionToken(request)
    const account = await getSessionAccount(supabase, sessionToken)
    const snapshot = await buildSnapshot(supabase, account.accountId)

    return jsonResponse(request, {
      account,
      snapshot,
    })
  } catch (error) {
    return errorResponse(request, error)
  }
})
