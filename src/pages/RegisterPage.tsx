import React, { useState } from 'react';
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
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { registerAgency } from '@/services/auth.service';
import { UserRegistrationData } from '@/types/user.types';
import { SUCCESS_MESSAGES, NIGERIAN_STATES, MINISTRY_TYPES } from '@/utils/constants';

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
  agencyName: yup
    .string()
    .required('Agency/Ministry name is required')
    .min(3, 'Agency name must be at least 3 characters'),
  region: yup.string().required('Please select your state/region'),
  ministryType: yup.string().optional(),
});

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserRegistrationData>({
    resolver: yupResolver(registerSchema),
  });

  const onSubmit = async (data: UserRegistrationData) => {
    setLoading(true);
    setError(null);

    try {
      await registerAgency(data);
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

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
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
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}
          >
            <PersonAdd sx={{ fontSize: 30, color: 'white' }} />
          </Box>

          <Typography component="h1" variant="h5" gutterBottom>
            Register Agency
          </Typography>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create an account for your government agency, ministry, or body
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Registration Form */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ width: '100%' }}
            noValidate
          >
            <Grid container spacing={2}>
              {/* Agency Name */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="agencyName"
                  label="Agency/Ministry Name"
                  placeholder="e.g., Federal Ministry of Finance"
                  autoFocus
                  {...register('agencyName')}
                  error={!!errors.agencyName}
                  helperText={errors.agencyName?.message}
                />
              </Grid>

              {/* Email */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Official Email Address"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
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
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Region/State */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  select
                  id="region"
                  label="State/Region"
                  {...register('region')}
                  error={!!errors.region}
                  helperText={errors.region?.message}
                  defaultValue=""
                >
                  <MenuItem value="" disabled>
                    Select State
                  </MenuItem>
                  {NIGERIAN_STATES.map((state) => (
                    <MenuItem key={state} value={state}>
                      {state}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Ministry Type */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  id="ministryType"
                  label="Ministry/Body Type"
                  {...register('ministryType')}
                  error={!!errors.ministryType}
                  helperText={errors.ministryType?.message || 'Optional'}
                  defaultValue=""
                >
                  <MenuItem value="">Select Type (Optional)</MenuItem>
                  {MINISTRY_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Password Requirements */}
            <Alert severity="info" sx={{ mt: 2 }}>
              Password must be at least 8 characters and contain uppercase, lowercase, and numbers
            </Alert>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register Agency'}
            </Button>

            {/* Link to Login */}
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign In
              </Link>
            </Box>
          </Box>
        </Paper>

        {/* Footer */}
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          Built for the Federal Republic of Nigeria
        </Typography>
      </Box>
    </Container>
  );
};

export default RegisterPage;
