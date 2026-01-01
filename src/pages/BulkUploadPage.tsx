import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Upload,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { createAsset } from '@/services/asset.service';
import { AssetFormData } from '@/types/asset.types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ASSET_CATEGORIES } from '@/utils/constants';

interface BulkUploadRow {
  rowNumber: number;
  assetId?: string;
  description: string;
  category: string;
  location: string;
  purchaseDate: string; // DD/MM/YYYY format
  purchaseCost: number;
  marketValue?: number;
  remarks?: string;
  [key: string]: any; // For category-specific fields
  errors: string[];
  status: 'pending' | 'uploading' | 'success' | 'error';
}

const BulkUploadPage = () => {
  const { userData } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BulkUploadRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSummary, setUploadSummary] = useState<{ success: number; failed: number } | null>(null);

  // Download Excel template
  const downloadTemplate = () => {
    const templateData = [
      {
        'Asset ID (Optional)': '',
        Description: 'Example: Toyota Camry 2020',
        Category: 'Motor Vehicle',
        Location: 'Lagos, Nigeria',
        'Purchase Date (DD/MM/YYYY)': '15/01/2020',
        'Purchase Cost': 5000000,
        'Market Value (Optional)': 4500000,
        'Remarks (Optional)': 'In good condition',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets Template');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Asset ID
      { wch: 30 }, // Description
      { wch: 25 }, // Category
      { wch: 20 }, // Location
      { wch: 20 }, // Purchase Date
      { wch: 15 }, // Purchase Cost
      { wch: 15 }, // Market Value
      { wch: 30 }, // Remarks
    ];

    XLSX.writeFile(workbook, 'Asset_Upload_Template.xlsx');
    toast.success('Template downloaded successfully');
  };

  // Parse date from DD/MM/YYYY format
  const parseDate = (dateStr: string): { day: number; month: number; year: number } | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;

    return { day, month, year };
  };

  // Helper to get column value with flexible key matching
  const getColumnValue = (row: any, possibleKeys: string[]): any => {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }
    return undefined;
  };

  // Validate a single row
  const validateRow = (row: any, rowNumber: number): BulkUploadRow => {
    const errors: string[] = [];

    // Get values with flexible column name matching
    const description = getColumnValue(row, ['Description', 'description', 'DESCRIPTION']);
    const category = getColumnValue(row, ['Category', 'category', 'CATEGORY']);
    const location = getColumnValue(row, ['Location', 'location', 'LOCATION']);
    const purchaseDate = getColumnValue(row, [
      'Purchase Date (DD/MM/YYYY)',
      'Purchase Date',
      'purchase date',
      'Date',
    ]);
    const purchaseCost = getColumnValue(row, [
      'Purchase Cost',
      'purchase cost',
      'Cost',
      'cost',
      'PURCHASE COST',
    ]);
    const assetId = getColumnValue(row, [
      'Asset ID (Optional)',
      'Asset ID',
      'asset id',
      'ID',
    ]);
    const marketValue = getColumnValue(row, [
      'Market Value (Optional)',
      'Market Value',
      'market value',
      'MARKET VALUE',
    ]);
    const remarks = getColumnValue(row, [
      'Remarks (Optional)',
      'Remarks',
      'remarks',
      'REMARKS',
    ]);

    // Required field validations
    if (!description || String(description).trim() === '') {
      errors.push('Description is required');
    }
    if (!category || !ASSET_CATEGORIES.includes(category)) {
      errors.push('Invalid category');
    }
    if (!location || String(location).trim() === '') {
      errors.push('Location is required');
    }
    if (!purchaseDate) {
      errors.push('Purchase date is required');
    } else {
      const parsedDate = parseDate(String(purchaseDate));
      if (!parsedDate) {
        errors.push('Invalid date format (use DD/MM/YYYY)');
      }
    }
    if (!purchaseCost || parseFloat(purchaseCost) <= 0) {
      errors.push('Valid purchase cost is required');
    }

    return {
      rowNumber,
      assetId: assetId ? String(assetId).trim() : undefined,
      description: description ? String(description) : '',
      category: category ? String(category) : '',
      location: location ? String(location) : '',
      purchaseDate: purchaseDate ? String(purchaseDate) : '',
      purchaseCost: purchaseCost ? parseFloat(purchaseCost) : 0,
      marketValue: marketValue ? parseFloat(marketValue) : undefined,
      remarks: remarks ? String(remarks).trim() : undefined,
      errors,
      status: errors.length > 0 ? 'error' : 'pending',
    };
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      toast.error(ERROR_MESSAGES.ASSETS.INVALID_FILE);
      return;
    }

    setFile(selectedFile);
    parseExcelFile(selectedFile);
  };

  // Parse Excel file
  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error('Excel file is empty');
          return;
        }

        // Validate each row
        const validatedRows = jsonData.map((row, index) => validateRow(row, index + 2)); // +2 because Excel starts at 1 and has header

        setRows(validatedRows);

        const errorCount = validatedRows.filter(r => r.errors.length > 0).length;
        if (errorCount > 0) {
          toast.warning(`${errorCount} row(s) have errors. Please fix them before uploading.`);
        } else {
          toast.success(`${validatedRows.length} row(s) parsed successfully`);
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Remove a row from the list
  const removeRow = (rowNumber: number) => {
    setRows(rows.filter(r => r.rowNumber !== rowNumber));
  };

  // Upload all valid rows
  const handleBulkUpload = async () => {
    if (!userData) {
      toast.error('Please sign in to upload assets');
      return;
    }

    // Filter out rows with errors
    const validRows = rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      // Update row status to uploading
      setRows(prevRows =>
        prevRows.map(r =>
          r.rowNumber === row.rowNumber ? { ...r, status: 'uploading' } : r
        )
      );

      try {
        // Parse purchase date
        const parsedDate = parseDate(row.purchaseDate);
        if (!parsedDate) {
          throw new Error('Invalid date format');
        }

        // Create asset form data
        const assetFormData: AssetFormData = {
          assetId: row.assetId,
          description: row.description,
          category: row.category as any,
          location: row.location,
          purchasedDate: parsedDate,
          purchaseCost: row.purchaseCost,
          marketValue: row.marketValue,
          remarks: row.remarks,
        };

        // Upload asset (skip category-specific field validation for bulk uploads)
        await createAsset(assetFormData, userData.userId, userData.agencyName, true);

        // Update row status to success
        setRows(prevRows =>
          prevRows.map(r =>
            r.rowNumber === row.rowNumber ? { ...r, status: 'success' } : r
          )
        );
        successCount++;
      } catch (error: any) {
        console.error(`Error uploading row ${row.rowNumber}:`, error);

        // Update row status to error
        setRows(prevRows =>
          prevRows.map(r =>
            r.rowNumber === row.rowNumber
              ? { ...r, status: 'error', errors: [...r.errors, error.message || 'Upload failed'] }
              : r
          )
        );
        failedCount++;
      }

      // Update progress
      setUploadProgress(((i + 1) / validRows.length) * 100);
    }

    setUploading(false);
    setUploadSummary({ success: successCount, failed: failedCount });

    if (failedCount === 0) {
      toast.success(SUCCESS_MESSAGES.ASSETS.BULK_UPLOAD(successCount));
    } else {
      toast.warning(`${successCount} succeeded, ${failedCount} failed`);
    }
  };

  const hasErrors = rows.some(r => r.errors.length > 0);
  const validRowCount = rows.filter(r => r.errors.length === 0).length;

  return (
    <Container component="main" maxWidth="lg">
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

        <Paper elevation={3} sx={{ padding: 4 }}>
          {/* Page Title */}
          <Typography component="h1" variant="h4" gutterBottom>
            Bulk Upload Assets
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload multiple assets at once using an Excel file. Download the template to get started.
          </Typography>

          {/* Download Template */}
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={downloadTemplate}
              size="large"
            >
              Download Excel Template
            </Button>
          </Box>

          {/* File Upload */}
          <Box sx={{ mb: 3 }}>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="excel-file-upload"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="excel-file-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<Upload />}
                size="large"
              >
                Choose Excel File
              </Button>
            </label>
            {file && (
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </Typography>
            )}
          </Box>

          {/* Upload Progress */}
          {uploading && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Uploading assets... {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {/* Upload Summary */}
          {uploadSummary && (
            <Alert severity={uploadSummary.failed === 0 ? 'success' : 'warning'} sx={{ mb: 3 }}>
              Upload complete: {uploadSummary.success} succeeded, {uploadSummary.failed} failed
            </Alert>
          )}

          {/* Preview Table */}
          {rows.length > 0 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Preview ({validRowCount} valid, {rows.length - validRowCount} errors)
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleBulkUpload}
                  disabled={uploading || hasErrors || validRowCount === 0}
                  size="large"
                >
                  Upload {validRowCount} Asset{validRowCount !== 1 ? 's' : ''}
                </Button>
              </Box>

              {hasErrors && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Some rows have errors. Please fix them or remove the rows before uploading.
                </Alert>
              )}

              <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Purchase Date</TableCell>
                      <TableCell>Cost</TableCell>
                      <TableCell>Errors</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        sx={{
                          backgroundColor:
                            row.status === 'error'
                              ? 'rgba(211, 47, 47, 0.08)'
                              : row.status === 'success'
                              ? 'rgba(46, 125, 50, 0.08)'
                              : 'inherit',
                        }}
                      >
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.status === 'pending' && <Chip label="Pending" size="small" />}
                          {row.status === 'uploading' && <Chip label="Uploading" color="info" size="small" />}
                          {row.status === 'success' && (
                            <Chip icon={<CheckCircle />} label="Success" color="success" size="small" />
                          )}
                          {row.status === 'error' && (
                            <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />
                          )}
                        </TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>{row.purchaseDate}</TableCell>
                        <TableCell>₦{row.purchaseCost.toLocaleString()}</TableCell>
                        <TableCell>
                          {row.errors.length > 0 && (
                            <Typography variant="caption" color="error">
                              {row.errors.join(', ')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => removeRow(row.rowNumber)}
                            disabled={uploading}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default BulkUploadPage;
