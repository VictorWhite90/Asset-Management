import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
  Container,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

const EmailActionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleEmailAction();
  }, []);

  const handleEmailAction = async () => {
    const mode = searchParams.get('mode');
    const actionCode = searchParams.get('oobCode');

    if (!actionCode) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    try {
      if (mode === 'verifyEmail') {
        // Apply the email verification code
        await applyActionCode(auth, actionCode);
        setStatus('success');
        setMessage('Email verified successfully! You can now sign in.');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Email verified! Please sign in to continue.' }
          });
        }, 2000);
      } else if (mode === 'resetPassword') {
        // Redirect to password reset page with the code
        navigate(`/reset-password?oobCode=${actionCode}`);
      } else {
        setStatus('error');
        setMessage('Invalid action');
      }
    } catch (error: any) {
      setStatus('error');
      if (error.code === 'auth/invalid-action-code') {
        setMessage('This verification link has expired or already been used.');
      } else if (error.code === 'auth/user-disabled') {
        setMessage('This account has been disabled.');
      } else {
        setMessage('An error occurred. Please try again.');
      }
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
        <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                Verifying your email...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we verify your email address
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle
                sx={{ fontSize: 80, color: 'success.main', mb: 2 }}
              />
              <Typography variant="h5" gutterBottom color="success.main">
                Email Verified!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {message}
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                Redirecting to login page...
              </Alert>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon
                sx={{ fontSize: 80, color: 'error.main', mb: 2 }}
              />
              <Typography variant="h5" gutterBottom color="error.main">
                Verification Failed
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {message}
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{ mt: 2 }}
              >
                Go to Login
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailActionPage;
