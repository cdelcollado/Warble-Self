import { type IRadioDriver, type MemoryChannel, type SettingDef, type GlobalSettings, defaultChannels } from '../types';
import { SerialConnection } from '../serial';

export class UV5RMiniRadio implements IRadioDriver {
  public readonly name = "Baofeng UV-5R MINI";
  public readonly id = "uv5rmini";

  private serial: SerialConnection;

  constructor(serial: SerialConnection) {
    this.serial = serial;
  }

  private MEM_STARTS = [0x0000, 0x9000, 0xA000];
  private MEM_SIZES = [0x8040, 0x0040, 0x01C0];
  private MEM_TOTAL = 0x8240;
  private BLOCK_SIZE = 0x40;

  async connect(): Promise<void> {
    if (!this.serial.isConnected()) {
      await this.serial.connect(115200);
    }
  }

  async disconnect(): Promise<void> {
    await this.serial.disconnect();
  }

  private crypt(buffer: Uint8Array): Uint8Array {
    const symbol = new Uint8Array([67, 79, 32, 55]); // b"CO 7" at index 1
    const dec = new Uint8Array(buffer.length);
    let idx1 = 0;
    for (let i = 0; i < buffer.length; i++) {
        const charBuf = buffer[i];
        const charSym = symbol[idx1];
        const doCrypt = (charSym !== 32) && (charBuf !== 0) && (charBuf !== 255) &&
                        (charBuf !== charSym) && (charBuf !== (charSym ^ 255));
        
        dec[i] = doCrypt ? (charBuf ^ charSym) : charBuf;
        idx1 = (idx1 + 1) % 4;
    }
    return dec;
  }

  private makeHeader(command: string, address: number, length: number): Uint8Array {
      const buf = new Uint8Array(4);
      buf[0] = command.charCodeAt(0);
      buf[1] = (address >> 8) & 0xFF;
      buf[2] = address & 0xFF;
      buf[3] = length;
      return buf;
  }

  private async doIdent(): Promise<void> {
    this.serial.clearBuffer();
    const identParams = new Uint8Array([80, 82, 79, 71, 82, 65, 77, 67, 79, 76, 79, 82, 80, 82, 79, 85]); // b"PROGRAMCOLORPROU"
    await this.serial.write(identParams);
    const ack = await this.serial.readBytes(1, 2000);
    if (ack[0] !== 0x06) throw new Error("No fingerprint received from Mini");

    // Magic sequences
    await this.serial.write(new Uint8Array([0x46]));
    await this.serial.readBytes(16, 2000);

    await this.serial.write(new Uint8Array([0x4d]));
    await this.serial.readBytes(15, 2000);
    
    // Third (long) magic sequence
    const magic3 = new Uint8Array([0x53, 0x45, 0x4E, 0x44, 0x21, 0x05, 0x0D, 0x01, 0x01, 0x01, 0x04, 0x11, 0x08, 0x05, 0x0D, 0x0D, 0x01, 0x11, 0x0F, 0x09, 0x12, 0x09, 0x10, 0x04, 0x00]);
    await this.serial.write(magic3);
    await this.serial.readBytes(1, 2000);
  }

  async readFromRadio(onProgress?: (percent: number) => void): Promise<Uint8Array> {
    await this.doIdent();
    
    const data = new Uint8Array(this.MEM_TOTAL);
    let offset = 0;
    
    for (let i = 0; i < this.MEM_SIZES.length; i++) {
        const size = this.MEM_SIZES[i];
        const start = this.MEM_STARTS[i];
        
        for (let addr = start; addr < start + size; addr += this.BLOCK_SIZE) {
            const req = this.makeHeader("R", addr, this.BLOCK_SIZE);
            await this.serial.write(req);
            
            // Receive RX BLOCK (header + payload)
            const rxBlock = await this.serial.readBytes(this.BLOCK_SIZE + 4, 2000);
            const payload = rxBlock.subarray(4); // Remove headers
            
            // Encryption enabled by default (_uses_encr = True)
            const decrypted = this.crypt(payload);
            data.set(decrypted, offset);
            offset += this.BLOCK_SIZE;
            
            if (onProgress) onProgress(Math.min(100, Math.round((offset / this.MEM_TOTAL) * 100)));
        }
    }
    return data;
  }

