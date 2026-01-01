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
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import DashboardPage from '@/pages/DashboardPage';
import AssetUploadPage from '@/pages/AssetUploadPage';
import BulkUploadPage from '@/pages/BulkUploadPage';
import AgencyAssetsPage from '@/pages/AgencyAssetsPage';
import AdminAssetsPage from '@/pages/AdminAssetsPage';

// Nigeria flag colors theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#008751', // Green from Nigerian flag
      light: '#00a862',
      dark: '#006038',
    },
    secondary: {
      main: '#FFFFFF', // White from Nigerian flag
      contrastText: '#008751',
    },
    error: {
      main: '#d32f2f',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
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
});

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
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
