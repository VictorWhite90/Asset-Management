import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  DoneAll,
  Visibility,
  Schedule,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingAssets, approveAsset, rejectAsset } from '@/services/asset.service';
import { Asset } from '@/types/asset.types';
import AppLayout from '@/components/AppLayout';

const ReviewUploadsPage = () => {
  const { userData, currentUser } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingAssets();
  }, []);

  const fetchPendingAssets = async () => {
    if (!userData?.userId || !userData?.ministryId) {
      setError('User data not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch pending assets from the approver's ministry
      const pendingAssets = await getPendingAssets(userData.ministryId);
      setAssets(pendingAssets);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending assets');
      toast.error(err.message || 'Failed to load pending assets');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (assetId: string) => {
    if (!userData?.userId) return;

    setProcessingId(assetId);
    try {
      await approveAsset(
        assetId,
        userData.userId,
        currentUser?.email || undefined,
        userData.agencyName
      );
      toast.success('Asset approved successfully');
      await fetchPendingAssets(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve asset');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedAsset?.id || !userData?.userId) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedAsset.id);
    try {
      await rejectAsset(
        selectedAsset.id,
        userData.userId,
        rejectionReason,
        currentUser?.email || undefined,
        userData.agencyName
      );
      toast.success('Asset rejected successfully');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedAsset(null);
      await fetchPendingAssets(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject asset');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (!userData?.userId || assets.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to approve all ${assets.length} pending assets?`
    );

    if (!confirmed) return;

    setProcessingId('all');
    let successCount = 0;
    let failCount = 0;

    try {
      for (const asset of assets) {
        if (asset.id) {
          try {
            await approveAsset(
              asset.id,
              userData.userId,
              currentUser?.email || undefined,
              userData.agencyName
            );
            successCount++;
          } catch {
            failCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} asset(s) approved successfully`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} asset(s) failed to approve`);
      }

      await fetchPendingAssets(); // Refresh list
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format date
  const formatDate = (date: { day: number; month: number; year: number }) => {
    return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Paginate
  const paginatedAssets = assets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <AppLayout>
        <Container component="main" maxWidth="lg">
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
          >
            <CircularProgress sx={{ color: '#00ff88' }} />
          </Box>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container component="main" maxWidth="xl">
        {/* Back Button */}
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

        {/* Page Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
            borderLeft: '4px solid #008751',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}>
                Review Pending Uploads
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                Review and approve asset submissions from your ministry/agency
              </Typography>
            </Box>
            {assets.length > 0 && userData?.accountStatus === 'verified' && (
              <Button
                variant="contained"
                startIcon={<DoneAll />}
                onClick={handleApproveAll}
                disabled={processingId === 'all'}
                size="small"
                sx={{
                  backgroundColor: '#2e7d32',
                  '&:hover': { backgroundColor: '#1b5e20' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  flexShrink: 0,
                }}
              >
                {processingId === 'all' ? 'Processing...' : 'Approve All'}
              </Button>
            )}
          </Box>
        </Paper>

        {/* Account Pending Verification Warning */}
        {userData?.accountStatus === 'pending_verification' && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(237, 108, 2, 0.1)',
              border: '1px solid rgba(237, 108, 2, 0.3)',
              '& .MuiAlert-icon': { color: '#ed6c02' },
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#FFFFFF' }}>
              Account Pending Verification
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Your approver account is awaiting verification by your ministry administrator.
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              <strong>Registered:</strong> {userData.createdAt?.toDate().toLocaleDateString('en-GB')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              You will be notified via email once your account is approved. After approval, you will be able to review and approve asset uploads from {userData.agencyName} ({userData.location}).
            </Typography>
          </Alert>
        )}

        {/* Account Rejected Warning */}
        {userData?.accountStatus === 'rejected' && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              border: '1px solid rgba(211, 47, 47, 0.3)',
              '& .MuiAlert-icon': { color: '#d32f2f' },
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#FFFFFF' }}>
              Account Verification Rejected
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Your approver account was rejected by your ministry administrator.
            </Typography>
            {userData.rejectionReason && (
              <Typography variant="body2" paragraph sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                <strong>Reason:</strong> {userData.rejectionReason}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Please contact the system administrator for more information.
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Summary and Assets Table - Only show if account is verified */}
        {(!userData?.accountStatus || userData?.accountStatus === 'verified') && (
          <>
            {/* Summary Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                border: '1px solid rgba(0, 135, 81, 0.3)',
              }}
            >
              <Schedule sx={{ fontSize: { xs: 30, sm: 40 }, color: '#ff9800' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                  {assets.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  asset(s) awaiting your approval
                </Typography>
              </Box>
            </Paper>

            {/* Assets Table */}
            {assets.length === 0 ? (
              <Paper elevation={0} sx={{ p: 5, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 60, color: '#00ff88', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                  No pending uploads to review
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                  {userData?.agencyName && userData?.location
                    ? `All uploads from ${userData.agencyName} (${userData.location}) have been reviewed`
                    : 'All uploads from your agency have been reviewed'}
                </Typography>
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 } }}>
                <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                  <Table size="small" sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Asset ID</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Description</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Category</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Location</TableCell>
                        <TableCell sx={{ color: '#00ff88', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Purchase Date</TableCell>
                        <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Cost</TableCell>
                        <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedAssets.map((asset) => (
                        <TableRow
                          key={asset.id}
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' },
                            borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600 }}>
                              {asset.assetId}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ color: '#FFFFFF' }}>{asset.description}</TableCell>
                          <TableCell>
                            <Chip
                              label={asset.category}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                                color: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(0, 135, 81, 0.3)',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{asset.location}</TableCell>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{formatDate(asset.purchasedDate)}</TableCell>
                          <TableCell align="right" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                            {formatCurrency(asset.purchaseCost)}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  component={Link}
                                  to={`/assets/view/${asset.id}`}
                                  sx={{ color: '#00ff88' }}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  onClick={() => asset.id && handleApprove(asset.id)}
                                  disabled={processingId === asset.id || processingId === 'all'}
                                  sx={{
                                    color: '#4caf50',
                                    '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                                    '&.Mui-disabled': { color: 'rgba(76, 175, 80, 0.3)' },
                                  }}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRejectClick(asset)}
                                  disabled={processingId === asset.id || processingId === 'all'}
                                  sx={{
                                    color: '#f44336',
                                    '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
                                    '&.Mui-disabled': { color: 'rgba(244, 67, 54, 0.3)' },
                                  }}
                                >
                                  <Cancel />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={assets.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    '.MuiTablePagination-selectIcon': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                />
              </Paper>
            )}
          </>
        )}

        {/* Rejection Dialog */}
        <Dialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#0d2818',
              border: '1px solid rgba(0, 135, 81, 0.3)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#f44336', fontWeight: 600 }}>
            Reject Asset Upload
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Please provide a reason for rejecting this asset. The uploader will see this message.
            </Typography>
            {selectedAsset && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600 }}>
                  Asset ID: {selectedAsset.assetId}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {selectedAsset.description}
                </Typography>
              </Box>
            )}
            <TextField
              autoFocus
              multiline
              rows={4}
              fullWidth
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Incorrect purchase cost, missing documentation, duplicate entry..."
              required
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setRejectDialogOpen(false)}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              variant="contained"
              disabled={!rejectionReason.trim() || processingId === selectedAsset?.id}
              sx={{
                backgroundColor: '#c62828',
                '&:hover': { backgroundColor: '#8e0000' },
              }}
            >
              Confirm Rejection
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default ReviewUploadsPage;
