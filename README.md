# Nigeria Government Asset Management System

A comprehensive web-based platform for managing government assets across ministries, departments, and agencies in Nigeria.

## Overview

This system enables government agencies to upload, track, and manage their assets in a centralized database. It features role-based access control, bulk upload capabilities, and powerful filtering and reporting tools.

## Features

### For Agencies
- **Asset Upload**: Upload individual assets with detailed information
- **Bulk Upload**: Import multiple assets using Excel templates
- **Asset Viewing**: View all uploaded assets with filtering and search
- **Excel Export**: Export asset data to Excel for offline analysis
- **Category-Specific Fields**: Dynamic forms adapt based on asset category

### For Administrators
- **Cross-Agency View**: View all assets across all agencies and ministries
- **Advanced Filtering**: Filter by agency, category, date range, and more
- **Comprehensive Reports**: Export filtered data to Excel
- **User Management**: View and manage agency accounts

### Security Features
- Email verification required for asset operations
- Role-based access control (Agency vs Admin)
- Firebase Authentication integration
- Secure Firestore database with security rules

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI)
- **Build Tool**: Vite
- **Backend**: Firebase (Firestore + Authentication)
- **Form Handling**: React Hook Form with Yup validation
- **Routing**: React Router v6
- **Excel Processing**: XLSX library

## Asset Categories

The system supports the following asset categories:
- Motor Vehicle
- Furniture & Fitting
- Office Equipment
- Plant & Generator
- Land
- Building
- Computer Equipment
- Corporate/Financial Asset

Each category can have custom required fields defined in the database.

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository
2. Install dependencies: npm install
3. Configure Firebase environment variables in .env
4. Start development server: npm run dev

## User Roles

### Agency User
- Can upload individual or bulk assets
- Can view their own assets only
- Cannot edit or delete assets once uploaded (immutable for audit trail)
- Requires email verification for asset operations

### Admin User
- Can view all assets across all agencies
- Can filter and export comprehensive reports
- Has access to admin panel with analytics
- Cannot edit or delete assets (view-only for audit trail)

## Security

- All asset operations require authentication
- Email verification required before uploading assets
- Firestore security rules enforce role-based access
- Assets are immutable once created (audit trail)
- Password reset functionality available

## License

Copyright © 2026 Nigeria Government Asset Management System. All rights reserved.

## Version

Current Version: 1.0.0
