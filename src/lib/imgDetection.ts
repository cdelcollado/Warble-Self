import { RADIO_BRANDS } from './catalog'

// .img footer magic bytes: \x00\xff + "chirp" + \xee + "img" + \x00
const IMG_MAGIC = new Uint8Array([0x00, 0xFF, 0x63, 0x68, 0x69, 0x72, 0x70, 0xEE, 0x69, 0x6D, 0x67, 0x00])

// Native memory sizes (without .img footer)
const IMG_SIGNATURES: Array<{ size: number; brand: string; model: string }> = [
  { size: 6152,  brand: 'Baofeng', model: 'UV-5R' },
  { size: 33344, brand: 'Baofeng', model: 'UV-5R MINI' },
]

// Map Warble model → driver ID
export const MODEL_TO_DRIVER_ID: Record<string, string> = {
  'UV-5R':      'uv5r',
  'UV-5R MINI': 'uv5rmini',
  'RT-4D':      'rt4d',
}

// Radtel RT-4D codeplug detection (.ddmr)
// Format: 1 MB flash dump with magic CD AB at 0x200C
function detectDdmr(data: Uint8Array, fileName: string): { brand: string; model: string } | null {
  if (!fileName.match(/\.ddmr$/i)) return null
  if (data.length !== 0x100000) return null
  if (data[0x200C] !== 0xCD || data[0x200D] !== 0xAB) return null
  return { brand: 'Radtel', model: 'RT-4D' }
}

function findImgMeta(data: Uint8Array): { brand: string; model: string } | null {
  outer: for (let i = data.length - IMG_MAGIC.length; i >= 0; i--) {
    for (let j = 0; j < IMG_MAGIC.length; j++) {
      if (data[i + j] !== IMG_MAGIC[j]) continue outer
    }
    try {
      // Skip any non-base64 bytes between the magic and the JSON (e.g. version byte 0x01)
      let b64Start = i + IMG_MAGIC.length
      while (b64Start < data.length && !/[A-Za-z0-9+/=]/.test(String.fromCharCode(data[b64Start]))) {
        b64Start++
      }
      const b64 = new TextDecoder().decode(data.subarray(b64Start)).trim()
      const json = JSON.parse(atob(b64)) as { vendor?: string; model?: string }
      if (!json.vendor || !json.model) return null
      for (const [brand, models] of Object.entries(RADIO_BRANDS)) {
        if (brand.toLowerCase() !== json.vendor.toLowerCase()) continue
        const match = models.find(m => m.toLowerCase() === json.model!.toLowerCase())
        if (match) return { brand, model: match }
      }
    } catch { /* continua amb detecció per mida */ }
    break
  }
  return null
}

export async function detectRadioFromImg(file: File): Promise<{ brand: string; model: string } | null> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const ddmr = detectDdmr(buf, file.name)
  if (ddmr) return ddmr
  const chirp = findImgMeta(buf)
  if (chirp) return chirp
  return IMG_SIGNATURES.find(s => s.size === buf.length) ?? null
}
