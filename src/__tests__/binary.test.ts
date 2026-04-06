import { describe, it, expect } from 'vitest';
import { intToBcd, bcdToInt, parseFreqBCD, encodeFreqBCD } from '../lib/binary';

describe('Binary utilities', () => {
  describe('intToBcd', () => {
    it('converts integers to BCD correctly', () => {
      expect(intToBcd(0)).toBe(0x00);
      expect(intToBcd(42)).toBe(0x42);
      expect(intToBcd(99)).toBe(0x99);
      expect(intToBcd(25)).toBe(0x25);
    });

    it('throws on invalid input', () => {
      expect(() => intToBcd(100)).toThrow(RangeError);
      expect(() => intToBcd(-1)).toThrow(RangeError);
      expect(() => intToBcd(256)).toThrow(RangeError);
    });
  });

  describe('bcdToInt', () => {
    it('converts BCD to integers correctly', () => {
      expect(bcdToInt(0x00)).toBe(0);
      expect(bcdToInt(0x42)).toBe(42);
      expect(bcdToInt(0x99)).toBe(99);
      expect(bcdToInt(0x25)).toBe(25);
    });

    it('throws on invalid BCD values', () => {
      expect(() => bcdToInt(0xAA)).toThrow(RangeError); // A > 9
      expect(() => bcdToInt(0x1F)).toThrow(RangeError); // F > 9
    });
  });

  describe('parseFreqBCD', () => {
    it('parses UV-5R frequency format correctly', () => {
      // 145.500000 MHz = 14550000 = [0x00, 0x50, 0x45, 0x01]
      const buffer = new Uint8Array([0x00, 0x50, 0x45, 0x01]);
      expect(parseFreqBCD(buffer, 0)).toBe('145.500000');
    });

    it('parses VHF frequencies', () => {
      // 136.000000 MHz
      const buffer = new Uint8Array([0x00, 0x00, 0x60, 0x13]);
      expect(parseFreqBCD(buffer, 0)).toBe('136.000000');
    });

    it('parses UHF frequencies', () => {
      // 446.006250 MHz (PMR)
      const buffer = new Uint8Array([0x50, 0x62, 0x60, 0x44]);
      expect(parseFreqBCD(buffer, 0)).toBe('446.006250');
    });
  });

  describe('encodeFreqBCD', () => {
    it('encodes frequencies to BCD correctly', () => {
      const result = encodeFreqBCD('145.500000');
      expect(result).toEqual(new Uint8Array([0x00, 0x50, 0x45, 0x01]));
    });

    it('roundtrips with parseFreqBCD', () => {
      const frequencies = ['145.500000', '136.000000', '446.006250', '174.000000'];

      frequencies.forEach(freq => {
        const encoded = encodeFreqBCD(freq);
        const decoded = parseFreqBCD(encoded, 0);
        expect(decoded).toBe(freq);
      });
    });
  });
});
