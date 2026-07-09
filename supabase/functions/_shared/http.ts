export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

function getAllowedOrigin(request: Request) {
  const configured = Deno.env.get('APP_PUBLIC_URL')?.trim()

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  return request.headers.get('origin') ?? '*'
}

export function corsHeaders(request: Request) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-armax-session',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function optionsResponse(request: Request) {
  return new Response('ok', {
    headers: corsHeaders(request),
  })
}

export function jsonResponse(request: Request, body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  })
}

export async function readJsonBody<T extends Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const body = await request.json()

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpError(400, 'JSON body must be an object')
    }

    return body as T
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    throw new HttpError(400, 'Invalid JSON body')
  }
}

export function errorResponse(request: Request, error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse(request, { error: error.message, message: error.message }, error.status)
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error'
  console.error(error)
  return jsonResponse(request, { error: message, message }, 500)
}
