import { Container, Paper, Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssetUploadForm from '@/components/AssetUploadForm';

/**
 * Asset Upload Page
 * Wrapper page for the AssetUploadForm component
 * Provides layout, title, and navigation back to dashboard
 */
const AssetUploadPage = () => {
  return (
    <Container component="main" maxWidth="md">
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
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
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
