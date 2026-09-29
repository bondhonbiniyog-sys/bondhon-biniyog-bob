/**
 * Utility functions for Bengali digits, currency formatting, and dates
 */

const englishToBengaliMap: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

export function toBengaliDigits(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '০';
  const str = String(num);
  return str.replace(/[0-9]/g, (digit) => englishToBengaliMap[digit] || digit);
}

export function formatTaka(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return '৳ ০';
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  
  // Format with standard South Asian or International comma separation
  const parts = num.toLocaleString('en-IN');
  return `৳ ${toBengaliDigits(parts)}`;
}

export function formatTakaEnglish(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return '৳ 0';
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return `৳ ${num.toLocaleString('en-US')}`;
}

export function formatBengaliDate(dateStr: string): string {
  if (!dateStr) return '';
  // e.g. "2026-09-24" or "2026-09-24 16:45"
  return toBengaliDigits(dateStr);
}