  async writeToRadio(data: Uint8Array, onProgress?: (percent: number) => void): Promise<void> {
    await this.doIdent();
    
    let offset = 0;
    for (let i = 0; i < this.MEM_SIZES.length; i++) {
        const size = this.MEM_SIZES[i];
        const start = this.MEM_STARTS[i];
        
        for (let addr = start; addr < start + size; addr += this.BLOCK_SIZE) {
            const rawPayload = data.subarray(offset, offset + this.BLOCK_SIZE);
            const encrypted = this.crypt(rawPayload); 
            
            const req = new Uint8Array(4 + this.BLOCK_SIZE);
            req.set(this.makeHeader("W", addr, this.BLOCK_SIZE), 0);
            req.set(encrypted, 4);
            
            await this.serial.write(req);
            const ack = await this.serial.readBytes(1, 2000);
            if (ack[0] !== 0x06) throw new Error("Write rejected by radio");
            
            offset += this.BLOCK_SIZE;
            if (onProgress) onProgress(Math.min(100, Math.round((offset / this.MEM_TOTAL) * 100)));
        }
    }
  }

  // BCD conversion utils
  private decodeFreq(bcd: Uint8Array): string {
    if (bcd.length !== 4) return "";
    let s = "";
    for (let i = 3; i >= 0; i--) { // LBCD format
      s += (bcd[i] >> 4).toString() + (bcd[i] & 0x0F).toString();
    }
    // Expected to be something like 43300000 -> 433.00000
    const val = parseInt(s, 10);
    if (isNaN(val) || val === 0 || s === "FFFFFFFF") return "";
    return (val / 100000).toFixed(6);
  }

  private encodeFreq(freqStr: string): Uint8Array {
      if (!freqStr || freqStr === "") return new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
      
      const val = Math.round(parseFloat(freqStr) * 100000); // 433.000 -> 43300000
      const s = val.toString().padStart(8, '0');
      
      const bcd = new Uint8Array(4);
      for (let i = 0; i < 4; i++) {
          const pair = s.substr(i*2, 2);
          bcd[3 - i] = parseInt(pair, 16); // little endian byte order
      }
      return bcd;
  }

  decodeChannels(data: Uint8Array): MemoryChannel[] {
    const channels: MemoryChannel[] = [];
    const maxChannels = 999; 
    
    for (let i = 0; i < maxChannels; i++) {
      const offset = i * 32;
      const fBytes = data.subarray(offset, offset + 4);
      if (fBytes[0] === 0xFF && fBytes[1] === 0xFF) continue; // Empty
      
      const rxFreq = this.decodeFreq(data.subarray(offset, offset + 4));
      if (!rxFreq || rxFreq === "0.000000") continue;
      
      const txFreq = this.decodeFreq(data.subarray(offset + 4, offset + 8));
      
      let duplex: "None" | "+" | "-" | "Split" = "None";
      let shift = "0.000000";
      
      if (txFreq && txFreq !== rxFreq) {
          const rxNum = parseFloat(rxFreq);
          const txNum = parseFloat(txFreq);
          if (txNum > rxNum) { duplex = "+"; shift = (txNum - rxNum).toFixed(6); }
          else { duplex = "-"; shift = (rxNum - txNum).toFixed(6); }
      }

      const flags = data[15]; // wide, bcl, scan... 
      const bclStr = ((flags >> 3) & 1) === 1 ? 'true' : 'false';
      const wide = ((flags >> 0) & 1) === 0; // usually bit 0, 0=wide, 1=narrow

      // Extreure Nom del Canal
      const nameBytes = data.subarray(offset + 20, offset + 32);
      let name = "";
      for (let j = 0; j < 12; j++) {
         if (nameBytes[j] === 0xFF || nameBytes[j] === 0x00) break;
         name += String.fromCharCode(nameBytes[j]);
      }

      channels.push({
        index: i + 1,
        name: name.trim(),
        frequency: rxFreq,
        duplex,
        offset: shift,
        toneMode: "None", // Simplifying tones for now
        tone: "88.5",
        toneSql: "88.5",
        dtcsCode: "023",
        rxDtcsCode: bclStr ? "023" : "023",
        dtcsPolarity: "NN",
        mode: wide ? "FM" : "NFM",
        power: "High",
        skip: false
      });
    }
    
    // Per defecte posem canals buits per comoditat de la llista
    if (channels.length === 0) return defaultChannels;
    return channels;
  }

