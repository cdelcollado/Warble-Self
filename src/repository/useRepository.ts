import { useState, useEffect, useCallback } from 'react'
import { supabase, type CodefileWithAuthor, type Comment, type Rating } from '../lib/supabase'

export interface RepositoryFilters {
  search: string
  brand: string
  model: string
  country: string
  sortBy: 'newest' | 'downloads' | 'rating'
}

const PAGE_SIZE = 20

export function useRepository(filters: RepositoryFilters, page: number) {
  const [codefiles, setCodefiles] = useState<CodefileWithAuthor[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('codefiles')
      .select('*, profiles(callsign)', { count: 'exact' })

    if (filters.search.trim()) {
      query = query.or(
        `title.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%,country.ilike.%${filters.search}%`
      )
    }
    if (filters.brand) query = query.eq('brand', filters.brand)
    if (filters.model) query = query.eq('model', filters.model)
    if (filters.country) query = query.ilike('country', filters.country)

    if (filters.sortBy === 'downloads') {
      query = query.order('downloads', { ascending: false })
    } else if (filters.sortBy === 'rating') {
      query = query.order('avg_rating', { ascending: false }).order('rating_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    const { data, count, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setCodefiles((data as CodefileWithAuthor[]) ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filters, page])

  useEffect(() => { fetch() }, [fetch])

  return { codefiles, total, loading, error, refetch: fetch }
}

export async function uploadCodefile(
  authorId: string,
  fields: {
    title: string
    description: string
    brand: string
    model: string
    country: string
    region: string
  },
  file: File
): Promise<{ error: string | null }> {
  const ext = file.name.endsWith('.csv') ? 'csv' : 'img'
  const filePath = `${authorId}/${Date.now()}_${file.name}`

  const { error: storageError } = await supabase.storage
    .from('codefiles')
    .upload(filePath, file, { contentType: 'application/octet-stream' })

  if (storageError) return { error: storageError.message }

  const { error: dbError } = await supabase.from('codefiles').insert({
    author_id: authorId,
    title: fields.title.trim(),
    description: fields.description.trim() || null,
    brand: fields.brand,
    model: fields.model,
    country: fields.country.trim(),
    region: fields.region.trim() || null,
    file_path: filePath,
    file_format: ext,
    downloads: 0,
  })

  if (dbError) {
    await supabase.storage.from('codefiles').remove([filePath])
    return { error: dbError.message }
  }

  return { error: null }
}

export async function downloadCodefile(
  codefileId: string,
  filePath: string,
  fileName: string
): Promise<{ error: string | null }> {
  const { data, error: storageError } = await supabase.storage
    .from('codefiles')
    .download(filePath)

  if (storageError) return { error: storageError.message }

  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)

  await supabase.rpc('increment_downloads', { codefile_id: codefileId })

  return { error: null }
}

export async function fetchCodefileBuffer(
  filePath: string
): Promise<{ buffer: Uint8Array | null; error: string | null }> {
  const { data, error: storageError } = await supabase.storage
    .from('codefiles')
    .download(filePath)

  if (storageError) return { buffer: null, error: storageError.message }

  const buffer = new Uint8Array(await data.arrayBuffer())
  return { buffer, error: null }
}

// ── Ratings ──────────────────────────────────────────────────────────────────

export async function fetchRatings(codefileId: string): Promise<Rating[]> {
  const { data } = await supabase
    .from('codefile_ratings')
    .select('*')
    .eq('codefile_id', codefileId)
  return (data as Rating[]) ?? []
}

export async function upsertRating(
  codefileId: string, userId: string, rating: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('codefile_ratings')
    .upsert({ codefile_id: codefileId, user_id: userId, rating }, { onConflict: 'codefile_id,user_id' })
  return { error: error?.message ?? null }
}

export async function deleteRating(
  codefileId: string, userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('codefile_ratings')
    .delete()
    .eq('codefile_id', codefileId)
    .eq('user_id', userId)
  return { error: error?.message ?? null }
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(codefileId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from('codefile_comments')
    .select('*, profiles(callsign)')
    .eq('codefile_id', codefileId)
    .order('created_at', { ascending: true })
  return (data as Comment[]) ?? []
}

export async function addComment(
  codefileId: string, authorId: string, body: string, parentId?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('codefile_comments')
    .insert({ codefile_id: codefileId, author_id: authorId, body, parent_id: parentId ?? null })
  return { error: error?.message ?? null }
}

export async function deleteComment(commentId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('codefile_comments')
    .delete()
    .eq('id', commentId)
  return { error: error?.message ?? null }
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function reportContent(
  reporterId: string,
  target: { codefileId?: string; commentId?: string },
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('codefile_reports')
    .insert({
      reporter_id: reporterId,
      codefile_id: target.codefileId ?? null,
      comment_id: target.commentId ?? null,
      reason,
    })
  return { error: error?.message ?? null }
}
