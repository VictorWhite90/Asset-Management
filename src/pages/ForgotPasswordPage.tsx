import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Link,
  Alert,
} from '@mui/material';
import { LockReset, CheckCircle } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { resetPassword } from '@/services/auth.service';
import { SUCCESS_MESSAGES } from '@/utils/constants';

interface ForgotPasswordForm {
  email: string;
}

// Validation schema
const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
});

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: yupResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    setError(null);

    try {
      await resetPassword(data.email);
      setEmailSent(true);
      toast.success(SUCCESS_MESSAGES.AUTH.PASSWORD_RESET);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
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
          {/* Logo and Title */}
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: emailSent ? 'success.light' : 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}
          >
            {emailSent ? (
              <CheckCircle sx={{ fontSize: 30, color: 'success.main' }} />
            ) : (
              <LockReset sx={{ fontSize: 30, color: 'white' }} />
            )}
          </Box>

          <Typography component="h1" variant="h5" gutterBottom>
            {emailSent ? 'Check Your Email' : 'Reset Password'}
          </Typography>

          {emailSent ? (
            // Success state
            <>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 2 }}>
                Password reset instructions have been sent to:
              </Typography>

              <Typography variant="body1" fontWeight="bold" align="center" sx={{ mb: 3 }}>
                {getValues('email')}
              </Typography>

              <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
                Please check your inbox and follow the instructions to reset your password.
              </Alert>

              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                Didn't receive the email? Check your spam folder or try again.
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => setEmailSent(false)}
                sx={{ mb: 2 }}
              >
                Send Again
              </Button>

              <Link component={RouterLink} to="/login" variant="body2">
                Back to Sign In
              </Link>
            </>
          ) : (
            // Form state
            <>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                Enter your email address and we'll send you instructions to reset your password
              </Typography>

              {/* Error Alert */}
              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Form */}
              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ width: '100%' }}
                noValidate
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Instructions'}
                </Button>

                {/* Link to Login */}
                <Box sx={{ textAlign: 'center' }}>
                  <Link component={RouterLink} to="/login" variant="body2">
                    Remember your password? Sign In
                  </Link>
                </Box>
              </Box>
            </>
          )}
        </Paper>

        {/* Footer */}
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          Built for the Federal Republic of Nigeria
        </Typography>
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage;
