import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  ArrowBack,
  Upload,
  CheckCircle,
  Cancel,
  Edit,
  Login,
  Visibility,
  CloudUpload,
  History,
  FilterList,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAuditLogs, formatAction } from '@/services/auditLog.service';
import { AuditLog, AuditAction } from '@/types/auditLog.types';
import AppLayout from '@/components/AppLayout';

const ActivityLogPage = () => {
  const { userData } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [actionFilter, dateFromFilter, dateToFilter, logs]);

  const fetchActivityLogs = async () => {
    if (!userData?.userId) {
      setError('User data not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userLogs = await getUserAuditLogs(userData.userId, { limit: 100 });
      setLogs(userLogs);
      setFilteredLogs(userLogs);
    } catch (err: any) {
      setError(err.message || 'Failed to load activity history');
      toast.error(err.message || 'Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Apply action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Apply date range filter
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter((log) => {
        const logDate = log.timestamp.toDate();
        return logDate >= fromDate;
      });
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => {
        const logDate = log.timestamp.toDate();
        return logDate <= toDate;
      });
    }

    setFilteredLogs(filtered);
  };

  const handleClearFilters = () => {
    setActionFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const getActionIcon = (action: AuditAction) => {
    if (action === 'asset.upload') return <Upload />;
    if (action === 'asset.approve') return <CheckCircle />;
    if (action === 'asset.reject') return <Cancel />;
    if (action === 'asset.edit') return <Edit />;
    if (action === 'asset.view') return <Visibility />;
    if (action === 'asset.bulk_upload') return <CloudUpload />;
    if (action === 'user.login') return <Login />;
    return <Visibility />;
  };

  const getActionDotColor = (action: AuditAction): string => {
    if (action.includes('approve')) return '#66bb6a';
    if (action.includes('reject')) return '#ef5350';
    if (action.includes('upload')) return '#42a5f5';
    if (action.includes('edit')) return '#ffa726';
    if (action.includes('login')) return '#ab47bc';
    return '#00ff88';
  };

  const formatTimestamp = (timestamp: any) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const availableActions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Actions' },
    { value: 'asset.upload', label: 'Asset Upload' },
    { value: 'asset.approve', label: 'Asset Approval' },
    { value: 'asset.reject', label: 'Asset Rejection' },
    { value: 'asset.edit', label: 'Asset Edit' },
    { value: 'user.login', label: 'Login' },
    { value: 'user.password.change', label: 'Password Change' },
  ];

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
      <Container component="main" maxWidth="lg">
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
              <History sx={{ fontSize: 40, color: '#00ff88' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 0.5 }}>
                  Activity History
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Track your actions and system interactions
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${filteredLogs.length} ${filteredLogs.length === 1 ? 'Activity' : 'Activities'}`}
              sx={{
                backgroundColor: 'rgba(0, 135, 81, 0.2)',
                color: '#00ff88',
                border: '1px solid rgba(0, 135, 81, 0.4)',
                fontWeight: 600,
              }}
            />
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

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterList sx={{ color: '#00ff88' }} />
            <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
              Filters
            </Typography>
          </Box>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>Action Type</InputLabel>
                <Select
                  value={actionFilter}
                  label="Action Type"
                  onChange={(e) => setActionFilter(e.target.value)}
                  sx={{
                    color: '#FFFFFF',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 135, 81, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 135, 81, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#008751',
                    },
                    '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.6)' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: '#0d2818',
                        border: '1px solid rgba(0, 135, 81, 0.3)',
                        '& .MuiMenuItem-root': {
                          color: '#FFFFFF',
                          '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.2)' },
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(0, 135, 81, 0.3)',
                            '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.4)' },
                          },
                        },
                      },
                    },
                  }}
                >
                  {availableActions.map((action) => (
                    <MenuItem key={action.value} value={action.value}>
                      {action.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="From Date"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#FFFFFF',
                    '& fieldset': { borderColor: 'rgba(0, 135, 81, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(0, 135, 81, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#008751' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                  '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)' },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="To Date"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#FFFFFF',
                    '& fieldset': { borderColor: 'rgba(0, 135, 81, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(0, 135, 81, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#008751' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                  '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)' },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              {(actionFilter !== 'all' || dateFromFilter || dateToFilter) && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleClearFilters}
                  sx={{
                    borderColor: 'rgba(0, 255, 136, 0.5)',
                    color: '#00ff88',
                    '&:hover': {
                      borderColor: '#00ff88',
                      backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    },
                  }}
                >
                  Clear
                </Button>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* Activity Timeline */}
        <Paper elevation={0} sx={{ p: 3 }}>
          {filteredLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <History sx={{ fontSize: 60, color: 'rgba(0, 135, 81, 0.3)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                No activity found
              </Typography>
              {(actionFilter !== 'all' || dateFromFilter || dateToFilter) && (
                <Button
                  onClick={handleClearFilters}
                  sx={{
                    mt: 2,
                    color: '#00ff88',
                    '&:hover': { backgroundColor: 'rgba(0, 255, 136, 0.1)' },
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          ) : (
            <Timeline position="right">
              {filteredLogs.map((log, index) => (
                <TimelineItem key={log.id}>
                  <TimelineOppositeContent
                    sx={{
                      maxWidth: '180px',
                      pt: 2,
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    <Typography variant="caption">{formatTimestamp(log.timestamp)}</Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot
                      sx={{
                        backgroundColor: getActionDotColor(log.action),
                        boxShadow: `0 0 10px ${getActionDotColor(log.action)}40`,
                      }}
                    >
                      {getActionIcon(log.action)}
                    </TimelineDot>
                    {index < filteredLogs.length - 1 && (
                      <TimelineConnector sx={{ backgroundColor: 'rgba(0, 135, 81, 0.3)' }} />
                    )}
                  </TimelineSeparator>
                  <TimelineContent sx={{ pb: 4 }}>
                    <Card
                      sx={{
                        backgroundColor: 'rgba(0, 135, 81, 0.1)',
                        border: '1px solid rgba(0, 135, 81, 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 135, 81, 0.15)',
                          borderColor: 'rgba(0, 135, 81, 0.4)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 1,
                          }}
                        >
                          <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                            {formatAction(log.action)}
                          </Typography>
                          <Chip
                            label={log.action.split('.')[0].toUpperCase()}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(0, 135, 81, 0.2)',
                              color: '#00ff88',
                              border: '1px solid rgba(0, 135, 81, 0.4)',
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}
                        >
                          {log.details}
                        </Typography>
                        {log.metadata && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {log.metadata.assetId && (
                              <Chip
                                label={`Asset: ${log.metadata.assetId}`}
                                size="small"
                                sx={{
                                  backgroundColor: 'transparent',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  fontSize: '0.7rem',
                                }}
                              />
                            )}
                            {log.metadata.category && (
                              <Chip
                                label={log.metadata.category}
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(0, 135, 81, 0.15)',
                                  color: '#00ff88',
                                  border: '1px solid rgba(0, 135, 81, 0.3)',
                                  fontSize: '0.7rem',
                                }}
                              />
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </Paper>
      </Container>
    </AppLayout>
  );
};

export default ActivityLogPage;
