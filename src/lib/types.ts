export interface MemoryChannel {
  index: number;
  name: string;
  frequency: string;
  duplex: 'None' | '+' | '-' | 'Split';
  offset: string;
  toneMode: 'None' | 'Tone' | 'TSQL' | 'DTCS' | 'Cross';
  tone: string;
  toneSql: string;
  dtcsCode: string;
  rxDtcsCode: string;
  dtcsPolarity: 'NN' | 'NR' | 'RN' | 'RR';
  mode: 'FM' | 'NFM' | 'AM' | 'DMR';
  power: 'High' | 'Low';
  skip: boolean;
  distance?: number;    // Calculated via RepeaterBook when the user provides geolocation
  timeslot?: 1 | 2;    // DMR: timeslot (1 o 2)
  contactIndex?: number; // DMR: contact/TalkGroup index (until the name table is decoded)
}

export const defaultChannels: MemoryChannel[] = [
  {
    index: 1,
    name: "CALL",
    frequency: "145.500000",
    duplex: "None",
    offset: "0.000000",
    toneMode: "None",
    tone: "88.5",
    toneSql: "88.5",
    dtcsCode: "023",
    rxDtcsCode: "023",
    dtcsPolarity: "NN",
    mode: "FM",
    power: "High",
    skip: false
  },
  {
    index: 2,
    name: "R1",
    frequency: "145.625000",
    duplex: "-",
    offset: "0.600000",
    toneMode: "Tone",
    tone: "114.8",
    toneSql: "88.5",
    dtcsCode: "023",
    rxDtcsCode: "023",
    dtcsPolarity: "NN",
    mode: "FM",
    power: "High",
    skip: false
  },
  {
    index: 3,
    name: "PMR 1",
    frequency: "446.006250",
    duplex: "None",
    offset: "0.000000",
    toneMode: "None",
    tone: "88.5",
    toneSql: "88.5",
    dtcsCode: "023",
    rxDtcsCode: "023",
    dtcsPolarity: "NN",
    mode: "NFM",
    power: "Low",
    skip: false
  }
];

export interface SettingDef {
  id: string;          // Unique key (e.g. 'squelch')
  label: string;       // Translatable display label
  type: 'select' | 'boolean' | 'number';
  options?: { label: string; value: any }[]; // Only for 'select'
  min?: number;        // Only for 'number'
  max?: number;        // Only for 'number'
  step?: number;       // Only for 'number'
  default?: any;
}

export interface GlobalSettings {
  [key: string]: any;
  squelch?: number;
  step?: number;
  save?: number;
  vox?: number;
  backlight?: number; // TDR in UI but mapped to abr (0x0E2E)
  tdr?: boolean;
  beep?: boolean;
  timeout?: number;
  voicePrompt?: number;
  dtmfst?: number;
  pttid?: number;
  pttlt?: number;
  mdfa?: number;
  mdfb?: number;
  bcl?: boolean;
  autolk?: boolean;
  sftd?: number;
  wtled?: number;
  rxled?: number;
  txled?: number;
  almod?: number;
  band?: number;
  tdrab?: number;
  ste?: boolean;
  rpste?: number;
  rptrl?: number;
  ponmsg?: number;
  roger?: boolean;
  workmode?: number;

  // UV-5R MINI / UV17Pro specific settings
  savemode?: number;       // Battery save mode (0=Off, 1=On)
  dualstandby?: number;    // Dual watch (0=Off, 1=On)
  tot?: number;            // Timeout timer (0=Off, 1-12=15-180 sec)
  beepmode?: number;       // Beep mode for UV-5R MINI (0=Off, 1=Beep, 2=Voice, 3=Both)
  voicesw?: boolean;       // Enable voice prompts
  voice?: number;          // Voice language (0=English, 1=Chinese)
  sidetone?: number;       // Side tone (0-3)
  scanmode?: number;       // Scan mode (0=Time, 1=Carrier, 2=Search)
  chadistype?: number;     // Channel A display type (0=Name, 1=Freq, 2=Ch#)
  chbdistype?: number;     // Channel B display type (0=Name, 1=Freq, 2=Ch#)
  autolock?: boolean;      // Key auto lock
  alarmmode?: number;      // Alarm mode (0=Local, 1=Send Tone, 2=Send Code)
  alarmtone?: boolean;     // Sound alarm
  tailclear?: boolean;     // Tail clear
  chaworkmode?: number;    // Channel A work mode (0=Frequency, 1=Channel)
  chbworkmode?: number;    // Channel B work mode (0=Frequency, 1=Channel)
  fmenable?: boolean;      // Disable FM radio
  keylock?: boolean;       // Key lock
  powerondistype?: number; // Power on display type (0=LOGO, 1=BATT voltage)
  menuquittime?: number;   // Menu quit timer (0-10 = 5-60 sec)
}

export interface IRadioDriver {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  readFromRadio(onProgress?: (percent: number) => void): Promise<Uint8Array>;
  writeToRadio(data: Uint8Array, onProgress?: (percent: number) => void): Promise<void>;
  
  decodeChannels(data: Uint8Array): MemoryChannel[];
  encodeChannels(channels: MemoryChannel[], baseBuffer: Uint8Array): Uint8Array;
  
  getFrequencyLimits(): { min: number; max: number }[];
  
  getGlobalSettingsSchema(): SettingDef[];
  decodeGlobalSettings(data: Uint8Array): GlobalSettings;
  encodeGlobalSettings(settings: GlobalSettings, baseBuffer: Uint8Array): Uint8Array;
}
