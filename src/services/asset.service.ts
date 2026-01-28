import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Asset, AssetFormData, AssetStatus } from '@/types/asset.types';
import { Category } from '@/types/category.types';
import { COLLECTIONS, ERROR_MESSAGES } from '@/utils/constants';
import { isValidAssetDate, sanitizeDocumentId, generateAssetId } from '@/utils/assetHelpers';
import { logAction } from './auditLog.service';

/**
 * Fetch category details from Firestore by category name
 * @param categoryName - Name of the category (e.g., "Motor Vehicle")
 * @returns Category document with required fields
 */
export const getCategoryDetails = async (categoryName: string): Promise<Category> => {
  try {
    // Sanitize category name to match Firestore document ID format
    // "Motor Vehicle" → "motor-vehicle"
    const categoryId = sanitizeDocumentId(categoryName);

    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    const categoryDoc = await getDoc(categoryRef);

    if (!categoryDoc.exists()) {
      throw new Error(`Category "${categoryName}" not found`);
    }

    const data = categoryDoc.data();

    // Ensure requiredFields is always an array and filter out empty strings
    let requiredFields: string[] = [];
    if (Array.isArray(data.requiredFields)) {
      // Filter out empty strings, null, undefined, and whitespace-only strings
      requiredFields = data.requiredFields.filter(
        (field: unknown): field is string => typeof field === 'string' && field.trim() !== ''
      );
    }

    const category: Category = {
      name: data.name || categoryName,
      description: data.description || '',
      requiredFields,
      createdAt: data.createdAt || Timestamp.now(),
    };

    return category;
  } catch (error: any) {
    console.error('Error fetching category:', error);
    throw new Error(ERROR_MESSAGES.ASSETS.CATEGORY_LOAD_FAILED);
  }
};

/**
 * Validate asset data against category required fields
 * @param assetData - Asset form data to validate
 * @param requiredFields - Array of required field names from category
 * @returns true if all required fields are present and valid
 */
export const validateAssetData = (
  assetData: AssetFormData,
  requiredFields: string[]
): boolean => {
  // Check if all category-specific required fields are present
  for (const field of requiredFields) {
    if (!assetData[field] || assetData[field] === '') {
      return false;
    }
  }

  // Validate purchase date
  if (!isValidAssetDate(assetData.purchasedDate)) {
    return false;
  }

  // Validate purchase cost
  if (!assetData.purchaseCost || assetData.purchaseCost <= 0) {
    return false;
  }

  // Validate market value if provided
  if (assetData.marketValue && assetData.marketValue <= 0) {
    return false;
  }

  return true;
};

/**
 * Create a new asset in Firestore
 * @param assetData - Asset form data
 * @param userId - User ID of the agency creating the asset
 * @param agencyName - Name of the agency
 * @param skipCategoryValidation - Skip category-specific field validation (for bulk uploads)
 * @param userEmail - User email for audit logging
 * @param userRole - User role for audit logging
 * @param ministryId - Ministry ID for ministry-level access control
 * @param ministryType - Ministry type for categorization
 * @returns Asset ID of the created asset
 */
