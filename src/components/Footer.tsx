import { Box, Container, Typography, Link } from '@mui/material';
import { useLocation } from 'react-router-dom';

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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderTop: '1px solid rgba(0, 135, 81, 0.2)',
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
              <Box sx={{ width: 12, height: 8, backgroundColor: '#FFFFFF' }} />
              <Box sx={{ width: 12, height: 8, backgroundColor: '#008751' }} />
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Federal Republic of Nigeria
            </Typography>
          </Box>

          {/* Center - Copyright */}
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
            &copy; {currentYear} Nigeria Government Asset Management System. All rights reserved.
          </Typography>

          {/* Right - Links & Classification */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="#" sx={{ color: 'rgba(255, 255, 255, 0.5)', textDecoration: 'none', fontSize: '0.75rem', '&:hover': { color: '#00ff88' } }}>
                Privacy Policy
              </Link>
              <Link href="#" sx={{ color: 'rgba(255, 255, 255, 0.5)', textDecoration: 'none', fontSize: '0.75rem', '&:hover': { color: '#00ff88' } }}>
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
