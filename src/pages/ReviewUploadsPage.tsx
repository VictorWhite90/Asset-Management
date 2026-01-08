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
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingAssets, approveAsset, rejectAsset } from '@/services/asset.service';
import { Asset } from '@/types/asset.types';

const ReviewUploadsPage = () => {
  const { userData } = useAuth();
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
    if (!userData?.userId) {
      setError('User data not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const pendingAssets = await getPendingAssets(userData.userId);
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
      await approveAsset(assetId, userData.userId);
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
      await rejectAsset(selectedAsset.id, userData.userId, rejectionReason);
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
            await approveAsset(asset.id, userData.userId);
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
      <Container component="main" maxWidth="lg">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="80vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xl">
      <Box sx={{ marginTop: 4, marginBottom: 4 }}>
        {/* Back Button */}
        <Box sx={{ mb: 2 }}>
          <Button
            component={Link}
            to="/dashboard"
            startIcon={<ArrowBack />}
            variant="text"
          >
            Back to Dashboard
          </Button>
        </Box>

        <Paper elevation={3} sx={{ padding: 3 }}>
          {/* Page Title */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4">
              Review Pending Uploads
            </Typography>
            {assets.length > 0 && (
              <Button
                variant="contained"
                startIcon={<DoneAll />}
                onClick={handleApproveAll}
                disabled={processingId === 'all'}
                color="success"
              >
                {processingId === 'all' ? 'Processing...' : 'Approve All'}
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Summary */}
          <Box sx={{ mb: 3 }}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>{assets.length}</strong> asset(s) awaiting your approval
              </Typography>
            </Alert>
          </Box>

          {/* Assets Table */}
          {assets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="h6" color="text.secondary">
                No pending uploads to review
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                All uploads from your agency have been reviewed
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Asset ID</strong></TableCell>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Location</strong></TableCell>
                      <TableCell><strong>Purchase Date</strong></TableCell>
                      <TableCell align="right"><strong>Purchase Cost</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedAssets.map((asset) => (
                      <TableRow key={asset.id} hover>
                        <TableCell>{asset.assetId}</TableCell>
                        <TableCell>{asset.description}</TableCell>
                        <TableCell>
                          <Chip label={asset.category} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>{formatDate(asset.purchasedDate)}</TableCell>
                        <TableCell align="right">{formatCurrency(asset.purchaseCost)}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Approve">
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => asset.id && handleApprove(asset.id)}
                                disabled={processingId === asset.id || processingId === 'all'}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleRejectClick(asset)}
                                disabled={processingId === asset.id || processingId === 'all'}
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
              />
            </>
          )}
        </Paper>
      </Box>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Asset Upload</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this asset. The uploader will see this message.
          </Typography>
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
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            disabled={!rejectionReason.trim() || processingId === selectedAsset?.id}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReviewUploadsPage;