  encodeChannels(channels: MemoryChannel[], baseBuffer: Uint8Array): Uint8Array {
      const out = new Uint8Array(baseBuffer);
      for (let i = 0; i < 999; i++) {
          const offset = i * 32;
          // Esborra primer manualment per FFFF...
          out.fill(0xFF, offset, offset + 32);
      }
      
      for (const ch of channels) {
          if (ch.index < 1 || ch.index > 999) continue;
          const offset = (ch.index - 1) * 32;
          
          out.set(this.encodeFreq(ch.frequency), offset);
          
          let txString = ch.frequency;
          if (ch.duplex === '+') txString = (parseFloat(ch.frequency) + parseFloat(ch.offset)).toFixed(6);
          if (ch.duplex === '-') txString = (parseFloat(ch.frequency) - parseFloat(ch.offset)).toFixed(6);
          out.set(this.encodeFreq(txString), offset + 4);
          
          out[offset + 14] = 0; // Scramble i altres buits
          
          let flags = 0; // bitmask
          if (ch.mode === "NFM") flags |= (1 << 0); // Not wide
          out[offset + 15] = flags;
          
          if (ch.name) {
              for (let n = 0; n < Math.min(12, ch.name.length); n++) {
                  out[offset + 20 + n] = ch.name.charCodeAt(n);
              }
          }
      }
      return out;
  }

  getFrequencyLimits(): { min: number; max: number; }[] {
    return [
      { min: 108, max: 136 },   // Airband
      { min: 136, max: 174 },   // VHF
      { min: 350, max: 390 },   // UHF1
      { min: 400, max: 480 },   // UHF2
      { min: 480, max: 520 }    // UHF3
    ];
  }