export const createAsset = async (
  assetData: AssetFormData,
  userId: string,
  agencyName: string,
  skipCategoryValidation: boolean = false,
  userEmail?: string,
  userRole?: 'agency' | 'agency-approver' | 'ministry-admin' | 'admin',
  ministryId?: string,
  ministryType?: string
): Promise<string> => {
  try {
    // Fetch category details to get required fields
    const category = await getCategoryDetails(assetData.category);

    // Validate asset data against category requirements (skip category-specific fields for bulk uploads)
    if (!skipCategoryValidation && !validateAssetData(assetData, category.requiredFields)) {
      throw new Error(ERROR_MESSAGES.ASSETS.MISSING_REQUIRED_FIELDS);
    }

    // Generate asset ID if not provided
    const assetId = assetData.assetId?.trim() || generateAssetId();

    // Prepare asset document (base required fields)
    const assetDocument: Record<string, unknown> = {
      assetId,
      agencyId: userId,
      ministryId: ministryId || '', // Required for ministry-level access control
      agencyName,
      ministryType, // Uploader's ministry type
      description: assetData.description,
      category: assetData.category,
      location: assetData.location,
      purchasedDate: assetData.purchasedDate,
      purchaseCost: assetData.purchaseCost,
      uploadTimestamp: Timestamp.now(),

      // Approval workflow fields
      status: 'pending', // New uploads start as pending
      uploadedBy: userId,
    };

    // Add optional fields only if they have values (Firestore doesn't accept undefined)
    if (assetData.marketValue !== undefined && assetData.marketValue !== null) {
      assetDocument.marketValue = assetData.marketValue;
    }
    if (assetData.remarks !== undefined && assetData.remarks !== null && assetData.remarks.trim() !== '') {
      assetDocument.remarks = assetData.remarks;
    }

    // Include dynamic category-specific fields
    category.requiredFields.forEach((field) => {
      if (assetData[field] !== undefined && assetData[field] !== null) {
        assetDocument[field] = assetData[field];
      }
    });

    // Save to Firestore
    let createdAssetId = assetId;
    if (assetData.assetId) {
      // Use custom asset ID
      const assetRef = doc(db, COLLECTIONS.ASSETS, assetId);
      await setDoc(assetRef, assetDocument);
    } else {
      // Auto-generate Firestore document ID
      const assetsRef = collection(db, COLLECTIONS.ASSETS);
      const docRef = await addDoc(assetsRef, assetDocument);
      createdAssetId = docRef.id;
    }

    // Log the action
    if (userEmail && userRole) {
      await logAction({
        userId,
        userEmail,
        agencyName,
        userRole,
        action: 'asset.upload',
        resourceType: 'asset',
        resourceId: createdAssetId,
        details: `Uploaded asset: ${assetData.description} (${assetData.category})`,
        metadata: {
          assetId: createdAssetId,
          category: assetData.category,
          purchaseCost: assetData.purchaseCost,
        },
      });
    }

    return createdAssetId;
  } catch (error: any) {
    console.error('Error creating asset:', error);

    // Re-throw known errors
    if (error.message.includes('required fields') || error.message.includes('Category')) {
      throw error;
    }

    // Generic error for unknown issues
    throw new Error(ERROR_MESSAGES.ASSETS.UPLOAD_FAILED);
  }
};

/**
 * Get Firestore error message based on error code
 * @param errorCode - Firebase error code
 * @returns User-friendly error message
 */
export const getFirestoreErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'permission-denied':
      return 'You do not have permission to perform this action';
    case 'not-found':
      return 'The requested resource was not found';
    case 'already-exists':
      return 'This asset ID already exists';
    case 'resource-exhausted':
      return 'Too many requests. Please try again later';
    case 'unauthenticated':
      return 'Please sign in to continue';
    case 'unavailable':
      return 'Service temporarily unavailable. Please try again';
    default:
      return ERROR_MESSAGES.ASSETS.UPLOAD_FAILED;
  }
};

/**
 * Fetch all assets uploaded by a specific user (uploader)
 * @param userId - User ID of the uploader
 * @returns Array of assets uploaded by this user
 */
export const getAgencyAssets = async (userId: string): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    // Query by uploadedBy field - this matches the security rule that allows
    // uploaders to read only their own assets
    const q = query(assetsRef, where('uploadedBy', '==', userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching uploader assets:', error);
    throw new Error(getFirestoreErrorMessage(error.code));
  }
};

/**
 * Fetch assets for an approver by ministry ID
 * @param ministryId - Ministry ID to filter assets
 * @returns Array of assets from the same ministry
 */
export const getApproverAssets = async (ministryId: string): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    // Query by ministryId - this matches the security rule that allows
    // approvers to read assets from their ministry
    const q = query(assetsRef, where('ministryId', '==', ministryId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching approver assets:', error);
    throw new Error(getFirestoreErrorMessage(error.code));
  }
};

