// Types matching the self-hosted backend (camelCase)

export type Profile = {
  id: string
  callsign: string | null
  country: string | null
  createdAt: string
}

export type Codefile = {
  id: string
  authorId: string
  title: string
  description: string | null
  brand: string
  model: string
  country: string
  region: string | null
  filePath: string
  fileFormat: 'img' | 'csv' | 'ddmr'
  downloads: number
  avgRating: number
  ratingCount: number
  createdAt: string
  updatedAt: string
}

export type CodefileWithAuthor = Codefile & {
  profiles: { callsign: string | null } | null
}

export type Comment = {
  id: string
  codefileId: string
  authorId: string
  parentId: string | null
  body: string
  createdAt: string
  profiles: { callsign: string | null } | null
}

export type Rating = {
  id: string
  codefileId: string
  userId: string
  rating: number
  createdAt: string
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