  getGlobalSettingsSchema(): SettingDef[] {
    return [
      // Basic Settings
      { id: 'squelch', label: 'settings.squelch', type: 'select', options: [
        {label: 'Off', value: 0}, {label: '1', value: 1}, {label: '2', value: 2},
        {label: '3', value: 3}, {label: '4', value: 4}, {label: '5', value: 5}
      ], default: 0 },
      { id: 'savemode', label: 'settings.savemode', type: 'select', options: [
        {label: 'Off', value: 0}, {label: 'On', value: 1}
      ], default: 1 },
      { id: 'vox', label: 'settings.vox', type: 'select', options: [
        {label: 'Off', value: 0}, {label: '1', value: 1}, {label: '2', value: 2},
        {label: '3', value: 3}, {label: '4', value: 4}, {label: '5', value: 5},
        {label: '6', value: 6}, {label: '7', value: 7}, {label: '8', value: 8}, {label: '9', value: 9}
      ], default: 0 },
      { id: 'backlight', label: 'settings.backlight', type: 'select', options: [
        {label: 'Always On', value: 0}, {label: '5 sec', value: 1}, {label: '10 sec', value: 2},
        {label: '15 sec', value: 3}, {label: '20 sec', value: 4}
      ], default: 0 },
      { id: 'dualstandby', label: 'settings.dualstandby', type: 'select', options: [
        {label: 'Off', value: 0}, {label: 'On', value: 1}
      ], default: 1 },
      { id: 'tot', label: 'settings.tot', type: 'select', options: [
        {label: 'Off', value: 0}, {label: '15 sec', value: 1}, {label: '30 sec', value: 2},
        {label: '45 sec', value: 3}, {label: '60 sec', value: 4}, {label: '75 sec', value: 5},
        {label: '90 sec', value: 6}, {label: '105 sec', value: 7}, {label: '120 sec', value: 8},
        {label: '135 sec', value: 9}, {label: '150 sec', value: 10}, {label: '165 sec', value: 11}, {label: '180 sec', value: 12}
      ], default: 3 },
      { id: 'beepmode', label: 'settings.beep', type: 'select', options: [
        {label: 'Off', value: 0}, {label: 'Beep', value: 1}, {label: 'Voice', value: 2}, {label: 'Both', value: 3}
      ], default: 1 },
      { id: 'voicesw', label: 'settings.voicesw', type: 'boolean', default: true },
      { id: 'voice', label: 'settings.voice', type: 'select', options: [
        {label: 'English', value: 0}, {label: 'Chinese', value: 1}
      ], default: 0 },
      { id: 'autolock', label: 'settings.autolock', type: 'boolean', default: false },
      { id: 'roger', label: 'settings.roger', type: 'boolean', default: false },

      // Display Settings
      { id: 'chadistype', label: 'settings.chadistype', type: 'select', options: [
        {label: 'Name', value: 0}, {label: 'Frequency', value: 1}, {label: 'Channel Number', value: 2}
      ], default: 0 },
      { id: 'chbdistype', label: 'settings.chbdistype', type: 'select', options: [
        {label: 'Name', value: 0}, {label: 'Frequency', value: 1}, {label: 'Channel Number', value: 2}
      ], default: 0 },
      { id: 'powerondistype', label: 'settings.powerondistype', type: 'select', options: [
        {label: 'LOGO', value: 0}, {label: 'BATT voltage', value: 1}
      ], default: 0 },

      // Advanced Settings
      { id: 'scanmode', label: 'settings.scanmode', type: 'select', options: [
        {label: 'Time', value: 0}, {label: 'Carrier', value: 1}, {label: 'Search', value: 2}
      ], default: 0 },
      { id: 'alarmmode', label: 'settings.alarmmode', type: 'select', options: [
        {label: 'Local', value: 0}, {label: 'Send Tone', value: 1}, {label: 'Send Code', value: 2}
      ], default: 0 },
      { id: 'alarmtone', label: 'settings.alarmtone', type: 'boolean', default: false },
      { id: 'tailclear', label: 'settings.tailclear', type: 'boolean', default: false },
      { id: 'sidetone', label: 'settings.sidetone', type: 'select', options: [
        {label: 'Off', value: 0}, {label: 'KB Side Tone', value: 1},
        {label: 'ANI Side Tone', value: 2}, {label: 'KB + ANI Side Tone', value: 3}
      ], default: 0 },
      { id: 'menuquittime', label: 'settings.menuquittime', type: 'select', options: [
        {label: '5 sec', value: 0}, {label: '10 sec', value: 1}, {label: '15 sec', value: 2},
        {label: '20 sec', value: 3}, {label: '25 sec', value: 4}, {label: '30 sec', value: 5},
        {label: '35 sec', value: 6}, {label: '40 sec', value: 7}, {label: '45 sec', value: 8},
        {label: '50 sec', value: 9}, {label: '60 sec', value: 10}
      ], default: 1 },

      // Work Mode Settings
      { id: 'chaworkmode', label: 'settings.chaworkmode', type: 'select', options: [
        {label: 'Frequency', value: 0}, {label: 'Channel', value: 1}
      ], default: 1 },
      { id: 'chbworkmode', label: 'settings.chbworkmode', type: 'select', options: [
        {label: 'Frequency', value: 0}, {label: 'Channel', value: 1}
      ], default: 1 },

      // Other Settings
      { id: 'fmenable', label: 'settings.fmenable', type: 'boolean', default: false },
      { id: 'keylock', label: 'settings.keylock', type: 'boolean', default: false }
    ];
  }