/**
 * Fetch all assets across all agencies (Admin only)
 * @returns Array of all assets in the system
 */
export const getAllAssets = async (): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    const querySnapshot = await getDocs(assetsRef);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching all assets:', error);
    throw new Error(getFirestoreErrorMessage(error.code));
  }
};

/**
 * Get all assets for a specific ministry
 * @param ministryId - Ministry ID to filter assets by
 * @returns Array of assets belonging to the ministry
 */
export const getAssetsByMinistryId = async (ministryId: string): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    const q = query(assetsRef, where('ministryId', '==', ministryId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching ministry assets:', error);
    throw new Error(getFirestoreErrorMessage(error.code));
  }
};

/**
 * Fetch a single asset by ID
 * @param assetId - Document ID of the asset
 * @returns Asset object
 */
export const getAssetById = async (assetId: string): Promise<Asset> => {
  try {
    const assetRef = doc(db, COLLECTIONS.ASSETS, assetId);
    const assetDoc = await getDoc(assetRef);

    if (!assetDoc.exists()) {
      throw new Error('Asset not found');
    }

    return {
      ...assetDoc.data(),
      id: assetDoc.id,
    } as Asset;
  } catch (error: any) {
    console.error('Error fetching asset:', error);
    throw new Error(error.message || getFirestoreErrorMessage(error.code));
  }
};

/**
 * Get pending assets for a ministry (for approvers)
 * @param ministryId - Ministry ID to filter assets by
 * @returns Array of pending assets from the ministry
 */
export const getPendingAssets = async (ministryId: string): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    // Query by ministryId to match security rules for approvers
    const q = query(
      assetsRef,
      where('ministryId', '==', ministryId),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching pending assets:', error);
    throw new Error(getFirestoreErrorMessage(error.code));
  }
};

/**
 * Get assets by status for a specific uploader
 * @param userId - User ID of the uploader
 * @param status - Asset status to filter by
 * @returns Array of assets with the specified status
 */
export const getAssetsByStatus = async (
  userId: string,
  status: AssetStatus
): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    // Query by uploadedBy to match security rules for uploaders
    const q = query(
      assetsRef,
      where('uploadedBy', '==', userId),
      where('status', '==', status)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching assets by status:', error);
    throw new Error(getFirestoreErrorMessage(error.code));
  }
};

/**
 * Approve an asset (Agency Approver only) - sends to Ministry Admin, not directly approved
 * @param assetId - Document ID of the asset to approve
 * @param approverId - User ID of the approver
 * @param approverEmail - User email for audit logging
 * @param agencyName - Agency name for audit logging
 */
export const approveAsset = async (
  assetId: string,
  approverId: string,
  approverEmail?: string,
  agencyName?: string
): Promise<void> => {
  try {
    // Get asset details before updating
    const assetRef = doc(db, COLLECTIONS.ASSETS, assetId);
    const assetDoc = await getDoc(assetRef);
    const asset = assetDoc.exists() ? (assetDoc.data() as Asset) : null;

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Log asset ministryId for debugging
    console.log('[approveAsset] Asset details:', {
      assetId,
      assetStatus: asset.status,
      assetMinistryId: asset.ministryId,
      approverId,
      approverEmail,
    });

    // Verify asset is still pending
    if (asset.status !== 'pending') {
      throw new Error(`Cannot approve asset with status "${asset.status}". Asset must be in "pending" status.`);
    }

    // NEW WORKFLOW: Approver approves sends to Ministry Admin for final approval
    await updateDoc(assetRef, {
      status: 'pending_ministry_review', // Not directly approved anymore
      approvedBy: approverId,
      approvedAt: Timestamp.now(),
      sentToMinistryAdminBy: approverId,
      sentToMinistryAdminAt: Timestamp.now(),
    });

    // Log the action
    if (approverEmail && agencyName && asset) {
      await logAction({
        userId: approverId,
        userEmail: approverEmail,
        agencyName,
        userRole: 'agency-approver',
        action: 'asset.approve',
        resourceType: 'asset',
        resourceId: assetId,
        details: `Approved asset and sent to Ministry Admin: ${asset.description} (${asset.assetId})`,
        metadata: {
          assetId: asset.assetId,
          category: asset.category,
        },
      });
    }
  } catch (error: any) {
    console.error('Error approving asset:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('Missing or insufficient permissions')) {
      throw new Error('Permission denied: Unable to approve assets. This usually happens if permissions were just updated. Please try logging out and logging back in.');
    }
    if (error.message?.includes('Cannot approve')) {
      throw error;
    }
    
    throw new Error('Failed to approve asset. Please try again.');
  }
};

