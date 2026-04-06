import { UV5RRadio } from './uv5r';
import { UV5RMiniRadio } from './uv5rmini';
import { RT4DRadio } from './rt4d';
import { type IRadioDriver } from '../types';
import { SerialConnection } from '../serial';

export interface RadioModel {
  id: string;
  name: string;
  channelCount: number;
  driverClass: new (serial: SerialConnection) => IRadioDriver;
}

export const SUPPORTED_RADIOS: RadioModel[] = [
  { id: 'uv5r',     name: 'Baofeng UV-5R (and variants)',  channelCount: 128,  driverClass: UV5RRadio },
  { id: 'uv5rmini', name: 'Baofeng UV-5R MINI (999 CH)',   channelCount: 999,  driverClass: UV5RMiniRadio },
  { id: 'rt4d',     name: 'Radtel RT-4D (DMR)',            channelCount: 3072, driverClass: RT4DRadio },
];

export function getDriverClass(id: string): (new (serial: SerialConnection) => IRadioDriver) | undefined {
  return SUPPORTED_RADIOS.find(r => r.id === id)?.driverClass;
}
