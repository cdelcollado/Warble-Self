import { SerialConnection } from '../serial';
import type { MemoryChannel, IRadioDriver, SettingDef, GlobalSettings } from '../types';

function parseFreq(data: Uint8Array, offset: number): string {
  // 4 bytes Little Endian BCD. E.g. [0x00, 0x50, 0x45, 0x01] -> 145.500 MHz
  let val = 0;
  for (let i = 3; i >= 0; i--) {
    const b = data[offset + i];
    val = val * 100 + ((b >> 4) * 10) + (b & 0x0F);
  }
  return (val / 100000).toFixed(6);
}

export function decodeUV5R(data: Uint8Array): MemoryChannel[] {
  const channels: MemoryChannel[] = [];
  
  for (let i = 0; i < 128; i++) {
    const offset = 0x0008 + (i * 16);
    const nameOffset = 0x1008 + (i * 16);
    
    // First byte 0xFF means the indexed memory slot is unused
    if (data[offset] === 0xFF) continue;
    
    const rxFreqStr = parseFreq(data, offset);
    const txFreqStr = parseFreq(data, offset + 4);
    
    // Minimal viable parsing for 7-character channel names
    let name = "";
    for (let c = 0; c < 7; c++) {
      const charCode = data[nameOffset + c];
      if (charCode === 0xFF || charCode === 0x00) break;
      name += String.fromCharCode(charCode);
    }

    const rxFreq = parseFloat(rxFreqStr);
    const txFreq = parseFloat(txFreqStr);
    
    let duplex: 'None' | '+' | '-' | 'Split' = 'None';
    let offsetFreq = '0.000000';
    
    if (rxFreq === txFreq) {
      duplex = 'None';
    } else if (Math.abs(rxFreq - txFreq) > 70) {
      duplex = 'Split';
      offsetFreq = txFreqStr; // Split mode: stores TX directly when diff > 70 MHz
    } else {
      duplex = rxFreq > txFreq ? '-' : '+';
      offsetFreq = Math.abs(rxFreq - txFreq).toFixed(6);
    }

    // In v1 we only infer Low/High power from byte 14 as an approximate C bitfield
    const power = (data[offset + 14] & 0x03) === 1 ? 'Low' : 'High';
    
    // Wide/narrow mode (bit 6 of byte 15) is provisionally simplified to FM
    
    channels.push({
      index: i + 1, // 1-based index for human-readable UI
      name: name.trim(),
      frequency: rxFreqStr,
      duplex,
      offset: offsetFreq,
      toneMode: 'None', // TODO extract from tx/rx tone bytes 8~11
      tone: '88.5',
      toneSql: '88.5',
      dtcsCode: '023',
      rxDtcsCode: '023',
      dtcsPolarity: 'NN',
      mode: 'FM',
      power: power as 'High'|'Low',
      skip: false
    });
  }
  
  return channels;
}

function encodeFreq(freqStr: string): Uint8Array {
  // Converts "145.500000" -> integer 14550000 -> packed BCD [0x00, 0x00, 0x55, 0x14]
  let val = Math.round(parseFloat(freqStr) * 100000);
  const arr = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const pair = val % 100;
    val = Math.floor(val / 100);
    // BCD pack: fractional digit in high nibble, unit digit in low nibble
    arr[i] = ((Math.floor(pair / 10) << 4) & 0xF0) | (pair % 10);
  }
  return arr;
}

