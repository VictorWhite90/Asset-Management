import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  PictureAsPdf,
  Print,
  Assessment,
  TrendingUp,
  CheckCircle,
  Schedule,
  Visibility,
  Refresh,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAgencyReportSummary,
  getAgencyAssetsByCategory,
  getAgencyUploadYears,
  AgencyReportStats,
} from '@/services/asset.service';
import { Asset, AssetStatus } from '@/types/asset.types';
import { ASSET_CATEGORIES } from '@/utils/constants';
import AppLayout from '@/components/AppLayout';

type ViewMode = 'summary' | 'detailed';

const AgencyReportsPage = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  // Report data
  const [reportStats, setReportStats] = useState<AgencyReportStats | null>(null);
  const [detailedAssets, setDetailedAssets] = useState<Asset[]>([]);
  const [uploadYears, setUploadYears] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load initial data
  useEffect(() => {
    if (userData?.userId) {
      loadReportSummary();
      loadUploadYears();
    }
  }, [userData?.userId, categoryFilter, yearFilter]);

  const loadReportSummary = async () => {
    if (!userData?.userId) return;
    setLoading(true);
    setError(null);
    try {
      const stats = await getAgencyReportSummary(userData.userId, categoryFilter, yearFilter);
      setReportStats(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      toast.error(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const loadUploadYears = async () => {
    if (!userData?.userId) return;
    try {
      const years = await getAgencyUploadYears(userData.userId);
      setUploadYears(years);
    } catch (err: any) {
      console.error('Error loading years:', err);
    }
  };

  const loadCategoryDetails = async (category: string) => {
    if (!userData?.userId) return;
    setLoading(true);
    try {
      const assets = await getAgencyAssetsByCategory(userData.userId, category, yearFilter);
      setDetailedAssets(assets);
      setSelectedCategory(category);
      setViewMode('detailed');
    } catch (err: any) {
      toast.error('Failed to load category details');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setCategoryFilter('');
    setYearFilter('');
    setPage(0);
  };

  const handleBackToSummary = () => {
    setViewMode('summary');
    setSelectedCategory(null);
    setDetailedAssets([]);
  };

  const handleExportExcel = () => {
    try {
      const data = viewMode === 'summary'
        ? reportStats?.categoryBreakdown.map(c => ({
            'Category': c.category,
            'Total Assets': c.assetCount,
            'Purchase Value': `₦${c.totalPurchaseCost.toLocaleString()}`,
            'Market Value': `₦${c.totalMarketValue.toLocaleString()}`,
            'Approved': c.statusBreakdown.approved,
            'Pending': c.statusBreakdown.pending,
            'Rejected': c.statusBreakdown.rejected,
          }))
        : detailedAssets.map(a => ({
            'Asset ID': a.assetId,
            'Description': a.description,
            'Category': a.category,
            'Location': a.location,
            'Purchase Cost': a.purchaseCost,
            'Market Value': a.marketValue || 0,
            'Status': a.status,
          }));

      const worksheet = XLSX.utils.json_to_sheet(data || []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

      const filename = `${reportStats?.agencyName || 'agency'}-report-${new Date().toISOString().split('T')[0]}.xlsx`;
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
      doc.text('Nigeria Asset Management System', 14, 15);
      doc.setFontSize(12);
      doc.text(`${reportStats?.agencyName || 'Agency'} - Asset Report`, 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 28);

      if (viewMode === 'summary' && reportStats) {
        // Category summary table
        const tableData = reportStats.categoryBreakdown.map(c => [
          c.category,
          c.assetCount.toString(),
          `₦${c.totalPurchaseCost.toLocaleString()}`,
          `₦${c.totalMarketValue.toLocaleString()}`,
          c.statusBreakdown.approved.toString(),
          c.statusBreakdown.pending.toString(),
        ]);

        autoTable(doc, {
          head: [['Category', 'Count', 'Purchase Value', 'Market Value', 'Approved', 'Pending']],
          body: tableData,
          startY: 35,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 135, 81] },
        });
      } else {
        // Detailed assets table
        const tableData = detailedAssets.slice(0, 50).map(a => [
          a.assetId,
          a.description.substring(0, 30),
          a.category,
          (a.location || '').substring(0, 20),
          `₦${a.purchaseCost.toLocaleString()}`,
          a.status,
        ]);

        autoTable(doc, {
          head: [['Asset ID', 'Description', 'Category', 'Location', 'Cost', 'Status']],
          body: tableData,
          startY: 35,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [0, 135, 81] },
        });

        if (detailedAssets.length > 50) {
          const finalY = (doc as any).lastAutoTable?.finalY || 200;
          doc.text(`Note: Showing first 50 of ${detailedAssets.length} assets`, 14, finalY + 10);
        }
      }

      const filename = `${reportStats?.agencyName || 'agency'}-report-${new Date().toISOString().split('T')[0]}.pdf`;
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

  const getStatusChip = (status: AssetStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Chip
            label={status}
            size="small"
            sx={{
              backgroundColor: 'rgba(46, 125, 50, 0.15)',
              color: '#66bb6a',
              border: '1px solid rgba(46, 125, 50, 0.3)',
            }}
          />
        );
      case 'pending':
        return (
          <Chip
            label={status}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 167, 38, 0.15)',
              color: '#ffa726',
              border: '1px solid rgba(255, 167, 38, 0.3)',
            }}
          />
        );
      case 'rejected':
        return (
          <Chip
            label={status}
            size="small"
            sx={{
              backgroundColor: 'rgba(211, 47, 47, 0.15)',
              color: '#ef5350',
              border: '1px solid rgba(211, 47, 47, 0.3)',
            }}
          />
        );
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Input styles for dark theme
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      color: '#FFFFFF',
      '& fieldset': { borderColor: 'rgba(0, 135, 81, 0.3)' },
      '&:hover fieldset': { borderColor: 'rgba(0, 135, 81, 0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#008751' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
    '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.6)' },
  };

  const menuProps = {
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
  };

  if (!userData) {
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
            You must be logged in to view reports
          </Alert>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container maxWidth="xl">
        {/* Back Button */}
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
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
              <Assessment sx={{ fontSize: 40, color: '#00ff88' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 0.5 }}>
                  Asset Reports
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {reportStats?.agencyName}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadReportSummary}
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

        {/* Summary Cards */}
        {viewMode === 'summary' && reportStats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)', border: 'none' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} variant="body2">
                        Total Assets
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {reportStats.totalAssets}
                      </Typography>
                    </Box>
                    <TrendingUp sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #ed6c02 0%, #c25700 100%)', border: 'none' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} variant="body2">
                        Pending Review
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {reportStats.statusCounts.pending}
                      </Typography>
                    </Box>
                    <Schedule sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', border: 'none' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} variant="body2">
                        Approved
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {reportStats.statusCounts.approved}
                      </Typography>
                    </Box>
                    <CheckCircle sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', border: 'none' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} variant="body2">
                        Total Value
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {formatCurrency(reportStats.totalPurchaseValue)}
                      </Typography>
                    </Box>
                    <TrendingUp sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filter Panel */}
        <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600, mb: 2 }}>
            Filter Report
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                size="small"
                sx={inputStyles}
                SelectProps={{ MenuProps: menuProps }}
              >
                <MenuItem value="">All Categories</MenuItem>
                {ASSET_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                select
                label="Upload Year"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                size="small"
                sx={inputStyles}
                SelectProps={{ MenuProps: menuProps }}
              >
                <MenuItem value="">All Years</MenuItem>
                {uploadYears.map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={12} md={4}>
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
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Export Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            {viewMode === 'detailed' && selectedCategory && (
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleBackToSummary}
                sx={{
                  borderColor: 'rgba(0, 255, 136, 0.5)',
                  color: '#00ff88',
                  '&:hover': {
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                  },
                }}
              >
                Back to Summary
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
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
                backgroundColor: '#d32f2f',
                '&:hover': { backgroundColor: '#b71c1c' },
              }}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              Print
            </Button>
          </Box>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress sx={{ color: '#00ff88' }} />
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              color: '#ef5350',
              border: '1px solid rgba(211, 47, 47, 0.3)',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Summary View - Category Breakdown */}
        {!loading && !error && viewMode === 'summary' && reportStats && (
          <Paper elevation={0} sx={{ overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Category</TableCell>
                    <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Asset Count</TableCell>
                    <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Purchase Value</TableCell>
                    <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Market Value</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Approved</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Pending</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Rejected</TableCell>
                    <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportStats.categoryBreakdown.map((category) => (
                    <TableRow
                      key={category.category}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.05)', cursor: 'pointer' },
                        borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                      }}
                    >
                      <TableCell sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {category.category}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={category.assetCount}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(0, 135, 81, 0.2)',
                            color: '#00ff88',
                            border: '1px solid rgba(0, 135, 81, 0.4)',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {formatCurrency(category.totalPurchaseCost)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {formatCurrency(category.totalMarketValue)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={category.statusBreakdown.approved}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(46, 125, 50, 0.15)',
                            color: '#66bb6a',
                            border: '1px solid rgba(46, 125, 50, 0.3)',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={category.statusBreakdown.pending}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(255, 167, 38, 0.15)',
                            color: '#ffa726',
                            border: '1px solid rgba(255, 167, 38, 0.3)',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={category.statusBreakdown.rejected}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(211, 47, 47, 0.15)',
                            color: '#ef5350',
                            border: '1px solid rgba(211, 47, 47, 0.3)',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View detailed assets">
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => loadCategoryDetails(category.category)}
                            sx={{
                              color: '#00ff88',
                              '&:hover': { backgroundColor: 'rgba(0, 255, 136, 0.1)' },
                            }}
                          >
                            View
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Detailed View - Individual Assets */}
        {!loading && !error && viewMode === 'detailed' && (
          <>
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                border: '1px solid rgba(0, 135, 81, 0.2)',
              }}
            >
              <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
                {selectedCategory} - Detailed Assets ({detailedAssets.length} items)
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Asset ID</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Description</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Location</TableCell>
                      <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Purchase Cost</TableCell>
                      <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600 }}>Market Value</TableCell>
                      <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="center" sx={{ color: '#00ff88', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailedAssets
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((asset) => (
                        <TableRow
                          key={asset.assetId}
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.05)' },
                            borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                          }}
                        >
                          <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>{asset.assetId}</TableCell>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{asset.description}</TableCell>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{asset.location}</TableCell>
                          <TableCell align="right" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                            ₦{asset.purchaseCost.toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {asset.marketValue ? `₦${asset.marketValue.toLocaleString()}` : 'N/A'}
                          </TableCell>
                          <TableCell align="center">
                            {getStatusChip(asset.status)}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => navigate(`/assets/view/${asset.assetId}`)}
                              sx={{
                                color: '#00ff88',
                                '&:hover': { backgroundColor: 'rgba(0, 255, 136, 0.1)' },
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={detailedAssets.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderTop: '1px solid rgba(0, 135, 81, 0.2)',
                  '& .MuiTablePagination-select': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiTablePagination-selectIcon': { color: 'rgba(255, 255, 255, 0.5)' },
                  '& .MuiIconButton-root': { color: 'rgba(255, 255, 255, 0.5)' },
                  '& .MuiIconButton-root.Mui-disabled': { color: 'rgba(255, 255, 255, 0.2)' },
                }}
              />
            </Paper>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && reportStats?.totalAssets === 0 && (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 60, color: 'rgba(0, 135, 81, 0.3)', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              No assets uploaded yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
              Upload assets to generate reports
            </Typography>
            <Button
              variant="contained"
              sx={{
                mt: 2,
                backgroundColor: '#008751',
                '&:hover': { backgroundColor: '#006038' },
              }}
              onClick={() => navigate('/agency/upload')}
            >
              Upload Asset
            </Button>
          </Paper>
        )}
      </Container>
    </AppLayout>
  );
};

export default AgencyReportsPage;
