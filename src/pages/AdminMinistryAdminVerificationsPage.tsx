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
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPendingMinistryAdmins,
  approveMinistryAdmin,
  rejectMinistryAdmin
} from '@/services/auth.service';
import { User } from '@/types/user.types';
import AppLayout from '@/components/AppLayout';

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AdminPanelSettings sx={{ fontSize: 40, color: '#00ff88' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 0.5 }}>
                  Ministry Admin Verifications
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Review and approve ministry administrator accounts
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchPendingAdmins}
              disabled={loading}
              sx={{
                borderColor: 'rgba(0, 255, 136, 0.5)',
                color: '#00ff88',
                '&:hover': {
                  borderColor: '#00ff88',
                  backgroundColor: 'rgba(0, 255, 136, 0.1)',
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
        <Card sx={{ background: 'linear-gradient(135deg, #ed6c02 0%, #c25700 100%)', border: 'none', mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} variant="body2">
                  Pending Verifications
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {pendingAdmins.length}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)' }} variant="caption">
                  Ministry admin accounts awaiting approval
                </Typography>
              </Box>
              <Pending sx={{ fontSize: 60, color: 'rgba(255,255,255,0.3)' }} />
            </Box>
          </CardContent>
        </Card>

        {/* Ministry Admins Table */}
        <Paper elevation={0} sx={{ p: 3 }}>
          {pendingAdmins.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <AdminPanelSettings sx={{ fontSize: 60, color: 'rgba(0, 135, 81, 0.3)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                No pending ministry admin verifications
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
                All ministry admin registrations have been processed
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Admin Name</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Ministry Name</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Ministry Email</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Personal Email</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Email Status</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Registered</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
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
                        <Typography sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                          {admin.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: 'rgba(0, 255, 136, 0.9)', fontWeight: 500 }}>
                          {admin.pendingMinistry?.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {admin.pendingMinistry?.officialEmail || 'N/A'}
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
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
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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
              backgroundColor: '#0d2818',
              border: '1px solid rgba(0, 135, 81, 0.3)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#ef5350', borderBottom: '1px solid rgba(0, 135, 81, 0.2)' }}>
            Reject Ministry Admin Account
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Please provide a reason for rejecting this ministry admin account. The user will see this message.
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
                  color: '#FFFFFF',
                  '& fieldset': { borderColor: 'rgba(0, 135, 81, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 135, 81, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#008751' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
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
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Ministry Admin Details
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
                  <strong>Name:</strong> {selectedAdmin.name || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
                  <strong>Email:</strong> {selectedAdmin.email}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 135, 81, 0.2)' }}>
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
              backgroundColor: '#0d2818',
              border: '1px solid rgba(0, 135, 81, 0.3)',
            },
          }}
        >
          <DialogTitle sx={{
            color: '#00ff88',
            borderBottom: '1px solid rgba(0, 135, 81, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}>
            <Visibility />
            Ministry Admin Registration Details
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
                  <Typography variant="subtitle2" sx={{ color: '#00ff88', mb: 1.5, fontWeight: 700 }}>
                    Personal Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Full Name
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {viewDetailsAdmin.name || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Email Address
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {viewDetailsAdmin.email}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Position
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {viewDetailsAdmin.position || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        National ID (NIN)
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {viewDetailsAdmin.nin || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Staff ID
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {viewDetailsAdmin.staffId || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Registered On
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
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
                  <Typography variant="subtitle2" sx={{ color: '#00ff88', mb: 1.5, fontWeight: 700 }}>
                    Ministry Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Ministry Name
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600, fontSize: '1rem' }}>
                        {viewDetailsAdmin.pendingMinistry?.name || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Official Email
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {viewDetailsAdmin.pendingMinistry?.officialEmail || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Ministry Type
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {viewDetailsAdmin.pendingMinistry?.ministryType || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Ministry Location
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
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
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
