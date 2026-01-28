import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Link,
  Chip,
} from '@mui/material';
import {
  PersonAdd,
  VerifiedUser,
  AdminPanelSettings,
  ArrowForward,
  Lock,
  GppGood,
  ArrowBack,
} from '@mui/icons-material';

const RegisterLandingPage: React.FC = () => {
  const navigate = useNavigate();

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
        <Container maxWidth="lg">
          {/* Back Link */}
          <Box sx={{ mb: 3 }}>
            <Button
              component={RouterLink}
              to="/"
              startIcon={<ArrowBack />}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: '#00ff88',
                  backgroundColor: 'transparent',
                },
              }}
            >
              Back to Home
            </Button>
          </Box>

          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography
              component="h1"
              variant="h3"
              sx={{
                color: '#FFFFFF',
                fontWeight: 700,
                letterSpacing: 1,
                mb: 2,
              }}
            >
              Create Your Account
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}
            >
              Choose the registration type that applies to you
            </Typography>
            <Typography variant="body2" sx={{ color: '#00ff88' }}>
              Federal Republic of Nigeria - Asset Management System
            </Typography>
          </Box>

          {/* Registration Options */}
          <Grid container spacing={4} sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, sm: 1, md: 0 } }}>
            {/* Option 1: Ministry Admin Registration */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  p: { xs: 2.5, sm: 3, md: 4 },
                  backgroundColor: 'rgba(13, 40, 24, 0.8)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    borderColor: '#00ff88',
                    boxShadow: '0 15px 40px rgba(0, 135, 81, 0.3)',
                  },
                }}
                onClick={() => navigate('/register-ministry-admin')}
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
                  <AdminPanelSettings sx={{ fontSize: 40, color: '#00ff88' }} />
                </Box>

                {/* Title */}
                <Typography
                  component="h2"
                  variant="h5"
                  align="center"
                  sx={{
                    color: '#00ff88',
                    fontWeight: 700,
                    mb: 2,
                  }}
                >
                  Ministry Administrator
                </Typography>

                {/* Description */}
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', mb: 3, lineHeight: 1.7 }}
                >
                  For official ministry representatives to create an admin account, register their ministry, and manage staff approvals.
                </Typography>

                {/* Requirements */}
                <Box sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)', p: 2, borderRadius: 2, mb: 3, border: '1px solid rgba(0, 135, 81, 0.2)' }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ color: '#FFFFFF', mb: 1 }}>
                    Requirements:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mb: 0, '& li': { color: 'rgba(255, 255, 255, 0.7)', mb: 0.5 } }}>
                    <li><Typography variant="body2">Valid email address</Typography></li>
                    <li><Typography variant="body2">Full name and password</Typography></li>
                    <li><Typography variant="body2">Email verification required</Typography></li>
                  </Box>
                </Box>

                {/* Status Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <VerifiedUser fontSize="small" sx={{ color: '#b8860b' }} />
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Two-step process: Account approval → Ministry registration
                  </Typography>
                </Box>

                {/* Who This Is For */}
                <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600, textAlign: 'center', mb: 3 }}>
                  Choose this if you're the head/representative of your ministry
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{ mt: 'auto', py: 1.5 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/register-ministry-admin');
                  }}
                >
                  REGISTER AS ADMIN
                </Button>
              </Paper>
            </Grid>

            {/* Option 2: Staff Registration */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  p: { xs: 2.5, sm: 3, md: 4 },
                  backgroundColor: 'rgba(13, 40, 24, 0.8)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    borderColor: '#00ff88',
                    boxShadow: '0 15px 40px rgba(0, 135, 81, 0.3)',
                  },
                }}
                onClick={() => navigate('/register-staff')}
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

                {/* Title */}
                <Typography
                  component="h2"
                  variant="h5"
                  align="center"
                  sx={{
                    color: '#00ff88',
                    fontWeight: 700,
                    mb: 2,
                  }}
                >
                  Register as Ministry Staff
                </Typography>

                {/* Description */}
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', mb: 3, lineHeight: 1.7 }}
                >
                  For individual staff members to join an existing verified ministry as an Uploader (data submitter) or Approver (reviewer/head).
                </Typography>

                {/* Requirements */}
                <Box sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)', p: 2, borderRadius: 2, mb: 3, border: '1px solid rgba(0, 135, 81, 0.2)' }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ color: '#FFFFFF', mb: 1 }}>
                    Requirements:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mb: 0, '& li': { color: 'rgba(255, 255, 255, 0.7)', mb: 0.5 } }}>
                    <li><Typography variant="body2">Your ministry must be <strong>verified</strong></Typography></li>
                    <li><Typography variant="body2">Work email address</Typography></li>
                    <li><Typography variant="body2">Select role: Uploader (6 max) or Approver (5 max)</Typography></li>
                  </Box>
                </Box>

                {/* Status Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <VerifiedUser fontSize="small" sx={{ color: '#00ff88' }} />
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Uploaders active immediately. Approvers need admin verification.
                  </Typography>
                </Box>

                {/* Who This Is For */}
                <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600, textAlign: 'center', mb: 3 }}>
                  Choose this if you're joining an existing ministry/agency
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{ mt: 'auto', py: 1.5 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/register-staff');
                  }}
                >
                  START STAFF REGISTRATION
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* Help Section */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mt: 5,
              maxWidth: 800,
              mx: 'auto',
              backgroundColor: 'rgba(0, 135, 81, 0.1)',
              border: '1px solid rgba(0, 135, 81, 0.3)',
              borderLeft: '4px solid #008751',
            }}
          >
            <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 700, mb: 2 }}>
              Not sure which option to choose?
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
              <strong>Choose "Ministry Administrator"</strong> if your ministry is not yet registered, you're the official representative, or you'll manage staff approvals.
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              <strong>Choose "Ministry Staff"</strong> if your ministry is already verified and you want to create a personal account to upload or approve assets.
            </Typography>
          </Paper>

          {/* Login Link */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to="/login"
                sx={{
                  color: '#00ff88',
                  fontWeight: 600,
                  '&:hover': { color: '#66ffaa' },
                }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
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

export default RegisterLandingPage;
