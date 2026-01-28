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
  Chip,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Block,
  LockOpen,
  Refresh,
  People,
  PersonOff,
  Visibility,
  AccountBalance,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getAllUsers,
  disableUser,
  enableUser,
} from '@/services/user.service';
import { User } from '@/types/user.types';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';

const AdminUsersPage = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stats (only for verified/disabled ministry admins)
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    disabled: number;
  }>({ total: 0, active: 0, disabled: 0 });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const allUsers = await getAllUsers();
      // Filter to only show ministry-admin users who are VERIFIED or DISABLED
      // Pending ministry admins should only appear in the Verifications page
      const ministryAdmins = allUsers.filter(
        (user: User) =>
          user.role === 'ministry-admin' &&
          (user.accountStatus === 'verified' || user.accountStatus === 'disabled')
      );
      setUsers(ministryAdmins);
      setFilteredUsers(ministryAdmins);

      // Calculate stats
      const activeCount = ministryAdmins.filter((u: User) => u.accountStatus === 'verified').length;
      const disabledCount = ministryAdmins.filter((u: User) => u.accountStatus === 'disabled').length;

      setStats({
        total: ministryAdmins.length,
        active: activeCount,
        disabled: disabledCount,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load ministry admins');
      toast.error(err.message || 'Failed to load ministry admins');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(term) ||
          user.agencyName.toLowerCase().includes(term) ||
          user.name?.toLowerCase().includes(term)
      );
    }

    // Status filter (only active or disabled - no pending here)
    if (statusFilter === 'active') {
      filtered = filtered.filter((user) => user.accountStatus === 'verified');
    } else if (statusFilter === 'disabled') {
      filtered = filtered.filter((user) => user.accountStatus === 'disabled');
    }

    setFilteredUsers(filtered);
  };

  const handleDisableUser = (user: User) => {
    setSelectedUser(user);
    setDisableDialogOpen(true);
  };

  const handleEnableUser = (user: User) => {
    setSelectedUser(user);
    setEnableDialogOpen(true);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setViewDetailsDialogOpen(true);
  };

  const confirmDisableUser = async () => {
    if (!selectedUser || !userData?.userId) return;

    setActionLoading(true);
    try {
      await disableUser(selectedUser.userId, userData.userId, 'Disabled by Federal Administrator');
      toast.success(`Ministry Admin ${selectedUser.email} disabled successfully`);
      setDisableDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable ministry admin');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmEnableUser = async () => {
    if (!selectedUser || !userData?.userId) return;

    setActionLoading(true);
    try {
      await enableUser(selectedUser.userId, userData.userId);
      toast.success(`Ministry Admin ${selectedUser.email} enabled successfully`);
      setEnableDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to enable ministry admin');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusChip = (status: string | undefined) => {
    switch (status) {
      case 'verified':
        return (
          <Chip
            label="Active"
            size="small"
            icon={<CheckCircle sx={{ fontSize: 14, color: '#4caf50 !important' }} />}
            sx={{
              backgroundColor: 'rgba(76, 175, 80, 0.15)',
              color: '#4caf50',
              border: '1px solid rgba(76, 175, 80, 0.3)',
            }}
          />
        );
      case 'disabled':
        return (
          <Chip
            label="Disabled"
            size="small"
            icon={<Block sx={{ fontSize: 14, color: '#f44336 !important' }} />}
            sx={{
              backgroundColor: 'rgba(244, 67, 54, 0.15)',
              color: '#f44336',
              border: '1px solid rgba(244, 67, 54, 0.3)',
            }}
          />
        );
      default:
        return (
          <Chip
            label="Unknown"
            size="small"
            sx={{
              backgroundColor: 'rgba(158, 158, 158, 0.15)',
              color: '#9e9e9e',
              border: '1px solid rgba(158, 158, 158, 0.3)',
            }}
          />
        );
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Container component="main" maxWidth="xl">
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AccountBalance sx={{ fontSize: 40, color: '#00ff88' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  Ministry Admin Management
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}>
                  Manage ministry administrators and their access
                </Typography>
              </Box>
            </Box>
            <Button startIcon={<Refresh />} onClick={fetchUsers} variant="outlined">
              Refresh
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #008751 0%, #006038 100%)',
                border: 'none',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                      Total Verified
                    </Typography>
                    <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                      {stats.total}
                    </Typography>
                  </Box>
                  <People sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                border: 'none',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                      Active
                    </Typography>
                    <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                      {stats.active}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)',
                border: 'none',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                      Disabled
                    </Typography>
                    <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                      {stats.disabled}
                    </Typography>
                  </Box>
                  <PersonOff sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600, mb: 2 }}>
            Filter Ministry Admins
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search by name, email, or ministry"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Ministry Admins Table */}
        <Paper elevation={0}>
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid rgba(0, 135, 81, 0.3)',
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(0, 135, 81, 0.05) 100%)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
              Ministry Administrators
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Showing {filteredUsers.length} of {users.length} ministry admins
            </Typography>
          </Box>

          {filteredUsers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <AccountBalance sx={{ fontSize: 60, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                No ministry admins found
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                Try adjusting your filters
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Ministry</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Location</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.userId}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' },
                        borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                      }}
                    >
                      <TableCell sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {user.name || 'N/A'}
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{user.email}</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{user.agencyName}</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{user.location}</TableCell>
                      <TableCell>{getStatusChip(user.accountStatus)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(user)}
                              sx={{
                                color: '#00ff88',
                                '&:hover': { backgroundColor: 'rgba(0, 255, 136, 0.1)' },
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {user.accountStatus === 'verified' && (
                            <Tooltip title="Disable Ministry Admin">
                              <IconButton
                                size="small"
                                onClick={() => handleDisableUser(user)}
                                sx={{
                                  color: '#f44336',
                                  '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
                                }}
                              >
                                <Block />
                              </IconButton>
                            </Tooltip>
                          )}
                          {user.accountStatus === 'disabled' && (
                            <Tooltip title="Enable Ministry Admin">
                              <IconButton
                                size="small"
                                onClick={() => handleEnableUser(user)}
                                sx={{
                                  color: '#4caf50',
                                  '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                                }}
                              >
                                <LockOpen />
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
          open={viewDetailsDialogOpen}
          onClose={() => setViewDetailsDialogOpen(false)}
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
            Ministry Admin Details
          </DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box sx={{ pt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Full Name
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                      {selectedUser.name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedUser.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Position
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedUser.position || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Staff ID
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedUser.staffId || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      NIN (National ID)
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedUser.nin || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Ministry/Agency
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedUser.agencyName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Ministry Type
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedUser.ministryType || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Location
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedUser.location}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Account Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {getStatusChip(selectedUser.accountStatus)}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Registered
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {selectedUser.createdAt?.toDate().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setViewDetailsDialogOpen(false)}
              variant="outlined"
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Disable User Dialog */}
        <Dialog
          open={disableDialogOpen}
          onClose={() => !actionLoading && setDisableDialogOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: '#0d2818',
              border: '1px solid rgba(0, 135, 81, 0.3)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#f44336', fontWeight: 600 }}>
            Disable Ministry Admin
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Are you sure you want to disable <strong style={{ color: '#FFFFFF' }}>{selectedUser?.name || selectedUser?.email}</strong>?
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
              This will prevent them from logging in and managing their ministry.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDisableDialogOpen(false)}
              disabled={actionLoading}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDisableUser}
              variant="contained"
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={20} sx={{ color: '#FFFFFF' }} /> : <Block />}
              sx={{
                backgroundColor: '#c62828',
                '&:hover': { backgroundColor: '#8e0000' },
              }}
            >
              {actionLoading ? 'Disabling...' : 'Disable Ministry Admin'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Enable User Dialog */}
        <Dialog
          open={enableDialogOpen}
          onClose={() => !actionLoading && setEnableDialogOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: '#0d2818',
              border: '1px solid rgba(0, 135, 81, 0.3)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#4caf50', fontWeight: 600 }}>
            Enable Ministry Admin
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Are you sure you want to enable <strong style={{ color: '#FFFFFF' }}>{selectedUser?.name || selectedUser?.email}</strong>?
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
              They will regain access to manage their ministry.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setEnableDialogOpen(false)}
              disabled={actionLoading}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEnableUser}
              variant="contained"
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={20} sx={{ color: '#FFFFFF' }} /> : <LockOpen />}
              sx={{
                backgroundColor: '#2e7d32',
                '&:hover': { backgroundColor: '#1b5e20' },
              }}
            >
              {actionLoading ? 'Enabling...' : 'Enable Ministry Admin'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default AdminUsersPage;
