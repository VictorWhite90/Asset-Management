import { AssetDate } from '@/types/asset.types';

/**
 * Convert camelCase string to Title Case
 * Example: "registrationNumber" → "Registration Number"
 * @param str - camelCase string
 * @returns Title Case string
 */
export const camelToTitle = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (s) => s.toUpperCase()) // Capitalize first letter
    .trim();
};

/**
 * Validate AssetDate object
 * @param date - AssetDate to validate
 * @returns true if valid, false otherwise
 */
export const isValidAssetDate = (date: AssetDate): boolean => {
  const { day, month, year } = date;

  // Check month range
  if (month < 1 || month > 12) return false;

  // Check year range (reasonable for government assets)
  if (year < 1900 || year > new Date().getFullYear() + 1) return false;

  // Check day range based on month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;

  return true;
};

/**
 * Parse Excel date serial number to AssetDate
 * Excel stores dates as serial numbers (days since 1900-01-01)
 * @param serial - Excel date serial number
 * @returns AssetDate object
 */
export const excelDateToAssetDate = (serial: number): AssetDate => {
  // Excel date starts from 1900-01-01
  // Serial 1 = 1900-01-01, Serial 2 = 1900-01-02, etc.
  // Unix epoch starts 1970-01-01 which is serial 25569
  const date = new Date((serial - 25569) * 86400 * 1000);

  return {
    day: date.getDate(),
    month: date.getMonth() + 1, // JS months are 0-indexed
    year: date.getFullYear(),
  };
};

/**
 * Parse DD/MM/YYYY string to AssetDate
 * @param dateString - Date string in format DD/MM/YYYY
 * @returns AssetDate object or null if invalid
 */
export const parseDateString = (dateString: string): AssetDate | null => {
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const assetDate: AssetDate = { day, month, year };

  return isValidAssetDate(assetDate) ? assetDate : null;
};

/**
 * Format currency for Nigerian Naira
 * @param amount - Amount in Naira
 * @returns Formatted currency string (e.g., "₦15,000,000.00")
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

/**
 * Generate a random asset ID
 * Format: ASSET-YYYYMMDD-XXXX (where XXXX is random 4-digit number)
 * Example: ASSET-20251218-4523
 * @returns Generated asset ID string
 */
export const generateAssetId = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

  return `ASSET-${year}${month}${day}-${random}`;
};

/**
 * Sanitize string for use as Firestore document ID
 * Removes special characters and converts to lowercase with hyphens
 * @param str - String to sanitize
 * @returns Sanitized string safe for Firestore document IDs
 */
export const sanitizeDocumentId = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};
