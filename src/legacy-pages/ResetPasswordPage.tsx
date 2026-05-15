import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { LockReset } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { auth } from '@/services/firebase';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const oobCode = searchParams.get('oobCode') || '';

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError('This password reset link is invalid.');
        setLoading(false);
        return;
      }

      try {
        const resetEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(resetEmail);
      } catch {
        setError('This password reset link has expired or is invalid.');
      } finally {
        setLoading(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      toast.success('Password reset successfully. Please sign in.');
      navigate('/login', {
        state: { message: 'Password reset successfully. Please sign in.' },
      });
    } catch {
      setError('Unable to reset password. Please request a new reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
        <LockReset sx={{ fontSize: 58, color: '#00ff88', mb: 2 }} />
        <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1 }}>
          Create New Password
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', mb: 3 }}>
          {email ? `Resetting password for ${email}` : 'Checking your reset link...'}
        </Typography>

        {loading ? (
          <CircularProgress sx={{ color: '#00ff88' }} />
        ) : error && !email ? (
          <>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Button component={RouterLink} to="/forgot-password" variant="contained">
              Request New Link
            </Button>
          </>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              required
              label="New Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              required
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={submitting}
              sx={{ py: 1.4, fontWeight: 700 }}
            >
              {submitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ResetPasswordPage;
