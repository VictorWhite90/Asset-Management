import { Timestamp } from 'firebase/firestore';

export interface AuditLog {
  logId: string;
  action: 'login' | 'logout' | 'create_asset' | 'update_asset' | 'delete_asset' | 'bulk_upload' | 'export';
  userId: string;
  userEmail: string;
  agencyName: string;
  timestamp: Timestamp;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  hasMore: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

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
  'FCT',
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
] as const;

export type NigerianState = typeof NIGERIAN_STATES[number];

// Define AssetCategory type first
export type AssetCategory =
  | 'Office Equipment'
  | 'Furniture & Fittings'
  | 'Motor Vehicle'
  | 'Plant/Generator'
  | 'Building'
  | 'Land'
  | 'Stocks'
  | 'Others';

// Then define the array with the type
export const ASSET_CATEGORIES: readonly AssetCategory[] = [
  'Office Equipment',
  'Furniture & Fittings',
  'Motor Vehicle',
  'Plant/Generator',
  'Building',
  'Land',
  'Stocks',
  'Others',
] as const;
