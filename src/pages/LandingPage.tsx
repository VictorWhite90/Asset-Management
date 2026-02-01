import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
} from '@mui/material';
import {
  Shield,
  AccountBalance,
  VerifiedUser,
  Login,
  PersonAdd,
  Lock,
  Visibility,
  GppGood,
  AdminPanelSettings,
} from '@mui/icons-material';

const LandingPage = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a1a0d 0%, #0d2818 30%, #0a1a0d 70%, #050d07 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Presidential Seal Watermark Background */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '700px',
          opacity: 0.04,
          backgroundImage: 'url("/Seal_of_the_President_of_Nigeria.svg")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
          pointerEvents: 'none',
          filter: 'grayscale(30%)',
        }}
      />

      {/* Classification Banner */}
      <Box
        sx={{
          backgroundColor: '#1a0a0a',
          py: 0.75,
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
              fontSize: '0.7rem',
            }}
          >
            <Lock sx={{ fontSize: 12 }} />
            OFFICIAL • FEDERAL GOVERNMENT OF NIGERIA • AUTHORIZED ACCESS ONLY
            <Lock sx={{ fontSize: 12 }} />
          </Typography>
        </Container>
      </Box>

      {/* Header Bar */}
      <Box
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          py: 1.5,
          borderBottom: '1px solid rgba(0, 135, 81, 0.2)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Logo Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Nigerian Flag */}
              <Box sx={{ display: 'flex', borderRadius: 0.5, overflow: 'hidden', boxShadow: '0 0 10px rgba(0,135,81,0.3)' }}>
                <Box sx={{ width: 12, height: 24, backgroundColor: '#008751' }} />
                <Box sx={{ width: 12, height: 24, backgroundColor: '#FFFFFF' }} />
                <Box sx={{ width: 12, height: 24, backgroundColor: '#008751' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: 1, lineHeight: 1.2 }}>
                  FEDERAL REPUBLIC OF NIGERIA
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 }}>
                  Asset Management System
                </Typography>
              </Box>
            </Box>

            {/* Trust Badges */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              <Chip
                icon={<GppGood sx={{ fontSize: 14, color: '#00ff88 !important' }} />}
                label="NDPR Compliant"
                size="small"
                sx={{
                  backgroundColor: 'rgba(0, 135, 81, 0.2)',
                  color: '#00ff88',
                  border: '1px solid rgba(0, 135, 81, 0.4)',
                  fontSize: '0.65rem',
                  height: 24,
                }}
              />
              <Chip
                icon={<Lock sx={{ fontSize: 14, color: '#00ff88 !important' }} />}
                label="256-bit Encrypted"
                size="small"
                sx={{
                  backgroundColor: 'rgba(0, 135, 81, 0.2)',
                  color: '#00ff88',
                  border: '1px solid rgba(0, 135, 81, 0.4)',
                  fontSize: '0.65rem',
                  height: 24,
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 6, position: 'relative', zIndex: 5 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          {/* Coat of Arms Icon */}
          <Box
            sx={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.3) 0%, rgba(0, 135, 81, 0.1) 100%)',
              border: '3px solid #008751',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 4,
              boxShadow: '0 0 40px rgba(0, 135, 81, 0.4), inset 0 0 30px rgba(0, 135, 81, 0.1)',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                border: '1px solid rgba(0, 135, 81, 0.2)',
              },
            }}
          >
            <AccountBalance sx={{ fontSize: 70, color: '#00ff88' }} />
          </Box>

          {/* Main Title */}
          <Typography
            variant="h2"
            sx={{
              color: '#FFFFFF',
              fontWeight: 800,
              letterSpacing: 2,
              mb: 1,
              textShadow: '0 4px 20px rgba(0, 135, 81, 0.5)',
              fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            ASSET MANAGEMENT SYSTEM
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 400,
              fontStyle: 'italic',
              letterSpacing: 1,
              mb: 2,
              fontSize: { xs: '0.9rem', md: '1.1rem' },
            }}
          >
            Federal Ministry of Finance, Budget & National Planning
          </Typography>

          {/* Tagline */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {['Secure', 'Transparent', 'Accountable'].map((word, idx) => (
              <Box
                key={idx}
                component="span"
                sx={{
                  color: '#00ff88',
                  fontWeight: 600,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {idx > 0 && <Box component="span" sx={{ width: 6, height: 6, backgroundColor: '#008751', borderRadius: '50%', display: 'inline-block' }} />}
                {word}
              </Box>
            ))}
          </Box>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.75)',
              maxWidth: 700,
              mx: 'auto',
              lineHeight: 1.9,
              fontSize: '1rem',
            }}
          >
            A comprehensive digital platform for the tracking, management, and oversight
            of government assets across all federal ministries, departments, and agencies.
            Ensuring transparency, accountability, and efficient resource allocation for national development.
          </Typography>
        </Box>

        {/* Feature Cards */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {[
            { icon: <Shield sx={{ fontSize: 32 }} />, title: 'Secure Access', desc: 'Multi-level authentication with role-based access control' },
            { icon: <Visibility sx={{ fontSize: 32 }} />, title: 'Real-time Tracking', desc: 'Monitor assets across all government agencies instantly' },
            { icon: <AdminPanelSettings sx={{ fontSize: 32 }} />, title: 'Ministry Integration', desc: 'Seamless coordination between all federal ministries' },
            { icon: <VerifiedUser sx={{ fontSize: 32 }} />, title: 'Audit Compliance', desc: 'Complete audit trail for regulatory compliance' },
          ].map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: 'left',
                  backgroundColor: 'rgba(0, 20, 10, 0.6)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                  height: '100%',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 135, 81, 0.15)',
                    borderColor: '#00ff88',
                    transform: 'translateY(-8px)',
                    boxShadow: '0 15px 40px rgba(0, 135, 81, 0.3)',
                  },
                }}
              >
                <Box sx={{ color: '#00ff88', mb: 2 }}>{feature.icon}</Box>
                <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1, letterSpacing: 0.5 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.6 }}>
                  {feature.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Button
            component={Link}
            to="/login"
            variant="contained"
            size="large"
            startIcon={<Login />}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 700,
              backgroundColor: '#008751',
              color: '#FFFFFF',
              borderRadius: 1.5,
              textTransform: 'uppercase',
              letterSpacing: 2,
              boxShadow: '0 4px 20px rgba(0, 135, 81, 0.4)',
              '&:hover': {
                backgroundColor: '#00a862',
                boxShadow: '0 8px 30px rgba(0, 135, 81, 0.6)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Sign In
          </Button>

          <Button
            component={Link}
            to="/register"
            variant="outlined"
            size="large"
            startIcon={<PersonAdd />}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#00ff88',
              border: '2px solid #008751',
              borderRadius: 1.5,
              textTransform: 'uppercase',
              letterSpacing: 2,
              '&:hover': {
                backgroundColor: 'rgba(0, 135, 81, 0.2)',
                borderColor: '#00ff88',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Register
          </Button>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderTop: '1px solid rgba(0, 135, 81, 0.3)',
          py: 3,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            {/* Left - Flag & Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex' }}>
                <Box sx={{ width: 16, height: 10, backgroundColor: '#008751' }} />
                <Box sx={{ width: 16, height: 10, backgroundColor: '#FFFFFF' }} />
                <Box sx={{ width: 16, height: 10, backgroundColor: '#008751' }} />
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                Federal Republic of Nigeria
              </Typography>
            </Box>

            {/* Center - Copyright */}
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
              &copy; {new Date().getFullYear()} Nigeria Government Asset Management System. All rights reserved.
            </Typography>

            {/* Right - Links */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography
                component={Link}
                to="/privacy"
                variant="caption"
                sx={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none', '&:hover': { color: '#00ff88' } }}
              >
                Privacy Policy
              </Typography>
              <Typography
                component={Link}
                to="/terms"
                variant="caption"
                sx={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none', '&:hover': { color: '#00ff88' } }}
              >
                Terms of Service
              </Typography>
            </Box>
          </Box>

          {/* Security Footer */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(0, 135, 81, 0.15)', textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{
                color: '#b8860b',
                fontFamily: '"Courier New", monospace',
                letterSpacing: 2,
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              OFFICIAL USE ONLY • UNAUTHORIZED ACCESS IS PROHIBITED AND PUNISHABLE UNDER THE CYBERCRIMES ACT 2015
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.4)',
                mt: 1,
                fontSize: '0.6rem',
              }}
            >
              Last Updated: January 2026 • Version 1.0.0
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
