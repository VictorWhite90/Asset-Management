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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  Refresh,
  AdminPanelSettings,
  Pending,
  Visibility,
} from '@/components/icons';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPendingMinistryAdmins,
  approveMinistryAdmin,
  rejectMinistryAdmin
} from '@/services/auth.service';
import { User } from '@/types/user.types';
import AppLayout from '@/components/AppLayout';
import { deploymentLabels } from '@/utils/deployment';

const AdminMinistryAdminVerificationsPage = () => {
  const { userData } = useAuth();
  const [pendingAdmins, setPendingAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // View details dialog
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [viewDetailsAdmin, setViewDetailsAdmin] = useState<User | null>(null);

  useEffect(() => {
    fetchPendingAdmins();
  }, []);

  const fetchPendingAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const admins = await getPendingMinistryAdmins();
      setPendingAdmins(admins);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending ministry admins');
      toast.error(err.message || 'Failed to load pending ministry admins');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (adminId: string) => {
    if (!userData?.userId) return;

    setProcessingId(adminId);
    try {
      await approveMinistryAdmin(adminId, userData.userId);
      toast.success('Ministry admin account approved successfully');
      await fetchPendingAdmins(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve ministry admin');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (admin: User) => {
    setSelectedAdmin(admin);
    setRejectDialogOpen(true);
  };

  const handleViewDetails = (admin: User) => {
    setViewDetailsAdmin(admin);
    setViewDetailsDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedAdmin || !userData?.userId || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedAdmin.userId);
    try {
      await rejectMinistryAdmin(
        selectedAdmin.userId,
        userData.userId,
        rejectionReason
      );
      toast.success('Ministry admin account rejected');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedAdmin(null);
      await fetchPendingAdmins(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject ministry admin');
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
              color: '#ef5350',
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
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#008751' }} />
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
              color: '#006038',
              '&:hover': {
                color: '#008751',
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AdminPanelSettings sx={{ fontSize: 40, color: '#008751' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#0d331f', fontWeight: 700, mb: 0.5 }}>
                  {deploymentLabels.ministryAdminVerifications}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.65)' }}>
                  Review and approve {deploymentLabels.ministryAdminShort.toLowerCase()} accounts
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchPendingAdmins}
              disabled={loading}
              sx={{
                borderColor: 'rgba(0, 135, 81, 0.45)',
                color: '#006038',
                '&:hover': {
                  borderColor: '#008751',
                  backgroundColor: 'rgba(0, 135, 81, 0.06)',
                },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              color: '#ef5350',
              border: '1px solid rgba(211, 47, 47, 0.3)',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Summary Card */}
        <Card sx={{ background: 'linear-gradient(135deg, rgba(237, 108, 2, 0.16) 0%, rgba(194, 87, 0, 0.07) 100%)', border: 'none', mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ color: 'rgba(15,48,31,0.76)' }} variant="body2">
                  Pending Verifications
                </Typography>
                <Typography variant="h4" sx={{ color: '#143625', fontWeight: 700 }}>
                  {pendingAdmins.length}
                </Typography>
                <Typography sx={{ color: 'rgba(15,48,31,0.68)' }} variant="caption">
                  {deploymentLabels.ministryAdminShort} accounts awaiting approval
                </Typography>
              </Box>
              <Pending sx={{ fontSize: 60, color: 'rgba(15,48,31,0.3)' }} />
            </Box>
          </CardContent>
        </Card>

        {/* Ministry Admins Table */}
        <Paper elevation={0} sx={{ p: 3 }}>
          {pendingAdmins.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <AdminPanelSettings sx={{ fontSize: 60, color: 'rgba(0, 135, 81, 0.3)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'rgba(0, 0, 0, 0.75)' }}>
                No pending {deploymentLabels.ministryAdminShort.toLowerCase()} verifications
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.55)', mt: 1 }}>
                All {deploymentLabels.ministryAdminShort.toLowerCase()} registrations have been processed
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#006038', fontWeight: 600 }}>Admin Name</TableCell>
                    <TableCell sx={{ color: '#006038', fontWeight: 600 }}>Ministry Name</TableCell>
                    <TableCell sx={{ color: '#006038', fontWeight: 600 }}>Ministry Email</TableCell>
                    <TableCell sx={{ color: '#006038', fontWeight: 600 }}>Personal Email</TableCell>
                    <TableCell sx={{ color: '#006038', fontWeight: 600 }}>Email Status</TableCell>
                    <TableCell sx={{ color: '#006038', fontWeight: 600 }}>Registered</TableCell>
                    <TableCell align="center" sx={{ color: '#006038', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingAdmins.map((admin) => (
                    <TableRow
                      key={admin.userId}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.05)' },
                        borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 600 }}>
                          {admin.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: '#006038', fontWeight: 500 }}>
                          {admin.pendingMinistry?.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(0, 0, 0, 0.75)' }}>
                        {admin.pendingMinistry?.officialEmail || 'N/A'}
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(0, 0, 0, 0.75)' }}>
                        {admin.email}
                      </TableCell>
                      <TableCell>
                        {admin.emailVerified ? (
                          <Chip
                            label="Verified"
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(46, 125, 50, 0.15)',
                              color: '#66bb6a',
                              border: '1px solid rgba(46, 125, 50, 0.3)',
                            }}
                          />
                        ) : (
                          <Chip
                            label="Not Verified"
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(255, 167, 38, 0.15)',
                              color: '#ffa726',
                              border: '1px solid rgba(255, 167, 38, 0.3)',
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                        {formatDate(admin.createdAt)}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(admin)}
                              sx={{
                                color: '#2196f3',
                                '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' },
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={admin.emailVerified ? 'Approve' : 'Email not verified'}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleApprove(admin.userId)}
                                disabled={processingId === admin.userId || !admin.emailVerified}
                                sx={{
                                  color: '#66bb6a',
                                  '&:hover': { backgroundColor: 'rgba(102, 187, 106, 0.1)' },
                                  '&.Mui-disabled': { color: 'rgba(102, 187, 106, 0.3)' },
                                }}
                              >
                                <CheckCircle />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              onClick={() => handleRejectClick(admin)}
                              disabled={processingId === admin.userId}
                              sx={{
                                color: '#ef5350',
                                '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.1)' },
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
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 135, 81, 0.15)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#ef5350', borderBottom: '1px solid rgba(0, 135, 81, 0.2)' }}>
            Reject {deploymentLabels.ministryAdminShort} Account
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.7)', mb: 2 }}>
              Please provide a reason for rejecting this {deploymentLabels.ministryAdminShort.toLowerCase()} account. The user will see this message.
            </Typography>
            <TextField
              autoFocus
              multiline
              rows={3}
              fullWidth
              label="Rejection Reason"
              placeholder="e.g., Unable to verify identity, Invalid credentials, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              sx={{
                mt: 1,
                '& .MuiOutlinedInput-root': {
                  color: 'rgba(0, 0, 0, 0.87)',
                  backgroundColor: '#fafcfb',
                  '& fieldset': { borderColor: 'rgba(0, 135, 81, 0.25)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 135, 81, 0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#008751' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.72)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#006038' },
              }}
            />
            {selectedAdmin && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                  borderRadius: 1,
                  border: '1px solid rgba(0, 135, 81, 0.2)',
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                  {deploymentLabels.ministryAdminShort} Details
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)' }}>
                  <strong>Name:</strong> {selectedAdmin.name || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)' }}>
                  <strong>Email:</strong> {selectedAdmin.email}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 135, 81, 0.2)' }}>
            <Button
              onClick={() => setRejectDialogOpen(false)}
              sx={{ color: 'rgba(0, 0, 0, 0.65)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              variant="contained"
              disabled={!rejectionReason.trim() || processingId !== null}
              sx={{
                backgroundColor: '#d32f2f',
                '&:hover': { backgroundColor: '#b71c1c' },
              }}
            >
              {processingId ? 'Rejecting...' : 'Reject Account'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog
          open={viewDetailsDialogOpen}
          onClose={() => setViewDetailsDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 135, 81, 0.15)',
            },
          }}
        >
          <DialogTitle sx={{
            color: '#006038',
            borderBottom: '1px solid rgba(0, 135, 81, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}>
            <Visibility />
            {deploymentLabels.ministryAdminShort} Registration Details
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {viewDetailsAdmin && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Personal Information */}
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: 'rgba(0, 135, 81, 0.1)',
                    borderRadius: 1,
                    border: '1px solid rgba(0, 135, 81, 0.2)',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#006038', mb: 1.5, fontWeight: 700 }}>
                    Personal Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Full Name
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {viewDetailsAdmin.name || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Email Address
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {viewDetailsAdmin.email}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Position
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {viewDetailsAdmin.position || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Email Status
                      </Typography>
                      <Typography variant="body2">
                        {viewDetailsAdmin.emailVerified ? (
                          <Chip
                            label="Verified"
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(46, 125, 50, 0.15)',
                              color: '#66bb6a',
                              border: '1px solid rgba(46, 125, 50, 0.3)',
                              height: '24px',
                            }}
                          />
                        ) : (
                          <Chip
                            label="Not Verified"
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(255, 167, 38, 0.15)',
                              color: '#ffa726',
                              border: '1px solid rgba(255, 167, 38, 0.3)',
                              height: '24px',
                            }}
                          />
                        )}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        National ID (NIN)
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {viewDetailsAdmin.nin || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Staff ID
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {viewDetailsAdmin.staffId || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Registered On
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {formatDate(viewDetailsAdmin.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Ministry Information */}
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: 'rgba(0, 135, 81, 0.1)',
                    borderRadius: 1,
                    border: '1px solid rgba(0, 135, 81, 0.2)',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#006038', mb: 1.5, fontWeight: 700 }}>
                    {deploymentLabels.ministryInformationTitle}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Ministry Name
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#006038', fontWeight: 600, fontSize: '1rem' }}>
                        {viewDetailsAdmin.pendingMinistry?.name || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Official Email
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {viewDetailsAdmin.pendingMinistry?.officialEmail || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Ministry Type
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {viewDetailsAdmin.pendingMinistry?.ministryType || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.55)' }}>
                        Ministry Location
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 500 }}>
                        {viewDetailsAdmin.pendingMinistry?.location || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 135, 81, 0.2)' }}>
            <Button
              onClick={() => setViewDetailsDialogOpen(false)}
              sx={{
                color: 'rgba(0, 0, 0, 0.65)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 135, 81, 0.06)',
                },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default AdminMinistryAdminVerificationsPage;
