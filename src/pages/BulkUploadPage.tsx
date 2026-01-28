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
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Upload,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
  CloudUpload,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { createAsset } from '@/services/asset.service';
import { AssetFormData } from '@/types/asset.types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ASSET_CATEGORIES } from '@/utils/constants';
import AppLayout from '@/components/AppLayout';

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
  const { userData, currentUser } = useAuth();
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
        await createAsset(
          assetFormData,
          userData.userId,
          userData.agencyName,
          true,
          currentUser?.email || undefined,
          userData.role,
          userData.ministryId, // Pass ministry ID for access control
          userData.ministryType // Pass uploader's ministry type
        );

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
      if (userData?.agencyName && userData?.location) {
        toast.info(
          `Uploads sent to your agency head for approval. Ensure your ${userData.agencyName} (${userData.location}) has an approver account registered.`,
          { autoClose: 8000 }
        );
      }
    } else {
      toast.warning(`${successCount} succeeded, ${failedCount} failed`);
    }
  };

  const hasErrors = rows.some(r => r.errors.length > 0);
  const validRowCount = rows.filter(r => r.errors.length === 0).length;

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CloudUpload sx={{ fontSize: 40, color: '#00ff88' }} />
            <Box>
              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                Bulk Upload Assets
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}>
                Upload multiple assets at once using an Excel file. Download the template to get started.
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Actions Row */}
        <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Download Template */}
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={downloadTemplate}
              size="large"
            >
              Download Excel Template
            </Button>

            {/* File Upload */}
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
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Upload Progress */}
        {uploading && (
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#00ff88', mb: 1 }}>
              Uploading assets... {Math.round(uploadProgress)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(0, 135, 81, 0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#00ff88',
                },
              }}
            />
          </Paper>
        )}

        {/* Upload Summary */}
        {uploadSummary && (
          <Alert
            severity={uploadSummary.failed === 0 ? 'success' : 'warning'}
            sx={{
              mb: 3,
              backgroundColor: uploadSummary.failed === 0 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(237, 108, 2, 0.1)',
              border: `1px solid ${uploadSummary.failed === 0 ? 'rgba(46, 125, 50, 0.3)' : 'rgba(237, 108, 2, 0.3)'}`,
            }}
          >
            Upload complete: {uploadSummary.success} succeeded, {uploadSummary.failed} failed
          </Alert>
        )}

        {/* Preview Table */}
        {rows.length > 0 && (
          <Paper elevation={0}>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid rgba(0, 135, 81, 0.3)',
                background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(0, 135, 81, 0.05) 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600 }}>
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
              <Alert
                severity="error"
                sx={{
                  m: 2,
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  border: '1px solid rgba(211, 47, 47, 0.3)',
                }}
              >
                Some rows have errors. Please fix them or remove the rows before uploading.
              </Alert>
            )}

            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 135, 81, 0.1)' }}>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Row</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Status</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Description</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Category</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Location</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Purchase Date</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Cost</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Errors</TableCell>
                    <TableCell sx={{ color: '#00ff88', fontWeight: 600, backgroundColor: '#0d2818' }}>Actions</TableCell>
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
                        '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.1)' },
                        borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
                      }}
                    >
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{row.rowNumber}</TableCell>
                      <TableCell>
                        {row.status === 'pending' && (
                          <Chip
                            label="Pending"
                            size="small"
                            sx={{ backgroundColor: 'rgba(0, 135, 81, 0.2)', color: 'rgba(255, 255, 255, 0.8)' }}
                          />
                        )}
                        {row.status === 'uploading' && (
                          <Chip
                            label="Uploading"
                            size="small"
                            sx={{ backgroundColor: 'rgba(25, 118, 210, 0.2)', color: '#64b5f6' }}
                          />
                        )}
                        {row.status === 'success' && (
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: 14, color: '#4caf50 !important' }} />}
                            label="Success"
                            size="small"
                            sx={{ backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#4caf50' }}
                          />
                        )}
                        {row.status === 'error' && (
                          <Chip
                            icon={<ErrorIcon sx={{ fontSize: 14, color: '#f44336 !important' }} />}
                            label="Error"
                            size="small"
                            sx={{ backgroundColor: 'rgba(244, 67, 54, 0.15)', color: '#f44336' }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: '#FFFFFF' }}>{row.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.category}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(0, 135, 81, 0.1)',
                            color: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid rgba(0, 135, 81, 0.3)',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{row.location}</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{row.purchaseDate}</TableCell>
                      <TableCell sx={{ color: '#FFFFFF', fontWeight: 600 }}>₦{row.purchaseCost.toLocaleString()}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <Typography variant="caption" sx={{ color: '#f44336' }}>
                            {row.errors.join(', ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Remove row">
                          <IconButton
                            size="small"
                            onClick={() => removeRow(row.rowNumber)}
                            disabled={uploading}
                            sx={{
                              color: '#f44336',
                              '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Container>
    </AppLayout>
  );
};

export default BulkUploadPage;
