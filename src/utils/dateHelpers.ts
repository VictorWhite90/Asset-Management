import { AssetDate } from '@/types/asset.types';
import { MONTHS, MONTHS_SHORT } from './constants';

/**
 * Format AssetDate to display string
 * @param date - AssetDate object
 * @param format - 'full' | 'short' | 'numeric'
 * @returns Formatted date string
 */
export const formatAssetDate = (
  date: AssetDate,
  format: 'full' | 'short' | 'numeric' = 'full'
): string => {
  const { day, month, year } = date;

  switch (format) {
    case 'full':
      // "15 March 2020"
      return `${day} ${MONTHS[month - 1]} ${year}`;

    case 'short':
      // "15 Mar 2020"
      return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;

    case 'numeric':
      // "15/03/2020" (DD/MM/YYYY - common in Nigeria)
      const paddedDay = day.toString().padStart(2, '0');
      const paddedMonth = month.toString().padStart(2, '0');
      return `${paddedDay}/${paddedMonth}/${year}`;

    default:
      return `${day} ${MONTHS[month - 1]} ${year}`;
  }
};

/**
 * Get month name from month number
 * @param monthNumber - Month number (1-12)
 * @param short - Return short format (Jan, Feb, etc.)
 * @returns Month name
 */
export const getMonthName = (monthNumber: number, short: boolean = false): string => {
  if (monthNumber < 1 || monthNumber > 12) {
    return 'Invalid Month';
  }
  return short ? MONTHS_SHORT[monthNumber - 1] : MONTHS[monthNumber - 1];
};

/**
 * Parse AssetDate to JavaScript Date object
 * @param assetDate - AssetDate object
 * @returns JavaScript Date object
 */
export const assetDateToJsDate = (assetDate: AssetDate): Date => {
  return new Date(assetDate.year, assetDate.month - 1, assetDate.day);
};

/**
 * Convert JavaScript Date to AssetDate
 * @param jsDate - JavaScript Date object
 * @returns AssetDate object
 */
export const jsDateToAssetDate = (jsDate: Date): AssetDate => {
  return {
    day: jsDate.getDate(),
    month: jsDate.getMonth() + 1, // JS months are 0-indexed
    year: jsDate.getFullYear(),
  };
};

/**
 * Compare two AssetDates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareAssetDates = (date1: AssetDate, date2: AssetDate): number => {
  const jsDate1 = assetDateToJsDate(date1);
  const jsDate2 = assetDateToJsDate(date2);

  if (jsDate1 < jsDate2) return -1;
  if (jsDate1 > jsDate2) return 1;
  return 0;
};

/**
 * Validate AssetDate
 * @param date - AssetDate to validate
 * @returns true if valid, false otherwise
 */
export const isValidAssetDate = (date: AssetDate): boolean => {
  const { day, month, year } = date;

  // Check month range
  if (month < 1 || month > 12) return false;

  // Check year range (reasonable for government assets)
  if (year < 1900 || year > new Date().getFullYear() + 1) return false;

  // Check day range
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;

  return true;
};

/**
 * Get current date as AssetDate
 * @returns Current date as AssetDate
 */
export const getCurrentAssetDate = (): AssetDate => {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};
