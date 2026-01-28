import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Lock,
  GppGood,
  AccountCircle,
  Logout,
  Person,
  KeyboardArrowDown,
  Dashboard,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await signOut();
    navigate('/login');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleDashboard = () => {
    handleMenuClose();
    navigate('/dashboard');
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Federal Administrator';
      case 'ministry-admin':
        return 'Ministry Administrator';
      case 'agency-approver':
        return 'Agency Approver';
      case 'agency':
        return 'Staff';
      default:
        return role;
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
          opacity: 0.02,
          backgroundImage: 'url("/Seal_of_the_President_of_Nigeria.svg")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Security Classification Banner */}
      <Box
        sx={{
          backgroundColor: '#0a0505',
          py: 0.5,
          borderBottom: '2px solid #008751',
          position: 'relative',
          zIndex: 100,
        }}
      >
        <Container maxWidth="xl">
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
            OFFICIAL • FEDERAL GOVERNMENT OF NIGERIA • SECURE PORTAL
            <Lock sx={{ fontSize: 10 }} />
          </Typography>
        </Container>
      </Box>

      {/* Main Header */}
      <Box
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          py: 1.5,
          borderBottom: '1px solid rgba(0, 135, 81, 0.3)',
          position: 'relative',
          zIndex: 100,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Logo Section */}
            <Box
              component={Link}
              to="/dashboard"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                textDecoration: 'none',
                '&:hover': {
                  opacity: 0.9,
                },
              }}
            >
              {/* Nigerian Flag */}
              <Box sx={{ display: 'flex', borderRadius: 0.5, overflow: 'hidden', boxShadow: '0 0 10px rgba(0,135,81,0.3)', flexShrink: 0 }}>
                <Box sx={{ width: { xs: 8, sm: 10 }, height: { xs: 16, sm: 20 }, backgroundColor: '#008751' }} />
                <Box sx={{ width: { xs: 8, sm: 10 }, height: { xs: 16, sm: 20 }, backgroundColor: '#FFFFFF' }} />
                <Box sx={{ width: { xs: 8, sm: 10 }, height: { xs: 16, sm: 20 }, backgroundColor: '#008751' }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                  FEDERAL REPUBLIC OF NIGERIA
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: { xs: '0.55rem', sm: '0.65rem' }, display: { xs: 'none', sm: 'block' } }}>
                  Asset Management System
                </Typography>
              </Box>
            </Box>

            {/* Right Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Trust Badges - Desktop Only */}
              <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1 }}>
                <Chip
                  icon={<GppGood sx={{ fontSize: 12, color: '#00ff88 !important' }} />}
                  label="Secure"
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

              {/* User Menu */}
              <Button
                onClick={handleMenuOpen}
                endIcon={<KeyboardArrowDown />}
                sx={{
                  color: '#FFFFFF',
                  textTransform: 'none',
                  backgroundColor: 'rgba(0, 135, 81, 0.15)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  px: 2,
                  py: 0.75,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 135, 81, 0.25)',
                    borderColor: '#008751',
                  },
                }}
              >
                <AccountCircle sx={{ mr: 1, fontSize: 20 }} />
                <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2, fontWeight: 600 }}>
                    {userData?.name || userData?.email?.split('@')[0] || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2, color: '#00ff88', fontSize: '0.6rem' }}>
                    {getRoleDisplayName(userData?.role || '')}
                  </Typography>
                </Box>
              </Button>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem onClick={handleDashboard}>
                  <Dashboard sx={{ mr: 1.5, fontSize: 18 }} />
                  Dashboard
                </MenuItem>
                <MenuItem onClick={handleProfile}>
                  <Person sx={{ mr: 1.5, fontSize: 18 }} />
                  Profile
                </MenuItem>
                <Divider sx={{ borderColor: 'rgba(0, 135, 81, 0.2)' }} />
                <MenuItem onClick={handleLogout} sx={{ color: '#ff6666' }}>
                  <Logout sx={{ mr: 1.5, fontSize: 18 }} />
                  Sign Out
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          position: 'relative',
          zIndex: 1,
          py: 3,
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderTop: '1px solid rgba(0, 135, 81, 0.2)',
          py: 2,
          position: 'relative',
          zIndex: 100,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ display: 'flex' }}>
                <Box sx={{ width: 12, height: 8, backgroundColor: '#008751' }} />
                <Box sx={{ width: 12, height: 8, backgroundColor: '#FFFFFF' }} />
                <Box sx={{ width: 12, height: 8, backgroundColor: '#008751' }} />
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Federal Republic of Nigeria
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center' }}>
              &copy; {new Date().getFullYear()} Nigeria Government Asset Management System
            </Typography>

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

export default AppLayout;
