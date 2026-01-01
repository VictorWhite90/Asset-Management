# Firebase Console Manual Seeding Guide - Phase 3

This guide will help you manually seed the Firestore database through the Firebase Console.

## 📋 Prerequisites

1. Access to Firebase Console: https://console.firebase.google.com
2. Your project selected
3. Firestore Database enabled

---

## 🌱 Step 1: Seed Categories Collection

### Navigate to Firestore

1. Go to **Firestore Database** in the Firebase Console sidebar
2. Click **"Start collection"** (if no collections exist) or find the `categories` collection

### Collection: `categories`

Create **10 documents** with the following structure:

---

### Document 1: Motor Vehicle

- **Document ID:** `motor-vehicle` (or click "Auto-ID" and use manual ID)

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Motor Vehicle` |
| `description` | string | `Government vehicles including cars (e.g., Toyota Camry), trucks, buses, and other motorized transportation assets` |
| `requiredFields` | array | `["make", "model", "year", "mileage", "registrationNumber", "condition"]` |
| `createdAt` | timestamp | Click "Set to current time" |

**To add requiredFields array:**
1. Click "Add field"
2. Field name: `requiredFields`
3. Type: Select **"array"**
4. Click "Add item" for each field:
   - Click "Add item" → Enter `make` → Click "Add item" → Enter `model` → Continue for all 6 fields
   - Final array should have: `make`, `model`, `year`, `mileage`, `registrationNumber`, `condition`

---

### Document 2: Land

- **Document ID:** `land`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Land` |
| `description` | string | `Real estate properties including plots in Lagos and other locations, undeveloped land, and land parcels` |
| `requiredFields` | array | `["sizeInAcres", "landTitleType", "zoning", "surveyPlanNumber"]` |
| `createdAt` | timestamp | Set to current time |

---

### Document 3: Building

- **Document ID:** `building`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Building` |
| `description` | string | `Structures including office blocks, residential buildings, warehouses, and other constructed facilities` |
| `requiredFields` | array | `["buildingType", "numberOfFloors", "yearBuilt", "buildingArea", "condition"]` |
| `createdAt` | timestamp | Set to current time |

---

### Document 4: Office Equipment

- **Document ID:** `office-equipment`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Office Equipment` |
| `description` | string | `Office technology and equipment including laptops, computers, printers, scanners, and other office machinery` |
| `requiredFields` | array | `["equipmentType", "brand", "model", "serialNumber", "condition"]` |
| `createdAt` | timestamp | Set to current time |

---

### Document 5: Furniture & Fittings

- **Document ID:** `furniture-fittings`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Furniture & Fittings` |
| `description` | string | `Office furniture, fixtures, and fittings including desks, chairs, cabinets, and other furnishings` |
| `requiredFields` | array | `["furnitureType", "material", "condition"]` |
| `createdAt` | timestamp | Set to current time |

---

### Document 6: Plant/Generator

- **Document ID:** `plant-generator`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Plant/Generator` |
| `description` | string | `Power generation equipment, generators, and industrial plant machinery` |
| `requiredFields` | array | `["generatorType", "capacityKW", "fuelType", "yearManufactured", "condition"]` |
| `createdAt` | timestamp | Set to current time |

---

### Document 7: Infrastructure

- **Document ID:** `infrastructure`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Infrastructure` |
| `description` | string | `Public infrastructure including roads, bridges, water systems, and other civil engineering assets` |
| `requiredFields` | array | `["infrastructureType", "lengthOrArea", "yearCompleted", "condition"]` |
| `createdAt` | timestamp | Set to current time |

---

### Document 8: Extractive Assets

- **Document ID:** `extractive-assets`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Extractive Assets` |
| `description` | string | `Natural resource assets including oil fields, mining operations, and extractive industry assets` |
| `requiredFields` | array | `["assetType", "location", "estimatedReserves", "operationalStatus"]` |
| `createdAt` | timestamp | Set to current time |

---

### Document 9: Corporate/Financial Assets

- **Document ID:** `corporate-financial-assets`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Corporate/Financial Assets` |
| `description` | string | `Financial instruments including shares, stocks, bonds, and other corporate/financial holdings` |
| `requiredFields` | array | `["assetType", "tickerSymbol", "numberOfShares", "purchasePrice"]` |
| `createdAt` | timestamp | Set to current time |

---

### Document 10: Others

- **Document ID:** `others`

**Fields:**
| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Others` |
| `description` | string | `Other assets that do not fit into the above categories` |
| `requiredFields` | array | `[]` (empty array) |
| `createdAt` | timestamp | Set to current time |

**To create empty array:**
1. Click "Add field"
2. Field name: `requiredFields`
3. Type: Select **"array"**
4. Don't add any items - leave it empty

---

## 👥 Step 2: Users Collection Structure

The `users` collection structure should be:

### Collection: `users`

Each document represents a user (agency/admin). Document ID should be the Firebase Auth UID.

