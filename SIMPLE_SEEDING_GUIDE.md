# 🌱 Super Simple Database Seeding Guide
**No coding experience needed!** Follow these step-by-step instructions.

---

## 📍 **Where You Are Now:**

You should see a popup window that says **"Start a collection"** with:
- A box that says `/categories` at the top
- A "Document ID" box in the middle
- Fields section at the bottom

If you don't see this, go to: https://console.firebase.google.com/project/nigeria-asset-mgmt/firestore and click "Start collection"

---

## ✅ **What You Need to Do:**

Add **10 categories** (like types of government assets). Each category is like a folder.

---

# 📝 **CATEGORY 1 of 10: Motor Vehicle**

## **Step 1: Name Your Document**

In the **"Document ID"** box, type:
```
motor-vehicle
```
(all lowercase, with a dash, no spaces)

## **Step 2: Add the First Field**

Look for the **"Field"** box (empty box on the left side).

1. **Click in the Field box** and type: `name`
2. **Next to it, there's a dropdown** that says "string" - leave it as **string**
3. **In the big box below**, type: `Motor Vehicle`

## **Step 3: Add More Fields**

You'll see a button that says **"+ Add field"** at the bottom. Click it 3 times to add 3 more fields.

### **Field 2:**
- Field name: `description`
- Type: **string**
- Value: `Government vehicles like cars, trucks, and buses`

### **Field 3:** (This one is tricky - follow carefully!)
- Field name: `requiredFields`
- Type: Click the dropdown and select **array** (not string!)

After selecting array, you'll see **"Add item"** button appear. Click it **6 times** and add these words (one per box):
1. Click "Add item" → type `make`
2. Click "Add item" → type `model`
3. Click "Add item" → type `year`
4. Click "Add item" → type `mileage`
5. Click "Add item" → type `registrationNumber`
6. Click "Add item" → type `condition`

### **Field 4:**
- Field name: `createdAt`
- Type: Click dropdown and select **timestamp**
- After selecting timestamp, you'll see a clock icon ⏰ - **Click it** and select "Set to current time"

## **Step 4: Save**

Click the blue **"Save"** button at the bottom right.

**🎉 Done! You just created Category 1!**

---

# 📝 **CATEGORY 2 of 10: Land**

After saving Category 1, you'll see your `motor-vehicle` document. Now add the next one:

1. Look for **"+ Add document"** button - click it

## Fill in these fields:

**Document ID:** `land`

**Field 1:**
- name: `name`
- type: string
- value: `Land`

**Field 2:**
- name: `description`
- type: string
- value: `Real estate properties and land parcels`

**Field 3:**
- name: `requiredFields`
- type: **array**
- Add these 4 items (click "Add item" 4 times):
  1. `sizeInAcres`
  2. `landTitleType`
  3. `zoning`
  4. `surveyPlanNumber`

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time (click clock icon)

**Save!**

---

# 📝 **CATEGORY 3 of 10: Building**

Click **"+ Add document"** again.

**Document ID:** `building`

**Field 1:**
- name: `name`
- type: string
- value: `Building`

**Field 2:**
- name: `description`
- type: string
- value: `Office blocks, warehouses, and other structures`

**Field 3:**
- name: `requiredFields`
- type: **array**
- Add these 5 items:
  1. `buildingType`
  2. `numberOfFloors`
  3. `yearBuilt`
  4. `buildingArea`
  5. `condition`

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time

**Save!**

---

# 📝 **CATEGORY 4 of 10: Office Equipment**

Click **"+ Add document"**.

**Document ID:** `office-equipment`

**Field 1:**
- name: `name`
- type: string
- value: `Office Equipment`

**Field 2:**
- name: `description`
- type: string
- value: `Laptops, computers, printers, and office machines`

**Field 3:**
- name: `requiredFields`
- type: **array**
- Add these 5 items:
  1. `equipmentType`
  2. `brand`
  3. `model`
  4. `serialNumber`
  5. `condition`

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time

**Save!**

---

# 📝 **CATEGORY 5 of 10: Furniture & Fittings**

Click **"+ Add document"**.

**Document ID:** `furniture-fittings`

**Field 1:**
- name: `name`
- type: string
- value: `Furniture & Fittings`

**Field 2:**
- name: `description`
- type: string
- value: `Office furniture like desks, chairs, and cabinets`

**Field 3:**
- name: `requiredFields`
- type: **array**
- Add these 3 items:
  1. `furnitureType`
  2. `material`
  3. `condition`

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time

**Save!**

---

# 📝 **CATEGORY 6 of 10: Plant/Generator**

Click **"+ Add document"**.

**Document ID:** `plant-generator`

**Field 1:**
- name: `name`
- type: string
- value: `Plant/Generator`

**Field 2:**
- name: `description`
- type: string
- value: `Power generators and industrial machinery`

**Field 3:**
- name: `requiredFields`
- type: **array**
- Add these 5 items:
  1. `generatorType`
  2. `capacityKW`
  3. `fuelType`
  4. `yearManufactured`
  5. `condition`

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time

**Save!**

