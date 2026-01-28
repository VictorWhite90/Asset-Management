import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Refresh,
  ViewList,
  ViewModule,
  TrendingUp,
  CheckCircle,
  Schedule,
  Visibility,
  Print,
  PictureAsPdf,
  Cancel,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';
import {
  getAllAssets,
  getAssetsByMinistry,
  getAllMinistries,
  getAdminDashboardStats,
  MinistryStats,
  AdminDashboardStats,
} from '@/services/asset.service';
import { Asset, AssetStatus } from '@/types/asset.types';
import { ASSET_CATEGORIES, NIGERIAN_STATES } from '@/utils/constants';
import AppLayout from '@/components/AppLayout';

type ViewMode = 'summary' | 'detailed';

const AdminAssetsPage = () => {

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats | null>(null);
  const [ministryStats, setMinistryStats] = useState<MinistryStats[]>([]);
  const [detailedAssets, setDetailedAssets] = useState<Asset[]>([]);
  const [allMinistries, setAllMinistries] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [ministryFilter, setMinistryFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selected ministry for detailed view
  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    loadDashboardData();
    loadMinistries();
  }, []);

  // Fetch filtered data when filters change
  useEffect(() => {
    if (viewMode === 'summary') {
      loadMinistryStats();
    } else {
      loadDetailedAssets();
    }
  }, [categoryFilter, ministryFilter, stateFilter, statusFilter, startDate, endDate, viewMode]);

  const loadDashboardData = async () => {
    try {
      const stats = await getAdminDashboardStats();
      setDashboardStats(stats);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
    }
  };

  const loadMinistries = async () => {
    try {
      const ministries = await getAllMinistries();
      setAllMinistries(ministries);
    } catch (err: any) {
      console.error('Error loading ministries:', err);
    }
  };

  const loadMinistryStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await getAssetsByMinistry(
        categoryFilter || undefined,
        ministryFilter || undefined,
        stateFilter || undefined,
        statusFilter || undefined
      );
      setMinistryStats(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load ministry statistics');
      toast.error(err.message || 'Failed to load ministry statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      let assets = await getAllAssets();

      // Apply filters
      if (categoryFilter) {
        assets = assets.filter(a => a.category === categoryFilter);
      }
      if (ministryFilter) {
        assets = assets.filter(a => a.agencyName === ministryFilter);
      }
      if (stateFilter) {
        assets = assets.filter(a => a.location?.includes(stateFilter));
      }
      if (statusFilter) {
        assets = assets.filter(a => a.status === statusFilter);
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        assets = assets.filter(a =>
          a.description?.toLowerCase().includes(query) ||
          a.assetId?.toLowerCase().includes(query) ||
          a.agencyName?.toLowerCase().includes(query) ||
          a.location?.toLowerCase().includes(query)
        );
      }
      // Date range filter
      if (startDate || endDate) {
        assets = assets.filter(a => {
          if (!a.uploadedAt) return false;
          const assetDate = a.uploadedAt.toDate ? a.uploadedAt.toDate() : new Date(a.uploadedAt);
          const assetTime = assetDate.getTime();

          if (startDate && endDate) {
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            return assetTime >= start && assetTime <= end;
          } else if (startDate) {
            return assetTime >= new Date(startDate).getTime();
          } else if (endDate) {
            return assetTime <= new Date(endDate).setHours(23, 59, 59, 999);
          }
          return true;
        });
      }

      setDetailedAssets(assets);
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
      toast.error(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setCategoryFilter('');
    setMinistryFilter('');
    setStateFilter('');
    setStatusFilter('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const handleViewMinistryDetails = (ministryName: string) => {
    setSelectedMinistry(ministryName);
    setMinistryFilter(ministryName);
    setViewMode('detailed');
  };

  const handleExportExcel = () => {
    try {
      const data = viewMode === 'summary'
        ? ministryStats.map(m => ({
            'Ministry/Agency': m.ministryName,
            'Total Assets': m.assetCount,
            'Purchase Value': `₦${m.totalPurchaseCost.toLocaleString()}`,
            'Market Value': `₦${m.totalMarketValue.toLocaleString()}`,
            'Approved': m.statusBreakdown.approved,
            'Pending': m.statusBreakdown.pending,
            'Rejected': m.statusBreakdown.rejected,
            'States': m.states.join(', '),
          }))
        : detailedAssets.map(a => ({
            'Asset ID': a.assetId,
            'Description': a.description,
            'Category': a.category,
            'Agency': a.agencyName,
            'Location': a.location,
            'Purchase Cost': a.purchaseCost,
            'Market Value': a.marketValue || 0,
            'Status': a.status,
          }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

      const filename = `nigeria-assets-${viewMode}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success('Excel file exported successfully');
    } catch (err: any) {
      toast.error('Failed to export Excel file');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text('Nigeria Government Asset Management System', 14, 15);
      doc.setFontSize(12);
      doc.text(`${viewMode === 'summary' ? 'Ministry Summary' : 'Detailed Assets'} Report`, 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 28);

      if (viewMode === 'summary') {
        // Ministry summary table
        const tableData = ministryStats.map(m => [
          m.ministryName,
          m.assetCount.toString(),
          `₦${m.totalPurchaseCost.toLocaleString()}`,
          `₦${m.totalMarketValue.toLocaleString()}`,
          m.statusBreakdown.approved.toString(),
          m.statusBreakdown.pending.toString(),
          m.statusBreakdown.rejected.toString(),
        ]);

        autoTable(doc, {
          head: [['Ministry/Agency', 'Total Assets', 'Purchase Value', 'Market Value', 'Approved', 'Pending', 'Rejected']],
          body: tableData,
          startY: 35,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 135, 81] }, // Nigerian green
        });
      } else {
        // Detailed assets table
        const tableData = detailedAssets.slice(0, 50).map(a => [
          a.assetId,
          a.description.substring(0, 30),
          a.category,
          (a.agencyName || '').substring(0, 25),
          (a.location || '').substring(0, 20),
          `₦${a.purchaseCost.toLocaleString()}`,
          a.status,
        ]);

        autoTable(doc, {
          head: [['Asset ID', 'Description', 'Category', 'Agency', 'Location', 'Cost', 'Status']],
          body: tableData,
          startY: 35,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [0, 135, 81] }, // Nigerian green
        });

        if (detailedAssets.length > 50) {
          const finalY = (doc as any).lastAutoTable?.finalY || 200;
          doc.text(`Note: Showing first 50 of ${detailedAssets.length} assets`, 14, finalY + 10);
        }
      }

      const filename = `nigeria-assets-${viewMode}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      toast.success('PDF file exported successfully');
    } catch (err: any) {
      toast.error('Failed to export PDF file');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `₦${(amount / 1000000000).toFixed(2)}B`;
    } else if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(2)}K`;
    }
    return `₦${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: AssetStatus): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  return (
    <AppLayout>
      <Container maxWidth="xl">
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
            <Box>
              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                Federal Admin - National Asset Management
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
                Comprehensive view of all government assets nationwide
              </Typography>
            </Box>
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={() => {
                  loadDashboardData();
                  viewMode === 'summary' ? loadMinistryStats() : loadDetailedAssets();
                }}
                sx={{ color: '#00ff88' }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Dashboard Summary Cards */}
        {dashboardStats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
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
                        Total Assets
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {dashboardStats.totalAssets.toLocaleString()}
                      </Typography>
                    </Box>
                    <TrendingUp sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #ed6c02 0%, #c55a02 100%)',
                  border: 'none',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                        Pending Review
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {dashboardStats.statusCounts.pending}
                      </Typography>
                    </Box>
                    <Schedule sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
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
                        Approved Assets
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {dashboardStats.statusCounts.approved}
                      </Typography>
                    </Box>
                    <CheckCircle sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  border: 'none',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                        Total Value
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {formatCurrency(dashboardStats.totalPurchaseValue)}
                      </Typography>
                    </Box>
                    <TrendingUp sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.5)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filter Panel */}
        <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600, mb: 2 }}>
            Filter Assets
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Categories</MenuItem>
                {ASSET_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Ministry/Agency"
                value={ministryFilter}
                onChange={(e) => setMinistryFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Ministries</MenuItem>
                {allMinistries.map((ministry) => (
                  <MenuItem key={ministry} value={ministry}>{ministry}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                label="State"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="">All States</MenuItem>
                {NIGERIAN_STATES.map((state) => (
                  <MenuItem key={state} value={state}>{state}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AssetStatus | '')}
                size="small"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                size="medium"
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>

          {viewMode === 'detailed' && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Search (ID, Description, Agency, Location)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
              />
            </Box>
          )}
        </Paper>

        {/* View Mode Toggle & Export */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={viewMode === 'summary' ? 'contained' : 'outlined'}
              startIcon={<ViewModule />}
              onClick={() => setViewMode('summary')}
            >
              Ministry Summary
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
              startIcon={<ViewList />}
              onClick={() => setViewMode('detailed')}
            >
              Detailed List
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportExcel}
              sx={{
                backgroundColor: '#2e7d32',
                '&:hover': { backgroundColor: '#1b5e20' },
              }}
            >
              Export Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<PictureAsPdf />}
              onClick={handleExportPDF}
              sx={{
                backgroundColor: '#c62828',
                '&:hover': { backgroundColor: '#8e0000' },
              }}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
            >
              Print
            </Button>
          </Box>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#00ff88' }} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Ministry Summary View */}
        {!loading && viewMode === 'summary' && (
          <Paper elevation={0}>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid rgba(0, 135, 81, 0.3)',
                background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(0, 135, 81, 0.05) 100%)',
              }}
            >
              <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                Ministry/Agency Statistics
                {categoryFilter && ` - ${categoryFilter}`}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Showing {ministryStats.length} {ministryStats.length === 1 ? 'ministry' : 'ministries'}
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Ministry/Agency</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Assets</TableCell>
                    <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Purchase Value</TableCell>
                    <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Market Value</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>States</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ministryStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', py: 4 }}>
                          No data found. Try adjusting your filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ministryStats.map((ministry) => (
                      <TableRow
                        key={ministry.ministryName}
                        sx={{
                          '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' },
                          borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                            {ministry.ministryName}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={ministry.assetCount}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(0, 135, 81, 0.2)',
                              color: '#00ff88',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#FFFFFF' }}>
                          {formatCurrency(ministry.totalPurchaseCost)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#FFFFFF' }}>
                          {formatCurrency(ministry.totalMarketValue)}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Chip
                              label={ministry.statusBreakdown.approved}
                              icon={<CheckCircle sx={{ fontSize: 14, color: '#4caf50 !important' }} />}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(76, 175, 80, 0.15)',
                                color: '#4caf50',
                                border: '1px solid rgba(76, 175, 80, 0.3)',
                              }}
                            />
                            <Chip
                              label={ministry.statusBreakdown.pending}
                              icon={<Schedule sx={{ fontSize: 14, color: '#ff9800 !important' }} />}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(255, 152, 0, 0.15)',
                                color: '#ff9800',
                                border: '1px solid rgba(255, 152, 0, 0.3)',
                              }}
                            />
                            {ministry.statusBreakdown.rejected > 0 && (
                              <Chip
                                label={ministry.statusBreakdown.rejected}
                                icon={<Cancel sx={{ fontSize: 14, color: '#f44336 !important' }} />}
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(244, 67, 54, 0.15)',
                                  color: '#f44336',
                                  border: '1px solid rgba(244, 67, 54, 0.3)',
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={ministry.states.join(', ')}>
                            <Chip
                              label={`${ministry.states.length} state${ministry.states.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                                color: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(0, 135, 81, 0.3)',
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewMinistryDetails(ministry.ministryName)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Detailed Assets View */}
        {!loading && viewMode === 'detailed' && (
          <Paper elevation={0}>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid rgba(0, 135, 81, 0.3)',
                background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(0, 135, 81, 0.05) 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                  Asset Details
                  {selectedMinistry && ` - ${selectedMinistry}`}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Showing {detailedAssets.length} {detailedAssets.length === 1 ? 'asset' : 'assets'}
                </Typography>
              </Box>
              {selectedMinistry && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    setSelectedMinistry(null);
                    setMinistryFilter('');
                    setViewMode('summary');
                  }}
                  sx={{ color: '#00ff88' }}
                >
                  ← Back to Summary
                </Button>
              )}
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Asset ID</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Agency</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Location</TableCell>
                    <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Purchase Cost</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailedAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', py: 4 }}>
                          No assets found. Try adjusting your filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    detailedAssets
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((asset) => (
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
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{asset.agencyName}</TableCell>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{asset.location}</TableCell>
                          <TableCell align="right" sx={{ color: '#FFFFFF' }}>
                            ₦{asset.purchaseCost?.toLocaleString()}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={asset.status}
                              size="small"
                              color={getStatusColor(asset.status)}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Full Details">
                              <IconButton
                                component={Link}
                                to={`/assets/view/${asset.id}`}
                                size="small"
                                sx={{ color: '#00ff88' }}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {detailedAssets.length > 0 && (
              <TablePagination
                component="div"
                count={detailedAssets.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '.MuiTablePagination-selectIcon': { color: 'rgba(255, 255, 255, 0.7)' },
                }}
              />
            )}
          </Paper>
        )}
      </Container>
    </AppLayout>
  );
};

export default AdminAssetsPage;
