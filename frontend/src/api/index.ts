import { USE_MOCK } from '@/lib/constants'
import { httpApi } from './http'
import type { Api } from './types'

// Imported only in mock mode so real-API builds do not download the mock layer and the bundled dataset
export const api: Api = USE_MOCK ? (await import('@/mocks/mockApi')).mockApi : httpApi
export type { Api }
