import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider } from '@/contexts/AuthContext';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleBasedRoute from '@/components/RoleBasedRoute';

// Pages
import LandingPage from '@/legacy-pages/LandingPage';
import LoginPage from '@/legacy-pages/LoginPage';
import RegisterLandingPage from '@/legacy-pages/RegisterLandingPage';
import RegisterPage from '@/legacy-pages/RegisterPage';
import RegisterMinistryAdminPage from '@/legacy-pages/RegisterMinistryAdminPage';
import MinistryAdminDashboardPage from '@/legacy-pages/MinistryAdminDashboardPage';
import ForgotPasswordPage from '@/legacy-pages/ForgotPasswordPage';
import VerifyEmailPage from '@/legacy-pages/VerifyEmailPage';
import EmailActionPage from '@/legacy-pages/EmailActionPage';
import DashboardPage from '@/legacy-pages/DashboardPage';
import AssetUploadPage from '@/legacy-pages/AssetUploadPage';
import BulkUploadPage from '@/legacy-pages/BulkUploadPage';
import AgencyAssetsPage from '@/legacy-pages/AgencyAssetsPage';
import AgencyReportsPage from '@/legacy-pages/AgencyReportsPage';
import AssetDetailsPage from '@/legacy-pages/AssetDetailsPage';
import EditAssetPage from '@/legacy-pages/EditAssetPage';
import ReviewUploadsPage from '@/legacy-pages/ReviewUploadsPage';
import ViewUploadsPage from '@/legacy-pages/ViewUploadsPage';
import AdminAssetsPage from '@/legacy-pages/AdminAssetsPage';
import AdminMinistryAdminVerificationsPage from '@/legacy-pages/AdminMinistryAdminVerificationsPage';
import AdminMinistriesPage from '@/legacy-pages/AdminMinistriesPage';
import AdminUsersPage from '@/legacy-pages/AdminUsersPage';
import ProfilePage from '@/legacy-pages/ProfilePage';
import ActivityLogPage from '@/legacy-pages/ActivityLogPage';
import ReportsPage from '@/legacy-pages/ReportsPage';
import { appTheme } from '@/theme';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterLandingPage />} />
            <Route path="/register-staff" element={<RegisterPage />} />
            <Route path="/register-ministry-admin" element={<RegisterMinistryAdminPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/action" element={<EmailActionPage />} />

            {/* Protected Routes */}
            <Route
              path="/verify-email"
              element={
                <ProtectedRoute>
                  <VerifyEmailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <ActivityLogPage />
                </ProtectedRoute>
              }
            />

            {/* Ministry Admin Routes */}
            <Route
              path="/ministry-admin/dashboard"
              element={
                <ProtectedRoute requireEmailVerification>
                  <RoleBasedRoute allowedRoles={['ministry-admin']}>
                    <MinistryAdminDashboardPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />

            {/* Asset Management Routes (Agency Only) */}
            <Route
              path="/assets/upload"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['agency']}>
                    <AssetUploadPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/view-uploads"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['agency', 'agency-approver']}>
                    <ViewUploadsPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/bulk-upload"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['agency']}>
                    <BulkUploadPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/my-assets"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['agency']}>
                    <AgencyAssetsPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agency/reports"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['agency']}>
                    <AgencyReportsPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/view/:id"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <AssetDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/edit/:id"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['agency']}>
                    <EditAssetPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />

            {/* Approver Routes (Agency Approver Only) */}
            <Route
              path="/approver/review-uploads"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['agency-approver']}>
                    <ReviewUploadsPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/assets"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <AdminAssetsPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <AdminMinistryAdminVerificationsPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ministries"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <AdminMinistriesPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <AdminUsersPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />

            {/* Reports Route (Admin, Ministry Admin, and Approver) */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['admin', 'ministry-admin', 'agency-approver']}>
                    <ReportsPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />

            {/* 404 Route - redirect to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