export function encodeUV5R(channels: MemoryChannel[], baseBuffer: Uint8Array): Uint8Array {
  // Clone the original radio map because hundreds of critical config bytes
  // outside the channel area must not be overwritten.
  const buf = new Uint8Array(baseBuffer);

  // Mark all 128 channels as empty first by writing 0xFF to their frequency
  // header bytes, ensuring any removed channels are properly cleared
  for (let i = 0; i < 128; i++) {
    const offset = 0x0008 + (i * 16);
    const nameOffset = 0x1008 + (i * 16);
    buf[offset] = 0xFF; 
    buf[offset + 1] = 0xFF;
    buf[offset + 2] = 0xFF;
    buf[offset + 3] = 0xFF;
    for (let c = 0; c < 7; c++) buf[nameOffset + c] = 0xFF;
  }

  // Write active channels from the grid
  for (const ch of channels) {
    if (ch.index < 1 || ch.index > 128) continue; // Skip out-of-range channels
    const i = ch.index - 1;
    const offset = 0x0008 + (i * 16);
    const nameOffset = 0x1008 + (i * 16);

    const rxFreq = parseFloat(ch.frequency);
    let txFreq = rxFreq;
    if (ch.duplex === '+') txFreq += parseFloat(ch.offset);
    else if (ch.duplex === '-') txFreq -= parseFloat(ch.offset);
    else if (ch.duplex === 'Split') txFreq = parseFloat(ch.offset);

    // RX/TX frequency data
    buf.set(encodeFreq(ch.frequency), offset);
    buf.set(encodeFreq(txFreq.toFixed(6)), offset + 4);

    // Set UHF/VHF bitfield: activate bit 3 if frequency is above 400 MHz
    const isUHF = rxFreq >= 400;
    if (isUHF) buf[offset + 12] |= 0x08;
    else buf[offset + 12] &= ~0x08;

    // Output Power (High/Low) — first two bits of byte 14
    buf[offset + 14] &= ~0x03; // Clear bits 0 and 1
    buf[offset + 14] |= ch.power === 'Low' ? 1 : 0; // Set 1 for LOW, 0 for HIGH

    // ASCII alphanumeric label — max 7 characters with null/FF padding
    const nameBytes = ch.name.substring(0, 7);
    for (let c = 0; c < 7; c++) {
      if (c < nameBytes.length) {
        buf[nameOffset + c] = nameBytes.charCodeAt(c);
      } else {
        buf[nameOffset + c] = 0xFF; // Pad remaining bytes with 0xFF
      }
    }
  }

  return buf;
}

export class UV5RRadio implements IRadioDriver {
  private serial: SerialConnection;
  private lastIdent: Uint8Array = new Uint8Array([0x50, 0xBB, 0xFF, 0x20, 0x12, 0x07, 0x25, 0x00]);

  get name() { return "Baofeng UV-5R"; }

  constructor(serial: SerialConnection) {
    this.serial = serial;
  }

  async connect(): Promise<void> {
    if (!this.serial.isConnected()) {
      await this.serial.connect(9600);
    }
  }
  
  async disconnect(): Promise<void> {
    await this.serial.disconnect();
  }

  /**
   * Initiates communication by putting the radio into "Clone Mode".
   */
  async identify(): Promise<boolean> {
    if (!this.serial.isConnected()) throw new Error("Radio not connected");
    
    const magics = [
      new Uint8Array([0x50, 0xBB, 0xFF, 0x20, 0x12, 0x07, 0x25]), // UV5R_291
      new Uint8Array([0x50, 0xBB, 0xFF, 0x01, 0x25, 0x98, 0x4D]), // UV5R_ORIG
      new Uint8Array([0x50, 0xBB, 0xFF, 0x20, 0x13, 0x01, 0x05])  // UV82_ORIG
    ];

    for (const magic of magics) {
      this.serial.clearBuffer();
      console.log("Trying magic:", magic);
      try {
         // Write byte by byte sequentially with a small inter-byte delay
         for (let i = 0; i < magic.length; i++) {
           await this.serial.write(new Uint8Array([magic[i]]));
           await new Promise(r => setTimeout(r, 10));
         }

         const ack1 = await this.serial.readBytes(1, 1500);
         if (ack1[0] !== 0x06) continue;

         // Respond with ACK to trigger the radio to send the firmware chip identifier
         await this.serial.write(new Uint8Array([0x02]));

         const response: number[] = [];
         for (let i = 0; i < 12; i++) {
           try {
             const b = await this.serial.readBytes(1, 500);
             response.push(b[0]);
             if (b[0] === 0xDD) break; // Occasional EOF of the ident string
           } catch {
             break; // Early timeout
           }
         }
         
         if (response.length === 12) {
           this.lastIdent = new Uint8Array([response[0], response[3], response[5], ...response.slice(7)]);
         } else {
           const id = new Uint8Array(8);
           id.set(response.slice(0, Math.min(response.length, 8)));
           this.lastIdent = id;
         }

         // Second ACK (acknowledging the received firmware ident)
         await this.serial.write(new Uint8Array([0x06]));
         const ack2 = await this.serial.readBytes(1, 1500);
         if (ack2[0] !== 0x06) continue;

         console.log("Handshake complete. Ident:", response);
         return true; // Match found — handshake successful

      } catch {
         console.warn("Handshake failed with this magic. Trying next.");
      }
    }
    
    return false; // No magic sequence matched
  }

