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
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  Refresh,
  HourglassEmpty,
  VerifiedUser,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingApprovers, approveApprover, rejectApprover } from '@/services/auth.service';
import { User } from '@/types/user.types';
import AppLayout from '@/components/AppLayout';

const AdminVerificationsPage = () => {
  const { userData } = useAuth();
  const [pendingApprovers, setPendingApprovers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingApprovers();
  }, []);

  const fetchPendingApprovers = async () => {
    setLoading(true);
    setError(null);
    try {
      const approvers = await getPendingApprovers();
      setPendingApprovers(approvers);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending approvers');
      toast.error(err.message || 'Failed to load pending approvers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approverId: string) => {
    if (!userData?.userId) return;

    setProcessingId(approverId);
    try {
      await approveApprover(approverId, userData.userId);
      toast.success('Approver account verified successfully');
      await fetchPendingApprovers(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve approver');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (approver: User) => {
    setSelectedApprover(approver);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedApprover || !userData?.userId || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedApprover.userId);
    try {
      await rejectApprover(
        selectedApprover.userId,
        userData.userId,
        rejectionReason
      );
      toast.success('Approver account rejected');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedApprover(null);
      await fetchPendingApprovers(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject approver');
    } finally {
      setProcessingId(null);
    }
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-GB');
  };

  if (!userData || userData.role !== 'admin') {
    return (
      <AppLayout>
        <Container maxWidth="lg">
          <Alert
            severity="error"
            sx={{
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              border: '1px solid rgba(211, 47, 47, 0.3)',
            }}
          >
            Unauthorized: Admin access required
          </Alert>
        </Container>
      </AppLayout>
    );
  }

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
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
            borderLeft: '4px solid #008751',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <VerifiedUser sx={{ fontSize: 40, color: '#00ff88' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  Pending Approver Verifications
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}>
                  Review and verify agency approver account registrations
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchPendingApprovers}
              disabled={loading}
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

        {/* Summary Card */}
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #ed6c02 0%, #c55a02 100%)',
            border: 'none',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                  Pending Verifications
                </Typography>
                <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {pendingApprovers.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
                  approver account(s) awaiting verification
                </Typography>
              </Box>
              <HourglassEmpty sx={{ fontSize: 60, color: 'rgba(255, 255, 255, 0.5)' }} />
            </Box>
          </CardContent>
        </Card>

        {/* Approvers Table */}
        <Paper elevation={0}>
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid rgba(0, 135, 81, 0.3)',
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(0, 135, 81, 0.05) 100%)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
              Pending Approvers
            </Typography>
          </Box>

          {pendingApprovers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CheckCircle sx={{ fontSize: 60, color: '#00ff88', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                No pending approver verifications
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                All approver registrations have been processed
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Agency</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Ministry Type</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Registered</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingApprovers.map((approver) => (
                    <TableRow
                      key={approver.userId}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' },
                        borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                      }}
                    >
                      <TableCell sx={{ color: '#FFFFFF' }}>{approver.email}</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{approver.agencyName}</TableCell>
                      <TableCell>
                        <Chip
                          label={approver.ministryType}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(0, 135, 81, 0.1)',
                            color: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid rgba(0, 135, 81, 0.3)',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {formatDate(approver.createdAt)}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              onClick={() => handleApprove(approver.userId)}
                              disabled={processingId === approver.userId}
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
                              onClick={() => handleRejectClick(approver)}
                              disabled={processingId === approver.userId}
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
          )}
        </Paper>

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
            Reject Approver Account
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Please provide a reason for rejecting this approver account. The user will see this message.
            </Typography>
            <TextField
              autoFocus
              multiline
              rows={3}
              fullWidth
              label="Rejection Reason"
              placeholder="e.g., Unable to verify employment with agency, Invalid documentation, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              sx={{ mt: 1 }}
            />
            {selectedApprover && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" sx={{ color: '#00ff88' }}>
                  Approver Details
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
                  <strong>Email:</strong> {selectedApprover.email}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  <strong>Agency:</strong> {selectedApprover.agencyName}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  <strong>Ministry:</strong> {selectedApprover.ministryType}
                </Typography>
              </Box>
            )}
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
              disabled={!rejectionReason.trim() || processingId !== null}
              sx={{
                backgroundColor: '#c62828',
                '&:hover': { backgroundColor: '#8e0000' },
              }}
            >
              {processingId ? 'Rejecting...' : 'Reject Account'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default AdminVerificationsPage;
