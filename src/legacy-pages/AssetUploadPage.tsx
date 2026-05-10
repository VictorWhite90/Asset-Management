import { Container, Paper, Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@/components/icons';
import AssetUploadForm from '@/components/AssetUploadForm';

/**
 * Asset Upload Page
 * Wrapper page for the AssetUploadForm component
 * Provides layout, title, and navigation back to dashboard
 */
const AssetUploadPage = () => {
  return (
    <Container component="main" maxWidth="lg">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Back to Dashboard Button */}
        <Box sx={{ alignSelf: 'flex-start', mb: 2 }}>
          <Button
            component={Link}
            to="/dashboard"
            startIcon={<ArrowBackIcon />}
            variant="text"
          >
            Back to Dashboard
          </Button>
        </Box>

        <Paper
          elevation={3}
          sx={{
            width: '100%',
            padding: { xs: 2.5, md: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.72)',
            border: '1px solid rgba(0, 135, 81, 0.18)',
            boxShadow: '0 24px 70px rgba(20, 54, 37, 0.12)',
            backdropFilter: 'blur(18px)',
          }}
        >
          {/* Page Title */}
          <Typography component="h1" variant="h4" gutterBottom>
            Upload Asset
          </Typography>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Fill in the details below to add a new asset to your inventory.
            Fields marked with * are required.
          </Typography>

          {/* Upload Form */}
          <AssetUploadForm />
        </Paper>
      </Box>
    </Container>
  );
};

export default AssetUploadPage;