  /**
   * Reads a raw block from the radio by sending the 'S' command and returning the chunk
   */
  private async readBlock(start: number, size: number, firstCommand: boolean = false): Promise<Uint8Array> {
    // Read block command '\x52' = 'S' followed by hi, lo address bytes and size
    const cmd = new Uint8Array([0x53, (start >> 8) & 0xFF, start & 0xFF, size]);
    await this.serial.write(cmd);

    if (!firstCommand) {
      // For all blocks except the first, the radio ACKs the end of the previous chunk first (\x06)
      const ack = await this.serial.readBytes(1, 1500);
      if (ack[0] !== 0x06) {
        throw new Error(`Radio refused to send block 0x${start.toString(16)}`);
      }
    }

    // Read confirmation header — must be '\x58' = 'X' followed by address bytes
    const answer = await this.serial.readBytes(4, 1500);
    if (answer[0] !== 0x58 || ((answer[1] << 8) | answer[2]) !== start || answer[3] !== size) {
      throw new Error(`Unexpected response from radio for block 0x${start.toString(16)}`);
    }

    // Read the actual block data
    const chunk = await this.serial.readBytes(size, 2000);
    if (chunk.length !== size) {
      throw new Error(`Radio sent incomplete block 0x${start.toString(16)}`);
    }

    // ACK to tell the radio we have received the block correctly
    await this.serial.write(new Uint8Array([0x06]));
    await new Promise(r => setTimeout(r, 50)); // Buffer stabilisation delay for radio CPU

    return chunk;
  }

  /**
   * Downloads (Read from Radio) the full memory map (0x1800 bytes for a typical UV-5R)
   */
  async readFromRadio(onProgress?: (percent: number) => void): Promise<Uint8Array> {
    const memorySize = 0x1800; // Standard UV-5R memory size
    const fullBuffer = new Uint8Array(memorySize + 8);
    
    this.serial.clearBuffer();
    
    const isCloneMode = await this.identify();
    if (!isCloneMode) {
      throw new Error("Handshake failed: could not enter Clone Mode. Check volume level and ensure the cable is fully inserted.");
    }
    
    fullBuffer.set(this.lastIdent, 0);

    let loaded = 0;
    for (let i = 0; i < memorySize; i += 0x40) {
      const isFirst = (i === 0);
      try {
        const chunk = await this.readBlock(i, 0x40, isFirst);
        fullBuffer.set(chunk, i + 8);
        loaded += 0x40;
        
        if (onProgress) onProgress((loaded / memorySize) * 100);
      } catch (err: any) {
        throw new Error(`Error reading block 0x${i.toString(16)}: ` + err.message);
      }
    }
    
    return fullBuffer;
  }

  decodeChannels(data: Uint8Array): MemoryChannel[] {
    return decodeUV5R(data);
  }

  encodeChannels(channels: MemoryChannel[], baseBuffer: Uint8Array): Uint8Array {
    return encodeUV5R(channels, baseBuffer);
  }

  getFrequencyLimits(): { min: number; max: number }[] {
    return [
      { min: 136, max: 174 },
      { min: 400, max: 520 }
    ];
  }

