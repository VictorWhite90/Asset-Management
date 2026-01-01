import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Asset, AssetFormData } from '@/types/asset.types';
import { Category } from '@/types/category.types';
import { COLLECTIONS, ERROR_MESSAGES } from '@/utils/constants';
import { isValidAssetDate, sanitizeDocumentId, generateAssetId } from '@/utils/assetHelpers';

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
 * @returns Asset ID of the created asset
 */
export const createAsset = async (
  assetData: AssetFormData,
  userId: string,
  agencyName: string,
  skipCategoryValidation: boolean = false
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
      agencyName,
      description: assetData.description,
      category: assetData.category,
      location: assetData.location,
      purchasedDate: assetData.purchasedDate,
      purchaseCost: assetData.purchaseCost,
      uploadTimestamp: Timestamp.now(),
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
    if (assetData.assetId) {
      // Use custom asset ID
      const assetRef = doc(db, COLLECTIONS.ASSETS, assetId);
      await setDoc(assetRef, assetDocument);
    } else {
      // Auto-generate Firestore document ID
      const assetsRef = collection(db, COLLECTIONS.ASSETS);
      const docRef = await addDoc(assetsRef, assetDocument);
      return docRef.id;
    }

    return assetId;
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
 * Fetch all assets for a specific agency
 * @param agencyId - User ID of the agency
 * @returns Array of assets owned by the agency
 */
export const getAgencyAssets = async (agencyId: string): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, COLLECTIONS.ASSETS);
    const q = query(assetsRef, where('agencyId', '==', agencyId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as Asset[];
  } catch (error: any) {
    console.error('Error fetching agency assets:', error);
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
