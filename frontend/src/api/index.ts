import { USE_MOCK } from '@/lib/constants'
import { mockApi } from '@/mocks/mockApi'
import { httpApi } from './http'
import type { Api } from './types'

export const api: Api = USE_MOCK ? mockApi : httpApi
export type { Api }
