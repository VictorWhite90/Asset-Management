import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';
import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
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
  const [hasShownError, setHasShownError] = useState(false);

  useEffect(() => {
    // Show error toast if user doesn't have required role
    if (!loading && userData && !allowedRoles.includes(userData.role) && !hasShownError) {
      toast.error('You do not have permission to access this page');
      setHasShownError(true);
    }
  }, [userData, loading, allowedRoles, hasShownError]);

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
