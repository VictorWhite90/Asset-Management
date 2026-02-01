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
  Chip,
} from '@mui/material';
import { LockReset, CheckCircle, Lock, GppGood, ArrowBack } from '@mui/icons-material';
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
            SECURE PORTAL • FEDERAL GOVERNMENT OF NIGERIA
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
          {/* Back Link */}
          <Box sx={{ mb: 3 }}>
            <Button
              component={RouterLink}
              to="/login"
              startIcon={<ArrowBack />}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: '#00ff88',
                  backgroundColor: 'transparent',
                },
              }}
            >
              Back to Sign In
            </Button>
          </Box>

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
                <LockReset sx={{ fontSize: 40, color: '#00ff88' }} />
              )}
            </Box>

            <Typography
              component="h1"
              variant="h5"
              align="center"
              sx={{ color: '#FFFFFF', fontWeight: 700, mb: 2 }}
            >
              {emailSent ? 'Check Your Email' : 'Reset Password'}
            </Typography>

            {emailSent ? (
              // Success state
              <>
                <Typography
                  variant="body1"
                  align="center"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}
                >
                  Password reset instructions have been sent to:
                </Typography>

                <Typography
                  variant="body1"
                  align="center"
                  sx={{ color: '#00ff88', fontWeight: 600, mb: 3 }}
                >
                  {getValues('email')}
                </Typography>

                <Alert
                  severity="success"
                  sx={{
                    mb: 3,
                    backgroundColor: 'rgba(0, 135, 81, 0.15)',
                    border: '1px solid rgba(0, 135, 81, 0.3)',
                    '& .MuiAlert-icon': { color: '#00ff88' },
                  }}
                >
                  Please check your inbox and follow the instructions to reset your password.
                </Alert>

                <Typography
                  variant="body2"
                  align="center"
                  sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}
                >
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

                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component={RouterLink}
                    to="/login"
                    sx={{
                      color: '#00ff88',
                      textDecoration: 'none',
                      '&:hover': { color: '#66ffaa' },
                    }}
                  >
                    Back to Sign In
                  </Link>
                </Box>
              </>
            ) : (
              // Form state
              <>
                <Typography
                  variant="body2"
                  align="center"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}
                >
                  Enter your email address and we'll send you instructions to reset your password
                </Typography>

                {/* Error Alert */}
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {/* Form */}
                <Box
                  component="form"
                  onSubmit={handleSubmit(onSubmit)}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.15)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          '& fieldset': {
                            borderColor: 'rgba(0, 255, 136, 0.4)',
                          },
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          borderColor: '#00ff88',
                          boxShadow: '0 0 0 3px rgba(0, 255, 136, 0.1)',
                          '& fieldset': {
                            borderColor: '#00ff88',
                            borderWidth: '2px',
                          },
                        },
                        '&.Mui-error': {
                          '& fieldset': {
                            borderColor: '#ff4444',
                          },
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        '&.Mui-focused': {
                          color: '#00ff88',
                        },
                        '&.Mui-error': {
                          color: '#ff4444',
                        },
                      },
                      '& .MuiOutlinedInput-input': {
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        padding: '14px 16px',
                        '&::placeholder': {
                          color: 'rgba(255, 255, 255, 0.4)',
                          opacity: 1,
                        },
                        // Override autofill styles
                        '&:-webkit-autofill': {
                          WebkitBoxShadow: '0 0 0 100px rgba(0, 135, 81, 0.15) inset !important',
                          WebkitTextFillColor: '#ffffff !important',
                          caretColor: '#ffffff',
                          borderRadius: '12px',
                          transition: 'background-color 5000s ease-in-out 0s',
                        },
                        '&:-webkit-autofill:hover': {
                          WebkitBoxShadow: '0 0 0 100px rgba(0, 135, 81, 0.2) inset !important',
                        },
                        '&:-webkit-autofill:focus': {
                          WebkitBoxShadow: '0 0 0 100px rgba(0, 135, 81, 0.25) inset !important',
                        },
                      },
                      '& .MuiFormHelperText-root': {
                        marginLeft: '4px',
                        fontSize: '0.8rem',
                        '&.Mui-error': {
                          color: '#ff6666',
                        },
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      mt: 3,
                      mb: 2,
                      py: 1.5,
                      fontWeight: 700,
                      letterSpacing: 1,
                    }}
                  >
                    {loading ? 'Sending...' : 'SEND RESET INSTRUCTIONS'}
                  </Button>

                  {/* Link to Login */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Link
                      component={RouterLink}
                      to="/login"
                      sx={{
                        color: '#00ff88',
                        textDecoration: 'none',
                        '&:hover': { color: '#66ffaa' },
                      }}
                    >
                      Remember your password? Sign In
                    </Link>
                  </Box>
                </Box>
              </>
            )}
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

export default ForgotPasswordPage;
