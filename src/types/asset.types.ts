import { Timestamp } from 'firebase/firestore';

export type AssetStatus = 'pending' | 'pending_ministry_review' | 'submitted_to_federal' | 'approved' | 'rejected';

export type AssetCategory =
  | 'Office Equipment'
  | 'Furniture & Fittings'
  | 'Motor Vehicle'
  | 'Plant/Generator'
  | 'Building'
  | 'Land'
  | 'Infrastructure'
  | 'Extractive Assets'
  | 'Securities/Financial Assets'
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
  ministryId: string; // Reference to ministry document (for multi-user ministry access)
  agencyName?: string; // Denormalized for quick display (e.g., "Ministry of Works")
  staffAgencyName?: string; // Explicit agency lane for state ministry staff
  region?: string; // Uploader's state (e.g., "Abuja", "Lagos") - for approver matching
  ministryType?: string; // Uploader's ministry type (e.g., "Federal Agency")
  description: string;
  category: AssetCategory;
  location: string; // e.g., "Ikorodu Lagos" - where the asset is physically located
  state?: string; // State where the asset is located
  ministry?: string; // Ministry captured from upload form
  agency?: string; // Agency captured from upload form
  department?: string; // Department captured from upload form
  condition?: string; // Asset condition captured from upload form
  purchasedDate: AssetDate; // Split into day/month/year
  purchaseCost: number;
  marketValue?: number; // Current market worth of the asset

  // Approval workflow fields
  status: AssetStatus; // pending, approved, rejected
  uploadedBy: string; // userId of uploader
  uploaderDisplayId?: string; // Short display ID of uploader e.g. "EDU-STF-0001"
  uploadTimestamp: Timestamp;
  uploadedAt?: Timestamp; // Backward-compatible alias used by older reports/admin filters

  // Approver action (Agency Approver sends to Ministry Admin)
  approvedBy?: string; // userId of agency approver (if approved by approver)
  approvedAt?: Timestamp; // When approver approved it
  
  // Ministry Admin action
  sentToMinistryAdminBy?: string; // userId of approver who sent it
  sentToMinistryAdminAt?: Timestamp; // When sent to ministry admin
  
  approvedByMinistry?: string; // userId of ministry admin (if approved by ministry)
  approvedByMinistryAt?: Timestamp; // When ministry admin approved
  
  rejectedBy?: string; // userId of who rejected it (approver or ministry admin)
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  rejectionLevel?: 'approver' | 'ministry-admin' | 'federal-admin'; // Which level rejected it

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
  state?: string;
  ministry?: string;
  agency?: string;
  department?: string;
  condition?: string;
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
