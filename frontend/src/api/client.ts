import { createLogger, logServerLogs, newRequestId } from '@/lib/logger'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'vivid:token'
const log = createLogger('HTTP')

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage blocked: the session will not survive a reload */
  }
}

export class ApiError extends Error {
  status: number
  requestId?: string
  constructor(status: number, message: string, requestId?: string) {
    super(message)
    this.status = status
    this.requestId = requestId
  }
}

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

interface ValidationIssue {
  loc?: (string | number)[]
  msg?: string
}

// FastAPI sends HTTPException as {detail: string} and request validation (422) as {detail: [{loc, msg}]}
function errorMessage(data: unknown, fallback: string): { message: string; fields?: string[] } {
  if (typeof data !== 'object' || data === null) return { message: fallback }
  const { detail, message } = data as { detail?: unknown; message?: unknown }
  if (typeof detail === 'string') return { message: detail }
  if (Array.isArray(detail)) {
    const fields = (detail as ValidationIssue[]).map((d) => `${(d.loc ?? []).slice(1).join('.') || 'body'}: ${d.msg ?? '?'}`)
    return { message: 'Dữ liệu gửi lên không hợp lệ', fields }
  }
  if (typeof message === 'string') return { message }
  return { message: fallback }
}

type Query = Record<string, string | number | boolean | undefined | null>

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: { body?: unknown; query?: Query } = {},
): Promise<T> {
  const url = new URL(BASE_URL + path, window.location.origin)
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const requestId = newRequestId()
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-ID': requestId }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  log.debug(`-> ${method} ${path} req=${requestId}`)
  const started = performance.now()
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch (err) {
    log.error(`network error ${method} ${path} req=${requestId}`, err)
    throw new ApiError(0, 'Không kết nối được tới máy chủ', requestId)
  }

  const line = `<- ${res.status} ${method} ${path} ${Math.round(performance.now() - started)}ms req=${requestId}`
  logServerLogs(requestId, res.headers.get('X-Debug-Logs'))

  if (!res.ok) {
    if (res.status >= 500) log.error(line)
    else log.warn(line)
    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      /* non-JSON error body */
    }
    const { message, fields } = errorMessage(data, res.statusText)
    if (fields) log.warn(`invalid request ${method} ${path} req=${requestId}`, { fields })
    if (res.status === 401 && token && getToken() === token) {
      log.info(`session rejected, signing out req=${requestId}`)
      setToken(null)
      onUnauthorized?.()
    }
    throw new ApiError(res.status, message, requestId)
  }

  log.debug(line)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
