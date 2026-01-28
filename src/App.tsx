import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider } from '@/contexts/AuthContext';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleBasedRoute from '@/components/RoleBasedRoute';
import Footer from '@/components/Footer';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterLandingPage from '@/pages/RegisterLandingPage';
import RegisterPage from '@/pages/RegisterPage';
import RegisterMinistryAdminPage from '@/pages/RegisterMinistryAdminPage';
import MinistryAdminDashboardPage from '@/pages/MinistryAdminDashboardPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import EmailActionPage from '@/pages/EmailActionPage';
import DashboardPage from '@/pages/DashboardPage';
import AssetUploadPage from '@/pages/AssetUploadPage';
import BulkUploadPage from '@/pages/BulkUploadPage';
import AgencyAssetsPage from '@/pages/AgencyAssetsPage';
import AgencyReportsPage from '@/pages/AgencyReportsPage';
import AssetDetailsPage from '@/pages/AssetDetailsPage';
import EditAssetPage from '@/pages/EditAssetPage';
import ReviewUploadsPage from '@/pages/ReviewUploadsPage';
import ViewUploadsPage from '@/pages/ViewUploadsPage';
import AdminAssetsPage from '@/pages/AdminAssetsPage';
import AdminMinistryAdminVerificationsPage from '@/pages/AdminMinistryAdminVerificationsPage';
import AdminMinistriesPage from '@/pages/AdminMinistriesPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import ProfilePage from '@/pages/ProfilePage';
import ActivityLogPage from '@/pages/ActivityLogPage';
import ReportsPage from '@/pages/ReportsPage';

// Dark Government Security Theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#008751', // Nigerian Green
      light: '#00ff88',
      dark: '#006038',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00ff88', // Accent Green
      light: '#66ffaa',
      dark: '#00cc6a',
      contrastText: '#0a1a0d',
    },
    error: {
      main: '#ff4444',
      light: '#ff6666',
      dark: '#cc0000',
    },
    warning: {
      main: '#b8860b', // Gold for warnings
      light: '#daa520',
      dark: '#8b6508',
    },
    success: {
      main: '#00ff88',
      light: '#66ffaa',
      dark: '#00cc6a',
    },
    background: {
      default: '#0a1a0d', // Dark green-black
      paper: '#0d2818', // Slightly lighter dark green
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.4)',
    },
    divider: 'rgba(0, 135, 81, 0.2)',
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a1a0d',
          backgroundImage: 'linear-gradient(180deg, #0a1a0d 0%, #0d2818 50%, #0a1a0d 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(13, 40, 24, 0.9)',
          backgroundImage: 'none',
          border: '1px solid rgba(0, 135, 81, 0.2)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(13, 40, 24, 0.9)',
          border: '1px solid rgba(0, 135, 81, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: '0 4px 15px rgba(0, 135, 81, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(0, 135, 81, 0.4)',
          },
        },
        outlined: {
          borderColor: 'rgba(0, 135, 81, 0.5)',
          '&:hover': {
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 135, 81, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(0, 20, 10, 0.5)',
            '& fieldset': {
              borderColor: 'rgba(0, 135, 81, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 135, 81, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#008751',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 135, 81, 0.15)',
        },
        head: {
          backgroundColor: 'rgba(0, 135, 81, 0.1)',
          fontWeight: 700,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 135, 81, 0.08) !important',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 135, 81, 0.3)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardInfo: {
          backgroundColor: 'rgba(0, 135, 81, 0.15)',
          color: '#00ff88',
          border: '1px solid rgba(0, 135, 81, 0.3)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          color: '#00ff88',
          border: '1px solid rgba(0, 255, 136, 0.3)',
        },
        standardWarning: {
          backgroundColor: 'rgba(184, 134, 11, 0.15)',
          color: '#daa520',
          border: '1px solid rgba(184, 134, 11, 0.3)',
        },
        standardError: {
          backgroundColor: 'rgba(255, 68, 68, 0.15)',
          color: '#ff6666',
          border: '1px solid rgba(255, 68, 68, 0.3)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0d2818',
          border: '1px solid rgba(0, 135, 81, 0.3)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0d2818',
          border: '1px solid rgba(0, 135, 81, 0.3)',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 20, 10, 0.5)',
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 20, 10, 0.5)',
          '&:hover': {
            backgroundColor: 'rgba(0, 20, 10, 0.6)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(0, 20, 10, 0.7)',
          },
          '&.Mui-disabled': {
            backgroundColor: 'rgba(0, 20, 10, 0.3)',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            backgroundColor: 'transparent',
          },
        },
        input: {
          '&:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 100px #0d2818 inset !important',
            WebkitTextFillColor: '#FFFFFF !important',
            caretColor: '#FFFFFF',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#00ff88',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#00ff88',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
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

            {/* Reports Route (Admin and Ministry Admin) */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute requireEmailVerification={true}>
                  <RoleBasedRoute allowedRoles={['admin', 'ministry-admin']}>
                    <ReportsPage />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />

            {/* 404 Route - redirect to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Footer />

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
