import { ApiError } from '@/api/client'
import type { Logger } from '@/lib/logger'

// 4xx responses are user-recoverable (validation, auth), so they stay at warn and do not trip the
// e2e [ERROR] check; network failures and 5xx are real bugs.
export function logFailure(log: Logger, msg: string, err: unknown) {
  if (err instanceof ApiError) {
    const ctx = { status: err.status, requestId: err.requestId, message: err.message }
    if (err.status > 0 && err.status < 500) log.warn(msg, ctx)
    else log.error(msg, ctx)
    return
  }
  log.error(msg, err)
}
