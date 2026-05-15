'use client';

import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleBasedRoute from '@/components/RoleBasedRoute';
import LandingPage from '@/legacy-pages/LandingPage';
import LoginPage from '@/legacy-pages/LoginPage';
import RegisterLandingPage from '@/legacy-pages/RegisterLandingPage';
import RegisterPage from '@/legacy-pages/RegisterPage';
import RegisterMinistryAdminPage from '@/legacy-pages/RegisterMinistryAdminPage';
import MinistryAdminDashboardPage from '@/legacy-pages/MinistryAdminDashboardPage';
import ForgotPasswordPage from '@/legacy-pages/ForgotPasswordPage';
import ResetPasswordPage from '@/legacy-pages/ResetPasswordPage';
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

const withProtected = (page: React.ReactNode, requireEmailVerification = false) => (
  <ProtectedRoute requireEmailVerification={requireEmailVerification}>{page}</ProtectedRoute>
);

const withRole = (
  page: React.ReactNode,
  allowedRoles: Array<'agency' | 'agency-approver' | 'ministry-admin' | 'admin'>,
  requireEmailVerification = true
) => withProtected(<RoleBasedRoute allowedRoles={allowedRoles}>{page}</RoleBasedRoute>, requireEmailVerification);

export default function ClientPageRouter() {
  const pathname = usePathname() || '/';

  if (pathname === '/') return <LandingPage />;
  if (pathname === '/login') return <LoginPage />;
  if (pathname === '/register') return <RegisterLandingPage />;
  if (pathname === '/register-staff') return <RegisterPage />;
  if (pathname === '/register-ministry-admin') return <RegisterMinistryAdminPage />;
  if (pathname === '/forgot-password') return <ForgotPasswordPage />;
  if (pathname === '/reset-password') return <ResetPasswordPage />;
  if (pathname === '/auth/action') return <EmailActionPage />;
  if (pathname === '/verify-email') return withProtected(<VerifyEmailPage />);
  if (pathname === '/dashboard') return withProtected(<DashboardPage />);
  if (pathname === '/profile') return withProtected(<ProfilePage />);
  if (pathname === '/activity') return withProtected(<ActivityLogPage />);
  if (pathname === '/ministry-admin/dashboard') {
    return withRole(<MinistryAdminDashboardPage />, ['ministry-admin']);
  }
  if (pathname === '/assets/upload') return withRole(<AssetUploadPage />, ['agency']);
  if (pathname === '/assets/view-uploads') return withRole(<ViewUploadsPage />, ['agency', 'agency-approver']);
  if (pathname === '/assets/bulk-upload') return withRole(<BulkUploadPage />, ['agency']);
  if (pathname === '/assets/my-assets') return withRole(<AgencyAssetsPage />, ['agency']);
  if (pathname === '/agency/reports') return withRole(<AgencyReportsPage />, ['agency']);
  if (pathname.startsWith('/assets/view/')) return withProtected(<AssetDetailsPage />, true);
  if (pathname.startsWith('/assets/edit/')) return withRole(<EditAssetPage />, ['agency']);
  if (pathname === '/approver/review-uploads') return withRole(<ReviewUploadsPage />, ['agency-approver']);
  if (pathname === '/admin/assets') return withRole(<AdminAssetsPage />, ['admin']);
  if (pathname === '/admin/verifications') return withRole(<AdminMinistryAdminVerificationsPage />, ['admin']);
  if (pathname === '/admin/ministries') return withRole(<AdminMinistriesPage />, ['admin']);
  if (pathname === '/admin/users') return withRole(<AdminUsersPage />, ['admin']);
  if (pathname === '/reports') return withRole(<ReportsPage />, ['admin', 'ministry-admin', 'agency-approver']);

  return <LandingPage />;
}
