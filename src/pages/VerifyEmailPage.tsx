import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { Email, CheckCircle } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { resendVerificationEmail } from '@/services/auth.service';
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

  const handleContinue = () => {
    // Reload user to check if email is verified
    if (currentUser) {
      currentUser.reload().then(() => {
        if (currentUser.emailVerified) {
          navigate('/dashboard');
        } else {
          toast.warning('Please verify your email first');
        }
      });
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: emailSent ? 'success.light' : 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}
          >
            {emailSent ? (
              <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
            ) : (
              <Email sx={{ fontSize: 40, color: 'primary.main' }} />
            )}
          </Box>

          <Typography component="h1" variant="h5" gutterBottom align="center">
            Verify Your Email
          </Typography>

          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            We've sent a verification email to:
          </Typography>

          <Typography variant="body1" fontWeight="bold" align="center" sx={{ mb: 3 }}>
            {currentUser?.email}
          </Typography>

          {emailSent && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              Verification email sent! Please check your inbox and spam folder.
            </Alert>
          )}

          <Alert severity="info" sx={{ width: '100%', mb: 3 }}>
            Click the verification link in the email to activate your account.
          </Alert>

          {/* Instructions */}
          <Box sx={{ width: '100%', mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Steps to verify:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="ol" sx={{ pl: 2 }}>
              <li>Open your email inbox</li>
              <li>Find the email from Nigeria Asset Management</li>
              <li>Click the verification link</li>
              <li>Come back and click "Continue to Dashboard"</li>
            </Typography>
          </Box>

          {/* Buttons */}
          <Button
            fullWidth
            variant="contained"
            sx={{ mb: 2 }}
            onClick={handleContinue}
          >
            Continue to Dashboard
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
            color="error"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </Paper>

        {/* Footer */}
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          Built for the Federal Republic of Nigeria
        </Typography>
      </Box>
    </Container>
  );
};

export default VerifyEmailPage;
