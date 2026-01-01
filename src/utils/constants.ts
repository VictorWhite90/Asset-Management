import { AssetCategory } from '@/types/asset.types';

// Asset Categories
export const ASSET_CATEGORIES: AssetCategory[] = [
  'Office Equipment',
  'Furniture & Fittings',
  'Motor Vehicle',
  'Plant/Generator',
  'Building',
  'Land',
  'Infrastructure',
  'Extractive Assets',
  'Corporate/Financial Assets',
  'Others',
];

// Nigerian States
export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT (Abuja)',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

// Ministry/Agency Types
export const MINISTRY_TYPES = [
  'Federal Ministry',
  'State Ministry',
  'Federal Agency',
  'State Agency',
  'Parastatal',
  'Department',
  'Commission',
  'Board',
  'Authority',
  'Corporation',
  'Others',
];

// Pagination constants
export const INITIAL_LOAD_LIMIT = 50;
export const LOAD_MORE_LIMIT = 30;

// Date constants
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Excel column mapping (for bulk upload)
export const EXCEL_COLUMN_MAP = {
  SN: 'sn',
  'ASSET ID': 'assetId',
  DESCRIPTION: 'description',
  CATEGORY: 'category',
  LOCATION: 'location',
  'PURCHASED DATE': 'purchasedDate',
  'PURCHASE COST': 'purchaseCost',
  'VERIFIED BY': 'verifiedBy',
  REMARKS: 'remarks',
};

// App metadata
export const APP_NAME = 'Nigeria Government Asset Management System';
export const APP_SHORT_NAME = 'NGAMS';
export const APP_VERSION = '1.0.0';

// Firebase collection names
export const COLLECTIONS = {
  USERS: 'users',
  ASSETS: 'assets',
  LOGS: 'logs',
  CATEGORIES: 'categories',
};

// Error messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_EMAIL: 'Please enter a valid email address',
    WEAK_PASSWORD: 'Password must be at least 8 characters',
    EMAIL_IN_USE: 'This email is already registered',
    WRONG_PASSWORD: 'Incorrect password',
    USER_NOT_FOUND: 'No account found with this email',
    TOO_MANY_REQUESTS: 'Too many attempts. Please try again later',
    NETWORK_ERROR: 'Network error. Please check your connection',
  },
  ASSETS: {
    UPLOAD_FAILED: 'Failed to upload asset',
    INVALID_CATEGORY: 'Invalid category selected',
    MISSING_REQUIRED_FIELDS: 'Please fill all required fields',
    INVALID_DATE: 'Please enter a valid purchase date',
    INVALID_FILE: 'Please upload a valid Excel file (.xlsx or .xls)',
    BULK_UPLOAD_FAILED: 'Some assets failed to upload',
    CATEGORY_LOAD_FAILED: 'Failed to load category details',
    INVALID_COST: 'Please enter a valid cost amount',
    INVALID_MARKET_VALUE: 'Please enter a valid market value',
  },
};

// Success messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN: 'Login successful',
    LOGOUT: 'Logged out successfully',
    REGISTER: 'Registration successful. Please verify your email',
    EMAIL_SENT: 'Verification email sent',
    PASSWORD_RESET: 'Password reset email sent',
  },
  ASSETS: {
    UPLOAD: 'Asset uploaded successfully',
    BULK_UPLOAD: (count: number) => `${count} asset${count !== 1 ? 's' : ''} uploaded successfully`,
    UPDATE: 'Asset updated successfully',
    DELETE: 'Asset deleted successfully',
  },
};
