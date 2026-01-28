import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  PersonRemove,
  Refresh,
  ArrowBack,
  People,
  VerifiedUser,
  SwapHoriz,
  Block,
  PersonOff,
  Dashboard as DashboardIcon,
  Inventory,
  Send,
  AttachMoney,
  CheckCircleOutline,
  PendingActions,
  Business,
  Warning,
  ContentCopy,
  VpnKey,
  Schedule,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPendingUsersForMinistry,
  getUsersByMinistry,
  approveUserByMinistryAdmin,
  rejectUserByMinistryAdmin,
  removeUserFromMinistry,
  changeStaffRole,
  disableStaff,
  enableStaff,
} from '@/services/user.service';
import {
  getAssetsByMinistryId,
  getAssetsForMinistryReview,
  getAllMinistryAssets,
  approveAssetByMinistry,
  rejectAssetByMinistry,
} from '@/services/asset.service';
import { getMinistryById } from '@/services/ministry.service';
import { User } from '@/types/user.types';
import { Asset } from '@/types/asset.types';
import { Ministry } from '@/types/ministry.types';
import { format } from 'date-fns';
import AppLayout from '@/components/AppLayout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MinistryAdminDashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [staffTabValue, setStaffTabValue] = useState(0);

  // Staff data
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [disabledStaff, setDisabledStaff] = useState<User[]>([]);

  // Asset data
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [approvedAssets, setApprovedAssets] = useState<Asset[]>([]);
  const [pendingMinistryReviewAssets, setPendingMinistryReviewAssets] = useState<Asset[]>([]);
  const [assetTabValue, setAssetTabValue] = useState(0);

  // Ministry data
  const [ministry, setMinistry] = useState<Ministry | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [uuidDialogOpen, setUuidDialogOpen] = useState(false);
  const [assetRejectDialogOpen, setAssetRejectDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [reason, setReason] = useState('');
  const [assetRejectReason, setAssetRejectReason] = useState('');
  const [approvedStaffData, setApprovedStaffData] = useState<{
    uuid: string;
    userEmail: string;
    userName: string;
  } | null>(null);

  // Check permissions
  useEffect(() => {
    if (!currentUser || !userData) {
      toast.error('You must be logged in');
      navigate('/login');
      return;
    }

    if (userData.role !== 'ministry-admin') {
      toast.error('Access denied. Ministry admins only.');
      navigate('/dashboard');
      return;
    }

    if (!userData.isMinistryOwner || !userData.ownedMinistryId) {
      toast.error('You must own a ministry to access this page');
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [currentUser, userData, navigate]);

  const loadData = async () => {
    if (!userData?.ownedMinistryId) return;

    setLoading(true);
    setError(null);

    try {
      const [pending, staff, allMinistryAssets, ministryData] = await Promise.all([
        getPendingUsersForMinistry(userData.ownedMinistryId),
        getUsersByMinistry(userData.ownedMinistryId),
        getAllMinistryAssets(userData.ownedMinistryId),
        getMinistryById(userData.ownedMinistryId),
      ]);

      setPendingUsers(pending);
      setAllStaff(staff.filter(u => u.accountStatus === 'verified'));
      setDisabledStaff(staff.filter(u => u.accountStatus === 'disabled'));

      // Assets are already filtered by ministry - now categorize by status
      setAllAssets(allMinistryAssets);
      setPendingMinistryReviewAssets(allMinistryAssets.filter(a => a.status === 'pending_ministry_review'));
      setApprovedAssets(allMinistryAssets.filter(a => a.status === 'approved'));

      setMinistry(ministryData);
    } catch (err: any) {
      console.error('Error loading ministry admin data:', err);
      setError(err.message || 'Failed to load data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user: User) => {
    if (!currentUser) return;

    setActionLoading(true);
    try {
      const result = await approveUserByMinistryAdmin(user.userId, currentUser.uid);
      setApprovedStaffData({
        uuid: result.uuid,
        userEmail: result.userEmail,
        userName: result.userName,
      });
      setUuidDialogOpen(true);
      toast.success(`Approved ${user.email}`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyUuid = () => {
    if (approvedStaffData?.uuid) {
      navigator.clipboard.writeText(approvedStaffData.uuid);
      toast.success('UUID copied to clipboard!');
    }
  };

  const handleCloseUuidDialog = () => {
    setUuidDialogOpen(false);
    setApprovedStaffData(null);
  };

  const handleRejectClick = (user: User) => {
    setSelectedUser(user);
    setReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!currentUser || !selectedUser || !reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      await rejectUserByMinistryAdmin(selectedUser.userId, currentUser.uid, reason);
      toast.success(`Rejected ${selectedUser.email}`);
      setRejectDialogOpen(false);
      setSelectedUser(null);
      setReason('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveClick = (user: User) => {
    setSelectedUser(user);
    setReason('');
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!currentUser || !selectedUser) return;

    setActionLoading(true);
    try {
      await removeUserFromMinistry(
        selectedUser.userId,
        currentUser.uid,
        reason.trim() || 'Removed from ministry'
      );
      toast.success(`Removed ${selectedUser.email} from ministry`);
      setRemoveDialogOpen(false);
      setSelectedUser(null);
      setReason('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRoleClick = (user: User) => {
    setSelectedUser(user);
    setChangeRoleDialogOpen(true);
  };

  const handleChangeRoleConfirm = async () => {
    if (!selectedUser) return;

    const newRole = selectedUser.role === 'agency' ? 'agency-approver' : 'agency';

    setActionLoading(true);
    try {
      await changeStaffRole(selectedUser.userId, newRole);
      toast.success(
        `Changed ${selectedUser.email} role to ${newRole === 'agency' ? 'Uploader' : 'Approver'}`
      );
      setChangeRoleDialogOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableClick = (user: User) => {
    setSelectedUser(user);
    setReason('');
    setDisableDialogOpen(true);
  };

  const handleDisableConfirm = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await disableStaff(selectedUser.userId, reason.trim() || undefined);
      toast.success(`Disabled ${selectedUser.email}`);
      setDisableDialogOpen(false);
      setSelectedUser(null);
      setReason('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable staff');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnableStaff = async (user: User) => {
    setActionLoading(true);
    try {
      await enableStaff(user.userId);
      toast.success(`Re-enabled ${user.email}`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to enable staff');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitToFederal = () => {
    if (approvedAssets.length === 0) {
      toast.warning('No approved assets to submit');
      return;
    }
    setSubmitDialogOpen(true);
  };

  const handleSubmitToFederalConfirm = async () => {
    toast.info('Submit to Federal feature coming soon!');
    setSubmitDialogOpen(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStaffTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setStaffTabValue(newValue);
  };

  const handleAssetTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setAssetTabValue(newValue);
  };

  // Asset approval handlers for Ministry Admin
  const handleApproveAsset = async (asset: Asset) => {
    if (!currentUser || !userData || !userData.ownedMinistryId) {
      toast.error('User context missing');
      return;
    }

    setActionLoading(true);
    try {
      await approveAssetByMinistry(
        asset.id || '',
        currentUser.uid,
        currentUser.email || '',
        userData.agencyName
      );
      toast.success(`Asset "${asset.assetId}" approved successfully`);
      await loadData();
    } catch (err: any) {
      console.error('Error approving asset:', err);
      toast.error(err.message || 'Failed to approve asset');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetRejectReason('');
    setAssetRejectDialogOpen(true);
  };

  const handleRejectAssetConfirm = async () => {
    if (!currentUser || !userData || !selectedAsset) {
      toast.error('User or asset context missing');
      return;
    }

    if (!assetRejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await rejectAssetByMinistry(
        selectedAsset.id || '',
        currentUser.uid,
        assetRejectReason,
        currentUser.email || '',
        userData.agencyName
      );
      toast.success(`Asset "${selectedAsset.assetId}" rejected successfully`);
      setAssetRejectDialogOpen(false);
      setSelectedAsset(null);
      setAssetRejectReason('');
      await loadData();
    } catch (err: any) {
      console.error('Error rejecting asset:', err);
      toast.error(err.message || 'Failed to reject asset');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'agency':
        return 'Uploader';
      case 'agency-approver':
        return 'Approver';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'agency':
        return { bg: 'rgba(25, 118, 210, 0.15)', color: '#64b5f6', border: 'rgba(25, 118, 210, 0.3)' };
      case 'agency-approver':
        return { bg: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', border: 'rgba(76, 175, 80, 0.3)' };
      default:
        return { bg: 'rgba(0, 135, 81, 0.1)', color: 'rgba(255, 255, 255, 0.8)', border: 'rgba(0, 135, 81, 0.3)' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotalValue = (assets: Asset[]) => {
    return assets.reduce((sum, asset) => sum + (asset.marketValue || asset.purchaseCost || 0), 0);
  };

  if (loading) {
    return (
      <AppLayout>
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress sx={{ color: '#00ff88' }} />
          </Box>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 3 }}>
          <Button
            component={Link}
            to="/dashboard"
            startIcon={<ArrowBack />}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { color: '#00ff88', backgroundColor: 'transparent' },
            }}
          >
            Back to Dashboard
          </Button>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
            borderLeft: '4px solid #008751',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Business sx={{ fontSize: 40, color: '#00ff88' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {ministry?.name || 'Ministry Command Hub'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}>
                  Ministry Administrator Dashboard
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadData}
              disabled={loading || actionLoading}
              sx={{
                borderColor: 'rgba(0, 135, 81, 0.5)',
                color: '#00ff88',
                '&:hover': { borderColor: '#00ff88', backgroundColor: 'rgba(0, 135, 81, 0.1)' },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={0}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              borderBottom: '1px solid rgba(0, 135, 81, 0.3)',
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.6)',
                '&.Mui-selected': { color: '#00ff88' },
              },
              '& .MuiTabs-indicator': { backgroundColor: '#00ff88' },
            }}
          >
            <Tab icon={<DashboardIcon />} iconPosition="start" label="Overview" />
            <Tab icon={<People />} iconPosition="start" label={`Staff (${allStaff.length})`} />
            <Tab icon={<Inventory />} iconPosition="start" label={`Assets (${allAssets.length})`} />
          </Tabs>

          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                          Total Assets
                        </Typography>
                        <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                          {allAssets.length}
                        </Typography>
                      </Box>
                      <Inventory sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                          Total Value
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1.5rem' }}>
                          {formatCurrency(calculateTotalValue(allAssets))}
                        </Typography>
                      </Box>
                      <AttachMoney sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #ed6c02 0%, #c55a02 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                          Ready to Submit
                        </Typography>
                        <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                          {approvedAssets.length}
                        </Typography>
                      </Box>
                      <PendingActions sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                          Active Staff
                        </Typography>
                        <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                          {allStaff.length}
                        </Typography>
                      </Box>
                      <VerifiedUser sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                backgroundColor: 'rgba(0, 135, 81, 0.05)',
                border: '1px solid rgba(0, 135, 81, 0.2)',
              }}
            >
              <Typography variant="h6" sx={{ color: '#00ff88', mb: 2, fontWeight: 600 }}>
                Ministry Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Ministry Type
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                    {ministry?.ministryType || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Location
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                    {ministry?.location || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Official Email
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                    {ministry?.officialEmail || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Status
                  </Typography>
                  <Chip
                    label="Verified"
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(76, 175, 80, 0.15)',
                      color: '#4caf50',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Typography variant="h6" sx={{ color: '#00ff88', mb: 2, fontWeight: 600 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<People />}
                  onClick={() => setTabValue(1)}
                  sx={{
                    py: 1.5,
                    borderColor: 'rgba(0, 135, 81, 0.5)',
                    color: '#FFFFFF',
                    '&:hover': { borderColor: '#00ff88', backgroundColor: 'rgba(0, 135, 81, 0.1)' },
                  }}
                >
                  Manage Staff ({pendingUsers.length} pending)
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Inventory />}
                  onClick={() => setTabValue(2)}
                  sx={{
                    py: 1.5,
                    borderColor: 'rgba(0, 135, 81, 0.5)',
                    color: '#FFFFFF',
                    '&:hover': { borderColor: '#00ff88', backgroundColor: 'rgba(0, 135, 81, 0.1)' },
                  }}
                >
                  View Assets
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Send />}
                  onClick={handleSubmitToFederal}
                  disabled={approvedAssets.length === 0}
                  sx={{
                    py: 1.5,
                    backgroundColor: '#008751',
                    '&:hover': { backgroundColor: '#006038' },
                    '&:disabled': {
                      backgroundColor: 'rgba(0, 135, 81, 0.3)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    },
                  }}
                >
                  Submit to Federal ({approvedAssets.length})
                </Button>
              </Grid>
            </Grid>

            {pendingUsers.length > 0 && (
              <Alert
                severity="info"
                icon={<Warning />}
                sx={{
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  '& .MuiAlert-message': { color: 'rgba(255, 255, 255, 0.9)' },
                }}
              >
                You have {pendingUsers.length} pending staff registration{pendingUsers.length > 1 ? 's' : ''} awaiting approval
              </Alert>
            )}
          </TabPanel>

          {/* Staff Tab */}
          <TabPanel value={tabValue} index={1}>
            <Tabs
              value={staffTabValue}
              onChange={handleStaffTabChange}
              sx={{
                mb: 2,
                '& .MuiTab-root': {
                  color: 'rgba(255, 255, 255, 0.6)',
                  '&.Mui-selected': { color: '#00ff88' },
                },
                '& .MuiTabs-indicator': { backgroundColor: '#00ff88' },
              }}
            >
              <Tab label={`Pending (${pendingUsers.length})`} />
              <Tab label={`Active (${allStaff.length})`} />
              <Tab label={`Disabled (${disabledStaff.length})`} />
            </Tabs>

            <TabPanel value={staffTabValue} index={0}>
              {pendingUsers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <CheckCircle sx={{ fontSize: 60, color: '#00ff88', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                    No pending staff registrations
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Role</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Registered</TableCell>
                        <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingUsers.map((user) => {
                        const roleStyle = getRoleColor(user.role);
                        return (
                          <TableRow key={user.userId} sx={{ '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' } }}>
                            <TableCell sx={{ color: '#FFFFFF' }}>{user.email}</TableCell>
                            <TableCell>
                              <Chip label={getRoleLabel(user.role)} size="small" sx={{ ...roleStyle }} />
                            </TableCell>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                              {user.createdAt ? format(user.createdAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Approve">
                                <IconButton
                                  onClick={() => handleApprove(user)}
                                  disabled={actionLoading}
                                  sx={{ color: '#4caf50', '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' } }}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  onClick={() => handleRejectClick(user)}
                                  disabled={actionLoading}
                                  sx={{ color: '#f44336', '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' } }}
                                >
                                  <Cancel />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            <TabPanel value={staffTabValue} index={1}>
              {allStaff.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <People sx={{ fontSize: 60, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                    No active staff members yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Role</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Joined</TableCell>
                        <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allStaff.map((user) => {
                        const roleStyle = getRoleColor(user.role);
                        return (
                          <TableRow key={user.userId} sx={{ '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' } }}>
                            <TableCell sx={{ color: '#FFFFFF' }}>{user.email}</TableCell>
                            <TableCell>
                              <Chip label={getRoleLabel(user.role)} size="small" sx={{ ...roleStyle }} />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label="Active"
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(76, 175, 80, 0.15)',
                                  color: '#4caf50',
                                  border: '1px solid rgba(76, 175, 80, 0.3)',
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                              {user.verifiedAt ? format(user.verifiedAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                              {user.userId !== currentUser?.uid && (
                                <>
                                  <Tooltip title={`Change to ${user.role === 'agency' ? 'Approver' : 'Uploader'}`}>
                                    <IconButton
                                      onClick={() => handleChangeRoleClick(user)}
                                      disabled={actionLoading}
                                      sx={{ color: '#2196f3', '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' } }}
                                    >
                                      <SwapHoriz />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Disable staff">
                                    <IconButton
                                      onClick={() => handleDisableClick(user)}
                                      disabled={actionLoading}
                                      sx={{ color: '#ff9800', '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.1)' } }}
                                    >
                                      <Block />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Remove from ministry">
                                    <IconButton
                                      onClick={() => handleRemoveClick(user)}
                                      disabled={actionLoading}
                                      sx={{ color: '#f44336', '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' } }}
                                    >
                                      <PersonRemove />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            <TabPanel value={staffTabValue} index={2}>
              {disabledStaff.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <PersonOff sx={{ fontSize: 60, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                    No disabled staff members
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Role</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Disabled On</TableCell>
                        <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {disabledStaff.map((user) => {
                        const roleStyle = getRoleColor(user.role);
                        return (
                          <TableRow key={user.userId} sx={{ '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' }, opacity: 0.8 }}>
                            <TableCell sx={{ color: '#FFFFFF' }}>{user.email}</TableCell>
                            <TableCell>
                              <Chip label={getRoleLabel(user.role)} size="small" sx={{ ...roleStyle, opacity: 0.6 }} />
                            </TableCell>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              {(user as any).disabledAt ? format((user as any).disabledAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Re-enable staff">
                                <IconButton
                                  onClick={() => handleEnableStaff(user)}
                                  disabled={actionLoading}
                                  sx={{ color: '#4caf50', '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' } }}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </TabPanel>

          {/* Assets Tab */}
          <TabPanel value={tabValue} index={2}>
            {/* Asset Sub-Tabs */}
            <Paper elevation={0} sx={{ backgroundColor: 'transparent', mb: 2 }}>
              <Tabs
                value={assetTabValue}
                onChange={handleAssetTabChange}
                sx={{
                  borderBottom: '1px solid rgba(0, 135, 81, 0.2)',
                  '& .MuiTab-root': { color: '#aaa' },
                  '& .Mui-selected': { color: '#00ff88' },
                }}
              >
                <Tab
                  label={`Pending Ministry Review (${pendingMinistryReviewAssets.length})`}
                  id="asset-tab-0"
                />
                <Tab
                  label={`Approved (${approvedAssets.length})`}
                  id="asset-tab-1"
                />
                <Tab
                  label={`All Assets (${allAssets.length})`}
                  id="asset-tab-2"
                />
              </Tabs>
            </Paper>

            {/* Pending Ministry Review Tab */}
            <TabPanel value={assetTabValue} index={0}>
              {pendingMinistryReviewAssets.length === 0 ? (
                <Alert severity="info">No assets pending your ministry review</Alert>
              ) : (
                <>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {pendingMinistryReviewAssets.length} asset(s) awaiting your approval
                    </Typography>
                  </Alert>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#0d2818' }}>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Asset ID</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Description</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Category</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Value</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Uploaded By</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Approved By</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="right">
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingMinistryReviewAssets.map((asset) => (
                          <TableRow key={asset.id} hover>
                            <TableCell sx={{ fontWeight: 'bold' }}>{asset.assetId}</TableCell>
                            <TableCell>{asset.description}</TableCell>
                            <TableCell>{asset.category}</TableCell>
                            <TableCell>₦{asset.purchaseCost?.toLocaleString() || 0}</TableCell>
                            <TableCell sx={{ color: '#00ff88' }}>{asset.uploadedBy}</TableCell>
                            <TableCell sx={{ color: '#2196f3' }}>{asset.approvedBy || 'N/A'}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleApproveAsset(asset)}
                                  disabled={actionLoading}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRejectAsset(asset)}
                                  disabled={actionLoading}
                                >
                                  <Cancel />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </TabPanel>

            {/* Approved Assets Tab */}
            <TabPanel value={assetTabValue} index={1}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Ready for Federal Submission
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={handleSubmitToFederal}
                  disabled={approvedAssets.length === 0 || actionLoading}
                  sx={{
                    backgroundColor: '#008751',
                    '&:hover': { backgroundColor: '#006038' },
                  }}
                >
                  Submit All ({approvedAssets.length})
                </Button>
              </Box>

              {approvedAssets.length === 0 ? (
                <Alert severity="info">No approved assets ready for submission</Alert>
              ) : (
                <>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 3,
                      backgroundColor: 'rgba(0, 135, 81, 0.05)',
                      border: '1px solid rgba(0, 135, 81, 0.2)',
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          Total Approved Assets
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#00ff88', fontWeight: 700 }}>
                          {approvedAssets.length}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          Total Value
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                          {formatCurrency(calculateTotalValue(approvedAssets))}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#0d2818' }}>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Asset ID</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Description</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Category</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Value</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {approvedAssets.map((asset) => (
                          <TableRow key={asset.id} hover>
                            <TableCell sx={{ fontWeight: 'bold', color: '#00ff88' }}>{asset.assetId}</TableCell>
                            <TableCell>{asset.description}</TableCell>
                            <TableCell>{asset.category}</TableCell>
                            <TableCell>₦{asset.purchaseCost?.toLocaleString() || 0}</TableCell>
                            <TableCell>
                              <Chip
                                label="Approved"
                                size="small"
                                icon={<CheckCircle />}
                                sx={{
                                  backgroundColor: 'rgba(76, 175, 80, 0.15)',
                                  color: '#4caf50',
                                  border: '1px solid rgba(76, 175, 80, 0.3)',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </TabPanel>

            {/* All Assets Tab */}
            <TabPanel value={assetTabValue} index={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Showing all {allAssets.length} assets from your ministry across all statuses
              </Alert>

              {allAssets.length === 0 ? (
                <Alert severity="warning">No assets in this ministry yet</Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#0d2818' }}>
                        <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Asset ID</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Description</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Category</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Value</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Uploaded By</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allAssets.map((asset) => {
                        let statusColor = '#aaa';
                        let statusIcon = null;
                        let statusLabel = asset.status;

                        if (asset.status === 'pending_ministry_review') {
                          statusColor = '#2196f3';
                          statusIcon = <PendingActions />;
                          statusLabel = 'Pending Review';
                        } else if (asset.status === 'approved') {
                          statusColor = '#4caf50';
                          statusIcon = <CheckCircle />;
                        } else if (asset.status === 'rejected') {
                          statusColor = '#f44336';
                          statusIcon = <Cancel />;
                        } else if (asset.status === 'pending') {
                          statusColor = '#ff9800';
                          statusIcon = <Schedule />;
                        }

                        return (
                          <TableRow key={asset.id} hover>
                            <TableCell sx={{ fontWeight: 'bold' }}>{asset.assetId}</TableCell>
                            <TableCell>{asset.description}</TableCell>
                            <TableCell>{asset.category}</TableCell>
                            <TableCell>₦{asset.purchaseCost?.toLocaleString() || 0}</TableCell>
                            <TableCell>
                              <Chip
                                icon={statusIcon}
                                label={statusLabel}
                                size="small"
                                sx={{
                                  backgroundColor: `${statusColor}15`,
                                  color: statusColor,
                                  border: `1px solid ${statusColor}30`,
                                }}
                              />
                            </TableCell>
                            <TableCell>{asset.uploadedBy || 'N/A'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </TabPanel>
        </Paper>

        {/* Dialogs */}
        <Dialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          PaperProps={{ sx: { backgroundColor: '#0d2818', border: '1px solid rgba(0, 135, 81, 0.3)' } }}
        >
          <DialogTitle sx={{ color: '#f44336', fontWeight: 600 }}>
            Reject User Registration
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Rejecting: <strong>{selectedUser?.email}</strong>
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={3}
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRejectConfirm} disabled={!reason.trim()} variant="contained" color="error">
              Reject
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={submitDialogOpen}
          onClose={() => setSubmitDialogOpen(false)}
          PaperProps={{ sx: { backgroundColor: '#0d2818', border: '1px solid rgba(0, 135, 81, 0.3)' } }}
        >
          <DialogTitle sx={{ color: '#00ff88', fontWeight: 600 }}>
            Submit Assets to Federal Dashboard
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Submitting <strong>{approvedAssets.length} asset{approvedAssets.length > 1 ? 's' : ''}</strong> to Federal Administrator
            </Typography>
            <Alert sx={{ mt: 2, backgroundColor: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.3)' }}>
              Total Value: <strong>{formatCurrency(calculateTotalValue(approvedAssets))}</strong>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitToFederalConfirm} variant="contained" sx={{ backgroundColor: '#008751' }}>
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        {/* UUID Display Dialog */}
        <Dialog
          open={uuidDialogOpen}
          onClose={handleCloseUuidDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { backgroundColor: '#0d2818', border: '2px solid rgba(0, 255, 136, 0.5)' } }}
        >
          <DialogTitle sx={{ color: '#00ff88', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKey />
            Staff Approved Successfully
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Alert severity="success" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {approvedStaffData?.userName} ({approvedStaffData?.userEmail}) has been approved!
                </Typography>
                <Typography variant="caption">
                  A unique UUID has been generated for this staff member.
                </Typography>
              </Alert>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                Staff UUID:
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                  border: '1px solid rgba(0, 255, 136, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: '#00ff88',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: 1,
                    wordBreak: 'break-all',
                  }}
                >
                  {approvedStaffData?.uuid}
                </Typography>
                <Tooltip title="Copy to clipboard">
                  <IconButton
                    onClick={handleCopyUuid}
                    sx={{
                      color: '#00ff88',
                      '&:hover': { backgroundColor: 'rgba(0, 255, 136, 0.1)' },
                    }}
                  >
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
              </Paper>
            </Box>

            <Alert severity="info" sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.3)', mb: 2 }}>
              <Typography variant="caption">
                <strong>Important:</strong> Please share this UUID with the staff member. They will need it for login and tracking purposes.
                The UUID has also been saved to their account.
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.5)' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#ff9800' }}>
                ⚠️ Critical: Staff Must Log Out and Log Back In
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6 }}>
                The staff member's permissions have been activated. However, <strong>they must log out completely and log back in</strong> to get the updated permissions. 
                <br />
                <br />
                Without logging out and back in:
                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                  <li>They will NOT be able to approve or upload assets</li>
                  <li>They will NOT see the Review Uploads page</li>
                </ul>
                <br />
                <strong>Solution:</strong> Ask them to log out now and log back in to activate their account.
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCopyUuid} startIcon={<ContentCopy />} sx={{ color: '#00ff88' }}>
              Copy UUID
            </Button>
            <Button onClick={handleCloseUuidDialog} variant="contained" sx={{ backgroundColor: '#008751' }}>
              Done
            </Button>
          </DialogActions>
        </Dialog>

        {/* Asset Rejection Dialog */}
        <Dialog
          open={assetRejectDialogOpen}
          onClose={() => setAssetRejectDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { backgroundColor: '#0d2818', border: '1px solid rgba(0, 135, 81, 0.3)' } }}
        >
          <DialogTitle sx={{ color: '#ff9800', fontWeight: 600 }}>
            Reject Asset: {selectedAsset?.assetId}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Please provide a reason for rejecting this asset.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Rejection Reason"
              value={assetRejectReason}
              onChange={(e) => setAssetRejectReason(e.target.value)}
              placeholder="e.g., Missing documentation, incomplete information, etc."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(0, 20, 10, 0.5)',
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setAssetRejectDialogOpen(false);
              setSelectedAsset(null);
              setAssetRejectReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleRejectAssetConfirm}
              variant="contained"
              sx={{ backgroundColor: '#f44336' }}
              disabled={actionLoading || !assetRejectReason.trim()}
            >
              Reject Asset
            </Button>
          </DialogActions>
        </Dialog>

        {/* Remove from Ministry Dialog */}
        <Dialog
          open={removeDialogOpen}
          onClose={() => setRemoveDialogOpen(false)}
          PaperProps={{ sx: { backgroundColor: '#0d2818', border: '1px solid rgba(0, 135, 81, 0.3)' } }}
        >
          <DialogTitle sx={{ color: '#f44336', fontWeight: 600 }}>
            Remove Staff from Ministry
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Remove <strong>{selectedUser?.email}</strong> from this ministry?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRemoveConfirm} variant="contained" color="error" disabled={actionLoading}>
              Remove
            </Button>
          </DialogActions>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog
          open={changeRoleDialogOpen}
          onClose={() => setChangeRoleDialogOpen(false)}
          PaperProps={{ sx: { backgroundColor: '#0d2818', border: '1px solid rgba(0, 135, 81, 0.3)' } }}
        >
          <DialogTitle sx={{ color: '#2196f3', fontWeight: 600 }}>
            Change Staff Role
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Change role for <strong>{selectedUser?.email}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Current Role: <strong>{getRoleLabel(selectedUser?.role || '')}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: '#00ff88', mt: 1 }}>
              New Role: <strong>{selectedUser?.role === 'agency' ? 'Approver' : 'Uploader'}</strong>
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangeRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeRoleConfirm} variant="contained" sx={{ backgroundColor: '#2196f3' }} disabled={actionLoading}>
              Confirm Change
            </Button>
          </DialogActions>
        </Dialog>

        {/* Disable Staff Dialog */}
        <Dialog
          open={disableDialogOpen}
          onClose={() => setDisableDialogOpen(false)}
          PaperProps={{ sx: { backgroundColor: '#0d2818', border: '1px solid rgba(0, 135, 81, 0.3)' } }}
        >
          <DialogTitle sx={{ color: '#ff9800', fontWeight: 600 }}>
            Disable Staff Account
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Disable <strong>{selectedUser?.email}</strong>'s account? They will no longer be able to access the system.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisableDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDisableConfirm} variant="contained" sx={{ backgroundColor: '#ff9800' }} disabled={actionLoading}>
              Disable
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default MinistryAdminDashboardPage;
