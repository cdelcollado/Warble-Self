/**
 * Utilities for working with binary data, emulating the struct-based
 * data access used by radio programming Python drivers.
 *
 * These classes provide a typed interface for reading and writing
 * complex binary structures from radio .img files.
 */

/**
 * Binary data parser with an internal cursor for sequential reading
 * @example
 * const parser = new BinaryParser(buffer);
 * const frequency = parser.getUint32(true); // Little-endian
 * const name = parser.getString(7);
 */
export class BinaryParser {
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer | Uint8Array) {
    if (buffer instanceof Uint8Array) {
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
      this.view = new DataView(buffer);
    }
  }

  getUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  getUint16(littleEndian: boolean = true): number {
    const val = this.view.getUint16(this.offset, littleEndian);
    this.offset += 2;
    return val;
  }

  getUint32(littleEndian: boolean = true): number {
    const val = this.view.getUint32(this.offset, littleEndian);
    this.offset += 4;
    return val;
  }

  // Read strings (Baofeng channel names commonly use ASCII, terminated by 0x00 or 0xFF)
  getString(length: number): string {
    let str = "";
    for (let i = 0; i < length; i++) {
      const charCode = this.getUint8();
      if (charCode !== 0 && charCode !== 0xFF) {
        str += String.fromCharCode(charCode);
      }
    }
    return str.trim();
  }

  // Extract the next raw byte array for analysing unusual device fields
  getBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length);
    this.offset += length;
    return bytes;
  }

  seek(offset: number) {
    this.offset = offset;
  }

  getOffset(): number {
    return this.offset;
  }
}

export class BinaryWriter {
  private view: DataView;
  private offset: number = 0;

  constructor(length: number) {
    this.view = new DataView(new ArrayBuffer(length));
  }

  setUint8(value: number) {
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  setUint16(value: number, littleEndian: boolean = true) {
    this.view.setUint16(this.offset, value, littleEndian);
    this.offset += 2;
  }

  setUint32(value: number, littleEndian: boolean = true) {
    this.view.setUint32(this.offset, value, littleEndian);
    this.offset += 4;
  }

  setString(value: string, fixedLength: number, filler: number = 0xFF) {
    for (let i = 0; i < fixedLength; i++) {
      if (i < value.length) {
        this.view.setUint8(this.offset, value.charCodeAt(i));
      } else {
        this.view.setUint8(this.offset, filler);
      }
      this.offset += 1;
    }
  }

  setBytes(bytes: Uint8Array) {
    for (let i = 0; i < bytes.length; i++) {
      this.view.setUint8(this.offset, bytes[i]);
      this.offset += 1;
    }
  }

  seek(offset: number) {
    this.offset = offset;
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(this.view.buffer);
  }
}

// === Global helper functions for radio frequencies ===

/**
 * Converts an integer to BCD (Binary-Coded Decimal) format
 *
 * BCD encodes each decimal digit (0-9) in 4 bits. For example,
 * the number 42 is represented as 0x42 (0100 0010 in binary).
 *
 * @param val - Integer between 0-99
 * @returns BCD byte where each nibble represents a decimal digit
 * @throws RangeError if the value is outside the range 0-99
 * @example
 * intToBcd(42) // returns 0x42 (66 in decimal)
 * intToBcd(99) // returns 0x99 (153 in decimal)
 */
export function intToBcd(val: number): number {
  if (val < 0 || val > 99) {
    throw new RangeError(`intToBcd only accepts values 0-99, got ${val}`);
  }
  return ((Math.floor(val / 10) % 10) << 4) | (val % 10);
}

/**
 * Converts a BCD-encoded byte to an integer
 *
 * @param val - Byte in BCD format
 * @returns Decimal integer (0-99)
 * @example
 * bcdToInt(0x42) // returns 42
 * bcdToInt(0x99) // returns 99
 */
export function bcdToInt(val: number): number {
  const high = (val >> 4) & 0x0F;
  const low = val & 0x0F;

  // Validate that each nibble is a valid digit (0-9)
  if (high > 9 || low > 9) {
    throw new RangeError(`Invalid BCD value: 0x${val.toString(16)}`);
  }

  return high * 10 + low;
}

/**
 * Parses a 4-byte Little Endian BCD-encoded frequency
 *
 * UV-5R format: 4 BCD bytes representing frequency × 100000
 * Example: [0x00, 0x50, 0x45, 0x01] = 14550000 = 145.500000 MHz
 *
 * @param data - Buffer containing the data
 * @param offset - Starting position of the 4 frequency bytes
 * @returns Frequency string in MHz (format "XXX.XXXXXX")
 * @example
 * parseFreqBCD(buffer, 0x08) // "145.500000"
 */
export function parseFreqBCD(data: Uint8Array, offset: number): string {
  let val = 0;
  for (let i = 3; i >= 0; i--) {
    const byte = data[offset + i];
    val = val * 100 + bcdToInt(byte);
  }
  return (val / 100000).toFixed(6);
}

/**
 * Encodes a frequency into 4-byte BCD format
 *
 * @param freqStr - Frequency in MHz as a string (example: "145.500000")
 * @returns Uint8Array of 4 bytes in Little Endian BCD format
 * @example
 * encodeFreqBCD("145.500000") // Uint8Array([0x00, 0x50, 0x45, 0x01])
 */
export function encodeFreqBCD(freqStr: string): Uint8Array {
  // Convert "145.500000" → integer 14550000
  let val = Math.round(parseFloat(freqStr) * 100000);
  const arr = new Uint8Array(4);

  for (let i = 0; i < 4; i++) {
    const pair = val % 100;
    val = Math.floor(val / 100);
    arr[i] = intToBcd(pair);
  }

  return arr;
}
