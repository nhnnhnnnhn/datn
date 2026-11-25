import { httpApi } from './http'
import type { Api } from './types'

// In mock mode MSW intercepts these requests (src/mocks/browser.ts), so the app always talks HTTP
export const api: Api = httpApi
export type { Api }