  getGlobalSettingsSchema(): SettingDef[] {
    return [
      { id: 'squelch', label: 'settings.squelch', type: 'number', min: 0, max: 9, step: 1, default: 5 },
      { id: 'step', label: 'settings.step', type: 'select', options: [
        {label: '2.5KHz', value: 0}, {label: '5.0KHz', value: 1}, {label: '6.25KHz', value: 2}, 
        {label: '10.0KHz', value: 3}, {label: '12.5KHz', value: 4}, {label: '25.0KHz', value: 5}
      ], default: 0 },
      { id: 'save', label: 'settings.save', type: 'select', options: [
        {label: 'Off', value: 0}, {label: '1:1', value: 1}, {label: '1:2', value: 2}, 
        {label: '1:3', value: 3}, {label: '1:4', value: 4}
      ], default: 3 },
      { id: 'vox', label: 'settings.vox', type: 'select', options: [
        {label: 'Off', value: 0}, {label: '1', value: 1}, {label: '2', value: 2}, 
        {label: '3', value: 3}, {label: '4', value: 4}, {label: '5', value: 5},
        {label: '6', value: 6}, {label: '7', value: 7}, {label: '8', value: 8},
        {label: '9', value: 9}, {label: '10', value: 10}
      ], default: 0 },
      { id: 'backlight', label: 'settings.backlight', type: 'number', min: 0, max: 10, step: 1, default: 5 },
      { id: 'tdr', label: 'settings.tdr', type: 'boolean', default: false },
      { id: 'beep', label: 'settings.beep', type: 'boolean', default: true },
      { id: 'timeout', label: 'settings.timeout', type: 'number', min: 0, max: 40, step: 1, default: 4 }, // 1 = 15s (15*4=60s)
      { id: 'voicePrompt', label: 'settings.voicePrompt', type: 'select', options: [{label: 'Off', value: 0}, {label: 'English', value: 1}, {label: 'Chinese', value: 2}], default: 1 },
      { id: 'bcl', label: 'settings.bcl', type: 'boolean', default: false },
      { id: 'autolk', label: 'settings.autolk', type: 'boolean', default: false },
      { id: 'sftd', label: 'settings.sftd', type: 'select', options: [{label: 'Off', value: 0}, {label: '+', value: 1}, {label: '-', value: 2}], default: 0 },
      { id: 'wtled', label: 'settings.wtled', type: 'select', options: [{label: 'Off', value: 0}, {label: 'Blue', value: 1}, {label: 'Orange', value: 2}, {label: 'Purple', value: 3}], default: 3 },
      { id: 'rxled', label: 'settings.rxled', type: 'select', options: [{label: 'Off', value: 0}, {label: 'Blue', value: 1}, {label: 'Orange', value: 2}, {label: 'Purple', value: 3}], default: 1 },
      { id: 'txled', label: 'settings.txled', type: 'select', options: [{label: 'Off', value: 0}, {label: 'Blue', value: 1}, {label: 'Orange', value: 2}, {label: 'Purple', value: 3}], default: 2 },
      { id: 'almod', label: 'settings.almod', type: 'select', options: [{label: 'Site', value: 0}, {label: 'Tone', value: 1}, {label: 'Code', value: 2}], default: 0 },
      { id: 'band', label: 'settings.band', type: 'select', options: [{label: 'VHF', value: 0}, {label: 'UHF', value: 1}], default: 0 },
      { id: 'tdrab', label: 'settings.tdrab', type: 'select', options: [{label: 'Off', value: 0}, {label: 'A', value: 1}, {label: 'B', value: 2}], default: 0 },
      { id: 'ste', label: 'settings.ste', type: 'boolean', default: true },
      { id: 'rpste', label: 'settings.rpste', type: 'number', min: 0, max: 10, step: 1, default: 5 },
      { id: 'rptrl', label: 'settings.rptrl', type: 'select', options: [
        {label: 'Off', value: 0}, {label: '1', value: 1}, {label: '2', value: 2}, 
        {label: '3', value: 3}, {label: '4', value: 4}, {label: '5', value: 5},
        {label: '6', value: 6}, {label: '7', value: 7}, {label: '8', value: 8},
        {label: '9', value: 9}, {label: '10', value: 10}
      ], default: 0 },
      { id: 'ponmsg', label: 'settings.ponmsg', type: 'select', options: [{label: 'Full', value: 0}, {label: 'Message', value: 1}], default: 0 },
      { id: 'roger', label: 'settings.roger', type: 'boolean', default: false },
      { id: 'workmode', label: 'settings.workmode', type: 'select', options: [{label: 'Frequency', value: 0}, {label: 'Channel', value: 1}], default: 1 }
    ];
  }

  decodeGlobalSettings(data: Uint8Array): GlobalSettings {
    const settings: GlobalSettings = {};
    if (data.length > 0x0E54) {
      settings.squelch = data[0x0E28];
      settings.step = data[0x0E29];
      settings.save = data[0x0E2B];
      settings.vox = data[0x0E2C];
      settings.backlight = data[0x0E2E];
      settings.tdr = data[0x0E2F] === 0x01;
      settings.beep = data[0x0E30] === 0x01;
      settings.timeout = data[0x0E31];
      settings.voicePrompt = data[0x0E36];
      // Skip various settings like pttid, pttlt, mdfa, mdfb that are rarely used or need more bits manipulation
      settings.bcl = data[0x0E3F] === 0x01;
      settings.autolk = data[0x0E40] === 0x01;
      settings.sftd = data[0x0E41];
      settings.wtled = data[0x0E45];
      settings.rxled = data[0x0E46];
      settings.txled = data[0x0E47];
      settings.almod = data[0x0E48];
      settings.band = data[0x0E49];
      settings.tdrab = data[0x0E4A];
      settings.ste = data[0x0E4B] === 0x01;
      settings.rpste = data[0x0E4C];
      settings.rptrl = data[0x0E4D];
      settings.ponmsg = data[0x0E4E];
      settings.roger = data[0x0E4F] === 0x01;
      settings.workmode = data[0x0E54];
    }
    return settings;
  }