/**
 * Reject an asset with a reason - tracks which level rejected it
 * @param assetId - Document ID of the asset to reject
 * @param rejectorId - User ID of the person rejecting (approver or ministry admin)
 * @param rejectionReason - Reason for rejection
 * @param rejectionLevel - Which level is rejecting: 'approver' or 'ministry-admin'
 * @param rejectorEmail - User email for audit logging
 * @param agencyName - Agency name for audit logging
 */
export const rejectAsset = async (
  assetId: string,
  rejectorId: string,
  rejectionReason: string,
  rejectionLevel: 'approver' | 'ministry-admin' | 'federal-admin' = 'approver',
  rejectorEmail?: string,
  agencyName?: string
): Promise<void> => {
  try {
    // Get asset details before updating
    const assetRef = doc(db, COLLECTIONS.ASSETS, assetId);
    const assetDoc = await getDoc(assetRef);
    const asset = assetDoc.exists() ? (assetDoc.data() as Asset) : null;

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Verify asset is in correct status for rejection
    if (rejectionLevel === 'approver' && asset.status !== 'pending') {
      throw new Error(`Cannot reject asset with status "${asset.status}". Asset must be in "pending" status.`);
    }
    if (rejectionLevel === 'ministry-admin' && asset.status !== 'pending_ministry_review') {
      throw new Error(`Cannot reject asset with status "${asset.status}". Asset must be in "pending_ministry_review" status.`);
    }

    await updateDoc(assetRef, {
      status: 'rejected',
      rejectedBy: rejectorId,
      rejectedAt: Timestamp.now(),
      rejectionReason,
      rejectionLevel,
    });

    // Log the action
    if (rejectorEmail && agencyName && asset) {
      const roleMap = {
        'approver': 'agency-approver',
        'ministry-admin': 'ministry-admin',
        'federal-admin': 'admin',
      };
      
      await logAction({
        userId: rejectorId,
        userEmail: rejectorEmail,
        agencyName,
        userRole: roleMap[rejectionLevel] as any,
        action: 'asset.reject',
        resourceType: 'asset',
        resourceId: assetId,
        details: `Rejected asset at ${rejectionLevel} level: ${asset.description} (${asset.assetId}) - Reason: ${rejectionReason}`,
        metadata: {
          assetId: asset.assetId,
          category: asset.category,
          rejectionReason,
          rejectionLevel,
        },
      });
    }
  } catch (error: any) {
    console.error('Error rejecting asset:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('Missing or insufficient permissions')) {
      throw new Error('Permission denied: Unable to reject assets. This usually happens if permissions were just updated. Please try logging out and logging back in.');
    }
    if (error.message?.includes('Cannot reject')) {
      throw error;
    }
    
    throw new Error('Failed to reject asset. Please try again.');
  }
};

/**
 * Update a rejected asset (allows uploader to fix and resubmit)
 * @param assetId - Document ID of the asset
 * @param assetData - Updated asset data
 * @param userId - User ID of the uploader
 * @param userEmail - User email for audit logging
 * @param agencyName - Agency name for audit logging
 */