**Required Fields:**
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `userId` | string | Firebase Auth UID (same as document ID) | `abc123xyz` |
| `email` | string | User email address | `admin@agency.gov.ng` |
| `agencyName` | string | Name of agency/organization | `Ministry of Finance` |
| `role` | string | User role: `"agency"` or `"admin"` | `admin` |
| `region` | string | Nigerian state/region | `Lagos` |
| `createdAt` | timestamp | Account creation date | Set to current time |

**Optional Fields:**
- `ministryType` (string) - e.g., "Federal Ministry", "State Agency"
- `emailVerified` (boolean) - Email verification status

---

## 🏢 Step 3: Assets Collection Structure

The `assets` collection structure should be:

### Collection: `assets`

Each document represents an asset. Document ID can be auto-generated or use custom assetId.

**Core Required Fields:**
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `assetId` | string | Unique asset identifier | `AE-23-001` |
| `agencyId` | string | Reference to user who owns/manages asset | `abc123xyz` |
| `description` | string | Asset description | `Toyota Camry 2020` |
| `category` | string | Category name (reference to categories.name) | `Motor Vehicle` |
| `location` | string | **Where the asset is located** | `Ikorodu, Lagos` |
| `purchasedDate` | map | Purchase date with day/month/year | See below |
| `purchaseCost` | number | Original purchase price | `15000000` |
| `marketValue` | number | **Current market worth of the asset** | `12000000` |
| `uploadTimestamp` | timestamp | When asset was uploaded | Set to current time |

**Optional Fields:**
- `verifiedBy` (string) - User who verified the asset
- `verifiedDate` (timestamp) - When asset was verified
- `agencyName` (string) - Denormalized agency name
- `remarks` (string) - Additional notes

### PurchasedDate Map Structure

When adding `purchasedDate`:
1. Click "Add field"
2. Field name: `purchasedDate`
3. Type: Select **"map"**
4. Add sub-fields:
   - `day` (number): e.g., `15`
   - `month` (string): e.g., `"January"` or `"March"`
   - `year` (number): e.g., `2020`

### Category-Specific Fields

Based on the category's `requiredFields`, you can add additional fields to assets:

**For Motor Vehicle:**
- `make` (string): e.g., `"Toyota"`
- `model` (string): e.g., `"Camry"`
- `year` (number): e.g., `2020`
- `mileage` (number): e.g., `50000`
- `registrationNumber` (string): e.g., `"LAG-123-ABC"`
- `condition` (string): e.g., `"Good"`

**For Land:**
- `sizeInAcres` (number): e.g., `2.5`
- `landTitleType` (string): e.g., `"Certificate of Occupancy"`
- `zoning` (string): e.g., `"Residential"`
- `surveyPlanNumber` (string): e.g., `"SP-12345"`

**And so on for other categories...**

---

## ✅ Verification Checklist

After seeding, verify:

- [ ] **Categories Collection:**
  - [ ] 10 documents created
  - [ ] Each has `name`, `description`, `requiredFields` (array), `createdAt`
  - [ ] All requiredFields arrays are properly populated

- [ ] **Users Collection:**
  - [ ] Structure matches specification
  - [ ] At least one admin user exists

- [ ] **Assets Collection:**
  - [ ] Structure includes `location` and `marketValue` fields
  - [ ] `purchasedDate` is a map with day/month/year

---

## 🔄 Alternative: Use the Seed Script

Instead of manual seeding, you can use the provided seed script:

```bash
# Make sure you have a .env file with Firebase config
node scripts/seedFirestore.cjs
```

This will automatically seed all categories with the correct structure.

---

## 📝 Quick Reference: Required Fields by Category

| Category | Required Fields |
|----------|----------------|
| Motor Vehicle | make, model, year, mileage, registrationNumber, condition |
| Land | sizeInAcres, landTitleType, zoning, surveyPlanNumber |
| Building | buildingType, numberOfFloors, yearBuilt, buildingArea, condition |
| Office Equipment | equipmentType, brand, model, serialNumber, condition |
| Furniture & Fittings | furnitureType, material, condition |
| Plant/Generator | generatorType, capacityKW, fuelType, yearManufactured, condition |
| Infrastructure | infrastructureType, lengthOrArea, yearCompleted, condition |
| Extractive Assets | assetType, location, estimatedReserves, operationalStatus |
| Corporate/Financial Assets | assetType, tickerSymbol, numberOfShares, purchasePrice |
| Others | (none) |

---

## 🆘 Troubleshooting

### Issue: Can't add array field
**Solution:** Make sure you select type "array" first, then add items one by one.

### Issue: Can't add map field
**Solution:** Select type "map", then add sub-fields within the map.

### Issue: Field type not available
**Solution:** Use the dropdown in Firebase Console to select the correct type. Common types: string, number, boolean, timestamp, map, array.

### Issue: Can't edit collection
**Solution:** Check Firestore security rules. You may need to temporarily allow writes for seeding, or use the Firebase Admin SDK.

---

**Need help?** Check the seed script at `scripts/seedFirestore.cjs` for the exact data structure.


