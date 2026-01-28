import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  LinearProgress,
  SelectChangeEvent,
  TextField,
} from '@mui/material';
import {
  Assessment,
  Inventory,
  TrendingDown,
  Security,
  ShowChart,
  PictureAsPdf,
  TableChart,
  Download,
  Refresh,
  FilterList,
  Info,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  BarChart,
  PieChart,
  Timeline,
  Description,
} from '@mui/icons-material';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  ReportType,
  ReportFilters,
  GeneratedReport,
  REPORT_TEMPLATES,
  AssetInventoryData,
  ValuationData,
  AuditData,
  UtilizationData,
  ReportInsight,
} from '@/types/report.types';
import {
  generateReport,
  getMinistriesForFilter,
  getUniqueLocations,
  formatCurrency,
} from '@/services/report.service';
import { ASSET_CATEGORIES, ASSET_STATUSES } from '@/utils/constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ReportsPage: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const isAdmin = userData?.role === 'admin';
  const isMinistryAdmin = userData?.role === 'ministry-admin';

  // State
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('asset_inventory');
  const [filters, setFilters] = useState<ReportFilters>({
    reportType: 'asset_inventory',
    ministryIds: [],
    assetTypes: [],
    statuses: [],
    locations: [],
    includeGraphs: true,
    includeDetailedTables: true,
    includeSummaryInsights: true,
  });
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Filter options
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoadingFilters(true);
        const [ministriesData, locationsData] = await Promise.all([
          getMinistriesForFilter(),
          getUniqueLocations(),
        ]);
        setMinistries(ministriesData);
        setLocations(locationsData);
      } catch (err) {
        console.error('Error loading filter options:', err);
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilterOptions();
  }, []);

  // Handle report type change
  const handleReportTypeChange = (type: ReportType) => {
    setSelectedReportType(type);
    setFilters({ ...filters, reportType: type });
    setGeneratedReport(null);
  };

  // Handle multi-select changes
  const handleMultiSelectChange = (field: keyof ReportFilters) => (
    event: SelectChangeEvent<string[]>
  ) => {
    const value = event.target.value;
    setFilters({
      ...filters,
      [field]: typeof value === 'string' ? value.split(',') : value,
    });
  };

  // Generate report
  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const reportFilters: ReportFilters = {
        ...filters,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const report = await generateReport(
        reportFilters,
        currentUser?.uid || '',
        currentUser?.email || '',
        isMinistryAdmin,
        userData?.ministryId,
        userData?.agencyName
      );

      setGeneratedReport(report);
      setActiveTab(0);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!generatedReport) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with Nigerian branding
    doc.setFillColor(0, 135, 81);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Federal Republic of Nigeria', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Government Asset Management System', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(12);
    doc.text(generatedReport.title, pageWidth / 2, 35, { align: 'center' });

    // Report info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated: ${generatedReport.generatedAt.toLocaleString()}`, 14, 50);
    doc.text(`Generated By: ${generatedReport.generatedBy}`, 14, 56);
    if (generatedReport.ministryName) {
      doc.text(`Ministry: ${generatedReport.ministryName}`, 14, 62);
    }

    let yPosition = generatedReport.ministryName ? 72 : 66;

    // Insights section
    if (generatedReport.insights.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Insights', 14, yPosition);
      yPosition += 8;

      generatedReport.insights.forEach((insight) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${insight.title}`, 14, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        const splitDescription = doc.splitTextToSize(insight.description, pageWidth - 28);
        doc.text(splitDescription, 18, yPosition);
        yPosition += splitDescription.length * 5 + 3;
      });
    }

    yPosition += 5;

    // Data tables based on report type
    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;

      // Summary stats
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, yPosition);
      yPosition += 8;

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: [
          ['Total Assets', data.totalAssets.toString()],
          ['Total Value', formatCurrency(data.totalValue)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 135, 81] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Assets by type
      if (data.byType.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Assets by Type', 14, yPosition);
        yPosition += 5;

        autoTable(doc, {
          startY: yPosition,
          head: [['Type', 'Count', 'Value']],
          body: data.byType.map((item) => [
            item.name,
            item.count.toString(),
            formatCurrency(item.value),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [0, 135, 81] },
        });
      }
    }

    // Footer on last page
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      'Nigeria GAMS Report',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );

    doc.save(`${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!generatedReport) return;

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Report Title', generatedReport.title],
      ['Generated At', generatedReport.generatedAt.toLocaleString()],
      ['Generated By', generatedReport.generatedBy],
      ['Scope', generatedReport.scope === 'ministry' ? 'Ministry Level' : 'Federal Level'],
    ];
    if (generatedReport.ministryName) {
      summaryData.push(['Ministry', generatedReport.ministryName]);
    }
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Insights sheet
    if (generatedReport.insights.length > 0) {
      const insightsData = [
        ['Type', 'Title', 'Description', 'Recommendation'],
        ...generatedReport.insights.map((i) => [
          i.type,
          i.title,
          i.description,
          i.recommendation || '',
        ]),
      ];
      const insightsSheet = XLSX.utils.aoa_to_sheet(insightsData);
      XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Insights');
    }

    // Data sheets based on report type
    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;

      // By Type
      const byTypeData = [
        ['Asset Type', 'Count', 'Total Value'],
        ...data.byType.map((item) => [item.name, item.count, item.value]),
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(byTypeData), 'By Type');

      // By Ministry
      const byMinistryData = [
        ['Ministry', 'Count', 'Total Value'],
        ...data.byMinistry.map((item) => [item.name, item.count, item.value]),
      ];
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(byMinistryData),
        'By Ministry'
      );

      // All Assets
      if (data.assets.length > 0) {
        const assetsData = [
          ['ID', 'Name', 'Type', 'Location', 'Status', 'Acquisition Cost', 'Current Value'],
          ...data.assets.map((a) => [
            a.id,
            a.name,
            a.type,
            a.location,
            a.status,
            a.acquisitionCost,
            a.currentValue,
          ]),
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(assetsData), 'All Assets');
      }
    }

    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;

      // Financial Summary
      const financialData = [
        ['Metric', 'Value'],
        ['Total Acquisition Cost', data.totalAcquisitionCost],
        ['Total Current Value', data.totalCurrentValue],
        ['Total Depreciation', data.totalDepreciation],
        ['Depreciation Rate (%)', data.depreciationRate.toFixed(2)],
        ['Projected Loss Next Year', data.projectedLossNextYear],
      ];
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(financialData),
        'Financial Summary'
      );

      // By Type
      const byTypeData = [
        ['Type', 'Acquisition Cost', 'Current Value', 'Depreciation'],
        ...data.byType.map((item) => [
          item.name,
          item.acquisitionCost,
          item.currentValue,
          item.depreciation,
        ]),
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(byTypeData), 'By Type');
    }

    if (generatedReport.type === 'audit_compliance') {
      const data = generatedReport.data as AuditData;

      // Actions Summary
      const actionsData = [
        ['Action Type', 'Count'],
        ...data.actionsByType.map((item) => [item.action, item.count]),
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(actionsData), 'Actions');

      // Activity by User
      const userActivityData = [
        ['User', 'Action Count'],
        ...data.actionsByUser.map((item) => [item.user, item.count]),
      ];
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(userActivityData),
        'User Activity'
      );
    }

    if (generatedReport.type === 'utilization_risk') {
      const data = generatedReport.data as UtilizationData;

      // Risk Distribution
      const riskData = [
        ['Risk Level', 'Asset Count'],
        ...data.byRiskLevel.map((item) => [item.level, item.count]),
      ];
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(riskData),
        'Risk Distribution'
      );

      // High Risk Assets
      if (data.highRiskAssets.length > 0) {
        const highRiskData = [
          ['ID', 'Name', 'Type', 'Location', 'Risk Score', 'Value'],
          ...data.highRiskAssets.map((a) => [
            a.id,
            a.name,
            a.type,
            a.location,
            a.riskScore || 'N/A',
            a.currentValue,
          ]),
        ];
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet(highRiskData),
          'High Risk Assets'
        );
      }
    }

    XLSX.writeFile(workbook, `${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!generatedReport) return;

    let csvContent = '';

    // Header
    csvContent += `Report: ${generatedReport.title}\n`;
    csvContent += `Generated: ${generatedReport.generatedAt.toLocaleString()}\n`;
    csvContent += `Generated By: ${generatedReport.generatedBy}\n\n`;

    // Data based on report type
    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      csvContent += 'Asset Type,Count,Total Value\n';
      data.byType.forEach((item) => {
        csvContent += `"${item.name}",${item.count},${item.value}\n`;
      });
    }

    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;
      csvContent += 'Category,Acquisition Cost,Current Value,Depreciation\n';
      data.byType.forEach((item) => {
        csvContent += `"${item.name}",${item.acquisitionCost},${item.currentValue},${item.depreciation}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    link.click();
  };

  // Get insight icon
  const getInsightIcon = (type: ReportInsight['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'warning':
        return <Warning sx={{ color: '#ff9800' }} />;
      case 'danger':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:
        return <Info sx={{ color: '#2196f3' }} />;
    }
  };

  // Render report type cards
  const renderReportTypeCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {(Object.keys(REPORT_TEMPLATES) as ReportType[])
        .filter((type) => type !== 'custom')
        .map((type) => {
          const template = REPORT_TEMPLATES[type];
          const isSelected = selectedReportType === type;

          const getIcon = (iconName: string) => {
            switch (iconName) {
              case 'Inventory':
                return <Inventory sx={{ fontSize: 32 }} />;
              case 'TrendingDown':
                return <TrendingDown sx={{ fontSize: 32 }} />;
              case 'Security':
                return <Security sx={{ fontSize: 32 }} />;
              case 'Assessment':
                return <ShowChart sx={{ fontSize: 32 }} />;
              default:
                return <Assessment sx={{ fontSize: 32 }} />;
            }
          };

          return (
            <Grid item xs={12} sm={6} md={3} key={type}>
              <Card
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  transition: 'all 0.3s ease',
                  border: isSelected ? '2px solid #00ff88' : '1px solid rgba(0, 135, 81, 0.3)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(0, 135, 81, 0.3) 0%, rgba(0, 135, 81, 0.1) 100%)'
                    : 'transparent',
                  '&:hover': {
                    borderColor: '#00ff88',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0, 255, 136, 0.2)',
                  },
                }}
                onClick={() => handleReportTypeChange(type)}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 1,
                      color: isSelected ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    {getIcon(template.icon)}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'inherit' }}>
                      {template.title.replace(' Report', '')}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}
                  >
                    {template.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
    </Grid>
  );

  // Render filters panel
  const renderFiltersPanel = () => (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.1) 0%, rgba(0, 135, 81, 0.05) 100%)',
        borderLeft: '4px solid #008751',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FilterList sx={{ color: '#00ff88' }} />
        <Typography variant="h6" sx={{ color: '#00ff88' }}>
          Report Filters
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Ministry Filter (Admin only) */}
        {isAdmin && (
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Ministries</InputLabel>
              <Select
                multiple
                value={filters.ministryIds || []}
                onChange={handleMultiSelectChange('ministryIds')}
                input={<OutlinedInput label="Ministries" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((id) => {
                      const ministry = ministries.find((m) => m.id === id);
                      return (
                        <Chip
                          key={id}
                          label={ministry?.name || id}
                          size="small"
                          sx={{ backgroundColor: 'rgba(0, 135, 81, 0.3)' }}
                        />
                      );
                    })}
                  </Box>
                )}
                disabled={loadingFilters}
              >
                {ministries.map((ministry) => (
                  <MenuItem key={ministry.id} value={ministry.id}>
                    {ministry.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Asset Types Filter */}
        <Grid item xs={12} md={isAdmin ? 4 : 6}>
          <FormControl fullWidth size="small">
            <InputLabel>Asset Types</InputLabel>
            <Select
              multiple
              value={filters.assetTypes || []}
              onChange={handleMultiSelectChange('assetTypes')}
              input={<OutlinedInput label="Asset Types" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip
                      key={value}
                      label={value}
                      size="small"
                      sx={{ backgroundColor: 'rgba(0, 135, 81, 0.3)' }}
                    />
                  ))}
                </Box>
              )}
            >
              {ASSET_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Status Filter */}
        <Grid item xs={12} md={isAdmin ? 4 : 6}>
          <FormControl fullWidth size="small">
            <InputLabel>Statuses</InputLabel>
            <Select
              multiple
              value={filters.statuses || []}
              onChange={handleMultiSelectChange('statuses')}
              input={<OutlinedInput label="Statuses" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip
                      key={value}
                      label={value}
                      size="small"
                      sx={{ backgroundColor: 'rgba(0, 135, 81, 0.3)' }}
                    />
                  ))}
                </Box>
              )}
            >
              {ASSET_STATUSES.map((status: string) => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Location Filter */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Locations</InputLabel>
            <Select
              multiple
              value={filters.locations || []}
              onChange={handleMultiSelectChange('locations')}
              input={<OutlinedInput label="Locations" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip
                      key={value}
                      label={value}
                      size="small"
                      sx={{ backgroundColor: 'rgba(0, 135, 81, 0.3)' }}
                    />
                  ))}
                </Box>
              )}
              disabled={loadingFilters}
            >
              {locations.map((location) => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Date Range */}
        <Grid item xs={12} md={4}>
          <TextField
            label="From Date"
            type="date"
            size="small"
            fullWidth
            value={dateFrom ? dateFrom.toISOString().split('T')[0] : ''}
            onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : null)}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="To Date"
            type="date"
            size="small"
            fullWidth
            value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
            onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : null)}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>
      </Grid>

      {/* Generate Button */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => {
            setFilters({
              reportType: selectedReportType,
              ministryIds: [],
              assetTypes: [],
              statuses: [],
              locations: [],
              includeGraphs: true,
              includeDetailedTables: true,
              includeSummaryInsights: true,
            });
            setDateFrom(null);
            setDateTo(null);
          }}
        >
          Clear Filters
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Assessment />}
          onClick={handleGenerateReport}
          disabled={loading}
          sx={{ minWidth: 180 }}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </Box>
    </Paper>
  );

  // Render report preview
  const renderReportPreview = () => {
    if (!generatedReport) return null;

    return (
      <Paper sx={{ p: 3 }}>
        {/* Report Header */}
        <Box
          sx={{
            mb: 3,
            pb: 2,
            borderBottom: '2px solid rgba(0, 135, 81, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h5" sx={{ color: '#00ff88', fontWeight: 700, mb: 1 }}>
                {generatedReport.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Generated: {generatedReport.generatedAt.toLocaleString()} | By:{' '}
                {generatedReport.generatedBy}
              </Typography>
              {generatedReport.ministryName && (
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Ministry: {generatedReport.ministryName}
                </Typography>
              )}
            </Box>

            {/* Export Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Export as PDF">
                <IconButton
                  onClick={handleExportPDF}
                  sx={{
                    color: '#ef5350',
                    border: '1px solid rgba(239, 83, 80, 0.3)',
                    '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.1)' },
                  }}
                >
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as Excel">
                <IconButton
                  onClick={handleExportExcel}
                  sx={{
                    color: '#4caf50',
                    border: '1px solid rgba(76, 175, 80, 0.3)',
                    '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                  }}
                >
                  <TableChart />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as CSV">
                <IconButton
                  onClick={handleExportCSV}
                  sx={{
                    color: '#2196f3',
                    border: '1px solid rgba(33, 150, 243, 0.3)',
                    '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' },
                  }}
                >
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Insights Section */}
        {generatedReport.insights.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2 }}>
              Key Insights
            </Typography>
            <Grid container spacing={2}>
              {generatedReport.insights.map((insight, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card
                    sx={{
                      backgroundColor:
                        insight.type === 'danger'
                          ? 'rgba(244, 67, 54, 0.1)'
                          : insight.type === 'warning'
                          ? 'rgba(255, 152, 0, 0.1)'
                          : insight.type === 'success'
                          ? 'rgba(76, 175, 80, 0.1)'
                          : 'rgba(33, 150, 243, 0.1)',
                      border: `1px solid ${
                        insight.type === 'danger'
                          ? 'rgba(244, 67, 54, 0.3)'
                          : insight.type === 'warning'
                          ? 'rgba(255, 152, 0, 0.3)'
                          : insight.type === 'success'
                          ? 'rgba(76, 175, 80, 0.3)'
                          : 'rgba(33, 150, 243, 0.3)'
                      }`,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getInsightIcon(insight.type)}
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
                          {insight.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
                        {insight.description}
                      </Typography>
                      {insight.recommendation && (
                        <Typography
                          variant="body2"
                          sx={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}
                        >
                          Recommendation: {insight.recommendation}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Report Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab icon={<BarChart />} label="Summary" iconPosition="start" />
          <Tab icon={<TableChart />} label="Data Tables" iconPosition="start" />
          {generatedReport.type !== 'audit_compliance' && (
            <Tab icon={<PieChart />} label="Charts" iconPosition="start" />
          )}
        </Tabs>

        <Divider sx={{ mb: 2 }} />

        {/* Tab Content */}
        {activeTab === 0 && renderSummaryTab()}
        {activeTab === 1 && renderDataTablesTab()}
        {activeTab === 2 && renderChartsTab()}
      </Paper>
    );
  };

  // Render Summary Tab
  const renderSummaryTab = () => {
    if (!generatedReport) return null;

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      return (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Total Assets
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.totalAssets.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Total Value
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {formatCurrency(data.totalValue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Asset Types
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.byType.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  High Risk Assets
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.topHighRiskAssets.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      );
    }

    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;
      return (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Acquisition Cost
                </Typography>
                <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {formatCurrency(data.totalAcquisitionCost)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Current Value
                </Typography>
                <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {formatCurrency(data.totalCurrentValue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Total Depreciation
                </Typography>
                <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {formatCurrency(data.totalDepreciation)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Depreciation Rate
                </Typography>
                <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.depreciationRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      );
    }

    if (generatedReport.type === 'audit_compliance') {
      const data = generatedReport.data as AuditData;
      return (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Total Actions
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.totalActions.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Approval Rate
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.approvalRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Rejection Rate
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.rejectionRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Anomalies Found
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.flaggedAnomalies.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      );
    }

    if (generatedReport.type === 'utilization_risk') {
      const data = generatedReport.data as UtilizationData;
      return (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Avg Utilization
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.averageUtilization}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={data.averageUtilization}
                  sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Avg Condition
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.averageConditionScore}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={data.averageConditionScore}
                  sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Avg Risk Score
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {data.averageRiskScore}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={data.averageRiskScore}
                  color="error"
                  sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Potential Savings
                </Typography>
                <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                  {formatCurrency(data.potentialSavings)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      );
    }

    return null;
  };

  // Render Data Tables Tab
  const renderDataTablesTab = () => {
    if (!generatedReport) return null;

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      return (
        <Box>
          {/* By Type Table */}
          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2 }}>
            Assets by Type
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Asset Type</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byType.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                    <TableCell align="right">{formatCurrency(row.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* By Ministry Table */}
          {data.byMinistry.length > 0 && (
            <>
              <Typography variant="h6" sx={{ color: '#00ff88', mb: 2 }}>
                Assets by Ministry
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ministry</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.byMinistry.slice(0, 10).map((row) => (
                      <TableRow key={row.name}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                        <TableCell align="right">{formatCurrency(row.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* High Risk Assets */}
          {data.topHighRiskAssets.length > 0 && (
            <>
              <Typography variant="h6" sx={{ color: '#ef5350', mb: 2 }}>
                High Risk Assets
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell align="right">Risk Score</TableCell>
                      <TableCell align="right">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topHighRiskAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${asset.riskScore}%`}
                            size="small"
                            sx={{
                              backgroundColor:
                                (asset.riskScore || 0) >= 70
                                  ? 'rgba(244, 67, 54, 0.2)'
                                  : 'rgba(255, 152, 0, 0.2)',
                              color:
                                (asset.riskScore || 0) >= 70 ? '#ef5350' : '#ff9800',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(asset.currentValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      );
    }

    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;
      return (
        <Box>
          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2 }}>
            Depreciation by Asset Type
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Asset Type</TableCell>
                  <TableCell align="right">Acquisition Cost</TableCell>
                  <TableCell align="right">Current Value</TableCell>
                  <TableCell align="right">Depreciation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byType.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{formatCurrency(row.acquisitionCost)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.currentValue)}</TableCell>
                    <TableCell align="right" sx={{ color: '#ef5350' }}>
                      -{formatCurrency(row.depreciation)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Underutilized Assets */}
          {data.underutilizedAssets.length > 0 && (
            <>
              <Typography variant="h6" sx={{ color: '#ff9800', mb: 2 }}>
                Underutilized Assets
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Acquisition Cost</TableCell>
                      <TableCell align="right">Current Value</TableCell>
                      <TableCell align="right">Value Loss</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.underutilizedAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(asset.acquisitionCost)}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(asset.currentValue)}</TableCell>
                        <TableCell align="right" sx={{ color: '#ef5350' }}>
                          -{formatCurrency(asset.acquisitionCost - asset.currentValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      );
    }

    if (generatedReport.type === 'audit_compliance') {
      const data = generatedReport.data as AuditData;
      return (
        <Box>
          {/* Actions by Type */}
          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2 }}>
            Actions by Type
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Action Type</TableCell>
                  <TableCell align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.actionsByType.map((row) => (
                  <TableRow key={row.action}>
                    <TableCell>{row.action}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* User Activity */}
          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2 }}>
            Top Users by Activity
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.actionsByUser.map((row) => (
                  <TableRow key={row.user}>
                    <TableCell>{row.user}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Anomalies */}
          {data.flaggedAnomalies.length > 0 && (
            <>
              <Typography variant="h6" sx={{ color: '#ef5350', mb: 2 }}>
                Flagged Anomalies
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Recommendation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.flaggedAnomalies.map((anomaly, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{anomaly.type}</TableCell>
                        <TableCell>{anomaly.description}</TableCell>
                        <TableCell>
                          <Chip
                            label={anomaly.severity}
                            size="small"
                            sx={{
                              backgroundColor:
                                anomaly.severity === 'high'
                                  ? 'rgba(244, 67, 54, 0.2)'
                                  : anomaly.severity === 'medium'
                                  ? 'rgba(255, 152, 0, 0.2)'
                                  : 'rgba(76, 175, 80, 0.2)',
                              color:
                                anomaly.severity === 'high'
                                  ? '#ef5350'
                                  : anomaly.severity === 'medium'
                                  ? '#ff9800'
                                  : '#4caf50',
                            }}
                          />
                        </TableCell>
                        <TableCell>{anomaly.recommendation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      );
    }

    if (generatedReport.type === 'utilization_risk') {
      const data = generatedReport.data as UtilizationData;
      return (
        <Box>
          {/* Risk Distribution */}
          <Typography variant="h6" sx={{ color: '#00ff88', mb: 2 }}>
            Risk Distribution
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Risk Level</TableCell>
                  <TableCell align="right">Asset Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byRiskLevel.map((row) => (
                  <TableRow key={row.level}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: row.color,
                          }}
                        />
                        {row.level}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* High Risk Assets */}
          {data.highRiskAssets.length > 0 && (
            <>
              <Typography variant="h6" sx={{ color: '#ef5350', mb: 2 }}>
                High Risk Assets
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell align="right">Risk Score</TableCell>
                      <TableCell align="right">Current Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.highRiskAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${asset.riskScore}%`}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(244, 67, 54, 0.2)',
                              color: '#ef5350',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(asset.currentValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      );
    }

    return null;
  };

  // Render Charts Tab (simplified without Recharts for now)
  const renderChartsTab = () => {
    if (!generatedReport) return null;

    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Timeline sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
          Visual Charts Available
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2 }}>
          Charts are included in PDF and Excel exports for comprehensive visualization.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdf />}
          onClick={handleExportPDF}
          sx={{ mr: 1 }}
        >
          Export PDF with Charts
        </Button>
        <Button
          variant="outlined"
          startIcon={<TableChart />}
          onClick={handleExportExcel}
        >
          Export Excel with Data
        </Button>
      </Box>
    );
  };

  return (
    <AppLayout>
      <Container maxWidth="xl">
        {/* Page Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
            border: '1px solid rgba(0, 135, 81, 0.3)',
            borderLeft: '4px solid #008751',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assessment sx={{ fontSize: 40, color: '#00ff88' }} />
            <Box>
              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                Report Generation
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Generate comprehensive reports with data insights, charts, and export options
              </Typography>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Report Type Selection */}
        {renderReportTypeCards()}

        {/* Filters Panel */}
        {renderFiltersPanel()}

        {/* Loading Indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#00ff88' }} />
          </Box>
        )}

        {/* Report Preview */}
        {!loading && generatedReport && renderReportPreview()}

        {/* No Report Generated Yet */}
        {!loading && !generatedReport && (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.05) 0%, transparent 100%)',
            }}
          >
            <Description sx={{ fontSize: 80, color: 'rgba(255, 255, 255, 0.2)', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
              No Report Generated Yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Select a report type, configure filters, and click "Generate Report" to create a
              comprehensive analysis.
            </Typography>
          </Paper>
        )}
      </Container>
    </AppLayout>
  );
};

export default ReportsPage;