export const updateRejectedAsset = async (
  assetId: string,
  assetData: Partial<AssetFormData>,
  userId: string,
  userEmail?: string,
  agencyName?: string
): Promise<void> => {
  try {
    const assetRef = doc(db, COLLECTIONS.ASSETS, assetId);
    const assetDoc = await getDoc(assetRef);

    if (!assetDoc.exists()) {
      throw new Error('Asset not found');
    }

    const currentAsset = assetDoc.data() as Asset;

    // Only allow updates if asset is rejected and user is the uploader
    if (currentAsset.status !== 'rejected') {
      throw new Error('Only rejected assets can be updated');
    }

    if (currentAsset.uploadedBy !== userId) {
      throw new Error('You can only update your own assets');
    }

    // Reset to pending status and clear rejection fields
    await updateDoc(assetRef, {
      ...assetData,
      status: 'pending',
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      uploadTimestamp: Timestamp.now(), // Update timestamp for resubmission
    });

    // Log the action
    if (userEmail && agencyName) {
      await logAction({
        userId,
        userEmail,
        agencyName,
        userRole: 'agency',
        action: 'asset.edit',
        resourceType: 'asset',
        resourceId: assetId,
        details: `Edited and resubmitted rejected asset: ${assetData.description || currentAsset.description} (${currentAsset.assetId})`,
        metadata: {
          assetId: currentAsset.assetId,
          category: assetData.category || currentAsset.category,
          previousStatus: 'rejected',
          newStatus: 'pending',
        },
      });
    }
  } catch (error: any) {
    console.error('Error updating rejected asset:', error);
    throw new Error(error.message || 'Failed to update asset. Please try again.');
  }
};

// ============================================
// ADMIN DASHBOARD FUNCTIONS
// ============================================

export interface MinistryStats {
  ministryName: string;
  ministryType: string;
  assetCount: number;
  totalPurchaseCost: number;
  totalMarketValue: number;
  states: string[];
  statusBreakdown: {
    approved: number;
    pending: number;
    rejected: number;
  };
}

export interface AdminDashboardStats {
  totalAssets: number;
  totalPurchaseValue: number;
  totalMarketValue: number;
  statusCounts: {
    approved: number;
    pending: number;
    rejected: number;
  };
  categoryCounts: Record<string, number>;
  recentUploads: Asset[];
}

/**
 * Get assets grouped by ministry with statistics
 */
export const getAssetsByMinistry = async (
  category?: string,
  ministry?: string,
  state?: string,
  status?: AssetStatus
): Promise<MinistryStats[]> => {
  try {
    let assets = await getAllAssets();

    // Apply filters
    if (category) {
      assets = assets.filter(a => a.category === category);
    }
    if (ministry) {
      assets = assets.filter(a => a.agencyName === ministry);
    }
    if (state) {
      assets = assets.filter(a => a.location?.includes(state));
    }
    if (status) {
      assets = assets.filter(a => a.status === status);
    }

    // Group by ministry
    const ministryMap = new Map<string, Asset[]>();
    assets.forEach(asset => {
      const ministry = asset.agencyName || 'Unknown';
      if (!ministryMap.has(ministry)) {
        ministryMap.set(ministry, []);
      }
      ministryMap.get(ministry)!.push(asset);
    });

    // Calculate stats for each ministry
    const ministryStats: MinistryStats[] = [];
    ministryMap.forEach((assets, ministryName) => {
      const totalPurchaseCost = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
      const totalMarketValue = assets.reduce((sum, a) => sum + (a.marketValue || 0), 0);
      const states = [...new Set(assets.map(a => a.location).filter(Boolean))];
      const statusBreakdown = {
        approved: assets.filter(a => a.status === 'approved').length,
        pending: assets.filter(a => a.status === 'pending').length,
        rejected: assets.filter(a => a.status === 'rejected').length,
      };

      ministryStats.push({
        ministryName,
        ministryType: assets[0]?.ministryType || '',
        assetCount: assets.length,
        totalPurchaseCost,
        totalMarketValue,
        states,
        statusBreakdown,
      });
    });

    return ministryStats.sort((a, b) => b.assetCount - a.assetCount);
  } catch (error: any) {
    console.error('Error getting assets by ministry:', error);
    throw new Error('Failed to load ministry statistics');
  }
};

