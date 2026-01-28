import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  CircularProgress,
  Chip,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person,
  Email,
  Add,
  UploadFile,
  ViewList,
  RateReview,
  TrendingUp,
  CheckCircle,
  Schedule,
  Cancel,
  AttachMoney,
  Assessment,
  VerifiedUser,
  AccountBalance,
  Security,
  Groups,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { getAgencyAssets, getApproverAssets, getAllAssets } from '@/services/asset.service';
import { getPendingMinistryAdmins } from '@/services/auth.service';
import { Asset } from '@/types/asset.types';
import { User } from '@/types/user.types';
import AppLayout from '@/components/AppLayout';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pendingMinistryAdmins, setPendingMinistryAdmins] = useState<User[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (userData && currentUser?.emailVerified) {
      fetchDashboardStats();
    }
  }, [userData, currentUser]);

  const fetchDashboardStats = async () => {
    if (!userData) return;

    setLoadingStats(true);
    setStatsError(null);
    try {
      let fetchedAssets: Asset[] = [];

      // Only fetch assets if the user's account is verified (has custom claims)
      // Pending users don't have custom claims, so Firestore will deny access
      const isAccountVerified = !userData.accountStatus || userData.accountStatus === 'verified';

      if (userData.role === 'agency' && isAccountVerified) {
        fetchedAssets = await getAgencyAssets(userData.userId);
      } else if (userData.role === 'agency-approver' && isAccountVerified) {
        fetchedAssets = await getApproverAssets(userData.ministryId || '');
      } else if (userData.role === 'admin') {
        fetchedAssets = await getAllAssets();
        // Fetch pending ministry admins for notification badge
        const admins = await getPendingMinistryAdmins();
        setPendingMinistryAdmins(admins);
      }

      setAssets(fetchedAssets);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setStatsError(err.message || 'Failed to load statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  // Calculate statistics
  const totalAssets = assets.length;
  const pendingAssets = assets.filter((a) => a.status === 'pending').length;
  const approvedAssets = assets.filter((a) => a.status === 'approved').length;
  const rejectedAssets = assets.filter((a) => a.status === 'rejected').length;

  const totalPurchaseCost = assets.reduce((sum, asset) => sum + asset.purchaseCost, 0);
  const totalMarketValue = assets.reduce(
    (sum, asset) => sum + (asset.marketValue || 0),
    0
  );

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Get recent uploads (last 5)
  const recentUploads = [...assets]
    .sort((a, b) => {
      const timeA = a.uploadTimestamp?.toMillis?.() || 0;
      const timeB = b.uploadTimestamp?.toMillis?.() || 0;
      return timeB - timeA;
    })
    .slice(0, 5);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Federal Administrator';
      case 'ministry-admin':
        return 'Ministry Administrator';
      case 'agency-approver':
        return 'Agency Approver';
      case 'agency':
        return 'Asset Uploader';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    const iconSx = { fontSize: { xs: 32, sm: 48 }, color: '#00ff88' };
    switch (role) {
      case 'admin':
        return <Security sx={iconSx} />;
      case 'ministry-admin':
        return <AccountBalance sx={iconSx} />;
      case 'agency-approver':
        return <VerifiedUser sx={iconSx} />;
      case 'agency':
        return <Person sx={iconSx} />;
      default:
        return <Person sx={iconSx} />;
    }
  };

  return (

    <AppLayout>
      <Container maxWidth="xl">
        {/* Welcome Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
            border: '1px solid rgba(0, 135, 81, 0.3)',
            borderLeft: '4px solid #008751',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: { xs: 50, sm: 70 },
                height: { xs: 50, sm: 70 },
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.3) 0%, rgba(0, 135, 81, 0.1) 100%)',
                border: '2px solid #008751',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 135, 81, 0.3)',
                flexShrink: 0,
              }}
            >
              {getRoleIcon(userData?.role || '')}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h4"
                sx={{
                  color: '#FFFFFF',
                  fontWeight: 700,
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
                  wordBreak: 'break-word',
                }}
              >
                Welcome, {userData?.name || userData?.agencyName || currentUser?.email?.split('@')[0]}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={getRoleDisplayName(userData?.role || '')}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(0, 135, 81, 0.2)',
                    color: '#00ff88',
                    border: '1px solid rgba(0, 135, 81, 0.4)',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                  }}
                />
                {userData?.agencyName && userData.role !== 'admin' && (
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {userData.agencyName}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Email Verification Alert */}
        {currentUser && !currentUser.emailVerified && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(184, 134, 11, 0.15)',
              border: '1px solid rgba(184, 134, 11, 0.3)',
            }}
          >
            Your email is not verified. Please check your inbox and verify your email address.
            <Button
              size="small"
              onClick={() => navigate('/verify-email')}
              sx={{ ml: 2, color: '#00ff88' }}
            >
              Verify Now
            </Button>
          </Alert>
        )}

        {/* Pending Ministry Approval Alert */}
        {userData?.accountStatus === 'pending_ministry_approval' && (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(0, 135, 81, 0.10)',
              border: '1px solid #008751',
              color: '#008751',
              fontWeight: 600,
            }}
          >
            Your account is <strong>pending approval by your Ministry Admin</strong>.<br />
            You will not be able to approve or upload assets until your account is verified by your ministry.
          </Alert>
        )}

        {/* Statistics Cards */}
        {currentUser?.emailVerified && (
          <>
            {loadingStats ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, py: 4 }}>
                <CircularProgress sx={{ color: '#00ff88' }} />
              </Box>
            ) : statsError ? (
              <Alert severity="error" sx={{ mb: 3 }}>
                {statsError}
              </Alert>
            ) : (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Statistics for Agency Uploader */}
                {userData?.role === 'agency' && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Total Assets
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {totalAssets}
                              </Typography>
                            </Box>
                            <TrendingUp sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Pending
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {pendingAssets}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                                Pending Assets
                              </Typography>
                            </Box>
                            <Schedule sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Approved
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {approvedAssets}
                              </Typography>
                            </Box>
                            <CheckCircle sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Rejected
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {rejectedAssets}
                              </Typography>
                            </Box>
                            <Cancel sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AttachMoney sx={{ mr: 1, color: '#00ff88', fontSize: { xs: 20, sm: 24 } }} />
                            <Typography variant="h6" sx={{ color: '#FFFFFF', fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>Total Purchase Cost</Typography>
                          </Box>
                          <Typography variant="h4" sx={{ color: '#00ff88', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2rem' }, wordBreak: 'break-word' }}>
                            {formatCurrency(totalPurchaseCost)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AttachMoney sx={{ mr: 1, color: '#4caf50', fontSize: { xs: 20, sm: 24 } }} />
                            <Typography variant="h6" sx={{ color: '#FFFFFF', fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>Total Market Value</Typography>
                          </Box>
                          <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2rem' }, wordBreak: 'break-word' }}>
                            {formatCurrency(totalMarketValue)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Recent Uploads */}
                    {recentUploads.length > 0 && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2 }}>
                            Recent Uploads
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {recentUploads.map((asset) => (
                              <Box
                                key={asset.id}
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  p: 2,
                                  borderRadius: 1,
                                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                                  border: '1px solid rgba(0, 135, 81, 0.2)',
                                  '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.15)' },
                                }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                                    {asset.description}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                    {asset.assetId} • {asset.category}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={asset.status.toUpperCase()}
                                  size="small"
                                  sx={{
                                    backgroundColor:
                                      asset.status === 'approved'
                                        ? 'rgba(46, 125, 50, 0.3)'
                                        : asset.status === 'rejected'
                                        ? 'rgba(198, 40, 40, 0.3)'
                                        : 'rgba(184, 134, 11, 0.3)',
                                    color:
                                      asset.status === 'approved'
                                        ? '#4caf50'
                                        : asset.status === 'rejected'
                                        ? '#ef5350'
                                        : '#ffc107',
                                    border: '1px solid',
                                    borderColor:
                                      asset.status === 'approved'
                                        ? 'rgba(46, 125, 50, 0.5)'
                                        : asset.status === 'rejected'
                                        ? 'rgba(198, 40, 40, 0.5)'
                                        : 'rgba(184, 134, 11, 0.5)',
                                  }}
                                />
                              </Box>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                  </>
                )}

                {/* Statistics for Agency Approver */}
                {userData?.role === 'agency-approver' && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Pending Approval
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {pendingAssets}
                              </Typography>
                            </Box>
                            <Schedule sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Total Assets
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {totalAssets}
                              </Typography>
                            </Box>
                            <TrendingUp sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Approved
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {approvedAssets}
                              </Typography>
                            </Box>
                            <CheckCircle sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Rejected
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {rejectedAssets}
                              </Typography>
                            </Box>
                            <Cancel sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}

                {/* Statistics for Admin */}
                {userData?.role === 'admin' && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Total Assets
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {totalAssets}
                              </Typography>
                            </Box>
                            <TrendingUp sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Approved
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {approvedAssets}
                              </Typography>
                            </Box>
                            <CheckCircle sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Pending
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {pendingAssets}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                                Pending Assets
                              </Typography>
                            </Box>
                            <Schedule sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Rejected
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                                {rejectedAssets}
                              </Typography>
                            </Box>
                            <Cancel sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AttachMoney sx={{ mr: 1, color: '#00ff88', fontSize: { xs: 20, sm: 24 } }} />
                            <Typography variant="h6" sx={{ color: '#FFFFFF', fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>Total Purchase Cost</Typography>
                          </Box>
                          <Typography variant="h4" sx={{ color: '#00ff88', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2rem' }, wordBreak: 'break-word' }}>
                            {formatCurrency(totalPurchaseCost)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            Across all ministries
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AttachMoney sx={{ mr: 1, color: '#4caf50', fontSize: { xs: 20, sm: 24 } }} />
                            <Typography variant="h6" sx={{ color: '#FFFFFF', fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>Total Market Value</Typography>
                          </Box>
                          <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2rem' }, wordBreak: 'break-word' }}>
                            {formatCurrency(totalMarketValue)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            Current valuation
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}
              </Grid>
            )}
          </>
        )}

        {/* User Info Cards */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Person sx={{ mr: 1, color: '#00ff88', fontSize: { xs: 20, sm: 24 } }} />
                  <Typography variant="h6" sx={{ color: '#FFFFFF', fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>Ministry/Agency</Typography>
                </Box>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '0.85rem', sm: '1rem' }, wordBreak: 'break-word' }}>
                  {userData?.agencyName || 'Federal Administration'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Email sx={{ mr: 1, color: '#00ff88', fontSize: { xs: 20, sm: 24 } }} />
                  <Typography variant="h6" sx={{ color: '#FFFFFF', fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>Email</Typography>
                </Box>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '0.85rem', sm: '1rem' }, wordBreak: 'break-word' }}>
                  {currentUser?.email || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DashboardIcon sx={{ mr: 1, color: '#00ff88', fontSize: { xs: 20, sm: 24 } }} />
                  <Typography variant="h6" sx={{ color: '#FFFFFF', fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>Role</Typography>
                </Box>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                  {getRoleDisplayName(userData?.role || '')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Asset Management Actions (Agency Only) */}
        {userData?.role === 'agency' && currentUser?.emailVerified && (
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(0, 135, 81, 0.05) 100%)',
              borderLeft: '4px solid #008751',
            }}
          >
            <Typography variant="h6" sx={{ color: '#00ff88', mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Asset Management
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Upload and manage your ministry's assets
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={6} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/assets/upload"
                  variant="contained"
                  fullWidth
                  startIcon={<Add />}
                  size="medium"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}
                >
                  Upload Asset
                </Button>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/assets/bulk-upload"
                  variant="outlined"
                  fullWidth
                  startIcon={<UploadFile />}
                  size="medium"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}
                >
                  Bulk Upload
                </Button>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/assets/my-assets"
                  variant="outlined"
                  fullWidth
                  startIcon={<ViewList />}
                  size="medium"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}
                >
                  View My Assets
                </Button>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/agency/reports"
                  variant="outlined"
                  fullWidth
                  startIcon={<Assessment />}
                  size="medium"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}
                >
                  Asset Reports
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Pending Verification Warning (Approver with Pending Status) */}
        {userData?.role === 'agency-approver' &&
         currentUser?.emailVerified &&
         userData?.accountStatus === 'pending_verification' && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              backgroundColor: 'rgba(184, 134, 11, 0.15)',
              border: '1px solid rgba(184, 134, 11, 0.3)',
              borderLeft: '4px solid #b8860b',
            }}
          >
            <Typography variant="h6" sx={{ color: '#ffc107', mb: 1 }}>
              Account Pending Verification
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Your approver account is awaiting verification by your ministry administrator.
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              <strong>Registered:</strong> {userData.createdAt?.toDate().toLocaleDateString('en-GB')}
            </Typography>
          </Paper>
        )}

        {/* Account Rejected Warning (Approver) */}
        {userData?.role === 'agency-approver' &&
         currentUser?.emailVerified &&
         userData?.accountStatus === 'rejected' && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              backgroundColor: 'rgba(198, 40, 40, 0.15)',
              border: '1px solid rgba(198, 40, 40, 0.3)',
              borderLeft: '4px solid #c62828',
            }}
          >
            <Typography variant="h6" sx={{ color: '#ef5350', mb: 1 }}>
              Account Verification Rejected
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Your approver account was rejected by your ministry administrator.
            </Typography>
            {userData.rejectionReason && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                <strong>Reason:</strong> {userData.rejectionReason}
              </Typography>
            )}
          </Paper>
        )}

        {/* Approver Actions (Verified) */}
        {userData?.role === 'agency-approver' &&
         currentUser?.emailVerified &&
         (!userData?.accountStatus || userData?.accountStatus === 'verified') && (
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.15) 0%, rgba(184, 134, 11, 0.05) 100%)',
              borderLeft: '4px solid #b8860b',
            }}
          >
            <Typography variant="h6" sx={{ color: '#ffc107', mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Review & Approval
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Review and approve asset uploads from your ministry
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} sm={6}>
                <Button
                  component={Link}
                  to="/approver/review-uploads"
                  variant="contained"
                  fullWidth
                  startIcon={<RateReview />}
                  size="medium"
                  sx={{
                    backgroundColor: '#b8860b',
                    '&:hover': { backgroundColor: '#8b6914' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    py: { xs: 1, sm: 1.5 },
                  }}
                >
                  Review Pending Uploads
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Admin Actions */}
        {userData?.role === 'admin' && currentUser?.emailVerified && (
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
              borderLeft: '4px solid #008751',
            }}
          >
            <Typography variant="h6" sx={{ color: '#00ff88', mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Federal Admin Panel
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Manage all assets, ministries, and ministry admin verifications
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={6} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/admin/assets"
                  variant="contained"
                  fullWidth
                  startIcon={<ViewList />}
                  size="medium"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}
                >
                  View All Assets
                </Button>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/reports"
                  variant="contained"
                  fullWidth
                  startIcon={<Assessment />}
                  size="medium"
                  sx={{
                    backgroundColor: '#b8860b',
                    '&:hover': { backgroundColor: '#8b6914' },
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    py: { xs: 1, sm: 1.5 },
                  }}
                >
                  Generate Reports
                </Button>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Badge
                  badgeContent={pendingMinistryAdmins.length}
                  color="error"
                  sx={{
                    width: '100%',
                    '& .MuiBadge-badge': {
                      right: { xs: 8, sm: 16 },
                      top: { xs: 8, sm: 16 },
                      fontSize: { xs: '0.7rem', sm: '0.85rem' },
                      fontWeight: 700,
                    }
                  }}
                >
                  <Button
                    component={Link}
                    to="/admin/verifications"
                    variant="outlined"
                    fullWidth
                    startIcon={<Groups />}
                    size="medium"
                    sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}
                  >
                    Admin Verifications
                  </Button>
                </Badge>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/admin/users"
                  variant="outlined"
                  fullWidth
                  startIcon={<Person />}
                  size="medium"
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}
                >
                  Manage Admins
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Ministry Admin - Pending Federal Admin Approval */}
        {userData?.role === 'ministry-admin' &&
         currentUser?.emailVerified &&
         userData?.accountStatus === 'pending_verification' && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              backgroundColor: 'rgba(184, 134, 11, 0.15)',
              border: '1px solid rgba(184, 134, 11, 0.3)',
              borderLeft: '4px solid #b8860b',
            }}
          >
            <Typography variant="h6" sx={{ color: '#ffc107', mb: 1 }}>
              Ministry Admin Account Pending Approval
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Your ministry admin account is awaiting approval by the federal administrator.
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              <strong>Registered:</strong> {userData.createdAt?.toDate().toLocaleDateString('en-GB')}
            </Typography>
          </Paper>
        )}

        {/* Ministry Admin - Account Rejected */}
        {userData?.role === 'ministry-admin' &&
         currentUser?.emailVerified &&
         userData?.accountStatus === 'rejected' && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              backgroundColor: 'rgba(198, 40, 40, 0.15)',
              border: '1px solid rgba(198, 40, 40, 0.3)',
              borderLeft: '4px solid #c62828',
            }}
          >
            <Typography variant="h6" sx={{ color: '#ef5350', mb: 1 }}>
              Ministry Admin Account Rejected
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Your ministry admin account was rejected by the federal administrator.
            </Typography>
            {userData.rejectionReason && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                <strong>Reason:</strong> {userData.rejectionReason}
              </Typography>
            )}
          </Paper>
        )}

        {/* Ministry Admin - Manage Staff */}
        {userData?.role === 'ministry-admin' &&
         currentUser?.emailVerified &&
         userData?.isMinistryOwner && (
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
              borderLeft: '4px solid #008751',
            }}
          >
            <Typography variant="h6" sx={{ color: '#00ff88', mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Ministry Management
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Manage staff registrations and approvals for your ministry
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={6} sm={6}>
                <Button
                  component={Link}
                  to="/ministry-admin/dashboard"
                  variant="contained"
                  fullWidth
                  startIcon={<VerifiedUser />}
                  size="medium"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}
                >
                  Manage Staff
                </Button>
              </Grid>
              <Grid item xs={6} sm={6}>
                <Button
                  component={Link}
                  to="/reports"
                  variant="contained"
                  fullWidth
                  startIcon={<Assessment />}
                  size="medium"
                  sx={{
                    backgroundColor: '#b8860b',
                    '&:hover': { backgroundColor: '#8b6914' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    py: { xs: 1, sm: 1.5 },
                  }}
                >
                  Generate Reports
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* System Info */}
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Nigeria Government Asset Management System
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            A comprehensive platform for managing government assets across ministries, departments, and agencies.
          </Typography>

          <Box sx={{ pt: 2, borderTop: '1px solid rgba(0, 135, 81, 0.2)' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              <strong>Ministry Type:</strong> {userData?.ministryType || 'Federal Administration'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              <strong>Location:</strong> {userData?.location || 'Abuja, FCT'}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </AppLayout>
  );
};

export default DashboardPage;
