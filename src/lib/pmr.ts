import type { MemoryChannel } from './types';

export const pmr446Channels = [
  { frequency: "446.006250", name: "PMR 1" },
  { frequency: "446.018750", name: "PMR 2" },
  { frequency: "446.031250", name: "PMR 3" },
  { frequency: "446.043750", name: "PMR 4" },
  { frequency: "446.056250", name: "PMR 5" },
  { frequency: "446.068750", name: "PMR 6" },
  { frequency: "446.081250", name: "PMR 7" },
  { frequency: "446.093750", name: "PMR 8" },
  { frequency: "446.106250", name: "PMR 9" },
  { frequency: "446.118750", name: "PMR 10" },
  { frequency: "446.131250", name: "PMR 11" },
  { frequency: "446.143750", name: "PMR 12" },
  { frequency: "446.156250", name: "PMR 13" },
  { frequency: "446.168750", name: "PMR 14" },
  { frequency: "446.181250", name: "PMR 15" },
  { frequency: "446.193750", name: "PMR 16" }
];

export function getPmr446Channels(startingIndex: number): MemoryChannel[] {
  return pmr446Channels.map((ch, idx) => ({
    index: startingIndex + idx,
    frequency: ch.frequency,
    name: ch.name,
    toneMode: "None",
    tone: "88.5",
    toneSql: "88.5",
    dtcsCode: "023",
    rxDtcsCode: "023",
    dtcsPolarity: "NN",
    duplex: "None",
    offset: "0.000000",
    mode: "NFM",
    power: "Low",
    skip: false
  }));
}