/**
 * Get list of all unique ministries
 */
export const getAllMinistries = async (): Promise<string[]> => {
  try {
    const assets = await getAllAssets();
    const ministries = [...new Set(assets.map(a => a.agencyName).filter((name): name is string => !!name))];
    return ministries.sort();
  } catch (error: any) {
    console.error('Error getting ministries:', error);
    throw new Error('Failed to load ministries');
  }
};

/**
 * Get overall admin dashboard statistics
 */
export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  try {
    const assets = await getAllAssets();

    const totalPurchaseValue = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
    const totalMarketValue = assets.reduce((sum, a) => sum + (a.marketValue || 0), 0);

    const statusCounts = {
      approved: assets.filter(a => a.status === 'approved').length,
      pending: assets.filter(a => a.status === 'pending').length,
      rejected: assets.filter(a => a.status === 'rejected').length,
    };

    const categoryCounts: Record<string, number> = {};
    assets.forEach(asset => {
      categoryCounts[asset.category] = (categoryCounts[asset.category] || 0) + 1;
    });

    const recentUploads = assets
      .sort((a, b) => {
        const aTime = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt);
        const bTime = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt);
        return bTime.getTime() - aTime.getTime();
      })
      .slice(0, 10);

    return {
      totalAssets: assets.length,
      totalPurchaseValue,
      totalMarketValue,
      statusCounts,
      categoryCounts,
      recentUploads,
    };
  } catch (error: any) {
    console.error('Error getting admin dashboard stats:', error);
    throw new Error('Failed to load dashboard statistics');
  }
};

// ============================================
// AGENCY REPORTS FUNCTIONS
// ============================================

export interface CategoryStats {
  category: string;
  assetCount: number;
  totalPurchaseCost: number;
  totalMarketValue: number;
  statusBreakdown: {
    approved: number;
    pending: number;
    rejected: number;
  };
  yearBreakdown: Record<string, number>;
}

export interface AgencyReportStats {
  agencyName: string;
  totalAssets: number;
  totalPurchaseValue: number;
  totalMarketValue: number;
  categoryBreakdown: CategoryStats[];
  statusCounts: {
    approved: number;
    pending: number;
    rejected: number;
  };
}

/**
 * Get agency report summary grouped by category
 */
export const getAgencyReportSummary = async (
  agencyId: string,
  categoryFilter?: string,
  yearFilter?: string
): Promise<AgencyReportStats> => {
  try {
    let assets = await getAgencyAssets(agencyId);

    // Apply filters
    if (categoryFilter) {
      assets = assets.filter(a => a.category === categoryFilter);
    }
    if (yearFilter) {
      assets = assets.filter(a => {
        const uploadDate = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt);
        return uploadDate.getFullYear().toString() === yearFilter;
      });
    }

    // Group by category
    const categoryMap = new Map<string, Asset[]>();
    assets.forEach(asset => {
      if (!categoryMap.has(asset.category)) {
        categoryMap.set(asset.category, []);
      }
      categoryMap.get(asset.category)!.push(asset);
    });

    // Calculate stats for each category
    const categoryBreakdown: CategoryStats[] = [];
    categoryMap.forEach((categoryAssets, category) => {
      const totalPurchaseCost = categoryAssets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
      const totalMarketValue = categoryAssets.reduce((sum, a) => sum + (a.marketValue || 0), 0);

      const statusBreakdown = {
        approved: categoryAssets.filter(a => a.status === 'approved').length,
        pending: categoryAssets.filter(a => a.status === 'pending').length,
        rejected: categoryAssets.filter(a => a.status === 'rejected').length,
      };

      const yearBreakdown: Record<string, number> = {};
      categoryAssets.forEach(asset => {
        const year = asset.uploadedAt?.toDate?.().getFullYear().toString() || 'Unknown';
        yearBreakdown[year] = (yearBreakdown[year] || 0) + 1;
      });

      categoryBreakdown.push({
        category,
        assetCount: categoryAssets.length,
        totalPurchaseCost,
        totalMarketValue,
        statusBreakdown,
        yearBreakdown,
      });
    });

    // Sort by asset count descending
    categoryBreakdown.sort((a, b) => b.assetCount - a.assetCount);

    const totalPurchaseValue = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
    const totalMarketValue = assets.reduce((sum, a) => sum + (a.marketValue || 0), 0);

    const statusCounts = {
      approved: assets.filter(a => a.status === 'approved').length,
      pending: assets.filter(a => a.status === 'pending').length,
      rejected: assets.filter(a => a.status === 'rejected').length,
    };

    return {
      agencyName: assets[0]?.agencyName || '',
      totalAssets: assets.length,
      totalPurchaseValue,
      totalMarketValue,
      categoryBreakdown,
      statusCounts,
    };
  } catch (error: any) {
    console.error('Error getting agency report summary:', error);
    throw new Error('Failed to load report summary');
  }
};