  decodeGlobalSettings(data: Uint8Array): GlobalSettings {
    const settings: GlobalSettings = {};

    // Settings are stored at offset 0x8000 + 0x40 (after VFO A and B)
    // Based on UV17Pro structure (reverse-engineered from baofeng_uv17Pro.py)
    const settingsOffset = 0x8000 + 0x40;

    if (data.length > settingsOffset + 60) {
      settings.squelch = data[settingsOffset + 0];           // 0x8040
      settings.savemode = data[settingsOffset + 1];          // 0x8041
      settings.vox = data[settingsOffset + 2];               // 0x8042
      settings.backlight = data[settingsOffset + 3];         // 0x8043
      settings.dualstandby = data[settingsOffset + 4];       // 0x8044
      settings.tot = data[settingsOffset + 5];               // 0x8045
      settings.beepmode = data[settingsOffset + 6];          // 0x8046
      settings.voicesw = data[settingsOffset + 7] === 0x01;  // 0x8047
      settings.voice = data[settingsOffset + 8];             // 0x8048
      settings.sidetone = data[settingsOffset + 9];          // 0x8049
      settings.scanmode = data[settingsOffset + 10];         // 0x804A
      // Skip pttid at offset 11
      // Skip pttdly at offset 12
      settings.chadistype = data[settingsOffset + 13];       // 0x804D
      settings.chbdistype = data[settingsOffset + 14];       // 0x804E
      // Skip bcl at offset 15
      settings.autolock = data[settingsOffset + 16] === 0x01; // 0x8050
      settings.alarmmode = data[settingsOffset + 17];        // 0x8051
      settings.alarmtone = data[settingsOffset + 18] === 0x01; // 0x8052
      // Skip unknown1 at offset 19
      settings.tailclear = data[settingsOffset + 20] === 0x01; // 0x8054
      // Skip rpttailclear, rpttaildet at offsets 21-22
      settings.roger = data[settingsOffset + 23] === 0x01;   // 0x8057
      // Skip a_or_b_selected at offset 24
      settings.fmenable = data[settingsOffset + 25] === 0x01; // 0x8059

      // Work mode is packed in one byte (4 bits each)
      const workmodeByte = data[settingsOffset + 26];        // 0x805A
      settings.chbworkmode = (workmodeByte >> 4) & 0x0F;
      settings.chaworkmode = workmodeByte & 0x0F;

      settings.keylock = data[settingsOffset + 27] === 0x01; // 0x805B
      settings.powerondistype = data[settingsOffset + 28];   // 0x805C
      // Skip tone at offset 29
      // Skip unknown4[2] at offsets 30-31
      // Skip voxdlytime at offset 32
      settings.menuquittime = data[settingsOffset + 33];     // 0x8061
    }

    return settings;
  }