  encodeGlobalSettings(settings: GlobalSettings, baseBuffer: Uint8Array): Uint8Array {
    const buf = new Uint8Array(baseBuffer);
    if (buf.length > 0x0E54) {
      if ('squelch' in settings) buf[0x0E28] = settings.squelch as number;
      if ('step' in settings) buf[0x0E29] = settings.step as number;
      if ('save' in settings) buf[0x0E2B] = settings.save as number;
      if ('vox' in settings) buf[0x0E2C] = settings.vox as number;
      if ('backlight' in settings) buf[0x0E2E] = settings.backlight as number;
      if ('tdr' in settings) buf[0x0E2F] = settings.tdr ? 0x01 : 0x00;
      if ('beep' in settings) buf[0x0E30] = settings.beep ? 0x01 : 0x00;
      if ('timeout' in settings) buf[0x0E31] = settings.timeout as number;
      if ('voicePrompt' in settings) buf[0x0E36] = settings.voicePrompt as number;
      
      if ('bcl' in settings) buf[0x0E3F] = settings.bcl ? 0x01 : 0x00;
      if ('autolk' in settings) buf[0x0E40] = settings.autolk ? 0x01 : 0x00;
      if ('sftd' in settings) buf[0x0E41] = settings.sftd as number;
      if ('wtled' in settings) buf[0x0E45] = settings.wtled as number;
      if ('rxled' in settings) buf[0x0E46] = settings.rxled as number;
      if ('txled' in settings) buf[0x0E47] = settings.txled as number;
      if ('almod' in settings) buf[0x0E48] = settings.almod as number;
      if ('band' in settings) buf[0x0E49] = settings.band as number;
      if ('tdrab' in settings) buf[0x0E4A] = settings.tdrab as number;
      if ('ste' in settings) buf[0x0E4B] = settings.ste ? 0x01 : 0x00;
      if ('rpste' in settings) buf[0x0E4C] = settings.rpste as number;
      if ('rptrl' in settings) buf[0x0E4D] = settings.rptrl as number;
      if ('ponmsg' in settings) buf[0x0E4E] = settings.ponmsg as number;
      if ('roger' in settings) buf[0x0E4F] = settings.roger ? 0x01 : 0x00;
      if ('workmode' in settings) buf[0x0E54] = settings.workmode as number;
    }
    return buf;
  }

  /**
   * Sends a write block to the radio using the 'X' command and waits for ACK
   */
  private async writeBlock(start: number, chunk: Uint8Array): Promise<void> {
    const size = chunk.length;
    const msg = new Uint8Array(4 + size);

    // Header 'X' (0x58), 2 address bytes and length
    msg[0] = 0x58;
    msg[1] = (start >> 8) & 0xFF;
    msg[2] = start & 0xFF;
    msg[3] = size & 0xFF;

    // Append the payload data
    msg.set(chunk, 4);

    await this.serial.write(msg);

    // Wait for ACK confirming the block was written correctly
    const ack = await this.serial.readBytes(1, 1500);
    if (ack[0] !== 0x06) {
      throw new Error(`Radio rejected block write at address 0x${start.toString(16)} (no ACK)`);
    }
    await new Promise(r => setTimeout(r, 10)); // I/O buffer stabilisation delay
  }

  /**
   * Uploads the JS buffer to the radio's EEPROM memory, respecting protected ranges
   */
  async writeToRadio(data: Uint8Array, onProgress?: (percent: number) => void): Promise<void> {
    if (!this.serial.isConnected()) throw new Error("Radio not connected for writing");

    const isCloneMode = await this.identify();
    if (!isCloneMode) {
      throw new Error("Could not enter Clone Mode for writing.");
    }

    // Skip the 0x0CF0-0x0D00 region as per stable Baofeng community implementations
    const ranges = [
      { start: 0x0008, end: 0x0CF8 },
      { start: 0x0D08, end: 0x0DF8 },
      { start: 0x0E08, end: 0x1808 }
    ];

    const totalBytes = ranges.reduce((acc, r) => acc + (r.end - r.start), 0);
    let writingIdx = 0;
    
    this.serial.clearBuffer();

    for (const range of ranges) {
      for (let i = range.start; i < range.end; i += 0x10) { 
        // UV-5R series EEPROM writes are done in 16-byte (0x10) sub-blocks for safety
        const chunk = data.subarray(i, i + 0x10);
        
        try {
          await this.writeBlock(i - 0x08, chunk);
          writingIdx += 0x10;
          if (onProgress) onProgress((writingIdx / totalBytes) * 100);
        } catch (err: any) {
          throw new Error(`Error writing to radio (address 0x${(i - 0x08).toString(16)}): ` + err.message);
        }
      }
    }
  }
}