/**
 * Get assets for a specific category within an agency
 */
export const getAgencyAssetsByCategory = async (
  agencyId: string,
  category: string,
  yearFilter?: string
): Promise<Asset[]> => {
  try {
    let assets = await getAgencyAssets(agencyId);

    assets = assets.filter(a => a.category === category);

    if (yearFilter) {
      assets = assets.filter(a => {
        const uploadDate = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt);
        return uploadDate.getFullYear().toString() === yearFilter;
      });
    }

    return assets;
  } catch (error: any) {
    console.error('Error getting agency assets by category:', error);
    throw new Error('Failed to load category assets');
  }
};

/**
 * Get unique years from agency assets
 */
export const getAgencyUploadYears = async (agencyId: string): Promise<string[]> => {
  try {
    const assets = await getAgencyAssets(agencyId);
    const years = new Set<string>();

    assets.forEach(asset => {
      const uploadDate = asset.uploadedAt?.toDate?.() || new Date(asset.uploadedAt);
      years.add(uploadDate.getFullYear().toString());
    });

    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  } catch (error: any) {
    console.error('Error getting upload years:', error);
    throw new Error('Failed to load upload years');
  }
};
// ============================================================================
// MINISTRY ADMIN WORKFLOWS
// ============================================================================

/**
 * Get assets pending Ministry Admin review for a specific ministry
 * @param ministryId - Ministry ID
 * @returns Array of assets pending ministry review
 */
export const getAssetsForMinistryReview = async (ministryId: string): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    const q = query(
      assetsRef,
      where('ministryId', '==', ministryId),
      where('status', '==', 'pending_ministry_review')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching assets for ministry review:', error);
    throw new Error(getFirestoreErrorMessage(error.code));
  }
};

/**
 * Get all assets (all statuses) for a ministry - for ministry admin dashboard
 * @param ministryId - Ministry ID
 * @returns Array of all assets in the ministry
 */
export const getAllMinistryAssets = async (ministryId: string): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    const q = query(assetsRef, where('ministryId', '==', ministryId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching all ministry assets:', error);
    throw new Error(getFirestoreErrorMessage(error.code));
  }
};

/**
 * Ministry Admin approves an asset (final approval before federal admin)
 * @param assetId - Document ID of the asset
 * @param ministryAdminId - User ID of the ministry admin
 * @param ministryAdminEmail - Email for audit logging
 * @param agencyName - Agency name for audit logging
 */