  encodeGlobalSettings(settings: GlobalSettings, baseBuffer: Uint8Array): Uint8Array {
    const buf = new Uint8Array(baseBuffer);
    const settingsOffset = 0x8000 + 0x40;

    if (buf.length > settingsOffset + 60) {
      if ('squelch' in settings) buf[settingsOffset + 0] = settings.squelch as number;
      if ('savemode' in settings) buf[settingsOffset + 1] = settings.savemode as number;
      if ('vox' in settings) buf[settingsOffset + 2] = settings.vox as number;
      if ('backlight' in settings) buf[settingsOffset + 3] = settings.backlight as number;
      if ('dualstandby' in settings) buf[settingsOffset + 4] = settings.dualstandby as number;
      if ('tot' in settings) buf[settingsOffset + 5] = settings.tot as number;
      if ('beepmode' in settings) buf[settingsOffset + 6] = settings.beepmode as number;
      if ('voicesw' in settings) buf[settingsOffset + 7] = settings.voicesw ? 0x01 : 0x00;
      if ('voice' in settings) buf[settingsOffset + 8] = settings.voice as number;
      if ('sidetone' in settings) buf[settingsOffset + 9] = settings.sidetone as number;
      if ('scanmode' in settings) buf[settingsOffset + 10] = settings.scanmode as number;
      if ('chadistype' in settings) buf[settingsOffset + 13] = settings.chadistype as number;
      if ('chbdistype' in settings) buf[settingsOffset + 14] = settings.chbdistype as number;
      if ('autolock' in settings) buf[settingsOffset + 16] = settings.autolock ? 0x01 : 0x00;
      if ('alarmmode' in settings) buf[settingsOffset + 17] = settings.alarmmode as number;
      if ('alarmtone' in settings) buf[settingsOffset + 18] = settings.alarmtone ? 0x01 : 0x00;
      if ('tailclear' in settings) buf[settingsOffset + 20] = settings.tailclear ? 0x01 : 0x00;
      if ('roger' in settings) buf[settingsOffset + 23] = settings.roger ? 0x01 : 0x00;
      if ('fmenable' in settings) buf[settingsOffset + 25] = settings.fmenable ? 0x01 : 0x00;

      // Work mode packed byte
      if ('chaworkmode' in settings || 'chbworkmode' in settings) {
        const chamode = ('chaworkmode' in settings) ? settings.chaworkmode as number : 1;
        const chbmode = ('chbworkmode' in settings) ? settings.chbworkmode as number : 1;
        buf[settingsOffset + 26] = ((chbmode & 0x0F) << 4) | (chamode & 0x0F);
      }

      if ('keylock' in settings) buf[settingsOffset + 27] = settings.keylock ? 0x01 : 0x00;
      if ('powerondistype' in settings) buf[settingsOffset + 28] = settings.powerondistype as number;
      if ('menuquittime' in settings) buf[settingsOffset + 33] = settings.menuquittime as number;
    }

    return buf;
  }
}

function decodeMiniFreq(bcd: Uint8Array): string {
  if (bcd.length !== 4) return "";
  let s = "";
  for (let i = 3; i >= 0; i--) {
    s += (bcd[i] >> 4).toString() + (bcd[i] & 0x0F).toString();
  }
  const val = parseInt(s, 10);
  if (isNaN(val) || val === 0 || s === "FFFFFFFF") return "";
  return (val / 100000).toFixed(6);
}

export function decodeUV5RMini(data: Uint8Array): MemoryChannel[] {
  const channels: MemoryChannel[] = [];
  for (let i = 0; i < 999; i++) {
    const offset = i * 32;
    const fBytes = data.subarray(offset, offset + 4);
    if (fBytes[0] === 0xFF && fBytes[1] === 0xFF) continue;
    const rxFreq = decodeMiniFreq(data.subarray(offset, offset + 4));
    if (!rxFreq || rxFreq === "0.000000") continue;
    const txFreq = decodeMiniFreq(data.subarray(offset + 4, offset + 8));
    let duplex: "None" | "+" | "-" | "Split" = "None";
    let shift = "0.000000";
    if (txFreq && txFreq !== rxFreq) {
      const rxNum = parseFloat(rxFreq);
      const txNum = parseFloat(txFreq);
      if (txNum > rxNum) { duplex = "+"; shift = (txNum - rxNum).toFixed(6); }
      else { duplex = "-"; shift = (rxNum - txNum).toFixed(6); }
    }
    const flags = data[offset + 15];
    const wide = ((flags >> 0) & 1) === 0;
    const nameBytes = data.subarray(offset + 20, offset + 32);
    let name = "";
    for (let j = 0; j < 12; j++) {
      if (nameBytes[j] === 0xFF || nameBytes[j] === 0x00) break;
      name += String.fromCharCode(nameBytes[j]);
    }
    channels.push({
      index: i + 1,
      name: name.trim(),
      frequency: rxFreq,
      duplex,
      offset: shift,
      toneMode: "None",
      tone: "88.5",
      toneSql: "88.5",
      dtcsCode: "023",
      rxDtcsCode: "023",
      dtcsPolarity: "NN",
      mode: wide ? "FM" : "NFM",
      power: "High",
      skip: false,
    });
  }
  if (channels.length === 0) return defaultChannels;
  return channels;
}
