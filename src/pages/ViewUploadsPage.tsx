import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
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
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Visibility as Eye,
  Edit,
  CheckCircle,
  Cancel,
  Schedule,
  PendingActions,
  ArrowBack,
  Search,
} from '@mui/icons-material';
import { format } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAgencyAssets,
  getApproverAssets,
} from '@/services/asset.service';
import { Asset } from '@/types/asset.types';

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

const ViewUploadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Determine if user is uploader or approver
  const isUploader = userData?.role === 'agency';
  const isApprover = userData?.role === 'agency-approver';
  const pageTitle = isUploader ? 'My Uploads' : isApprover ? 'Assets Review' : 'View Uploads';

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fetchedAssets: Asset[] = [];

      if (isUploader && userData?.userId) {
        // Uploaders see their own assets
        fetchedAssets = await getAgencyAssets(userData.userId);
      } else if (isApprover && userData?.ministryId) {
        // Approvers see all assets from their ministry
        fetchedAssets = await getApproverAssets(userData.ministryId);
      } else {
        setError('Unable to load assets for your role');
        return;
      }

      setAssets(fetchedAssets);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching assets:', error);
      setError(error.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [isUploader, isApprover, userData?.userId, userData?.ministryId]);

  useEffect(() => {
    if (userData && currentUser?.emailVerified) {
      fetchAssets();
    }
  }, [userData, currentUser, fetchAssets]);

  // Filter assets by status and search term
  const getPendingAssets = () => {
    return assets.filter((a) => a.status === 'pending' && matches(a, searchTerm));
  };

  const getApprovedAssets = () => {
    return assets.filter(
      (a) => (a.status === 'approved' || a.status === 'pending_ministry_review') && matches(a, searchTerm)
    );
  };

  const getRejectedAssets = () => {
    return assets.filter((a) => a.status === 'rejected' && matches(a, searchTerm));
  };

  const matches = (asset: Asset, term: string): boolean => {
    if (!term) return true;
    const lowerTerm = term.toLowerCase();
    return (
      asset.assetId?.toLowerCase().includes(lowerTerm) ||
      asset.description?.toLowerCase().includes(lowerTerm) ||
      asset.category?.toLowerCase().includes(lowerTerm) ||
      asset.location?.toLowerCase().includes(lowerTerm)
    );
  };

  const handleViewDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedAsset(null);
  };

  const handleEdit = (assetId: string) => {
    navigate(`/assets/edit/${assetId}`);
  };

  const getStatusChip = (asset: Asset) => {
    switch (asset.status) {
      case 'pending':
        return <Chip icon={<Schedule />} label="Pending" color="warning" size="small" />;
      case 'pending_ministry_review':
        return <Chip icon={<PendingActions />} label="Ministry Review" color="info" size="small" />;
      case 'approved':
        return <Chip icon={<CheckCircle />} label="Approved" color="success" size="small" />;
      case 'rejected':
        return <Chip icon={<Cancel />} label="Rejected" color="error" size="small" />;
      default:
        return <Chip label={asset.status} size="small" />;
    }
  };

  const renderAssetTable = (filteredAssets: Asset[]) => {
    if (filteredAssets.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No assets found
        </Alert>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d2818' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Asset ID</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Description</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Location</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Purchase Cost</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAssets.map((asset) => (
              <TableRow key={asset.id} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{asset.assetId}</TableCell>
                <TableCell>{asset.description}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell>{asset.location}</TableCell>
                <TableCell>₦{asset.purchaseCost?.toLocaleString() || 0}</TableCell>
                <TableCell>{getStatusChip(asset)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleViewDetails(asset)}
                    >
                      <Eye />
                    </IconButton>
                  </Tooltip>

                  {isUploader && (asset.status === 'pending' || asset.status === 'rejected') && (
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleEdit(asset.id || '')}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (!isUploader && !isApprover) {
    return (
      <AppLayout>
        <Container maxWidth="lg">
          <Alert severity="error">You do not have permission to access this page</Alert>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container maxWidth="xl">
        {/* Header */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: 'rgba(13, 40, 24, 0.9)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/dashboard')}
              sx={{ color: '#00ff88' }}
            >
              Back to Dashboard
            </Button>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: '#00ff88' }}>
            {pageTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: '#aaa' }}>
            {isUploader
              ? 'View and manage your uploaded assets'
              : 'Review and manage assets from your ministry'}
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Search Bar */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by Asset ID, Description, Category, or Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#00ff88' }} />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper elevation={0} sx={{ backgroundColor: 'rgba(13, 40, 24, 0.9)' }}>
            <Tabs
              value={tabValue}
            onChange={(_e, newValue) => setTabValue(newValue)}
              sx={{
                borderBottom: '1px solid rgba(0, 135, 81, 0.2)',
                '& .MuiTab-root': { color: '#aaa' },
                '& .Mui-selected': { color: '#00ff88' },
              }}
            >
              <Tab
                label={`Pending (${getPendingAssets().length})`}
                id="tab-0"
                aria-controls="tabpanel-0"
              />
              <Tab
                label={`Approved (${getApprovedAssets().length})`}
                id="tab-1"
                aria-controls="tabpanel-1"
              />
              <Tab
                label={`Rejected (${getRejectedAssets().length})`}
                id="tab-2"
                aria-controls="tabpanel-2"
              />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {renderAssetTable(getPendingAssets())}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {renderAssetTable(getApprovedAssets())}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {renderAssetTable(getRejectedAssets())}
            </TabPanel>
          </Paper>
        )}

        {/* Asset Details Dialog */}
        <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ backgroundColor: '#0d2818', color: '#00ff88', fontWeight: 'bold' }}>
            Asset Details
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {selectedAsset && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Asset ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {selectedAsset.assetId}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Description
                  </Typography>
                  <Typography variant="body1">{selectedAsset.description}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Category
                  </Typography>
                  <Typography variant="body1">{selectedAsset.category}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Location
                  </Typography>
                  <Typography variant="body1">{selectedAsset.location}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Purchase Cost
                  </Typography>
                  <Typography variant="body1">
                    ₦{selectedAsset.purchaseCost?.toLocaleString() || 0}
                  </Typography>
                </Box>

                {selectedAsset.marketValue && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#aaa' }}>
                      Market Value
                    </Typography>
                    <Typography variant="body1">
                      ₦{selectedAsset.marketValue?.toLocaleString() || 0}
                    </Typography>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>{getStatusChip(selectedAsset)}</Box>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Uploaded On
                  </Typography>
                  <Typography variant="body2">
                    {selectedAsset.uploadTimestamp
                      ? format(selectedAsset.uploadTimestamp.toDate(), 'MMM dd, yyyy hh:mm a')
                      : 'N/A'}
                  </Typography>
                </Box>

                {selectedAsset.status === 'pending_ministry_review' && selectedAsset.approvedAt && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#aaa' }}>
                      Approved by Staff on
                    </Typography>
                    <Typography variant="body2">
                      {format(selectedAsset.approvedAt.toDate(), 'MMM dd, yyyy hh:mm a')}
                    </Typography>
                  </Box>
                )}

                {selectedAsset.status === 'approved' && selectedAsset.approvedByMinistryAt && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#aaa' }}>
                      Approved by Ministry on
                    </Typography>
                    <Typography variant="body2">
                      {format(selectedAsset.approvedByMinistryAt.toDate(), 'MMM dd, yyyy hh:mm a')}
                    </Typography>
                  </Box>
                )}

                {selectedAsset.status === 'rejected' && selectedAsset.rejectionReason && (
                  <Box sx={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', p: 2, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: '#ff6666' }}>
                      Rejection Reason
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ff9999', mt: 1 }}>
                      {selectedAsset.rejectionReason}
                    </Typography>
                  </Box>
                )}

                {selectedAsset.remarks && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#aaa' }}>
                      Remarks
                    </Typography>
                    <Typography variant="body2">{selectedAsset.remarks}</Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            {isUploader && selectedAsset && (selectedAsset.status === 'pending' || selectedAsset.status === 'rejected') && (
              <Button
                variant="contained"
                color="warning"
                onClick={() => {
                  handleCloseDetails();
                  handleEdit(selectedAsset.id || '');
                }}
              >
                Edit Asset
              </Button>
            )}
            <Button onClick={handleCloseDetails} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default ViewUploadsPage;
