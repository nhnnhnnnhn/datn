export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  time: string
  level: LogLevel
  tag: string
  msg: string
  ctx?: unknown
}

export interface Logger {
  debug(msg: string, ctx?: unknown): void
  info(msg: string, ctx?: unknown): void
  warn(msg: string, ctx?: unknown): void
  error(msg: string, ctx?: unknown): void
}

declare global {
  interface Window {
    __APP_LOGS__?: LogEntry[]
  }
}

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const BUFFER_SIZE = 500
const SERVER_LEVELS: Record<string, LogLevel> = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warn',
  ERROR: 'error',
  CRITICAL: 'error',
}

function resolveMinLevel(): LogLevel {
  const configured = import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined
  if (configured && configured in LEVELS) return configured
  return import.meta.env.DEV ? 'debug' : 'warn'
}

const minLevel = resolveMinLevel()

function remember(entry: LogEntry) {
  const buffer = (window.__APP_LOGS__ ??= [])
  buffer.push(entry)
  if (buffer.length > BUFFER_SIZE) buffer.splice(0, buffer.length - BUFFER_SIZE)
}

function emit(level: LogLevel, tag: string, msg: string, ctx?: unknown) {
  if (LEVELS[level] < LEVELS[minLevel]) return
  remember({ time: new Date().toISOString(), level, tag, msg, ctx })
  const prefix = level === 'error' && tag !== 'ERROR' ? `[ERROR][${tag}]` : `[${tag}]`
  const args = ctx === undefined ? [`${prefix} ${msg}`] : [`${prefix} ${msg}`, ctx]
  console[level](...args)
}

export function createLogger(tag: string): Logger {
  const normalized = tag.toUpperCase()
  return {
    debug: (msg, ctx) => emit('debug', normalized, msg, ctx),
    info: (msg, ctx) => emit('info', normalized, msg, ctx),
    warn: (msg, ctx) => emit('warn', normalized, msg, ctx),
    error: (msg, ctx) => emit('error', normalized, msg, ctx),
  }
}

export function newRequestId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function logServerLogs(requestId: string, header: string | null) {
  if (!header) return
  try {
    const entries = JSON.parse(decodeBase64Url(header)) as { tag: string; level: string; msg: string }[]
    for (const entry of entries) {
      emit(SERVER_LEVELS[entry.level] ?? 'info', `BE:${entry.tag}`, `${entry.msg} req=${requestId}`)
    }
  } catch (err) {
    emit('warn', 'LOG', 'could not decode X-Debug-Logs header', err)
  }
}

let globalHandlersInstalled = false

export function installGlobalErrorLogging() {
  if (globalHandlersInstalled) return
  globalHandlersInstalled = true
  const log = createLogger('UNCAUGHT')
  window.addEventListener('error', (event) => {
    log.error(event.message, { source: event.filename, line: event.lineno, error: event.error })
  })
  window.addEventListener('unhandledrejection', (event) => {
    log.error('unhandled promise rejection', event.reason)
  })
}
