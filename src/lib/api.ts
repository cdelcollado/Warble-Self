const BASE = import.meta.env.VITE_API_URL ?? ''

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    const isFormData = options.body instanceof FormData
    const res = await fetch(`${BASE}/api${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    })
    const json = await res.json()
    if (!json.success) return { data: null, error: json.error ?? 'Error' }
    return { data: json.data as T, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function apiBuffer(
  path: string,
): Promise<{ buffer: Uint8Array | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE}/api${path}`, { credentials: 'include' })
    if (!res.ok) return { buffer: null, error: 'Download failed' }
    return { buffer: new Uint8Array(await res.arrayBuffer()), error: null }
  } catch (err) {
    return { buffer: null, error: err instanceof Error ? err.message : 'Network error' }
  }
}
