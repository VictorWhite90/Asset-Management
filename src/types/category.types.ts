import { Timestamp } from 'firebase/firestore';

/**
 * Category interface matching Firestore structure
 * Defines asset categories with their required fields for dynamic form generation
 */
export interface Category {
  name: string;
  description: string;
  requiredFields: string[]; // Dynamic fields based on asset category
  createdAt: Timestamp;
}

/**
 * Category document with Firestore document ID
 * Used when fetching categories from Firestore
 */
export interface CategoryDocument extends Category {
  id: string; // Firestore document ID (e.g., 'motor-vehicle')
}
