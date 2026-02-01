import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Select,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Search,
  Clear,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { getAgencyAssets } from '@/services/asset.service';
import { Asset } from '@/types/asset.types';
import { ASSET_CATEGORIES } from '@/utils/constants';
import AppLayout from '@/components/AppLayout';

const AgencyAssetsPage = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, categoryFilter, dateFromFilter, dateToFilter, assets]);

  const fetchAssets = async () => {
    if (!userData?.userId) {
      setError('User data not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const agencyAssets = await getAgencyAssets(userData.userId);
      setAssets(agencyAssets);
      setFilteredAssets(agencyAssets);
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
      toast.error(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.description?.toLowerCase().includes(query) ||
          asset.assetId?.toLowerCase().includes(query) ||
          asset.location?.toLowerCase().includes(query) ||
          asset.category?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter((asset) => asset.category === categoryFilter);
    }

    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter((asset) => {
        const uploadDate = asset.uploadTimestamp?.toDate?.() || new Date(0);
        return uploadDate >= fromDate;
      });
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((asset) => {
        const uploadDate = asset.uploadTimestamp?.toDate?.() || new Date(0);
        return uploadDate <= toDate;
      });
    }

    setFilteredAssets(filtered);
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const handleExportToExcel = () => {
    if (filteredAssets.length === 0) {
      toast.warning('No assets to export');
      return;
    }

    const exportData = filteredAssets.map((asset) => ({
      'Asset ID': asset.assetId,
      'Description': asset.description,
      'Category': asset.category,
      'Location': asset.location,
      'Purchase Date': `${asset.purchasedDate.day}/${asset.purchasedDate.month}/${asset.purchasedDate.year}`,
      'Upload Date': asset.uploadTimestamp?.toDate?.()
        ? new Date(asset.uploadTimestamp.toDate()).toLocaleDateString()
        : 'N/A',
      'Purchase Cost': asset.purchaseCost,
      'Market Value': asset.marketValue || 'N/A',
      'Remarks': asset.remarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'My Assets');

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 35 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
    ];

    const filename = `My_Assets_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast.success(`Exported ${filteredAssets.length} assets to Excel`);
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (date: { day: number; month: number; year: number }) => {
    return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
  };

  const totalPurchaseCost = filteredAssets.reduce((sum, asset) => sum + asset.purchaseCost, 0);
  const totalMarketValue = filteredAssets.reduce(
    (sum, asset) => sum + (asset.marketValue || 0),
    0
  );

  const paginatedAssets = filteredAssets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Page Title */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography component="h1" variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}>
              My Assets
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportToExcel}
              disabled={filteredAssets.length === 0}
              size="small"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              Export
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Summary Cards */}
          <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, mb: 3, flexWrap: 'wrap' }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                flex: 1,
                minWidth: { xs: '100%', sm: 150 },
                background: 'linear-gradient(135deg, #008751 0%, #006038 100%)',
                border: 'none',
              }}
            >
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Total Assets
              </Typography>
              <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {filteredAssets.length}
              </Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                flex: 1,
                minWidth: { xs: 'calc(50% - 6px)', sm: 150 },
                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                border: '1px solid rgba(0, 135, 81, 0.3)',
              }}
            >
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Purchase Cost
              </Typography>
              <Typography variant="h5" sx={{ color: '#00ff88', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.5rem' }, wordBreak: 'break-word' }}>
                {formatCurrency(totalPurchaseCost)}
              </Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                flex: 1,
                minWidth: { xs: 'calc(50% - 6px)', sm: 150 },
                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                border: '1px solid rgba(0, 135, 81, 0.3)',
              }}
            >
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Market Value
              </Typography>
              <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.5rem' }, wordBreak: 'break-word' }}>
                {formatCurrency(totalMarketValue)}
              </Typography>
            </Paper>
          </Box>

          {/* Status Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(0, 135, 81, 0.3)', mb: 3 }}>
            <Tabs
              value={statusFilter}
              onChange={(_, value) => setStatusFilter(value)}
              aria-label="asset status tabs"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                '& .MuiTab-root': {
                  color: 'rgba(255,255,255,0.6)',
                  '&.Mui-selected': { color: '#00ff88' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  minWidth: { xs: 'auto', sm: 90 },
                  px: { xs: 1.5, sm: 2 },
                },
                '& .MuiTabs-indicator': { backgroundColor: '#00ff88' },
              }}
            >
              <Tab label={`All (${assets.length})`} value="all" />
              <Tab label={`Pending (${assets.filter(a => a.status === 'pending').length})`} value="pending" />
              <Tab label={`Approved (${assets.filter(a => a.status === 'approved').length})`} value="approved" />
              <Tab label={`Rejected (${assets.filter(a => a.status === 'rejected').length})`} value="rejected" />
            </Tabs>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search..."
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'rgba(255,255,255,0.5)', fontSize: { xs: 18, sm: 24 } }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <Clear sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 150 } }} size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                {ASSET_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="From"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 130 } }}
            />
            <TextField
              label="To"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 130 } }}
            />
            {(searchQuery || categoryFilter !== 'All' || dateFromFilter || dateToFilter) && (
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClearFilters}
                size="small"
                sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 'auto' } }}
              >
                Clear
              </Button>
            )}
          </Box>

          {/* Active Filters Display */}
          {(searchQuery || categoryFilter !== 'All' || dateFromFilter || dateToFilter) && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {searchQuery && (
                <Chip
                  label={`Search: "${searchQuery}"`}
                  onDelete={() => setSearchQuery('')}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(0, 135, 81, 0.2)',
                    color: '#00ff88',
                    '& .MuiChip-deleteIcon': { color: '#00ff88' },
                  }}
                />
              )}
              {categoryFilter !== 'All' && (
                <Chip
                  label={`Category: ${categoryFilter}`}
                  onDelete={() => setCategoryFilter('All')}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(0, 135, 81, 0.2)',
                    color: '#00ff88',
                    '& .MuiChip-deleteIcon': { color: '#00ff88' },
                  }}
                />
              )}
              {dateFromFilter && (
                <Chip
                  label={`From: ${dateFromFilter}`}
                  onDelete={() => setDateFromFilter('')}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(0, 135, 81, 0.2)',
                    color: '#00ff88',
                    '& .MuiChip-deleteIcon': { color: '#00ff88' },
                  }}
                />
              )}
              {dateToFilter && (
                <Chip
                  label={`To: ${dateToFilter}`}
                  onDelete={() => setDateToFilter('')}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(0, 135, 81, 0.2)',
                    color: '#00ff88',
                    '& .MuiChip-deleteIcon': { color: '#00ff88' },
                  }}
                />
              )}
            </Box>
          )}

          {/* Assets Table */}
          {filteredAssets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                No assets found
              </Typography>
              {(searchQuery || categoryFilter !== 'All' || dateFromFilter || dateToFilter) && (
                <Button onClick={handleClearFilters} sx={{ mt: 2, color: '#00ff88' }}>
                  Clear Filters
                </Button>
              )}
            </Box>
          ) : (
            <>
              <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Asset ID</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Description</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Location</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Purchase Date</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Upload Date</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }} align="right">Purchase Cost</TableCell>
                      <TableCell sx={{ color: '#00ff88', fontWeight: 600 }} align="right">Market Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedAssets.map((asset) => (
                      <TableRow
                        key={asset.id}
                        hover
                        onClick={() => navigate(`/assets/view/${asset.id}`)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' },
                        }}
                      >
                        <TableCell sx={{ color: '#FFFFFF' }}>{asset.assetId}</TableCell>
                        <TableCell sx={{ color: '#FFFFFF' }}>{asset.description}</TableCell>
                        <TableCell>
                          <Chip
                            label={asset.category}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(0, 135, 81, 0.2)',
                              color: '#00ff88',
                              border: '1px solid rgba(0, 135, 81, 0.4)',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{asset.location}</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{formatDate(asset.purchasedDate)}</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {asset.uploadTimestamp?.toDate?.()
                            ? new Date(asset.uploadTimestamp.toDate()).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Tooltip title={asset.status === 'rejected' ? `Reason: ${asset.rejectionReason}` : ''}>
                            <Chip
                              label={asset.status?.toUpperCase() || 'PENDING'}
                              size="small"
                              sx={{
                                backgroundColor:
                                  asset.status === 'approved'
                                    ? 'rgba(46, 125, 50, 0.3)'
                                    : asset.status === 'rejected'
                                    ? 'rgba(198, 40, 40, 0.3)'
                                    : 'rgba(184, 134, 11, 0.3)',
                                color:
                                  asset.status === 'approved'
                                    ? '#4caf50'
                                    : asset.status === 'rejected'
                                    ? '#ef5350'
                                    : '#ffc107',
                                border: '1px solid',
                                borderColor:
                                  asset.status === 'approved'
                                    ? 'rgba(46, 125, 50, 0.5)'
                                    : asset.status === 'rejected'
                                    ? 'rgba(198, 40, 40, 0.5)'
                                    : 'rgba(184, 134, 11, 0.5)',
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ color: '#FFFFFF' }} align="right">{formatCurrency(asset.purchaseCost)}</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }} align="right">
                          {asset.marketValue ? formatCurrency(asset.marketValue) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50, 100]}
                component="div"
                count={filteredAssets.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  '& .MuiTablePagination-selectIcon': { color: 'rgba(255,255,255,0.5)' },
                }}
              />
            </>
          )}
        </Paper>
      </Container>
    </AppLayout>
  );
};

export default AgencyAssetsPage;
