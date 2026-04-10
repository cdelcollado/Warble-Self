import { useState, useEffect, useCallback } from 'react'
import { api, apiBuffer } from '../lib/api'
import type { CodefileWithAuthor, Comment, Rating } from '../lib/catalog'

export interface RepositoryFilters {
  search: string
  brand: string
  model: string
  country: string
  sortBy: 'newest' | 'downloads' | 'rating'
}

const BASE = import.meta.env.VITE_API_URL ?? ''

export function useRepository(filters: RepositoryFilters, page: number) {
  const [codefiles, setCodefiles] = useState<CodefileWithAuthor[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.brand) params.set('brand', filters.brand)
    if (filters.model) params.set('model', filters.model)
    if (filters.country) params.set('country', filters.country)
    params.set('sortBy', filters.sortBy)
    params.set('page', String(page))

    try {
      const res = await window.fetch(`${BASE}/api/codefiles?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setCodefiles(json.data ?? [])
        setTotal(json.meta?.total ?? 0)
      } else {
        setError(json.error ?? 'Error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    }
    setLoading(false)
  }, [filters, page])

  useEffect(() => { load() }, [load])

  return { codefiles, total, loading, error, refetch: load }
}

export async function uploadCodefile(
  fields: {
    title: string
    description: string
    brand: string
    model: string
    country: string
    region: string
  },
  file: File,
): Promise<{ error: string | null }> {
  const form = new FormData()
  form.append('file', file)
  form.append('title', fields.title.trim())
  form.append('description', fields.description.trim())
  form.append('brand', fields.brand)
  form.append('model', fields.model)
  form.append('country', fields.country.trim())
  form.append('region', fields.region.trim())

  const { error } = await api('/codefiles', { method: 'POST', body: form })
  return { error }
}

export async function downloadCodefile(
  codefileId: string,
  _filePath: string,
  fileName: string,
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`${BASE}/api/codefiles/${codefileId}/download`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return { error: 'Download failed' }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Download failed' }
  }
}

export async function fetchCodefileBuffer(
  _filePath: string,
  codefileId: string,
): Promise<{ buffer: Uint8Array | null; error: string | null }> {
  return apiBuffer(`/codefiles/${codefileId}/buffer`)
}

// ── Ratings ──────────────────────────────────────────────────────────────────

export async function fetchRatings(codefileId: string): Promise<Rating[]> {
  const { data } = await api<Rating[]>(`/codefiles/${codefileId}/ratings`)
  return data ?? []
}

export async function upsertRating(
  codefileId: string,
  _userId: string,
  rating: number,
): Promise<{ error: string | null }> {
  const { error } = await api(`/codefiles/${codefileId}/ratings`, {
    method: 'PUT',
    body: JSON.stringify({ rating }),
  })
  return { error }
}

export async function deleteRating(
  codefileId: string,
  _userId: string,
): Promise<{ error: string | null }> {
  const { error } = await api(`/codefiles/${codefileId}/ratings`, { method: 'DELETE' })
  return { error }
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(codefileId: string): Promise<Comment[]> {
  const { data } = await api<Comment[]>(`/codefiles/${codefileId}/comments`)
  return data ?? []
}

export async function addComment(
  codefileId: string,
  _authorId: string,
  body: string,
  parentId?: string,
): Promise<{ error: string | null }> {
  const { error } = await api(`/codefiles/${codefileId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, parentId }),
  })
  return { error }
}

export async function deleteComment(commentId: string): Promise<{ error: string | null }> {
  const { error } = await api(`/comments/${commentId}`, { method: 'DELETE' })
  return { error }
}

export async function deleteCodefile(codefileId: string): Promise<{ error: string | null }> {
  const { error } = await api(`/codefiles/${codefileId}`, { method: 'DELETE' })
  return { error }
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function reportContent(
  _reporterId: string,
  target: { codefileId?: string; commentId?: string },
  reason: string,
): Promise<{ error: string | null }> {
  const { error } = await api('/reports', {
    method: 'POST',
    body: JSON.stringify({ reason, ...target }),
  })
  return { error }
}
