import { describe, it, expect } from 'vitest';
import {
  validateFileSize,
  sanitizeHtml,
  sanitizeChannelName,
  escapeCsvField,
  validateFrequency,
  validateImgBuffer,
  MAX_FILE_SIZE
} from '../lib/security';

describe('Security utilities', () => {
  describe('validateFileSize', () => {
    it('accepts files within size limit', () => {
      const smallBuffer = new Uint8Array(1024); // 1KB
      expect(validateFileSize(smallBuffer)).toBe(true);
    });

    it('rejects files exceeding size limit', () => {
      const hugeBuffer = new Uint8Array(MAX_FILE_SIZE + 1);
      expect(() => validateFileSize(hugeBuffer)).toThrow();
    });
  });

  describe('sanitizeHtml', () => {
    it('escapes HTML entities', () => {
      expect(sanitizeHtml('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeHtml('"test"')).toBe('&quot;test&quot;');
      expect(sanitizeHtml("'test'")).toBe('&#39;test&#39;');
      expect(sanitizeHtml('a & b')).toBe('a &amp; b');
    });

    it('handles XSS attempts', () => {
      const xss = '<script>alert("xss")</script>';
      const safe = sanitizeHtml(xss);
      expect(safe).not.toContain('<script>');
      expect(safe).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('leaves safe text unchanged', () => {
      expect(sanitizeHtml('SafeText123')).toBe('SafeText123');
    });
  });

  describe('sanitizeChannelName', () => {
    it('sanitizes and truncates channel names', () => {
      expect(sanitizeChannelName('<test>', 7)).toBe('&lt;test&gt;');
      expect(sanitizeChannelName('VeryLongChannelName', 7)).toBe('&lt;test&gt;'.substring(0, 7));
    });

    it('removes control characters', () => {
      const withControl = 'Test\x00\x1F\x7FName';
      const clean = sanitizeChannelName(withControl);
      expect(clean).not.toContain('\x00');
      expect(clean).not.toContain('\x1F');
    });
  });

  describe('escapeCsvField', () => {
    it('prevents formula injection', () => {
      expect(escapeCsvField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)'");
      expect(escapeCsvField('+1234')).toBe("'+1234'");
      expect(escapeCsvField('-5')).toBe("'-5'");
      expect(escapeCsvField('@ECHO')).toBe("'@ECHO'");
    });

    it('escapes fields with special characters', () => {
      expect(escapeCsvField('Text, with commas')).toBe('"Text, with commas"');
      expect(escapeCsvField('Text "with quotes"')).toBe('"Text ""with quotes"""');
      expect(escapeCsvField('Line\nbreak')).toBe('"Line\nbreak"');
    });

    it('leaves safe fields unchanged', () => {
      expect(escapeCsvField('SafeText')).toBe('SafeText');
      expect(escapeCsvField(42)).toBe('42');
      expect(escapeCsvField(true)).toBe('true');
    });
  });

  describe('validateFrequency', () => {
    const limits = [
      { min: 136, max: 174 }, // VHF
      { min: 400, max: 520 }  // UHF
    ];

    it('validates frequencies within limits', () => {
      expect(validateFrequency(145.5, limits)).toBe(true);
      expect(validateFrequency(446.0, limits)).toBe(true);
    });

    it('rejects frequencies outside limits', () => {
      expect(validateFrequency(100, limits)).toBe(false);
      expect(validateFrequency(300, limits)).toBe(false);
      expect(validateFrequency(600, limits)).toBe(false);
    });

    it('rejects invalid frequencies', () => {
      expect(validateFrequency(NaN, limits)).toBe(false);
      expect(validateFrequency(-1, limits)).toBe(false);
      expect(validateFrequency(0, limits)).toBe(false);
    });

    it('uses default VHF/UHF limits when none provided', () => {
      expect(validateFrequency(145.5, [])).toBe(true);
      expect(validateFrequency(446.0, [])).toBe(true);
      expect(validateFrequency(300, [])).toBe(false);
    });
  });

  describe('validateImgBuffer', () => {
    it('accepts valid buffers', () => {
      const validBuffer = new Uint8Array(6144); // 6KB typical UV-5R
      validBuffer.fill(0x42); // Fill with non-zero data
      expect(validateImgBuffer(validBuffer)).toBe(true);
    });

    it('rejects too small buffers', () => {
      const tinyBuffer = new Uint8Array(512);
      expect(() => validateImgBuffer(tinyBuffer)).toThrow('too small');
    });

    it('rejects corrupted buffers (all zeros)', () => {
      const corruptBuffer = new Uint8Array(6144);
      corruptBuffer.fill(0x00);
      expect(() => validateImgBuffer(corruptBuffer)).toThrow('corrupted');
    });

    it('rejects corrupted buffers (all 0xFF)', () => {
      const corruptBuffer = new Uint8Array(6144);
      corruptBuffer.fill(0xFF);
      expect(() => validateImgBuffer(corruptBuffer)).toThrow('corrupted');
    });
  });
});
