import { SerialConnection } from '../serial'
import type { MemoryChannel, IRadioDriver, SettingDef, GlobalSettings } from '../types'

// Radtel RT-4D — .ddmr format (flash dump, 1 MB)
//
// Serial protocol (CH340, 115200 baud, 8N1) — obtained from SPM capture:
//
//   ENTER:  [0x34, 0x52, 0x05, 0x10, 0x9B]    → ACK 0x06
//   READ:   [0x52, addr_hi, addr_lo, csum]      → [0x52, addr_hi, addr_lo] + 1024 bytes + csum
//   WRITE:  [cmd, ctr_hi, ctr_lo, ...1024 bytes..., csum]  → ACK 0x06
//   EXIT:   [0x34, 0x52, 0x05, 0xEE, 0x79]
//
//   checksum = sum(all_previous_bytes) & 0xFF
//   Blocks read: 0x0008 → 0x03C3 (remainder is 0xFF)
//   Each address = 1024-byte block; file_offset = addr × 1024
//
// Write protocol (verified from SPM capture of a write session):
//   1028-byte packets: [cmd, ctr_hi, ctr_lo, ...1024 bytes data..., csum]
//   csum = sum(cmd, ctr_hi, ctr_lo, data[0..1023]) & 0xFF
//
//   Sections:
//     cmd=0x90  ctr=0x0000           → block 0x0008 (global config)
//     cmd=0x91  ctr=(block − 0x0010) → blocks 0x0010–0x0357 (channels, zones, lists)
//     cmd=0x97  ctr=(block − 0x0358) → blocks 0x0358–0x035F (DMR contact table)
//     cmd=0x98  ctr=(block − 0x03C0) → blocks 0x03C0–0x03C3 (final section)
//
//   Note: all-0xFF blocks are skipped (not written)
//   Note: block 0x0000 (device ID) must be read and not modified
//
// Channel structure: 48-byte records (stride 0x30) starting at 0x4000
//   +00      : type (0x40 = Analog FM, 0x00/0x02 = DMR digital)
//   +03      : DMR timeslot (0x00 = TS1, 0x01 = TS2)
//   +05-08   : RX frequency (uint32 LE × 10 Hz)
//   +09-12   : TX frequency (uint32 LE × 10 Hz)
//   +11      : contact/TalkGroup index
//   +20-2E   : channel name (ASCII, 15 bytes, 0xFF padding)
//
// TODO (pending more test files):
//   - Color Code: suspected upper nibble of byte +02 (0x4E >> 4 = 4)
//   - TalkGroup name: contact table pending location

const FILE_SIZE      = 0x100000   // 1 MB
const BLOCK_SIZE     = 1024       // bytes per block
const BLOCK_FIRST    = 0x0008     // first data block
const BLOCK_LAST     = 0x03C3     // last data block (CPS reads up to here)

// Write sections (cmd byte per block range)
const WRITE_CONFIG_BLOC  = 0x0008  // cmd=0x90, 1 global config block
const WRITE_DATA_FIRST   = 0x0010  // cmd=0x91, first data block
const WRITE_DATA_LAST    = 0x0357  // cmd=0x91, last data block
const WRITE_CONTACT_FIRST = 0x0358 // cmd=0x97, first contact table block
const WRITE_CONTACT_LAST  = 0x035F // cmd=0x97, last contact table block
const WRITE_FINAL_FIRST  = 0x03C0  // cmd=0x98, first block of final section
const WRITE_FINAL_LAST   = 0x03C3  // cmd=0x98, last block of final section
const CHANNEL_START  = 0x4000
const CHANNEL_STRIDE = 0x30
const CHANNEL_MAX    = (0x1C000 - 0x4000) / CHANNEL_STRIDE

const CMD_ENTER  = new Uint8Array([0x34, 0x52, 0x05, 0x10, 0x9B])
const CMD_EXIT   = new Uint8Array([0x34, 0x52, 0x05, 0xEE, 0x79])

function checksum(bytes: number[]): number {
  return bytes.reduce((s, b) => (s + b) & 0xFF, 0)
}

function readCmd(addr: number): Uint8Array {
  const hi = (addr >> 8) & 0xFF
  const lo = addr & 0xFF
  return new Uint8Array([0x52, hi, lo, checksum([0x52, hi, lo])])
}


// ─── Decoder ───────────────────────────────────────────────────────────────

function readUint32LE(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0
}

function readFreqMHz(data: Uint8Array, offset: number): number {
  return (readUint32LE(data, offset) * 10) / 1_000_000
}

