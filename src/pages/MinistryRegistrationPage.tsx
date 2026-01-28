import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  Paper,
  Link as MuiLink,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createMinistryByAdmin } from '@/services/ministry.service';
import { MinistryFormData } from '@/types/ministry.types';
import { MINISTRY_TYPES, NIGERIAN_STATES } from '@/utils/constants';
import { useAuth } from '@/contexts/AuthContext';

// Validation schema
const schema = yup.object().shape({
  name: yup
    .string()
    .required('Ministry/Agency name is required')
    .min(5, 'Name must be at least 5 characters'),
  officialEmail: yup
    .string()
    .required('Official email is required')
    .email('Must be a valid email address'),
    // TESTING: .gov.ng validation temporarily disabled
    // .matches(
    //   /\.gov\.ng$/,
    //   'Must be an official government email ending with .gov.ng'
    // ),
  ministryType: yup.string().required('Ministry type is required'),
  location: yup.string().required('Headquarters location is required'),
});

const MinistryRegistrationPage = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MinistryFormData>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  // Check authentication and permissions
  useEffect(() => {
    const checkAccess = async () => {
      if (!currentUser) {
        toast.error('You must be logged in to register a ministry');
        navigate('/login');
        return;
      }

      if (!userData) {
        setCheckingAuth(false);
        return;
      }

      // Must be ministry-admin role
      if (userData.role !== 'ministry-admin') {
        toast.error('Only ministry admins can register ministries');
        navigate('/dashboard');
        return;
      }

      // Must have verified email
      if (!currentUser.emailVerified) {
        toast.error('Please verify your email before registering a ministry');
        navigate('/verify-email');
        return;
      }

      // Must be verified by federal admin
      if (userData.accountStatus !== 'verified') {
        toast.error('Your ministry admin account must be approved by federal admin first');
        navigate('/dashboard');
        return;
      }

      // Cannot already own a ministry
      if (userData.isMinistryOwner) {
        toast.error('You have already registered a ministry');
        navigate('/dashboard');
        return;
      }

      setCheckingAuth(false);
    };

    checkAccess();
  }, [currentUser, userData, navigate]);

  const onSubmit = async (data: MinistryFormData) => {
    if (!currentUser || !userData) {
      toast.error('Authentication required');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createMinistryByAdmin(
        data,
        currentUser.uid,
        userData.email,
        userData.agencyName // This contains the admin's full name
      );

      toast.success('Ministry registered successfully!');
      toast.info(
        'Your ministry is pending verification by the federal administrator. You will be notified once approved.',
        { autoClose: 8000 }
      );

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to register ministry';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            mt: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Checking permissions...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Register Your Ministry/Agency
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph sx={{ textAlign: 'center' }}>
          As a verified ministry admin, you can now register your ministry.
          After federal admin approval, you can approve staff to join your ministry.
        </Typography>

        <Paper elevation={3} sx={{ p: 4, mt: 3, width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Ministry/Agency Name */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Ministry/Agency Name"
              placeholder="e.g., Federal Ministry of Finance"
              autoFocus
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            {/* Official Email */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="officialEmail"
              label="Official Email"
              type="email"
              placeholder="e.g., your.email@gmail.com (testing mode)"
              {...register('officialEmail')}
              error={!!errors.officialEmail}
              helperText={errors.officialEmail?.message || 'Testing mode: Any valid email accepted'}
            />

            {/* Ministry Type */}
            <TextField
              margin="normal"
              required
              fullWidth
              select
              id="ministryType"
              label="Ministry/Agency Type"
              defaultValue=""
              {...register('ministryType')}
              error={!!errors.ministryType}
              helperText={errors.ministryType?.message}
            >
              <MenuItem value="" disabled>
                Select Type
              </MenuItem>
              {MINISTRY_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            {/* Headquarters Location */}
            <TextField
              margin="normal"
              required
              fullWidth
              select
              id="location"
              label="Headquarters Location"
              defaultValue=""
              {...register('location')}
              error={!!errors.location}
              helperText={errors.location?.message}
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

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? 'Submitting Registration...' : 'Register Ministry/Agency'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <MuiLink component={Link} to="/dashboard" underline="hover">
                ← Back to dashboard
              </MuiLink>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            🇳🇬 Nigeria Government Asset Management System
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default MinistryRegistrationPage;
