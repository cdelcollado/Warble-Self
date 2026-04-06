import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  callsign: string | null
  country: string | null
  created_at: string
}

export type Codefile = {
  id: string
  author_id: string
  title: string
  description: string | null
  brand: string
  model: string
  country: string
  region: string | null
  file_path: string
  file_format: 'img' | 'csv' | 'ddmr'
  downloads: number
  avg_rating: number
  rating_count: number
  created_at: string
  updated_at: string
}

export type CodefileWithAuthor = Codefile & {
  profiles: { callsign: string | null } | null
}

export type Comment = {
  id: string
  codefile_id: string
  author_id: string
  parent_id: string | null
  body: string
  created_at: string
  profiles: { callsign: string | null } | null
}

export type Rating = {
  id: string
  codefile_id: string
  user_id: string
  rating: number
  created_at: string
}

export const RADIO_BRANDS: Record<string, string[]> = {
  'Baofeng': ['UV-5R', 'UV-5R MINI', 'UV-82', 'BF-888S', 'UV-9R', 'UV-16', 'UV-S9 Plus'],
  'Yaesu': ['FT-65', 'FT-25', 'FT-4X', 'FT-4XR', 'FT-60R'],
  'Kenwood': ['TH-K20', 'TH-K40', 'TH-D74'],
  'Icom': ['IC-V86', 'IC-U86', 'IC-T70'],
  'Radioddity': ['GD-77', 'GA-5S', 'GD-AT10G'],
  'AnyTone': ['AT-D878UV', 'AT-D868UV', 'AT-D878UVII Plus'],
  'TYT': ['TH-UV88', 'MD-380', 'MD-9600'],
  'Radtel': ['RT-4D'],
  'Other': ['Other'],
}
