import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { apiFailureText } from './toast'

describe('apiFailureText', () => {
  it('reports failures the user cannot fix', () => {
    expect(apiFailureText(new ApiError(0, 'x'))).toBe('Mất kết nối tới máy chủ.')
    expect(apiFailureText(new ApiError(404, 'Not Found'))).toBe('Chức năng này chưa có trên máy chủ.')
    expect(apiFailureText(new ApiError(404, 'Không tìm thấy thành ngữ'))).toBe('Không tìm thấy dữ liệu yêu cầu.')
    expect(apiFailureText(new ApiError(500, 'Internal Server Error'))).toContain('(500)')
  })

  it('leaves form errors and sign-out to the page', () => {
    for (const status of [400, 401, 409, 422]) expect(apiFailureText(new ApiError(status, 'x'))).toBeNull()
    expect(apiFailureText(new Error('boom'))).toBeNull()
  })
})
