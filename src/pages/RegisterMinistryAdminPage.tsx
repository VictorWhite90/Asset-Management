import { useState } from 'react';
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
  Chip,
  Grid,
  MenuItem,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Slide,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  AdminPanelSettings,
  Lock,
  GppGood,
  ArrowBack,
  ArrowForward,
  Person,
  Business,
  Badge,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { registerMinistryAdmin } from '@/services/auth.service';
import { MinistryAdminRegistrationData } from '@/types/user.types';
import { MINISTRY_TYPES, NIGERIAN_STATES } from '@/utils/constants';

// Step 1: Personal Information validation
const personalInfoSchema = yup.object().shape({
  fullName: yup
    .string()
    .required('Full name is required')
    .min(3, 'Full name must be at least 3 characters'),
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
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  position: yup
    .string()
    .required('Position/Role is required')
    .min(2, 'Position must be at least 2 characters'),
  nin: yup
    .string()
    .required('NIN is required')
    .matches(/^\d{11}$/, 'NIN must be exactly 11 digits'),
  staffId: yup
    .string()
    .required('Staff ID is required')
    .min(3, 'Staff ID must be at least 3 characters'),
});

// Step 2: Ministry Information validation
const ministryInfoSchema = yup.object().shape({
  ministryName: yup
    .string()
    .required('Ministry/Agency name is required')
    .min(5, 'Name must be at least 5 characters'),
  ministryOfficialEmail: yup
    .string()
    .required('Official ministry email is required')
    .email('Must be a valid email address'),
  ministryType: yup.string().required('Ministry type is required'),
  ministryLocation: yup.string().required('Headquarters location is required'),
});

// Combined schema for final submission
const fullSchema = personalInfoSchema.concat(ministryInfoSchema);

const steps = ['Personal Information', 'Ministry Information'];

const RegisterMinistryAdminPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(fullSchema),
    mode: 'onChange',
  });

  const handleNext = async () => {
    // Validate Step 1 fields before proceeding
    const isValid = await trigger([
      'fullName',
      'email',
      'password',
      'confirmPassword',
      'position',
      'nin',
      'staffId',
    ]);

    if (isValid) {
      setSlideDirection('left');
      setCurrentStep(1);
    }
  };

  const handleBack = () => {
    setSlideDirection('right');
    setCurrentStep(0);
  };

  const onSubmit = async (data: any) => {
    const registrationData: MinistryAdminRegistrationData = {
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      position: data.position,
      nin: data.nin,
      staffId: data.staffId,
      ministryName: data.ministryName,
      ministryOfficialEmail: data.ministryOfficialEmail,
      ministryType: data.ministryType,
      ministryLocation: data.ministryLocation,
    };

    setLoading(true);
    setError(null);

    try {
      await registerMinistryAdmin(registrationData);
      toast.success('Registration submitted successfully!');
      toast.info(
        'Please verify your email. Your account and ministry will be reviewed by the Federal Administrator.',
        { autoClose: 10000 }
      );
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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  // Dark theme input styles
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      color: '#FFFFFF',
      backgroundColor: 'transparent',
      '& fieldset': { borderColor: 'rgba(0, 135, 81, 0.3)' },
      '&:hover fieldset': { borderColor: 'rgba(0, 135, 81, 0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#008751' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
    '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' },
    '& .MuiFormHelperText-root.Mui-error': { color: '#ef5350' },
    '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.6)' },
    '& input': {
      color: '#ffffff',
      '&:-webkit-autofill': {
        WebkitBoxShadow: '0 0 0 100px rgba(0, 135, 81, 0.15) inset !important',
        WebkitTextFillColor: '#ffffff !important',
        caretColor: '#ffffff',
        borderRadius: '12px',
        transition: 'background-color 5000s ease-in-out 0s',
      },
    },
  };

  const menuProps = {
    PaperProps: {
      sx: {
        backgroundColor: '#0d2818',
        border: '1px solid rgba(0, 135, 81, 0.3)',
        maxHeight: 300,
        '& .MuiMenuItem-root': {
          color: '#FFFFFF',
          '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.2)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 135, 81, 0.3)',
            '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.4)' },
          },
        },
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'linear-gradient(180deg, #0a1a0d 0%, #0d2818 50%, #0a1a0d 100%)',
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
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.3) 0%, rgba(0, 135, 81, 0.1) 100%)',
                  border: '2px solid #008751',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  mb: 2,
                  boxShadow: '0 0 30px rgba(0, 135, 81, 0.3)',
                }}
              >
                <AdminPanelSettings sx={{ fontSize: 35, color: '#00ff88' }} />
              </Box>

              <Typography
                component="h1"
                variant="h5"
                sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1 }}
              >
                Ministry Administrator Registration
              </Typography>

              <Typography
                variant="body2"
                sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}
              >
                Complete your registration in two simple steps
              </Typography>

              {/* Stepper */}
              <Stepper
                activeStep={currentStep}
                alternativeLabel
                sx={{
                  '& .MuiStepLabel-label': {
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.75rem',
                    '&.Mui-active': { color: '#00ff88', fontWeight: 600 },
                    '&.Mui-completed': { color: '#00ff88' },
                  },
                  '& .MuiStepIcon-root': {
                    color: 'rgba(0, 135, 81, 0.3)',
                    '&.Mui-active': { color: '#008751' },
                    '&.Mui-completed': { color: '#00ff88' },
                  },
                  '& .MuiStepConnector-line': {
                    borderColor: 'rgba(0, 135, 81, 0.3)',
                  },
                  '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
                    borderColor: '#008751',
                  },
                  '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
                    borderColor: '#00ff88',
                  },
                }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  color: '#ef5350',
                  border: '1px solid rgba(211, 47, 47, 0.3)',
                }}
              >
                {error}
              </Alert>
            )}

            {/* Registration Form */}
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {/* Step 1: Personal Information */}
              <Slide
                direction={slideDirection === 'left' ? 'left' : 'right'}
                in={currentStep === 0}
                mountOnEnter
                unmountOnExit
                timeout={300}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Person sx={{ color: '#00ff88' }} />
                    <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                      Personal Information
                    </Typography>
                  </Box>
                  <Divider sx={{ borderColor: 'rgba(0, 135, 81, 0.3)', mb: 3 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="fullName"
                        label="Full Name"
                        autoComplete="name"
                        placeholder="e.g., John Adebayo Doe"
                        autoFocus
                        {...register('fullName')}
                        error={!!errors.fullName}
                        helperText={errors.fullName?.message}
                        sx={inputStyles}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="position"
                        label="Position/Role in Ministry"
                        placeholder="e.g., Director, Permanent Secretary"
                        {...register('position')}
                        error={!!errors.position}
                        helperText={errors.position?.message}
                        sx={inputStyles}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="email"
                        label="Personal Email Address"
                        type="email"
                        autoComplete="email"
                        placeholder="e.g., john.doe@email.com"
                        {...register('email')}
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        sx={inputStyles}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        id="nin"
                        label="NIN (11 digits)"
                        placeholder="12345678901"
                        inputProps={{ maxLength: 11 }}
                        {...register('nin')}
                        error={!!errors.nin}
                        helperText={errors.nin?.message || 'National Identification Number'}
                        sx={inputStyles}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        id="staffId"
                        label="Government Staff ID"
                        placeholder="e.g., FGN/MIN/12345"
                        {...register('staffId')}
                        error={!!errors.staffId}
                        helperText={errors.staffId?.message}
                        sx={inputStyles}
                      />
                    </Grid>

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
                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={inputStyles}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        label="Confirm Password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        autoComplete="new-password"
                        {...register('confirmPassword')}
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword?.message}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle confirm password visibility"
                                onClick={toggleConfirmPasswordVisibility}
                                edge="end"
                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={inputStyles}
                      />
                    </Grid>
                  </Grid>

                  {/* Continue Button */}
                  <Box sx={{ mt: 4 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleNext}
                      endIcon={<ArrowForward />}
                      sx={{
                        py: 1.5,
                        fontWeight: 700,
                        letterSpacing: 1,
                        backgroundColor: '#008751',
                        '&:hover': { backgroundColor: '#006038' },
                      }}
                    >
                      CONTINUE TO MINISTRY INFO
                    </Button>
                  </Box>
                </Box>
              </Slide>

              {/* Step 2: Ministry Information */}
              <Slide
                direction={slideDirection === 'left' ? 'right' : 'left'}
                in={currentStep === 1}
                mountOnEnter
                unmountOnExit
                timeout={300}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Business sx={{ color: '#00ff88' }} />
                    <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                      Ministry Information
                    </Typography>
                  </Box>
                  <Divider sx={{ borderColor: 'rgba(0, 135, 81, 0.3)', mb: 3 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="ministryName"
                        label="Ministry/Agency Name"
                        placeholder="e.g., Federal Ministry of Works"
                        {...register('ministryName')}
                        error={!!errors.ministryName}
                        helperText={errors.ministryName?.message}
                        sx={inputStyles}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="ministryOfficialEmail"
                        label="Official Ministry Email"
                        type="email"
                        placeholder="e.g., info@works.gov.ng"
                        {...register('ministryOfficialEmail')}
                        error={!!errors.ministryOfficialEmail}
                        helperText={errors.ministryOfficialEmail?.message || 'Official contact email for the ministry'}
                        sx={inputStyles}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        select
                        id="ministryType"
                        label="Ministry/Agency Type"
                        defaultValue=""
                        {...register('ministryType')}
                        error={!!errors.ministryType}
                        helperText={errors.ministryType?.message}
                        SelectProps={{ MenuProps: menuProps }}
                        sx={inputStyles}
                      >
                        <MenuItem value="" disabled>
                          Select type
                        </MenuItem>
                        {MINISTRY_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        select
                        id="ministryLocation"
                        label="Headquarters Location"
                        defaultValue=""
                        {...register('ministryLocation')}
                        error={!!errors.ministryLocation}
                        helperText={errors.ministryLocation?.message}
                        SelectProps={{ MenuProps: menuProps }}
                        sx={inputStyles}
                      >
                        <MenuItem value="" disabled>
                          Select location
                        </MenuItem>
                        {NIGERIAN_STATES.map((state) => (
                          <MenuItem key={state} value={state}>
                            {state}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>

                  {/* Info Box */}
                  <Alert
                    severity="info"
                    icon={<Badge sx={{ color: '#00ff88' }} />}
                    sx={{
                      mt: 3,
                      backgroundColor: 'rgba(0, 135, 81, 0.1)',
                      border: '1px solid rgba(0, 135, 81, 0.3)',
                      '& .MuiAlert-message': { color: 'rgba(255, 255, 255, 0.8)' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#00ff88', mb: 1 }}>
                      What happens next:
                    </Typography>
                    <Box component="ol" sx={{ pl: 2, mb: 0, '& li': { mb: 0.5, fontSize: '0.85rem' } }}>
                      <li>Verify your email address</li>
                      <li>Federal Administrator reviews your application</li>
                      <li>Upon approval, your ministry account is activated</li>
                      <li>You can then add staff members to your ministry</li>
                    </Box>
                  </Alert>

                  {/* Action Buttons */}
                  <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleBack}
                      startIcon={<ArrowBack />}
                      sx={{
                        py: 1.5,
                        fontWeight: 600,
                        borderColor: 'rgba(0, 135, 81, 0.5)',
                        color: '#FFFFFF',
                        '&:hover': {
                          borderColor: '#00ff88',
                          backgroundColor: 'rgba(0, 135, 81, 0.1)',
                        },
                      }}
                    >
                      BACK
                    </Button>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                      sx={{
                        py: 1.5,
                        fontWeight: 700,
                        letterSpacing: 1,
                        backgroundColor: '#008751',
                        '&:hover': { backgroundColor: '#006038' },
                      }}
                    >
                      {loading ? 'Submitting...' : 'SUBMIT REGISTRATION'}
                    </Button>
                  </Box>
                </Box>
              </Slide>

              {/* Links */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
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

export default RegisterMinistryAdminPage;
