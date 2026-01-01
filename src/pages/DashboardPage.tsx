import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
} from '@mui/material';
import { Logout, Dashboard as DashboardIcon, Person, Email, Add, UploadFile, ViewList } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { SUCCESS_MESSAGES } from '@/utils/constants';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userData, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(SUCCESS_MESSAGES.AUTH.LOGOUT);
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ marginTop: 4, marginBottom: 4 }}>
        {/* Header */}
        <Paper
          elevation={2}
          sx={{
            padding: 3,
            marginBottom: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'primary.main',
            color: 'white',
          }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="subtitle1">
              Welcome, {userData?.agencyName || currentUser?.email}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Logout />}
            onClick={handleSignOut}
            sx={{
              borderColor: 'white',
              color: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Sign Out
          </Button>
        </Paper>

        {/* Email Verification Alert */}
        {currentUser && !currentUser.emailVerified && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Your email is not verified. Please check your inbox and verify your email address.
            <Button
              size="small"
              onClick={() => navigate('/verify-email')}
              sx={{ ml: 2 }}
            >
              Verify Now
            </Button>
          </Alert>
        )}

        {/* User Info Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Person sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Agency Name</Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {userData?.agencyName || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Email sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Email</Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {currentUser?.email || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DashboardIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Role</Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {userData?.role || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Asset Management Actions (Agency Only) */}
        {userData?.role === 'agency' && currentUser?.emailVerified && (
          <Paper elevation={2} sx={{ padding: 3, mb: 3, backgroundColor: '#f0f7f4' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Asset Management
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload and manage your agency's assets
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Button
                  component={Link}
                  to="/assets/upload"
                  variant="contained"
                  fullWidth
                  startIcon={<Add />}
                  size="large"
                >
                  Upload Asset
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  component={Link}
                  to="/assets/bulk-upload"
                  variant="outlined"
                  fullWidth
                  startIcon={<UploadFile />}
                  size="large"
                >
                  Bulk Upload (Excel)
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  component={Link}
                  to="/assets/my-assets"
                  variant="outlined"
                  fullWidth
                  startIcon={<ViewList />}
                  size="large"
                >
                  View My Assets
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Admin Actions (Admin Only) */}
        {userData?.role === 'admin' && currentUser?.emailVerified && (
          <Paper elevation={2} sx={{ padding: 3, mb: 3, backgroundColor: '#f0f4f7' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Admin Panel
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              View and manage all assets across agencies
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  component={Link}
                  to="/admin/assets"
                  variant="contained"
                  fullWidth
                  startIcon={<ViewList />}
                  size="large"
                >
                  View All Assets
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Main Content */}
        <Paper elevation={2} sx={{ padding: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            Nigeria Government Asset Management System
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            A comprehensive platform for managing government assets across ministries, departments, and agencies.
          </Typography>

          {userData?.role === 'agency' && currentUser?.emailVerified && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Use the Asset Management section above to:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                <Typography variant="body2" color="text.secondary" component="li" sx={{ mb: 1 }}>
                  Upload individual assets with detailed information
                </Typography>
                <Typography variant="body2" color="text.secondary" component="li" sx={{ mb: 1 }}>
                  Bulk upload multiple assets using Excel templates
                </Typography>
                <Typography variant="body2" color="text.secondary" component="li">
                  View and export your uploaded assets
                </Typography>
              </Box>
            </Box>
          )}

          {userData?.role === 'admin' && currentUser?.emailVerified && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Administrator Access
              </Typography>
              <Typography variant="body2" color="text.secondary">
                As an administrator, you have access to view all assets across agencies and ministries.
                Use the Admin Panel above to access comprehensive asset reports and analytics.
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Account Region:</strong> {userData?.region || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Ministry Type:</strong> {userData?.ministryType || 'N/A'}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default DashboardPage;
