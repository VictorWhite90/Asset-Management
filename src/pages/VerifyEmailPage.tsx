import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Alert,
  Chip,
} from '@mui/material';
import { Email, CheckCircle, Lock, GppGood } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { resendVerificationEmail, syncEmailVerificationStatus } from '@/services/auth.service';
import { SUCCESS_MESSAGES } from '@/utils/constants';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(true);

  const handleResendEmail = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      await resendVerificationEmail(currentUser);
      setEmailSent(true);
      toast.success(SUCCESS_MESSAGES.AUTH.EMAIL_SENT);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleContinue = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Sync email verification status from Firebase Auth to Firestore
      const isVerified = await syncEmailVerificationStatus(currentUser);

      if (isVerified) {
        toast.success('Email verified successfully!');
        // Force reload auth context to get updated userData
        window.location.href = '/dashboard';
      } else {
        toast.warning('Please verify your email first by clicking the link in your inbox');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify email status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Presidential Seal Watermark */}
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          opacity: 0.025,
          backgroundImage: 'url("/Seal_of_the_President_of_Nigeria.svg")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Security Banner */}
      <Box
        sx={{
          backgroundColor: '#0a0505',
          py: 0.5,
          borderBottom: '2px solid #008751',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="caption"
            sx={{
              color: '#00ff88',
              fontFamily: '"Courier New", monospace',
              letterSpacing: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              fontWeight: 600,
              fontSize: '0.65rem',
            }}
          >
            <Lock sx={{ fontSize: 10 }} />
            SECURE VERIFICATION • FEDERAL GOVERNMENT OF NIGERIA
            <Lock sx={{ fontSize: 10 }} />
          </Typography>
        </Container>
      </Box>

      {/* Header */}
      <Box
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          py: 1.5,
          borderBottom: '1px solid rgba(0, 135, 81, 0.2)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                textDecoration: 'none',
              }}
            >
              <Box sx={{ display: 'flex', borderRadius: 0.5, overflow: 'hidden' }}>
                <Box sx={{ width: 10, height: 20, backgroundColor: '#008751' }} />
                <Box sx={{ width: 10, height: 20, backgroundColor: '#FFFFFF' }} />
                <Box sx={{ width: 10, height: 20, backgroundColor: '#008751' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2 }}>
                  FEDERAL REPUBLIC OF NIGERIA
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>
                  Asset Management System
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
              <Chip
                icon={<GppGood sx={{ fontSize: 12, color: '#00ff88 !important' }} />}
                label="Secure Portal"
                size="small"
                sx={{
                  backgroundColor: 'rgba(0, 135, 81, 0.15)',
                  color: '#00ff88',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  fontSize: '0.6rem',
                  height: 22,
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          py: 4,
          position: 'relative',
          zIndex: 5,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              backgroundColor: 'rgba(13, 40, 24, 0.9)',
              border: '1px solid rgba(0, 135, 81, 0.3)',
              borderRadius: 2,
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: emailSent
                  ? 'linear-gradient(135deg, rgba(0, 135, 81, 0.4) 0%, rgba(0, 135, 81, 0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(0, 135, 81, 0.3) 0%, rgba(0, 135, 81, 0.1) 100%)',
                border: '2px solid #008751',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 3,
                boxShadow: '0 0 30px rgba(0, 135, 81, 0.3)',
              }}
            >
              {emailSent ? (
                <CheckCircle sx={{ fontSize: 40, color: '#00ff88' }} />
              ) : (
                <Email sx={{ fontSize: 40, color: '#00ff88' }} />
              )}
            </Box>

            <Typography
              component="h1"
              variant="h5"
              align="center"
              sx={{ color: '#FFFFFF', fontWeight: 700, mb: 2 }}
            >
              Verify Your Email
            </Typography>

            <Typography
              variant="body1"
              align="center"
              sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}
            >
              We've sent a verification email to:
            </Typography>

            <Typography
              variant="body1"
              align="center"
              sx={{ color: '#00ff88', fontWeight: 600, mb: 3 }}
            >
              {currentUser?.email}
            </Typography>

            {emailSent && (
              <Alert
                severity="success"
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(0, 135, 81, 0.15)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  '& .MuiAlert-icon': { color: '#00ff88' },
                }}
              >
                Verification email sent! Please check your inbox and spam folder.
              </Alert>
            )}

            <Alert
              severity="info"
              sx={{
                mb: 3,
                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                border: '1px solid rgba(0, 135, 81, 0.3)',
                '& .MuiAlert-icon': { color: '#00ff88' },
              }}
            >
              Click the verification link in the email to activate your account.
            </Alert>

            {/* Instructions */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                border: '1px solid rgba(0, 135, 81, 0.2)',
                borderLeft: '3px solid #008751',
              }}
            >
              <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600, mb: 1 }}>
                Steps to verify:
              </Typography>
              <Box component="ol" sx={{ pl: 2, mb: 0, '& li': { color: 'rgba(255, 255, 255, 0.7)', mb: 0.5 } }}>
                <li><Typography variant="body2">Open your email inbox</Typography></li>
                <li><Typography variant="body2">Find the email from Nigeria Asset Management</Typography></li>
                <li><Typography variant="body2">Click the verification link</Typography></li>
                <li><Typography variant="body2">Come back and click "Continue to Dashboard"</Typography></li>
              </Box>
            </Paper>

            {/* Buttons */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleContinue}
              disabled={loading}
              sx={{
                mb: 2,
                py: 1.5,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {loading ? 'Checking verification...' : 'CONTINUE TO DASHBOARD'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleResendEmail}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={handleSignOut}
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                '&:hover': {
                  color: '#ff6666',
                  backgroundColor: 'rgba(255, 102, 102, 0.1)',
                },
              }}
            >
              Sign Out
            </Button>
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderTop: '1px solid rgba(0, 135, 81, 0.2)',
          py: 2,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex' }}>
                <Box sx={{ width: 12, height: 8, backgroundColor: '#008751' }} />
                <Box sx={{ width: 12, height: 8, backgroundColor: '#FFFFFF' }} />
                <Box sx={{ width: 12, height: 8, backgroundColor: '#008751' }} />
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Federal Republic of Nigeria
              </Typography>
            </Box>

            <Typography
              variant="caption"
              sx={{
                color: '#b8860b',
                fontFamily: '"Courier New", monospace',
                letterSpacing: 1,
                fontSize: '0.6rem',
              }}
            >
              OFFICIAL USE ONLY
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default VerifyEmailPage;
