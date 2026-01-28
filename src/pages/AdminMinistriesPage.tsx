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
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Block,
  CheckCircleOutline,
  AccountBalance,
  VerifiedUser,
  Visibility,
  People,
  Upload,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllMinistries,
  suspendMinistry,
  reactivateMinistry,
} from '@/services/ministry.service';
import { Ministry } from '@/types/ministry.types';
import AppLayout from '@/components/AppLayout';

const AdminMinistriesPage = () => {
  const { userData } = useAuth();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // View details dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);

  // Suspend dialog
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    fetchMinistries();
  }, []);

  const fetchMinistries = async () => {
    setLoading(true);
    setError(null);
    try {
      const allMinistries = await getAllMinistries();
      // Only show verified and suspended ministries (not pending)
      const activeMinistries = allMinistries.filter(
        (m: Ministry) => m.status === 'verified' || m.status === 'suspended'
      );
      setMinistries(activeMinistries);
    } catch (err: any) {
      setError(err.message || 'Failed to load ministries');
      toast.error(err.message || 'Failed to load ministries');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setViewDialogOpen(true);
  };

  const handleSuspendClick = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setSuspendDialogOpen(true);
  };

  const handleSuspendConfirm = async () => {
    if (!selectedMinistry || !userData?.userId) return;

    setProcessingId(selectedMinistry.ministryId);
    try {
      await suspendMinistry(selectedMinistry.ministryId, userData.userId);
      toast.success('Ministry suspended successfully');
      setSuspendDialogOpen(false);
      setSuspendReason('');
      setSelectedMinistry(null);
      await fetchMinistries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to suspend ministry');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReactivate = async (ministryId: string) => {
    if (!userData?.userId) return;

    setProcessingId(ministryId);
    try {
      await reactivateMinistry(ministryId, userData.userId);
      toast.success('Ministry reactivated successfully');
      await fetchMinistries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate ministry');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusChip = (status: string) => {
    if (status === 'verified') {
      return (
        <Chip
          label="Active"
          size="small"
          icon={<VerifiedUser sx={{ fontSize: 14, color: '#66bb6a !important' }} />}
          sx={{
            backgroundColor: 'rgba(46, 125, 50, 0.15)',
            color: '#66bb6a',
            border: '1px solid rgba(46, 125, 50, 0.3)',
          }}
        />
      );
    }
    return (
      <Chip
        label="Suspended"
        size="small"
        icon={<Block sx={{ fontSize: 14, color: '#9e9e9e !important' }} />}
        sx={{
          backgroundColor: 'rgba(158, 158, 158, 0.15)',
          color: '#9e9e9e',
          border: '1px solid rgba(158, 158, 158, 0.3)',
        }}
      />
    );
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const verifiedCount = ministries.filter((m) => m.status === 'verified').length;
  const suspendedCount = ministries.filter((m) => m.status === 'suspended').length;

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
              <AccountBalance sx={{ fontSize: 40, color: '#00ff88' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 0.5 }}>
                  Verified Ministries
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  View and manage all verified ministry accounts
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchMinistries}
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

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)', border: 'none' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AccountBalance sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)', mb: 1 }} />
                <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {ministries.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Total Ministries
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', border: 'none' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <VerifiedUser sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)', mb: 1 }} />
                <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {verifiedCount}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Active
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #616161 0%, #424242 100%)', border: 'none' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Block sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)', mb: 1 }} />
                <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {suspendedCount}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Suspended
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Ministries Table */}
        <Paper elevation={0}>
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid rgba(0, 135, 81, 0.3)',
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(0, 135, 81, 0.05) 100%)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
              Ministry Directory
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {ministries.length} registered {ministries.length === 1 ? 'ministry' : 'ministries'}
            </Typography>
          </Box>

          {ministries.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <AccountBalance sx={{ fontSize: 60, color: 'rgba(0, 135, 81, 0.3)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                No verified ministries yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
                Ministries will appear here after being verified
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Ministry Name</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Official Email</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Location</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Staff</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Verified</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ministries.map((ministry) => (
                    <TableRow
                      key={ministry.ministryId}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.05)' },
                        borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                        opacity: ministry.status === 'suspended' ? 0.7 : 1,
                      }}
                    >
                      <TableCell sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {ministry.name}
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {ministry.officialEmail}
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {ministry.ministryType}
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {ministry.location}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            icon={<Upload sx={{ fontSize: 12, color: ministry.hasUploader === true ? '#66bb6a !important' : '#9e9e9e !important' }} />}
                            label={`${ministry.uploaders?.length || 0}/${ministry.maxUploaders || 10}`}
                            size="small"
                            sx={{
                              backgroundColor: ministry.hasUploader === true ? 'rgba(46, 125, 50, 0.15)' : 'rgba(158, 158, 158, 0.1)',
                              color: ministry.hasUploader === true ? '#66bb6a' : '#9e9e9e',
                              border: `1px solid ${ministry.hasUploader === true ? 'rgba(46, 125, 50, 0.3)' : 'rgba(158, 158, 158, 0.2)'}`,
                              fontSize: '0.7rem',
                            }}
                          />
                          <Chip
                            icon={<People sx={{ fontSize: 12, color: ministry.hasApprover === true ? '#66bb6a !important' : '#9e9e9e !important' }} />}
                            label={`${ministry.approvers?.length || 0}/${ministry.maxApprovers || 5}`}
                            size="small"
                            sx={{
                              backgroundColor: ministry.hasApprover === true ? 'rgba(46, 125, 50, 0.15)' : 'rgba(158, 158, 158, 0.1)',
                              color: ministry.hasApprover === true ? '#66bb6a' : '#9e9e9e',
                              border: `1px solid ${ministry.hasApprover === true ? 'rgba(46, 125, 50, 0.3)' : 'rgba(158, 158, 158, 0.2)'}`,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{getStatusChip(ministry.status)}</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {formatDate(ministry.verifiedAt)}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(ministry)}
                              sx={{
                                color: '#00ff88',
                                '&:hover': { backgroundColor: 'rgba(0, 255, 136, 0.1)' },
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {ministry.status === 'verified' && (
                            <Tooltip title="Suspend Ministry">
                              <IconButton
                                size="small"
                                onClick={() => handleSuspendClick(ministry)}
                                disabled={processingId === ministry.ministryId}
                                sx={{
                                  color: '#ffa726',
                                  '&:hover': { backgroundColor: 'rgba(255, 167, 38, 0.1)' },
                                }}
                              >
                                <Block />
                              </IconButton>
                            </Tooltip>
                          )}
                          {ministry.status === 'suspended' && (
                            <Tooltip title="Reactivate Ministry">
                              <IconButton
                                size="small"
                                onClick={() => handleReactivate(ministry.ministryId)}
                                disabled={processingId === ministry.ministryId}
                                sx={{
                                  color: '#66bb6a',
                                  '&:hover': { backgroundColor: 'rgba(102, 187, 106, 0.1)' },
                                }}
                              >
                                <CheckCircleOutline />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* View Details Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#0d2818',
              border: '1px solid rgba(0, 135, 81, 0.3)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#00ff88', fontWeight: 600 }}>
            Ministry Details
          </DialogTitle>
          <DialogContent>
            {selectedMinistry && (
              <Box sx={{ pt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Ministry Name
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      {selectedMinistry.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Official Email
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedMinistry.officialEmail}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Ministry Type
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedMinistry.ministryType}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Location
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedMinistry.location}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Ministry Admin
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedMinistry.ownerName || selectedMinistry.ownerEmail || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Uploaders
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedMinistry.uploaders?.length || 0} / {selectedMinistry.maxUploaders || 10}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Approvers
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedMinistry.approvers?.length || 0} / {selectedMinistry.maxApprovers || 5}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {getStatusChip(selectedMinistry.status)}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Registered
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {formatDate(selectedMinistry.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Verified
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {formatDate(selectedMinistry.verifiedAt)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setViewDialogOpen(false)} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Suspend Dialog */}
        <Dialog
          open={suspendDialogOpen}
          onClose={() => setSuspendDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#0d2818',
              border: '1px solid rgba(0, 135, 81, 0.3)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#ffa726', fontWeight: 600 }}>
            Suspend Ministry
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Are you sure you want to suspend <strong style={{ color: '#FFFFFF' }}>{selectedMinistry?.name}</strong>?
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2 }}>
              This will prevent all ministry staff from accessing the system until the ministry is reactivated.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Reason (optional)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              sx={{
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
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setSuspendDialogOpen(false)}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspendConfirm}
              variant="contained"
              disabled={processingId !== null}
              sx={{
                backgroundColor: '#ed6c02',
                '&:hover': { backgroundColor: '#c25700' },
              }}
            >
              {processingId ? 'Suspending...' : 'Suspend Ministry'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default AdminMinistriesPage;
