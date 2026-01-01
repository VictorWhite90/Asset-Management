import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmailVerification = false,
}) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireEmailVerification && !currentUser.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
