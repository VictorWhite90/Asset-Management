import { Box, Container, Typography, Link } from '@mui/material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.grey[200],
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            &copy; {currentYear} Nigeria Government Asset Management System. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="#" color="text.secondary" underline="hover" variant="body2">
              Privacy Policy
            </Link>
            <Link href="#" color="text.secondary" underline="hover" variant="body2">
              Terms of Service
            </Link>
            <Link href="#" color="text.secondary" underline="hover" variant="body2">
              Support
            </Link>
          </Box>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 2 }}
        >
          Version 1.0.0 | Built for efficient government asset tracking and management
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
