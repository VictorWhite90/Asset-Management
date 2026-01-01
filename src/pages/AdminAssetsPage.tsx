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
  Select,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Search,
  Clear,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { getAllAssets } from '@/services/asset.service';
import { Asset } from '@/types/asset.types';
import { ASSET_CATEGORIES } from '@/utils/constants';

const AdminAssetsPage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [agencyFilter, setAgencyFilter] = useState<string>('All');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  // Get unique agencies from assets
  const uniqueAgencies = Array.from(new Set(assets.map((asset) => asset.agencyName))).sort();

  // Fetch all assets on mount
  useEffect(() => {
    fetchAssets();
  }, []);

  // Apply filters when any filter changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, categoryFilter, agencyFilter, dateFromFilter, dateToFilter, assets]);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const allAssets = await getAllAssets();
      setAssets(allAssets);
      setFilteredAssets(allAssets);
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
      toast.error(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.description?.toLowerCase().includes(query) ||
          asset.assetId?.toLowerCase().includes(query) ||
          asset.agencyName?.toLowerCase().includes(query) ||
          asset.location?.toLowerCase().includes(query) ||
          asset.category?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter((asset) => asset.category === categoryFilter);
    }

    // Apply agency filter
    if (agencyFilter !== 'All') {
      filtered = filtered.filter((asset) => asset.agencyName === agencyFilter);
    }

    // Apply date range filter
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter((asset) => {
        const uploadDate = asset.uploadTimestamp?.toDate?.() || new Date(0);
        return uploadDate >= fromDate;
      });
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((asset) => {
        const uploadDate = asset.uploadTimestamp?.toDate?.() || new Date(0);
        return uploadDate <= toDate;
      });
    }

    setFilteredAssets(filtered);
    setPage(0); // Reset to first page when filters change
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
    setAgencyFilter('All');
    setDateFromFilter('');
    setDateToFilter('');
  };

  // Export to Excel
  const handleExportToExcel = () => {
    if (filteredAssets.length === 0) {
      toast.warning('No assets to export');
      return;
    }

    const exportData = filteredAssets.map((asset) => ({
      'Asset ID': asset.assetId,
      'Agency': asset.agencyName,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Asset ID
      { wch: 30 }, // Agency
      { wch: 35 }, // Description
      { wch: 25 }, // Category
      { wch: 20 }, // Location
      { wch: 15 }, // Purchase Date
      { wch: 15 }, // Upload Date
      { wch: 15 }, // Purchase Cost
      { wch: 15 }, // Market Value
      { wch: 30 }, // Remarks
    ];

    const filename = `Assets_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast.success(`Exported ${filteredAssets.length} assets to Excel`);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (date: { day: number; month: number; year: number }) => {
    return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
  };

  // Calculate total value
  const totalPurchaseCost = filteredAssets.reduce((sum, asset) => sum + asset.purchaseCost, 0);
  const totalMarketValue = filteredAssets.reduce(
    (sum, asset) => sum + (asset.marketValue || 0),
    0
  );

  // Paginate
  const paginatedAssets = filteredAssets.slice(
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
              All Assets
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportToExcel}
              disabled={filteredAssets.length === 0}
            >
              Export to Excel
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Summary Cards */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Paper elevation={1} sx={{ padding: 2, flex: 1, minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary">
                Total Assets
              </Typography>
              <Typography variant="h5">{filteredAssets.length}</Typography>
            </Paper>
            <Paper elevation={1} sx={{ padding: 2, flex: 1, minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary">
                Total Purchase Cost
              </Typography>
              <Typography variant="h5">{formatCurrency(totalPurchaseCost)}</Typography>
            </Paper>
            <Paper elevation={1} sx={{ padding: 2, flex: 1, minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary">
                Total Market Value
              </Typography>
              <Typography variant="h5">{formatCurrency(totalMarketValue)}</Typography>
            </Paper>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search by description, ID, agency, or location..."
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="All">All Categories</MenuItem>
                {ASSET_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Agency/Ministry</InputLabel>
              <Select
                value={agencyFilter}
                label="Agency/Ministry"
                onChange={(e) => setAgencyFilter(e.target.value)}
              >
                <MenuItem value="All">All Agencies</MenuItem>
                {uniqueAgencies.map((agency) => (
                  <MenuItem key={agency} value={agency}>
                    {agency}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="From Date"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              label="To Date"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            {(searchQuery || categoryFilter !== 'All' || agencyFilter !== 'All' || dateFromFilter || dateToFilter) && (
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            )}
          </Box>

          {/* Active Filters Display */}
          {(searchQuery || categoryFilter !== 'All' || agencyFilter !== 'All' || dateFromFilter || dateToFilter) && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {searchQuery && (
                <Chip
                  label={`Search: "${searchQuery}"`}
                  onDelete={() => setSearchQuery('')}
                  size="small"
                />
              )}
              {categoryFilter !== 'All' && (
                <Chip
                  label={`Category: ${categoryFilter}`}
                  onDelete={() => setCategoryFilter('All')}
                  size="small"
                  color="primary"
                />
              )}
              {agencyFilter !== 'All' && (
                <Chip
                  label={`Agency: ${agencyFilter}`}
                  onDelete={() => setAgencyFilter('All')}
                  size="small"
                  color="secondary"
                />
              )}
              {dateFromFilter && (
                <Chip
                  label={`From: ${dateFromFilter}`}
                  onDelete={() => setDateFromFilter('')}
                  size="small"
                />
              )}
              {dateToFilter && (
                <Chip
                  label={`To: ${dateToFilter}`}
                  onDelete={() => setDateToFilter('')}
                  size="small"
                />
              )}
            </Box>
          )}

          {/* Assets Table */}
          {filteredAssets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="h6" color="text.secondary">
                No assets found
              </Typography>
              {(searchQuery || categoryFilter !== 'All' || agencyFilter !== 'All' || dateFromFilter || dateToFilter) && (
                <Button onClick={handleClearFilters} sx={{ mt: 2 }}>
                  Clear Filters
                </Button>
              )}
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Asset ID</strong></TableCell>
                      <TableCell><strong>Agency</strong></TableCell>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Location</strong></TableCell>
                      <TableCell><strong>Purchase Date</strong></TableCell>
                      <TableCell><strong>Upload Date</strong></TableCell>
                      <TableCell align="right"><strong>Purchase Cost</strong></TableCell>
                      <TableCell align="right"><strong>Market Value</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedAssets.map((asset) => (
                      <TableRow key={asset.id} hover>
                        <TableCell>{asset.assetId}</TableCell>
                        <TableCell>{asset.agencyName}</TableCell>
                        <TableCell>{asset.description}</TableCell>
                        <TableCell>
                          <Chip label={asset.category} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>{formatDate(asset.purchasedDate)}</TableCell>
                        <TableCell>
                          {asset.uploadTimestamp?.toDate?.()
                            ? new Date(asset.uploadTimestamp.toDate()).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(asset.purchaseCost)}</TableCell>
                        <TableCell align="right">
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
              />
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminAssetsPage;
