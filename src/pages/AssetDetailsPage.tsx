import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  CalendarToday,
  LocationOn,
  Category as CategoryIcon,
  AttachMoney,
  Description,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { getAssetById, getCategoryDetails } from '@/services/asset.service';
import { Asset } from '@/types/asset.types';
import { Category } from '@/types/category.types';
import AppLayout from '@/components/AppLayout';

const AssetDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssetDetails();
  }, [id]);

  const fetchAssetDetails = async () => {
    if (!id) {
      setError('Asset ID not provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const assetData = await getAssetById(id);
      setAsset(assetData);

      // Fetch category details to display category-specific fields
      try {
        const categoryData = await getCategoryDetails(assetData.category);
        setCategory(categoryData);
      } catch (err) {
        console.error('Error loading category details:', err);
        // Continue without category details
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load asset details');
      toast.error(err.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (date: { day: number; month: number; year: number }) => {
    return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Chip
            icon={<CheckCircle />}
            label="APPROVED"
            sx={{
              backgroundColor: 'rgba(46, 125, 50, 0.15)',
              color: '#66bb6a',
              border: '1px solid rgba(46, 125, 50, 0.3)',
              fontSize: '1rem',
              padding: 2,
              '& .MuiChip-icon': { color: '#66bb6a' },
            }}
          />
        );
      case 'rejected':
        return (
          <Chip
            icon={<Cancel />}
            label="REJECTED"
            sx={{
              backgroundColor: 'rgba(211, 47, 47, 0.15)',
              color: '#ef5350',
              border: '1px solid rgba(211, 47, 47, 0.3)',
              fontSize: '1rem',
              padding: 2,
              '& .MuiChip-icon': { color: '#ef5350' },
            }}
          />
        );
      case 'pending':
      default:
        return (
          <Chip
            icon={<Schedule />}
            label="PENDING"
            sx={{
              backgroundColor: 'rgba(255, 167, 38, 0.15)',
              color: '#ffa726',
              border: '1px solid rgba(255, 167, 38, 0.3)',
              fontSize: '1rem',
              padding: 2,
              '& .MuiChip-icon': { color: '#ffa726' },
            }}
          />
        );
    }
  };

  const canEdit = asset && asset.status === 'rejected' && asset.uploadedBy === userData?.userId;

  if (loading) {
    return (
      <AppLayout>
        <Container component="main" maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#00ff88' }} />
          </Box>
        </Container>
      </AppLayout>
    );
  }

  if (error || !asset) {
    return (
      <AppLayout>
        <Container component="main" maxWidth="lg">
          <Box sx={{ mb: 3 }}>
            <Button
              component={Link}
              to="/dashboard"
              startIcon={<ArrowBack />}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: '#00ff88',
                  backgroundColor: 'transparent',
                },
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
          <Alert
            severity="error"
            sx={{
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              color: '#ef5350',
              border: '1px solid rgba(211, 47, 47, 0.3)',
            }}
          >
            {error || 'Asset not found'}
          </Alert>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container component="main" maxWidth="lg">
        {/* Back Button and Edit Button */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            component={Link}
            to={
              userData?.role === 'admin'
                ? '/admin/assets'
                : userData?.role === 'agency-approver'
                  ? '/approver/review-uploads'
                  : userData?.role === 'ministry-admin'
                    ? '/ministry-admin/dashboard'
                    : '/assets/my-assets'
            }
            startIcon={<ArrowBack />}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#00ff88',
                backgroundColor: 'transparent',
              },
            }}
          >
            Back
          </Button>
          {canEdit && (
            <Button
              component={Link}
              to={`/assets/edit/${id}`}
              startIcon={<Edit />}
              variant="contained"
              sx={{
                backgroundColor: '#008751',
                '&:hover': { backgroundColor: '#006038' },
              }}
            >
              Edit Asset
            </Button>
          )}
        </Box>

        {/* Page Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
            borderLeft: '4px solid #008751',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1 }}>
                Asset Details
              </Typography>
              <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                {asset.assetId}
              </Typography>
            </Box>
            {getStatusChip(asset.status)}
          </Box>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            {asset.description}
          </Typography>
        </Paper>

        {/* Basic Information */}
        <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: '#00ff88',
              fontWeight: 600,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Description />
            Basic Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                  border: '1px solid rgba(0, 135, 81, 0.2)',
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <CategoryIcon fontSize="small" /> Category
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {asset.category}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <LocationOn fontSize="small" /> Location
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {asset.location}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <CalendarToday fontSize="small" /> Purchase Date
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {formatDate(asset.purchasedDate)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                  border: '1px solid rgba(0, 135, 81, 0.2)',
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <AttachMoney fontSize="small" /> Purchase Cost
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 700 }}>
                        {formatCurrency(asset.purchaseCost)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <AttachMoney fontSize="small" /> Market Value
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#66bb6a', fontWeight: 700 }}>
                        {asset.marketValue ? formatCurrency(asset.marketValue) : 'Not specified'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Person fontSize="small" /> Agency
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {asset.agencyName || 'N/A'}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Category-Specific Fields */}
        {category && category.requiredFields.length > 0 && (
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600, mb: 2 }}>
              {asset.category} Specific Details
            </Typography>
            <Grid container spacing={3}>
              {category.requiredFields.map((field) => (
                <Grid item xs={12} sm={6} md={4} key={field}>
                  <Card
                    sx={{
                      backgroundColor: 'rgba(0, 135, 81, 0.1)',
                      border: '1px solid rgba(0, 135, 81, 0.2)',
                    }}
                  >
                    <CardContent>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {asset[field] || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Remarks */}
        {asset.remarks && (
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600, mb: 2 }}>
              Remarks
            </Typography>
            <Box
              sx={{
                p: 2,
                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                borderRadius: 1,
                border: '1px solid rgba(0, 135, 81, 0.2)',
              }}
            >
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {asset.remarks}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Approval Timeline */}
        <Paper elevation={0} sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: '#00ff88',
              fontWeight: 600,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Schedule />
            Approval Timeline
          </Typography>

          <Stack spacing={2}>
            {/* Upload Info */}
            <Card
              sx={{
                backgroundColor: 'rgba(66, 165, 245, 0.1)',
                border: '1px solid rgba(66, 165, 245, 0.3)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#42a5f5', fontWeight: 700 }}>
                      UPLOADED
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {formatTimestamp(asset.uploadTimestamp)}
                    </Typography>
                  </Box>
                  <Schedule sx={{ color: '#42a5f5', fontSize: 32 }} />
                </Box>
              </CardContent>
            </Card>

            {/* Approval Info */}
            {asset.status === 'approved' && asset.approvedBy && (
              <Card
                sx={{
                  backgroundColor: 'rgba(46, 125, 50, 0.1)',
                  border: '1px solid rgba(46, 125, 50, 0.3)',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#66bb6a', fontWeight: 700 }}>
                        APPROVED
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {formatTimestamp(asset.approvedAt)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Approved by: {asset.approvedBy}
                      </Typography>
                    </Box>
                    <CheckCircle sx={{ color: '#66bb6a', fontSize: 32 }} />
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Rejection Info */}
            {asset.status === 'rejected' && asset.rejectedBy && (
              <Card
                sx={{
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  border: '1px solid rgba(211, 47, 47, 0.3)',
                }}
              >
                <CardContent>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#ef5350', fontWeight: 700 }}>
                          REJECTED
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {formatTimestamp(asset.rejectedAt)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Rejected by: {asset.rejectedBy}
                        </Typography>
                      </Box>
                      <Cancel sx={{ color: '#ef5350', fontSize: 32 }} />
                    </Box>
                    {asset.rejectionReason && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          backgroundColor: 'rgba(211, 47, 47, 0.05)',
                          borderRadius: 1,
                          border: '1px solid rgba(211, 47, 47, 0.2)',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }} display="block" gutterBottom>
                          Reason for Rejection:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ef5350' }}>
                          {asset.rejectionReason}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Pending Info */}
            {asset.status === 'pending' && (
              <Card
                sx={{
                  backgroundColor: 'rgba(255, 167, 38, 0.1)',
                  border: '1px solid rgba(255, 167, 38, 0.3)',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#ffa726', fontWeight: 700 }}>
                        PENDING APPROVAL
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Awaiting review by agency approver
                      </Typography>
                    </Box>
                    <Schedule sx={{ color: '#ffa726', fontSize: 32 }} />
                  </Box>
                </CardContent>
              </Card>
            )}
          </Stack>

          {/* Action Button for Rejected Assets */}
          {canEdit && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Button
                component={Link}
                to={`/assets/edit/${id}`}
                startIcon={<Edit />}
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: '#008751',
                  '&:hover': { backgroundColor: '#006038' },
                }}
              >
                Edit and Resubmit Asset
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </AppLayout>
  );
};

export default AssetDetailsPage;
