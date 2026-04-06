import { useCallback } from 'react';
import { validateFrequency } from '../lib/security';

/**
 * Hook for validating frequencies against hardware limits
 * @param limits - Array of allowed frequency ranges
 * @returns Memoized validation function
 */
export function useFrequencyValidation(limits: { min: number; max: number }[]) {
  return useCallback(
    (frequency: number): boolean => {
      return validateFrequency(frequency, limits);
    },
    [limits]
  );
}

/**
 * Hook for validating and formatting frequency strings
 * @param limits - Array of allowed frequency ranges
 * @returns Object with validation and formatting functions
 */
export function useFrequencyFormatter(limits: { min: number; max: number }[]) {
  const validate = useFrequencyValidation(limits);

  const format = useCallback((freqStr: string): string | null => {
    const freq = parseFloat(freqStr);
    if (isNaN(freq) || !validate(freq)) {
      return null;
    }
    return freq.toFixed(6);
  }, [validate]);

  const isValid = useCallback((freqStr: string): boolean => {
    const freq = parseFloat(freqStr);
    return !isNaN(freq) && validate(freq);
  }, [validate]);

  return { format, isValid, validate };
}