export const approveAssetByMinistry = async (
  assetId: string,
  ministryAdminId: string,
  ministryAdminEmail?: string,
  agencyName?: string
): Promise<void> => {
  try {
    const assetRef = doc(db, COLLECTIONS.ASSETS, assetId);
    const assetDoc = await getDoc(assetRef);
    
    if (!assetDoc.exists()) {
      throw new Error('Asset not found');
    }
    
    const asset = assetDoc.data() as Asset;

    // Validate asset status is pending_ministry_review
    if (asset.status !== 'pending_ministry_review') {
      throw new Error(
        `Cannot approve asset with status "${asset.status}". Asset must be in "pending_ministry_review" status.`
      );
    }

    await updateDoc(assetRef, {
      status: 'approved',
      approvedByMinistry: ministryAdminId,
      approvedByMinistryAt: Timestamp.now(),
    });

    // Log the action
    if (ministryAdminEmail && agencyName) {
      await logAction({
        userId: ministryAdminId,
        userEmail: ministryAdminEmail,
        agencyName,
        userRole: 'ministry-admin',
        action: 'asset.approve_by_ministry',
        resourceType: 'asset',
        resourceId: assetId,
        details: `Approved asset at Ministry level: ${asset.description} (${asset.assetId})`,
        metadata: {
          assetId: asset.assetId,
          category: asset.category,
          approvedBy: {
            uploader: asset.uploadedBy,
            approver: asset.approvedBy,
            ministryAdmin: ministryAdminId,
          },
        },
      });
    }
  } catch (error: any) {
    console.error('Error approving asset at ministry level:', error);
    
    // Provide specific error messages for better debugging
    if (error.message?.includes('Missing or insufficient permissions')) {
      throw new Error(
        'Permission denied: You do not have access to approve this asset. ' +
        'Ensure you are the ministry admin for this asset\'s ministry.'
      );
    }
    
    if (error.message?.includes('Cannot approve asset')) {
      throw error; // Re-throw our custom validation error
    }
    
    throw new Error(
      error.message || 'Failed to approve asset at ministry level. Please try again.'
    );
  }
};

/**
 * Ministry Admin rejects an asset
 * @param assetId - Document ID of the asset
 * @param ministryAdminId - User ID of the ministry admin
 * @param rejectionReason - Reason for rejection
 * @param ministryAdminEmail - Email for audit logging
 * @param agencyName - Agency name for audit logging
 */
export const rejectAssetByMinistry = async (
  assetId: string,
  ministryAdminId: string,
  rejectionReason: string,
  ministryAdminEmail?: string,
  agencyName?: string
): Promise<void> => {
  try {
    const assetRef = doc(db, COLLECTIONS.ASSETS, assetId);
    const assetDoc = await getDoc(assetRef);
    
    if (!assetDoc.exists()) {
      throw new Error('Asset not found');
    }
    
    const asset = assetDoc.data() as Asset;

    // Validate asset status is pending_ministry_review
    if (asset.status !== 'pending_ministry_review') {
      throw new Error(
        `Cannot reject asset with status "${asset.status}". Asset must be in "pending_ministry_review" status.`
      );
    }

    await updateDoc(assetRef, {
      status: 'rejected',
      rejectedBy: ministryAdminId,
      rejectedAt: Timestamp.now(),
      rejectionReason,
      rejectionLevel: 'ministry-admin',
    });

    // Log the action
    if (ministryAdminEmail && agencyName) {
      await logAction({
        userId: ministryAdminId,
        userEmail: ministryAdminEmail,
        agencyName,
        userRole: 'ministry-admin',
        action: 'asset.reject_by_ministry',
        resourceType: 'asset',
        resourceId: assetId,
        details: `Rejected asset at Ministry level: ${asset.description} (${asset.assetId}) - Reason: ${rejectionReason}`,
        metadata: {
          assetId: asset.assetId,
          category: asset.category,
          rejectionReason,
        },
      });
    }
  } catch (error: any) {
    console.error('Error rejecting asset at ministry level:', error);
    
    // Provide specific error messages for better debugging
    if (error.message?.includes('Missing or insufficient permissions')) {
      throw new Error(
        'Permission denied: You do not have access to reject this asset. ' +
        'Ensure you are the ministry admin for this asset\'s ministry.'
      );
    }
    
    if (error.message?.includes('Cannot reject asset')) {
      throw error; // Re-throw our custom validation error
    }
    
    throw new Error(
      error.message || 'Failed to reject asset at ministry level. Please try again.'
    );
  }
};