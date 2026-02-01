import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  InputAdornment,
  IconButton,
  MenuItem,
  Grid,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  PersonAdd,
  Lock,
  GppGood,
  ArrowBack,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { registerAgency } from '@/services/auth.service';
import { UserRegistrationData } from '@/types/user.types';
import { SUCCESS_MESSAGES } from '@/utils/constants';
import { getVerifiedMinistries, getRoleCapacity } from '@/services/ministry.service';
import { Ministry } from '@/types/ministry.types';

// Validation schema
const registerSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  ministryId: yup
    .string()
    .required('Please select your ministry/agency'),
  role: yup
    .string()
    .required('Please select your role')
    .oneOf(['agency', 'agency-approver'], 'Invalid role selected'),
});

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMinistries, setLoadingMinistries] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [roleCapacity, setRoleCapacity] = useState<{
    agency: { available: number; total: number; filled: number };
    'agency-approver': { available: number; total: number; filled: number };
  }>({
    agency: { available: 6, total: 6, filled: 0 },
    'agency-approver': { available: 5, total: 5, filled: 0 },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  const selectedMinistryId = watch('ministryId');
  const selectedRole = watch('role');

  // Load verified ministries on component mount
  useEffect(() => {
    loadMinistries();
  }, []);

  // Check role availability when ministry or role changes
  useEffect(() => {
    if (selectedMinistryId) {
      checkRoleAvailability(selectedMinistryId);

      // Find and set the selected ministry
      const ministry = ministries.find((m) => m.ministryId === selectedMinistryId);
      setSelectedMinistry(ministry || null);
    }
  }, [selectedMinistryId, ministries]);

  const loadMinistries = async () => {
    try {
      const verifiedMinistries = await getVerifiedMinistries();
      setMinistries(verifiedMinistries);

      if (verifiedMinistries.length === 0) {
        setError('No verified ministries found. Please ask your ministry to register first.');
      }
    } catch (err: any) {
      setError('Failed to load ministries. Please try again later.');
      toast.error('Failed to load ministries');
    } finally {
      setLoadingMinistries(false);
    }
  };

  const checkRoleAvailability = async (ministryId: string) => {
    try {
      const uploaderCapacity = await getRoleCapacity(ministryId, 'agency');
      const approverCapacity = await getRoleCapacity(ministryId, 'agency-approver');

      setRoleCapacity({
        agency: uploaderCapacity,
        'agency-approver': approverCapacity,
      });
    } catch (err: any) {
      console.error('Error checking role capacity:', err);
    }
  };

  const onSubmit = async (data: any) => {
    // Validate role availability before submission
    if (!selectedMinistry) {
      setError('Please select a ministry');
      return;
    }

    const roleKey = data.role as 'agency' | 'agency-approver';
    const capacity = roleCapacity[roleKey];

    if (capacity.available <= 0) {
      setError(
        `No ${roleKey === 'agency' ? 'uploader' : 'approver'} slots available for this ministry. ` +
        `All ${capacity.total} slots are filled.`
      );
      return;
    }

    const registrationData: UserRegistrationData = {
      email: data.email,
      password: data.password,
      ministryId: selectedMinistry.ministryId,
      ministryType: selectedMinistry.ministryType,
      agencyName: selectedMinistry.name,
      location: selectedMinistry.location,
      role: data.role as 'agency' | 'agency-approver',
    };

    setLoading(true);
    setError(null);

    try {
      await registerAgency(registrationData);
      toast.success(SUCCESS_MESSAGES.AUTH.REGISTER);
      toast.info(SUCCESS_MESSAGES.AUTH.EMAIL_SENT);
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  if (loadingMinistries) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: '#00ff88' }} />
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Loading ministries...
        </Typography>
      </Box>
    );
  }

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
            SECURE REGISTRATION • FEDERAL GOVERNMENT OF NIGERIA
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
          py: 4,
          position: 'relative',
          zIndex: 5,
        }}
      >
        <Container maxWidth="md">
          {/* Back Link */}
          <Box sx={{ mb: 3 }}>
            <Button
              component={RouterLink}
              to="/register"
              startIcon={<ArrowBack />}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: '#00ff88',
                  backgroundColor: 'transparent',
                },
              }}
            >
              Back to Registration Options
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
                background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.3) 0%, rgba(0, 135, 81, 0.1) 100%)',
                border: '2px solid #008751',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 3,
                boxShadow: '0 0 30px rgba(0, 135, 81, 0.3)',
              }}
            >
              <PersonAdd sx={{ fontSize: 40, color: '#00ff88' }} />
            </Box>

            <Typography
              component="h1"
              variant="h5"
              align="center"
              sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1 }}
            >
              Ministry Staff Registration
            </Typography>

            <Typography
              variant="body2"
              align="center"
              sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}
            >
              Register as a staff member for your ministry or agency
            </Typography>

            <Typography
              variant="caption"
              align="center"
              sx={{ color: '#00ff88', display: 'block', mb: 3 }}
            >
              Your ministry must be registered and verified first
            </Typography>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Registration Form */}
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <Grid container spacing={2}>
                {/* Ministry Selection */}
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    select
                    id="ministryId"
                    label="Select Your Ministry/Agency"
                    {...register('ministryId')}
                    error={!!errors.ministryId}
                    helperText={errors.ministryId?.message || 'Choose the verified ministry you belong to'}
                    defaultValue=""
                    autoFocus
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
                      },
                      '& .MuiFormHelperText-root': {
                        marginLeft: '4px',
                        fontSize: '0.8rem',
                        '&.Mui-error': {
                          color: '#ff6666',
                        },
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select Ministry/Agency
                    </MenuItem>
                    {ministries.map((ministry) => (
                      <MenuItem key={ministry.ministryId} value={ministry.ministryId}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {ministry.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ministry.ministryType} • {ministry.location}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>

                  {ministries.length === 0 && (
                    <Alert
                      severity="warning"
                      sx={{
                        mt: 2,
                        backgroundColor: 'rgba(184, 134, 11, 0.1)',
                        border: '1px solid rgba(184, 134, 11, 0.3)',
                      }}
                    >
                      No verified ministries found.{' '}
                      <Link
                        component={RouterLink}
                        to="/register-ministry-admin"
                        sx={{ color: '#00ff88' }}
                      >
                        Register your ministry first
                      </Link>
                    </Alert>
                  )}
                </Grid>

                {/* Role Selection */}
                {selectedMinistry && (
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      select
                      id="role"
                      label="Your Role"
                      {...register('role')}
                      error={!!errors.role}
                      helperText={errors.role?.message || 'Select your role within the ministry'}
                      defaultValue=""
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
                        },
                        '& .MuiFormHelperText-root': {
                          marginLeft: '4px',
                          fontSize: '0.8rem',
                          '&.Mui-error': {
                            color: '#ff6666',
                          },
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        Select Your Role
                      </MenuItem>
                      <MenuItem value="agency" disabled={roleCapacity.agency.available <= 0}>
                        <Box>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={roleCapacity.agency.available > 0 ? 'inherit' : 'text.disabled'}
                          >
                            Asset Uploader {' '}
                            {roleCapacity.agency.available > 0 ? (
                              <Typography component="span" variant="caption" color="success.main">
                                ({roleCapacity.agency.available}/{roleCapacity.agency.total} slots available)
                              </Typography>
                            ) : (
                              <Typography component="span" variant="caption" color="error.main">
                                (Full - {roleCapacity.agency.filled}/{roleCapacity.agency.total})
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Upload and manage asset records for your ministry
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="agency-approver" disabled={roleCapacity['agency-approver'].available <= 0}>
                        <Box>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={roleCapacity['agency-approver'].available > 0 ? 'inherit' : 'text.disabled'}
                          >
                            Ministry Approver {' '}
                            {roleCapacity['agency-approver'].available > 0 ? (
                              <Typography component="span" variant="caption" color="success.main">
                                ({roleCapacity['agency-approver'].available}/{roleCapacity['agency-approver'].total} slots available)
                              </Typography>
                            ) : (
                              <Typography component="span" variant="caption" color="error.main">
                                (Full - {roleCapacity['agency-approver'].filled}/{roleCapacity['agency-approver'].total})
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Review and approve asset uploads before submission to federal admin
                          </Typography>
                        </Box>
                      </MenuItem>
                    </TextField>

                    {selectedRole && (
                      <Alert
                        severity="info"
                        sx={{
                          mt: 1,
                          backgroundColor: 'rgba(0, 135, 81, 0.1)',
                          border: '1px solid rgba(0, 135, 81, 0.3)',
                          '& .MuiAlert-icon': { color: '#00ff88' },
                        }}
                      >
                        {selectedRole === 'agency' ? (
                          <>
                            <strong>Note:</strong> Up to {roleCapacity.agency.total} uploader accounts allowed per ministry ({roleCapacity.agency.available} slots remaining). Your uploads will be reviewed by your ministry's approver.
                          </>
                        ) : (
                          <>
                            <strong>Note:</strong> Up to {roleCapacity['agency-approver'].total} approver accounts allowed per ministry ({roleCapacity['agency-approver'].available} slots remaining). Your account requires verification by your ministry administrator before you can approve uploads.
                          </>
                        )}
                      </Alert>
                    )}
                  </Grid>
                )}

                {/* Email */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Your Work Email Address"
                    type="email"
                    autoComplete="email"
                    placeholder="e.g., john.doe@ministry.gov.ng"
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
                </Grid>

                {/* Password */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="new-password"
                    {...register('password')}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={togglePasswordVisibility}
                            edge="end"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                color: '#00ff88',
                                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                              },
                            }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
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
                </Grid>
              </Grid>

              {/* Password Requirements */}
              <Alert
                severity="info"
                sx={{
                  mt: 2,
                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  '& .MuiAlert-icon': { color: '#00ff88' },
                }}
              >
                Password must be at least 8 characters and contain uppercase, lowercase, and numbers
              </Alert>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !selectedMinistry}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {loading ? 'Creating Account...' : 'CREATE STAFF ACCOUNT'}
              </Button>

              {/* Links */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{
                    color: '#00ff88',
                    textDecoration: 'none',
                    '&:hover': { color: '#66ffaa' },
                  }}
                >
                  Already have an account? Sign In
                </Link>
              </Box>

              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Ministry not listed?{' '}
                  <Link
                    component={RouterLink}
                    to="/register-ministry-admin"
                    sx={{ color: '#00ff88', '&:hover': { color: '#66ffaa' } }}
                  >
                    Register your ministry
                  </Link>
                </Typography>
              </Box>
            </Box>
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

export default RegisterPage;
