import { Timestamp } from 'firebase/firestore';

export type AssetStatus = 'pending' | 'approved' | 'rejected';

export type AssetCategory =
  | 'Office Equipment'
  | 'Furniture & Fittings'
  | 'Motor Vehicle'
  | 'Plant/Generator'
  | 'Building'
  | 'Land'
  | 'Infrastructure'
  | 'Extractive Assets'
  | 'Corporate/Financial Assets'
  | 'Others';

export interface AssetDate {
  day: number;
  month: number; // Month as number 1-12 (1=January, 12=December)
  year: number;
}

export interface Asset {
  id?: string; // Firestore document ID
  assetId: string; // Can be manual like "AE-23-001" or auto-generated
  agencyId: string; // Reference to user who uploaded
  agencyName?: string; // Denormalized for quick display
  description: string;
  category: AssetCategory;
  location: string; // e.g., "Ikorodu Lagos" - where the asset is located
  purchasedDate: AssetDate; // Split into day/month/year
  purchaseCost: number;
  marketValue?: number; // Current market worth of the asset

  // Approval workflow fields
  status: AssetStatus; // pending, approved, rejected
  uploadedBy: string; // userId of uploader
  uploadTimestamp: Timestamp;

  approvedBy?: string; // userId of approver (if approved)
  approvedAt?: Timestamp;

  rejectedBy?: string; // userId of approver (if rejected)
  rejectedAt?: Timestamp;
  rejectionReason?: string;

  // Legacy fields (keeping for backward compatibility)
  verifiedBy?: string;
  verifiedDate?: Timestamp;
  remarks?: string;

  // Optional category-specific fields based on requiredFields
  [key: string]: any; // Allows dynamic fields like make, model, year, etc.
}

export interface AssetFormData {
  assetId?: string;
  description: string;
  category: AssetCategory;
  location: string;
  purchasedDate: AssetDate;
  purchaseCost: number;
  marketValue?: number;
  verifiedBy?: string;
  remarks?: string;
  // Optional category-specific fields
  [key: string]: any;
}

export interface BulkUploadRow {
  sn: number;
  assetId: string;
  description: string;
  category: string;
  location: string;
  purchasedDate: string | number; // Can be Excel serial number
  purchaseCost: number;
  verifiedBy?: string;
  remarks?: string;
}

export interface AssetFilter {
  location?: string;
  category?: AssetCategory;
  year?: number;
  searchTerm?: string;
}
