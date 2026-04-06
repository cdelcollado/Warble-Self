export interface ApiResponse<T = undefined> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    pageSize: number
  }
}

export function ok<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) }
}

export function fail(error: string): ApiResponse {
  return { success: false, error }
}