function readName(data: Uint8Array, offset: number): string {
  let name = ''
  for (let i = 0; i < 15; i++) {
    const b = data[offset + i]
    if (b === 0xFF || b === 0x00) break
    name += String.fromCharCode(b)
  }
  return name.trim()
}

export function decodeRT4D(data: Uint8Array): MemoryChannel[] {
  if (data.length !== FILE_SIZE) {
    throw new Error('Invalid .ddmr format: expected file size is 1 MB')
  }
  if (data[0x200C] !== 0xCD || data[0x200D] !== 0xAB) {
    throw new Error('Invalid .ddmr format: magic bytes not found')
  }

  const channels: MemoryChannel[] = []

  for (let i = 0; i < CHANNEL_MAX; i++) {
    const base = CHANNEL_START + i * CHANNEL_STRIDE
    if (data[base + 0x20] === 0xFF) continue

    const name = readName(data, base + 0x20)
    if (!name) continue

    const typeFlag   = data[base + 0x00]
    const tsFlag     = data[base + 0x03]
    const contactIdx = data[base + 0x11]

    const rxMHz = readFreqMHz(data, base + 5)
    const txMHz = readFreqMHz(data, base + 9)

    const isAnalog = (typeFlag & 0x40) !== 0
    const mode: MemoryChannel['mode'] = isAnalog ? 'FM' : 'DMR'
    const timeslot: 1 | 2 | undefined = isAnalog ? undefined : (tsFlag === 0x01 ? 2 : 1)

    const diff = Math.abs(rxMHz - txMHz)
    const duplex: MemoryChannel['duplex'] = diff > 0.0001 ? (rxMHz > txMHz ? '-' : '+') : 'None'
    const offsetStr = diff > 0.0001 ? diff.toFixed(6) : '0.000000'

    channels.push({
      index: channels.length + 1,
      name,
      frequency: rxMHz.toFixed(6),
      duplex,
      offset: offsetStr,
      mode,
      timeslot,
      contactIndex: isAnalog ? undefined : contactIdx,
      toneMode:     'None',
      tone:         '88.5',
      toneSql:      '88.5',
      dtcsCode:     '023',
      rxDtcsCode:   '023',
      dtcsPolarity: 'NN',
      power:        'High',
      skip:         false,
    })
  }

  return channels
}

// ─── Driver serial ──────────────────────────────────────────────────────────

export class RT4DRadio implements IRadioDriver {
  private serial: SerialConnection

  get name() { return 'Radtel RT-4D' }

  constructor(serial: SerialConnection) {
    this.serial = serial
  }

  async connect(): Promise<void> {
    if (!this.serial.isConnected()) {
      await this.serial.connect(115200)
    }
  }

  async disconnect(): Promise<void> {
    await this.serial.disconnect()
  }

  private async enterProgramming(): Promise<void> {
    this.serial.clearBuffer()
    await this.serial.write(CMD_ENTER)
    const ack = await this.serial.readBytes(1, 3000)
    if (ack[0] !== 0x06) {
      throw new Error(
        'Radio did not respond to entry magic. ' +
        'Ensure the radio is powered on and the cable is firmly connected.'
      )
    }
  }

  private async exitProgramming(): Promise<void> {
    try {
      await this.serial.write(CMD_EXIT)
    } catch {
      // Ignore errors on exit
    }
  }

  async readFromRadio(onProgress?: (percent: number) => void): Promise<Uint8Array> {
    await this.enterProgramming()

    const buf = new Uint8Array(FILE_SIZE)
    buf.fill(0xFF)  // Initialise with 0xFF (empty flash)

    const totalBlocks = BLOCK_LAST - BLOCK_FIRST + 1

    try {
      for (let addr = BLOCK_FIRST; addr <= BLOCK_LAST; addr++) {
        // Send read command
        await this.serial.write(readCmd(addr))

        // Read response header (3 bytes: 0x52 + addr_hi + addr_lo)
        const header = await this.serial.readBytes(3, 3000)
        if (header[0] !== 0x52) {
          throw new Error(`Unexpected response for block 0x${addr.toString(16)}: 0x${header[0].toString(16)}`)
        }
        const respAddr = (header[1] << 8) | header[2]
        if (respAddr !== addr) {
          throw new Error(`Incorrect response address: expected 0x${addr.toString(16)}, got 0x${respAddr.toString(16)}`)
        }

        // Read 1024 bytes of data + 1 checksum byte
        const payload = await this.serial.readBytes(BLOCK_SIZE + 1, 5000)

        // Verifica checksum: suma(header + payload[0..1023]) & 0xFF
        const expectedCs = checksum([...header, ...Array.from(payload.subarray(0, BLOCK_SIZE))])
        if (payload[BLOCK_SIZE] !== expectedCs) {
          throw new Error(`Checksum mismatch at block 0x${addr.toString(16)}`)
        }

        // Write block to buffer
        const fileOffset = addr * BLOCK_SIZE
        buf.set(payload.subarray(0, BLOCK_SIZE), fileOffset)

        if (onProgress) {
          onProgress(((addr - BLOCK_FIRST + 1) / totalBlocks) * 100)
        }
      }
    } finally {
      await this.exitProgramming()
    }

    return buf
  }

