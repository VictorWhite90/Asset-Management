import { Box, Container, Typography, Link } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { deploymentLabels } from '@/utils/deployment';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  // Don't show footer on pages that have their own custom footer
  const pagesWithCustomFooter = ['/', '/login', '/register', '/register-staff', '/register-ministry-admin', '/forgot-password'];
  if (pagesWithCustomFooter.includes(location.pathname)) {
    return null;
  }

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.72)',
        borderTop: '1px solid rgba(0, 135, 81, 0.15)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Left - Flag & Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ display: 'flex' }}>
              <Box sx={{ width: 12, height: 8, backgroundColor: '#008751' }} />
              <Box sx={{ width: 12, height: 8, backgroundColor: '#ffffff', borderLeft: '1px solid rgba(0,0,0,0.06)', borderRight: '1px solid rgba(0,0,0,0.06)' }} />
              <Box sx={{ width: 12, height: 8, backgroundColor: '#008751' }} />
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(15, 48, 31, 0.68)' }}>
              {deploymentLabels.jurisdiction}
            </Typography>
          </Box>

          {/* Center - Copyright */}
          <Typography variant="caption" sx={{ color: 'rgba(15, 48, 31, 0.58)', textAlign: 'center' }}>
            &copy; {currentYear} {deploymentLabels.systemName}. All rights reserved.
          </Typography>

          {/* Right - Links & Classification */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="#" sx={{ color: 'rgba(0, 0, 0, 0.55)', textDecoration: 'none', fontSize: '0.75rem', '&:hover': { color: '#008751' } }}>
                Privacy Policy
              </Link>
              <Link href="#" sx={{ color: 'rgba(0, 0, 0, 0.55)', textDecoration: 'none', fontSize: '0.75rem', '&:hover': { color: '#008751' } }}>
                Terms of Service
              </Link>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: '#b8860b',
                fontFamily: '"Courier New", monospace',
                letterSpacing: 1,
                fontSize: '0.6rem',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              OFFICIAL USE ONLY
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
