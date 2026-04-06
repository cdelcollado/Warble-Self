/**
 * Security utilities for input validation and sanitization
 */

/**
 * Maximum allowed file size (10 MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates that a buffer does not exceed the maximum allowed size
 * @param buffer - ArrayBuffer or Uint8Array to validate
 * @returns true if the size is valid
 * @throws Error if the buffer is too large
 */
export function validateFileSize(buffer: ArrayBuffer | Uint8Array): boolean {
  const size = buffer instanceof Uint8Array ? buffer.byteLength : buffer.byteLength;
  if (size > MAX_FILE_SIZE) {
    throw new Error(`File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  return true;
}

/**
 * Sanitizes a string to prevent XSS by escaping HTML characters
 * @param input - Potentially dangerous string
 * @returns Safe string with escaped HTML entities
 * @example
 * sanitizeHtml('<script>alert("xss")</script>') // returns '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function sanitizeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '&': '&amp;'
  };

  return input.replace(/[<>"'&]/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitizes a radio channel name to prevent XSS and truncate to maximum length
 * @param name - Channel name
 * @param maxLength - Maximum length (default 7 for UV-5R)
 * @returns Sanitized and truncated name
 */
export function sanitizeChannelName(name: string, maxLength: number = 7): string {
  // First sanitize HTML
  let sanitized = sanitizeHtml(name);

  // Remove control and non-printable characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Truncate to maximum length
  return sanitized.substring(0, maxLength);
}

/**
 * Escapes a CSV field to prevent formula injection and ensure correct format
 * @param field - Field to escape (string or number)
 * @returns Safely escaped field for CSV output
 * @example
 * escapeCsvField('=SUM(A1:A10)') // returns "'=SUM(A1:A10)'" (prevents execution)
 * escapeCsvField('Text, with commas') // returns '"Text, with commas"'
 */
export function escapeCsvField(field: string | number | boolean): string {
  const str = String(field);

  // Prevent formula injection (=, +, -, @, \t, \r are dangerous)
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str.replace(/"/g, '""')}'`;
  }

  // Escape fields containing commas, quotes or line breaks
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Validates that a frequency is within the allowed limits
 * @param frequency - Frequency in MHz (as a number)
 * @param limits - Array of allowed ranges
 * @returns true if the frequency is valid
 */
export function validateFrequency(
  frequency: number,
  limits: { min: number; max: number }[]
): boolean {
  if (isNaN(frequency) || frequency <= 0) {
    return false;
  }

  // If no limits are specified, use standard VHF/UHF defaults
  if (!limits || limits.length === 0) {
    const isVHF = frequency >= 136 && frequency <= 174;
    const isUHF = frequency >= 400 && frequency <= 520;
    return isVHF || isUHF;
  }

  return limits.some(limit => frequency >= limit.min && frequency <= limit.max);
}

/**
 * Validates the contents of a .img file to detect obvious problems
 * @param buffer - Buffer of the .img file
 * @returns true if the buffer appears valid
 * @throws Error if obvious problems are detected
 */
export function validateImgBuffer(buffer: Uint8Array): boolean {
  // Validate minimum size (a UV-5R is at least ~6 KB)
  if (buffer.length < 1024) {
    throw new Error('Invalid .img file: file too small');
  }

  // Validate that it is not all zeros or all 0xFF (corruption)
  const allZeros = buffer.every(byte => byte === 0x00);
  const allFF = buffer.every(byte => byte === 0xFF);

  if (allZeros || allFF) {
    throw new Error('Invalid .img file: corrupted data detected');
  }

  return true;
}

/**
 * Typed async sleep/delay
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