  async writeToRadio(data: Uint8Array, onProgress?: (percent: number) => void): Promise<void> {
    if (data.length !== FILE_SIZE) {
      throw new Error('Invalid .ddmr format: expected file size is 1 MB')
    }

    // Count blocks that need writing (non-0xFF) for progress reporting
    const allFF = (addr: number) => {
      const off = addr * BLOCK_SIZE
      for (let i = 0; i < BLOCK_SIZE; i++) if (data[off + i] !== 0xFF) return false
      return true
    }

    const blocksToWrite: Array<{ cmd: number; counter: number; addr: number }> = []
    // Config
    if (!allFF(WRITE_CONFIG_BLOC)) {
      blocksToWrite.push({ cmd: 0x90, counter: 0x0000, addr: WRITE_CONFIG_BLOC })
    }
    // Dades (canals, zones, llistes, contactes auxiliars)
    for (let addr = WRITE_DATA_FIRST; addr <= WRITE_DATA_LAST; addr++) {
      if (!allFF(addr)) {
        blocksToWrite.push({ cmd: 0x91, counter: addr - WRITE_DATA_FIRST, addr })
      }
    }
    // Taula de contactes DMR
    for (let addr = WRITE_CONTACT_FIRST; addr <= WRITE_CONTACT_LAST; addr++) {
      if (!allFF(addr)) {
        blocksToWrite.push({ cmd: 0x97, counter: addr - WRITE_CONTACT_FIRST, addr })
      }
    }
    // Final section
    for (let addr = WRITE_FINAL_FIRST; addr <= WRITE_FINAL_LAST; addr++) {
      if (!allFF(addr)) {
        blocksToWrite.push({ cmd: 0x98, counter: addr - WRITE_FINAL_FIRST, addr })
      }
    }

    await this.enterProgramming()

    try {
      for (let i = 0; i < blocksToWrite.length; i++) {
        const { cmd, counter, addr } = blocksToWrite[i]
        await this.writeBlock(cmd, counter, data.subarray(addr * BLOCK_SIZE, (addr + 1) * BLOCK_SIZE))
        if (onProgress) onProgress(((i + 1) / blocksToWrite.length) * 100)
      }
    } finally {
      await this.exitProgramming()
    }
  }

  private async writeBlock(cmd: number, counter: number, blockData: Uint8Array): Promise<void> {
    const hi = (counter >> 8) & 0xFF
    const lo = counter & 0xFF
    const packet = new Uint8Array(1028)
    packet[0] = cmd
    packet[1] = hi
    packet[2] = lo
    packet.set(blockData, 3)
    // checksum = sum(cmd, hi, lo, data[0..1023]) & 0xFF
    let cs = cmd + hi + lo
    for (let i = 0; i < BLOCK_SIZE; i++) cs += blockData[i]
    packet[1027] = cs & 0xFF

    await this.serial.write(packet)
    const ack = await this.serial.readBytes(1, 5000)
    if (ack[0] !== 0x06) {
      throw new Error(
        `Radio did not acknowledge write for block 0x${cmd.toString(16)}/ctr=0x${counter.toString(16)}: ` +
        `response 0x${ack[0].toString(16)}`
      )
    }
  }

  decodeChannels(data: Uint8Array): MemoryChannel[] {
    return decodeRT4D(data)
  }

  encodeChannels(_channels: MemoryChannel[], baseBuffer: Uint8Array): Uint8Array {
    // TODO: implementar quan es confirmi el format d'escriptura
    return baseBuffer
  }

  getFrequencyLimits(): { min: number; max: number }[] {
    return [
      { min: 136, max: 174 },
      { min: 400, max: 480 },
    ]
  }

  getGlobalSettingsSchema(): SettingDef[] {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  decodeGlobalSettings(_data: Uint8Array): GlobalSettings {
    return {}
  }

  encodeGlobalSettings(_settings: GlobalSettings, baseBuffer: Uint8Array): Uint8Array {
    return baseBuffer
  }
}