---

# 📝 **CATEGORY 7 of 10: Infrastructure**

Click **"+ Add document"**.

**Document ID:** `infrastructure`

**Field 1:**
- name: `name`
- type: string
- value: `Infrastructure`

**Field 2:**
- name: `description`
- type: string
- value: `Roads, bridges, and public infrastructure`

**Field 3:**
- name: `requiredFields`
- type: **array**
- Add these 4 items:
  1. `infrastructureType`
  2. `lengthOrArea`
  3. `yearCompleted`
  4. `condition`

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time

**Save!**

---

# 📝 **CATEGORY 8 of 10: Extractive Assets**

Click **"+ Add document"**.

**Document ID:** `extractive-assets`

**Field 1:**
- name: `name`
- type: string
- value: `Extractive Assets`

**Field 2:**
- name: `description`
- type: string
- value: `Oil fields, mining operations, and natural resources`

**Field 3:**
- name: `requiredFields`
- type: **array**
- Add these 4 items:
  1. `assetType`
  2. `location`
  3. `estimatedReserves`
  4. `operationalStatus`

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time

**Save!**

---

# 📝 **CATEGORY 9 of 10: Corporate/Financial Assets**

Click **"+ Add document"**.

**Document ID:** `corporate-financial-assets`

**Field 1:**
- name: `name`
- type: string
- value: `Corporate/Financial Assets`

**Field 2:**
- name: `description`
- type: string
- value: `Shares, stocks, bonds, and financial instruments`

**Field 3:**
- name: `requiredFields`
- type: **array**
- Add these 4 items:
  1. `assetType`
  2. `tickerSymbol`
  3. `numberOfShares`
  4. `purchasePrice`

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time

**Save!**

---

# 📝 **CATEGORY 10 of 10: Others** (Last one!)

Click **"+ Add document"**.

**Document ID:** `others`

**Field 1:**
- name: `name`
- type: string
- value: `Others`

**Field 2:**
- name: `description`
- type: string
- value: `Assets that don't fit other categories`

**Field 3:**
- name: `requiredFields`
- type: **array**
- **IMPORTANT:** Don't add any items! Leave the array EMPTY.

**Field 4:**
- name: `createdAt`
- type: timestamp
- value: Set to current time

**Save!**

---

## 🎉 **YOU DID IT! All 10 Categories Added!**

You should now see 10 documents in your `categories` collection:
1. motor-vehicle
2. land
3. building
4. office-equipment
5. furniture-fittings
6. plant-generator
7. infrastructure
8. extractive-assets
9. corporate-financial-assets
10. others

---

## 👤 **Next: Create Admin User**

Now we need to create an admin user to manage everything.

### **Method 1: Register Through the App** (Easier)

1. Open your app: http://localhost:3000/register
2. Fill in the form:
   - **Agency Name**: `Central Admin - Federal Republic of Nigeria`
   - **Email**: `admin@nigeria-asset-mgmt.gov.ng`
   - **Password**: `AdminSecure123!`
   - **Region**: `FCT (Abuja)`
   - **Ministry Type**: `Federal Ministry`
3. Click "Register Agency"

4. **Now make them an admin:**
   - Go back to Firebase Console: https://console.firebase.google.com/project/nigeria-asset-mgmt/firestore
   - Click on `users` collection (you should see your new user)
   - Click on the user document
   - Find the `role` field
   - Click on the value (it says `agency`)
   - Change it to: `admin`
   - Click "Update"

**Done!** You now have an admin user!

---

## ✅ **Check Your Work:**

### **Categories Collection:**
- Go to Firestore
- Click on `categories` collection
- You should see 10 documents

### **Admin User:**
- Go to Authentication tab
- You should see: admin@nigeria-asset-mgmt.gov.ng
- Go to Firestore > `users` collection
- Find the admin user
- Check that `role` = `admin`

---

## 🔐 **Test Login:**

1. Go to: http://localhost:3000/login
2. Login with:
   - Email: `admin@nigeria-asset-mgmt.gov.ng`
   - Password: `AdminSecure123!`
3. You should see the dashboard
4. Your role should show as "admin"

---

## 🎊 **CONGRATULATIONS!**

Your database is now ready for Phase 4!

**Everything is working if:**
- ✅ You see 10 categories in Firestore
- ✅ You can login as admin
- ✅ Dashboard shows "admin" role

---

## 🆘 **Common Problems:**

### **Problem: Can't find "Add field" button**
**Solution:** Look at the bottom of the fields section. Scroll down if needed.

### **Problem: Don't see "array" in the type dropdown**
**Solution:** Click on the dropdown slowly. It should show: string, number, boolean, map, array, reference, geopoint, timestamp

### **Problem: Can't save document**
**Solution:** Make sure all required fields are filled:
- `name` (string)
- `description` (string)
- `requiredFields` (array)
- `createdAt` (timestamp)

### **Problem: Made a mistake**
**Solution:** Click on the document, then click the 3 dots (...) at the top right, select "Delete document", and start over.

---

**Need help?** Take a screenshot and show me where you're stuck!
