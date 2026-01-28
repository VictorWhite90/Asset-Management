import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * Role-Based Route Component
 * Extends ProtectedRoute functionality to check user roles
 * Redirects to dashboard if user doesn't have required role
 */
const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children, allowedRoles }) => {
  const { userData, loading } = useAuth();

  useEffect(() => {
    // Show error toast if user doesn't have required role (only once per navigation)
    if (!loading && userData && !allowedRoles.includes(userData.role)) {
      const errorKey = `role-error-${window.location.pathname}`;
      const hasShown = sessionStorage.getItem(errorKey);

      if (!hasShown) {
        toast.error('You do not have permission to access this page');
        sessionStorage.setItem(errorKey, 'true');
      }
    }
  }, [userData, loading, allowedRoles]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Check if user has required role
  if (userData && allowedRoles.includes(userData.role)) {
    return <>{children}</>;
  }

  // Redirect to dashboard if user doesn't have required role
  return <Navigate to="/dashboard" replace />;
};

export default RoleBasedRoute;
