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
import {
  getAgencyAssets,
  getApproverAssets,
  getAllAssets,
  getAllMinistryAssets,
  assetsVisibleOnTopAdminRegistry,
} from '@/services/asset.service';
import { getPendingMinistryAdmins, getPendingStaffCount } from '@/services/auth.service';
import { Asset } from '@/types/asset.types';
import { User } from '@/types/user.types';
import AppLayout from '@/components/AppLayout';
import { deploymentLabels } from '@/utils/deployment';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pendingMinistryAdmins, setPendingMinistryAdmins] = useState<User[]>([]);
  const [pendingStaffCount, setPendingStaffCount] = useState(0);
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
      } else if (userData.role === 'ministry-admin' && userData.ownedMinistryId && isAccountVerified) {
        const ministryAssets = await getAllMinistryAssets(userData.ownedMinistryId);
        fetchedAssets = assetsVisibleOnTopAdminRegistry(ministryAssets);
        const staffCount = await getPendingStaffCount(userData.ownedMinistryId);
        setPendingStaffCount(staffCount);
      } else if (userData.role === 'agency-approver' && userData.state && isAccountVerified) {
        fetchedAssets = await getApproverAssets(userData.ministryId || '', userData.state);
      } else if (userData.role === 'admin') {
        const all = await getAllAssets();
        fetchedAssets = assetsVisibleOnTopAdminRegistry(all);
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
  const approvedAssets = assets.filter((a) => a.status === 'approved' || a.status === 'submitted_to_federal').length;
  const rejectedAssets = assets.filter((a) => a.status === 'rejected').length;
  const pendingMinistryReview = assets.filter((a) => a.status === 'pending_ministry_review').length;

  // Admin-specific derived stats
  const getReportingEntityName = (asset: Asset) => (
    userData?.role === 'ministry-admin'
      ? asset.staffAgencyName || asset.agency || asset.agencyName
      : asset.agencyName
  );
  const reportingEntityNames = assets
    .map(getReportingEntityName)
    .filter((name): name is string => Boolean(name));
  const uniqueMinistries = new Set(reportingEntityNames).size;
  const uniqueCategories = new Set(assets.map((a) => a.category).filter(Boolean)).size;
  const newSubmissions = assets.length; // total approved assets visible to federal admin
  const reportingEntityLabel = userData?.role === 'ministry-admin' ? 'Agencies' : 'Ministries';
  const reportingEntityCaption = userData?.role === 'ministry-admin' ? 'Reporting agencies' : 'Reporting ministries';
  const totalAssetsCaption = userData?.role === 'ministry-admin' ? 'Across all agencies' : 'Across all ministries';

  // Category breakdown for bar chart
  const categoryBreakdown = Object.entries(
    assets.reduce((acc: Record<string, number>, a) => {
      if (a.category) acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const agencyBreakdown = Object.entries(
    assets.reduce((acc: Record<string, number>, a) => {
      const agency = getReportingEntityName(a) || 'Unspecified Agency';
      acc[agency] = (acc[agency] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const agencyMarketValueBreakdown = Object.entries(
    assets.reduce((acc: Record<string, number>, a) => {
      const agency = getReportingEntityName(a) || 'Unspecified Agency';
      acc[agency] = (acc[agency] || 0) + (Number(a.marketValue) || 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 7);

  const totalPurchaseCost = assets.reduce((sum, asset) => sum + asset.purchaseCost, 0);
  const totalMarketValue = assets.reduce(
    (sum, asset) => sum + (asset.marketValue || 0),
    0
  );

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Get recent uploads (last 2)
  const recentUploads = [...assets]
    .sort((a, b) => {
      const timeA = a.uploadTimestamp?.toMillis?.() || 0;
      const timeB = b.uploadTimestamp?.toMillis?.() || 0;
      return timeB - timeA;
    })
    .slice(0, 2);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return deploymentLabels.topAdminTitle;
      case 'ministry-admin':
        return deploymentLabels.ministryAdminTitle;
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

        {/* Priority Actions */}
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
              {deploymentLabels.topAdminPanel}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Manage all assets, ministries, and ministry admin verifications
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={6} sm={6} md={3}>
                <Button component={Link} to="/admin/assets" variant="contained" fullWidth startIcon={<ViewList />} size="medium" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}>
                  View All Assets
                </Button>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Button component={Link} to="/reports" variant="contained" fullWidth startIcon={<Assessment />} size="medium" sx={{ backgroundColor: '#b8860b', '&:hover': { backgroundColor: '#8b6914' }, fontSize: { xs: '0.7rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}>
                  Generate Reports
                </Button>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Badge badgeContent={pendingMinistryAdmins.length} color="error" sx={{ width: '100%', '& .MuiBadge-badge': { right: { xs: 8, sm: 16 }, top: { xs: 8, sm: 16 }, fontSize: { xs: '0.7rem', sm: '0.85rem' }, fontWeight: 700 } }}>
                  <Button component={Link} to="/admin/verifications" variant="outlined" fullWidth startIcon={<Groups />} size="medium" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}>
                    Admin Verifications
                  </Button>
                </Badge>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Button component={Link} to="/admin/users" variant="outlined" fullWidth startIcon={<Person />} size="medium" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}>
                  Manage Admins
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

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
                <Badge badgeContent={pendingStaffCount} color="error" sx={{ width: '100%' }}>
                  <Button component={Link} to="/ministry-admin/dashboard" variant="contained" fullWidth startIcon={<VerifiedUser />} size="medium" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}>
                    Manage Staff
                  </Button>
                </Badge>
              </Grid>
              <Grid item xs={6} sm={6}>
                <Button component={Link} to="/reports" variant="contained" fullWidth startIcon={<Assessment />} size="medium" sx={{ backgroundColor: '#b8860b', '&:hover': { backgroundColor: '#8b6914' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } }}>
                  Generate Reports
                </Button>
              </Grid>
            </Grid>
          </Paper>
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
                    <Grid item xs={12}>
                      <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                            Recent Uploads
                          </Typography>
                          <Button
                            component={Link}
                            to="/assets/my-assets"
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: 'rgba(0,135,81,0.5)', color: '#00ff88', fontSize: '0.75rem' }}
                          >
                            View All Uploads
                          </Button>
                        </Box>
                        {recentUploads.length === 0 ? (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 3 }}>
                            No uploads yet
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {recentUploads.map((asset) => {
                              const statusMap: Record<string, { label: string; color: string }> = {
                                approved: { label: 'Approved', color: '#4caf50' },
                                rejected: { label: 'Rejected', color: '#f44336' },
                                pending_ministry_review: { label: 'Ministry Review', color: '#2196f3' },
                                pending: { label: 'Pending Approval', color: '#ff9800' },
                                submitted_to_federal: { label: deploymentLabels.sentToTopAdmin, color: '#9c27b0' },
                              };
                              const s = statusMap[asset.status] || { label: asset.status, color: '#aaa' };
                              return (
                                <Box
                                  key={asset.id}
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    p: 2,
                                    borderRadius: 1,
                                    backgroundColor: 'rgba(0,135,81,0.07)',
                                    border: '1px solid rgba(0,135,81,0.15)',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600, wordBreak: 'break-word' }}>
                                      {asset.description}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                      {asset.assetId} • {asset.category} • ₦{asset.purchaseCost?.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={s.label}
                                    size="small"
                                    sx={{
                                      backgroundColor: `${s.color}20`,
                                      color: s.color,
                                      border: `1px solid ${s.color}40`,
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      flexShrink: 0,
                                    }}
                                  />
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Paper>
                    </Grid>
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

                    {/* Asset Chart for Approver */}
                    {categoryBreakdown.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" sx={{ color: '#00ff88', mb: 2.5, fontSize: { xs: '0.95rem', sm: '1.1rem' }, fontWeight: 600 }}>
                              Assets by Category
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              {categoryBreakdown.map(([cat, count], idx) => {
                                const pct = totalAssets > 0 ? (count / totalAssets) * 100 : 0;
                                const barColors = ['#00ff88', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];
                                const col = barColors[idx % barColors.length];
                                return (
                                  <Box key={cat}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{cat}</Typography>
                                      <Typography sx={{ fontSize: '0.78rem', color: col, fontWeight: 700 }}>{count} asset{count !== 1 ? 's' : ''}</Typography>
                                    </Box>
                                    <Box sx={{ height: 9, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                                      <Box sx={{ height: '100%', width: `${pct}%`, backgroundColor: col, borderRadius: 2, boxShadow: `0 0 8px ${col}55`, transition: 'width 0.6s ease' }} />
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {/* Status Distribution for Approver */}
                    {totalAssets > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" sx={{ color: '#00ff88', mb: 2.5, fontSize: { xs: '0.95rem', sm: '1.1rem' }, fontWeight: 600 }}>
                              Asset Status Overview
                            </Typography>
                            {(() => {
                              const slices = [
                                { label: 'Approved', count: approvedAssets, color: '#4caf50' },
                                { label: 'Pending Approval', count: pendingAssets, color: '#ff9800' },
                                { label: 'Rejected', count: rejectedAssets, color: '#f44336' },
                                { label: 'Ministry Review', count: pendingMinistryReview, color: '#2196f3' },
                              ].filter(s => s.count > 0);
                              if (slices.length === 0) return <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>No data yet</Typography>;
                              const r = 58; const cx = 78; const cy = 78;
                              let startAngle = -Math.PI / 2;
                              const paths = slices.map(s => {
                                const angle = (s.count / totalAssets) * 2 * Math.PI;
                                const x1 = cx + r * Math.cos(startAngle);
                                const y1 = cy + r * Math.sin(startAngle);
                                const x2 = cx + r * Math.cos(startAngle + angle);
                                const y2 = cy + r * Math.sin(startAngle + angle);
                                const large = angle > Math.PI ? 1 : 0;
                                const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
                                startAngle += angle;
                                return { ...s, d };
                              });
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                  <svg width="156" height="156" viewBox="0 0 156 156">
                                    {paths.map(p => <path key={p.label} d={p.d} fill={p.color} stroke="#0d2818" strokeWidth="2" />)}
                                  </svg>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                    {slices.map(s => (
                                      <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                                        <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>
                                          {s.label}: <strong>{s.count}</strong>
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {/* Recent Asset History for Approver */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                            Recent Asset History
                          </Typography>
                          <Button
                            component={Link}
                            to="/approver/review-uploads?tab=history"
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: 'rgba(0,135,81,0.5)', color: '#00ff88', fontSize: '0.75rem' }}
                          >
                            View All
                          </Button>
                        </Box>
                        {recentUploads.length === 0 ? (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 3 }}>
                            No assets yet
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {recentUploads.map((asset) => {
                              const statusMap: Record<string, { label: string; color: string }> = {
                                approved: { label: 'Approved', color: '#4caf50' },
                                rejected: { label: 'Rejected', color: '#f44336' },
                                pending_ministry_review: { label: 'Ministry Review', color: '#2196f3' },
                                pending: { label: 'Pending Approval', color: '#ff9800' },
                                submitted_to_federal: { label: deploymentLabels.sentToTopAdmin, color: '#9c27b0' },
                              };
                              const s = statusMap[asset.status] || { label: asset.status, color: '#aaa' };
                              return (
                                <Box
                                  key={asset.id}
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    p: 2,
                                    borderRadius: 1,
                                    backgroundColor: 'rgba(0,135,81,0.07)',
                                    border: '1px solid rgba(0,135,81,0.15)',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600, wordBreak: 'break-word' }}>
                                      {asset.description}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                      {asset.assetId} • {asset.category} • ₦{asset.purchaseCost?.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={s.label}
                                    size="small"
                                    sx={{
                                      backgroundColor: `${s.color}20`,
                                      color: s.color,
                                      border: `1px solid ${s.color}40`,
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      flexShrink: 0,
                                    }}
                                  />
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  </>
                )}

                {/* Statistics for Ministry Admin */}
                {userData?.role === 'ministry-admin' && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Total Assets</Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>{totalAssets}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{totalAssetsCaption}</Typography>
                            </Box>
                            <TrendingUp sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{reportingEntityLabel}</Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>{uniqueMinistries}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{reportingEntityCaption}</Typography>
                            </Box>
                            <AccountBalance sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Asset Categories</Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>{uniqueCategories}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Unique asset types</Typography>
                            </Box>
                            <Assessment sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Approved Assets</Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>{newSubmissions}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Sent by agencies</Typography>
                            </Box>
                            <Schedule sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Asset Chart for Ministry Admin */}
                    {agencyBreakdown.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" sx={{ color: '#00ff88', mb: 2.5, fontSize: { xs: '0.95rem', sm: '1.1rem' }, fontWeight: 600 }}>
                              Assets by Agency
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              {agencyBreakdown.map(([agency, count], idx) => {
                                const pct = totalAssets > 0 ? (count / totalAssets) * 100 : 0;
                                const barColors = ['#00ff88', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];
                                const col = barColors[idx % barColors.length];
                                return (
                                  <Box key={agency}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{agency}</Typography>
                                      <Typography sx={{ fontSize: '0.78rem', color: col, fontWeight: 700 }}>{count} asset{count !== 1 ? 's' : ''}</Typography>
                                    </Box>
                                    <Box sx={{ height: 9, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                                      <Box sx={{ height: '100%', width: `${pct}%`, backgroundColor: col, borderRadius: 2, boxShadow: `0 0 8px ${col}55`, transition: 'width 0.6s ease' }} />
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {/* Market Value by Agency for Ministry Admin */}
                    {totalAssets > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" sx={{ color: '#00ff88', mb: 0.5, fontSize: { xs: '0.95rem', sm: '1.1rem' }, fontWeight: 600 }}>
                              Market Value by Agency
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 2 }}>
                              Current market value of assets per agency
                            </Typography>
                            {(() => {
                              if (agencyMarketValueBreakdown.length === 0) return (
                                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>No market value data yet</Typography>
                              );
                              const maxVal = agencyMarketValueBreakdown[0][1];
                              const barColors = ['#2196f3', '#00bcd4', '#00ff88', '#ff9800', '#e91e63', '#9c27b0', '#4caf50'];
                              const chartH = 160;
                              const barCount = agencyMarketValueBreakdown.length;
                              const barWidth = Math.max(72, Math.min(160, Math.floor(620 / Math.max(barCount, 1))));
                              return (
                                <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
                                  {/* Vertical bar chart */}
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'flex-end',
                                      justifyContent: barCount <= 3 ? 'center' : 'flex-start',
                                      gap: { xs: 1, sm: 1.5 },
                                      minHeight: chartH + 58,
                                      minWidth: 'max-content',
                                      px: 0.5,
                                    }}
                                  >
                                    {agencyMarketValueBreakdown.map(([agency, value], idx) => {
                                      const col = barColors[idx % barColors.length];
                                      const barH = maxVal > 0 ? Math.max((value / maxVal) * chartH, 8) : 8;
                                      const formatted = value >= 1_000_000_000
                                        ? `₦${(value / 1_000_000_000).toFixed(1)}B`
                                        : value >= 1_000_000
                                        ? `₦${(value / 1_000_000).toFixed(1)}M`
                                        : `₦${value.toLocaleString()}`;
                                      return (
                                        <Box
                                          key={agency}
                                          sx={{
                                            width: { xs: Math.min(barWidth, 112), sm: barWidth },
                                            flex: '0 0 auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 0.6,
                                          }}
                                        >
                                          {/* Value label on top */}
                                          <Typography sx={{ fontSize: '0.58rem', color: col, fontWeight: 700, lineHeight: 1, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {formatted}
                                          </Typography>
                                          {/* Bar */}
                                          <Box sx={{ height: chartH, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                                            <Box sx={{
                                              width: '100%', height: barH,
                                              background: `linear-gradient(180deg, ${col}, ${col}88)`,
                                              borderRadius: '4px 4px 0 0',
                                              boxShadow: `0 0 10px ${col}55`,
                                              transition: 'height 0.7s ease',
                                              flexShrink: 0,
                                            }} />
                                          </Box>
                                          <Typography
                                            sx={{
                                              width: '100%',
                                              pt: 0.7,
                                              borderTop: '1px solid rgba(255,255,255,0.12)',
                                              fontSize: { xs: '0.58rem', sm: '0.62rem' },
                                              color: 'rgba(255,255,255,0.68)',
                                              lineHeight: 1.25,
                                              textAlign: 'center',
                                              whiteSpace: 'normal',
                                              overflowWrap: 'anywhere',
                                            }}
                                          >
                                            {agency}
                                          </Typography>
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                  {/* X-axis baseline */}
                                  <Box sx={{ display: 'none' }} />
                                  {/* Agency labels */}
                                  <Box sx={{ display: 'none' }}>
                                    {agencyMarketValueBreakdown.map(([state]) => (
                                      <Box key={state} sx={{ flex: 1, textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.2, wordBreak: 'break-word' }}>
                                          {state.length > 6 ? state.slice(0, 6) + '…' : state}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {/* Recent Asset History for Ministry Admin */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                            Recent Asset History
                          </Typography>
                          <Button
                            component={Link}
                            to="/ministry-admin/dashboard"
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: 'rgba(0,135,81,0.5)', color: '#00ff88', fontSize: '0.75rem' }}
                          >
                            View All
                          </Button>
                        </Box>
                        {recentUploads.length === 0 ? (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 3 }}>
                            No assets in your ministry yet
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {recentUploads.map((asset) => {
                              const statusMap: Record<string, { label: string; color: string }> = {
                                approved: { label: 'Approved', color: '#4caf50' },
                                rejected: { label: 'Rejected', color: '#f44336' },
                                pending_ministry_review: { label: 'Ministry Review', color: '#2196f3' },
                                pending: { label: 'Pending Approval', color: '#ff9800' },
                                submitted_to_federal: { label: deploymentLabels.sentToTopAdmin, color: '#9c27b0' },
                              };
                              const s = statusMap[asset.status] || { label: asset.status, color: '#aaa' };
                              return (
                                <Box
                                  key={asset.id}
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    p: 2,
                                    borderRadius: 1,
                                    backgroundColor: 'rgba(0,135,81,0.07)',
                                    border: '1px solid rgba(0,135,81,0.15)',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600, wordBreak: 'break-word' }}>
                                      {asset.description}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                      {asset.assetId} • {asset.category} • ₦{asset.purchaseCost?.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={s.label}
                                    size="small"
                                    sx={{
                                      backgroundColor: `${s.color}20`,
                                      color: s.color,
                                      border: `1px solid ${s.color}40`,
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      flexShrink: 0,
                                    }}
                                  />
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  </>
                )}

                {/* Statistics for Admin */}
                {userData?.role === 'admin' && (
                  <>
                    {/* Row 1: 4 stat cards */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Total Assets</Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>{totalAssets}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Across all ministries</Typography>
                            </Box>
                            <TrendingUp sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Ministries</Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>{uniqueMinistries}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Reporting ministries</Typography>
                            </Box>
                            <AccountBalance sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Asset Categories</Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>{uniqueCategories}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Unique asset types</Typography>
                            </Box>
                            <Assessment sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)', border: 'none' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Approved Assets</Typography>
                              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>{newSubmissions}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Sent by ministries</Typography>
                            </Box>
                            <Schedule sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Row 2: Purchase Cost + Market Value */}
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
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Across all ministries</Typography>
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
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Current valuation</Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Row 3: Asset Status Breakdown (pie) + Assets by Category (bar) */}
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>Asset Status Breakdown</Typography>
                          {totalAssets === 0 ? (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>No assets yet</Typography>
                          ) : (() => {
                            const slices = [
                              { label: 'Approved', count: approvedAssets, color: '#4caf50' },
                              { label: 'Awaiting Review', count: pendingMinistryReview, color: '#9c27b0' },
                              { label: 'Pending', count: pendingAssets, color: '#ff9800' },
                              { label: 'Rejected', count: rejectedAssets, color: '#f44336' },
                            ].filter(s => s.count > 0);
                            const r = 60; const cx = 80; const cy = 80;
                            let startAngle = -Math.PI / 2;
                            const paths = slices.map(s => {
                              const angle = (s.count / totalAssets) * 2 * Math.PI;
                              const x1 = cx + r * Math.cos(startAngle);
                              const y1 = cy + r * Math.sin(startAngle);
                              const x2 = cx + r * Math.cos(startAngle + angle);
                              const y2 = cy + r * Math.sin(startAngle + angle);
                              const large = angle > Math.PI ? 1 : 0;
                              const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
                              startAngle += angle;
                              return { ...s, d };
                            });
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <svg width="160" height="160" viewBox="0 0 160 160">
                                  {paths.map(p => <path key={p.label} d={p.d} fill={p.color} stroke="#0d2818" strokeWidth="2" />)}
                                </svg>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                  {slices.map(s => (
                                    <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                                        {s.label}: {s.count}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>Assets by Category</Typography>
                          {categoryBreakdown.length === 0 ? (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>No assets yet</Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              {categoryBreakdown.map(([cat, count]) => {
                                const pct = totalAssets > 0 ? (count / totalAssets) * 100 : 0;
                                return (
                                  <Box key={cat}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>{cat}</Typography>
                                      <Typography variant="caption" sx={{ color: '#00ff88', fontSize: '0.75rem', fontWeight: 600 }}>{count}</Typography>
                                    </Box>
                                    <Box sx={{ height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                      <Box sx={{ height: '100%', width: `${pct}%`, backgroundColor: '#008751', borderRadius: 4, transition: 'width 0.5s ease' }} />
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}
              </Grid>
            )}
          </>
        )}

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
              <Grid item xs={12} sm={6}>
                <Button
                  component={Link}
                  to="/reports"
                  variant="contained"
                  fullWidth
                  startIcon={<Assessment />}
                  size="medium"
                  sx={{
                    backgroundColor: '#008751',
                    '&:hover': { backgroundColor: '#006038' },
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
              {deploymentLabels.ministryAdminShort} Account Pending Approval
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Your {deploymentLabels.ministryAdminShort.toLowerCase()} account is awaiting approval by the {deploymentLabels.topAdminApprovalLower}.
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
              {deploymentLabels.ministryAdminShort} Account Rejected
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Your {deploymentLabels.ministryAdminShort.toLowerCase()} account was rejected by the {deploymentLabels.topAdminApprovalLower}.
            </Typography>
            {userData.rejectionReason && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                <strong>Reason:</strong> {userData.rejectionReason}
              </Typography>
            )}
          </Paper>
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
                  {userData?.agencyName || deploymentLabels.administrationFallback}
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

        {/* System Info */}
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {deploymentLabels.systemName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            A comprehensive platform for managing government assets across ministries, departments, and agencies.
          </Typography>

          <Box sx={{ pt: 2, borderTop: '1px solid rgba(0, 135, 81, 0.2)' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              <strong>Ministry Type:</strong> {userData?.ministryType || deploymentLabels.administrationFallback}
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
