import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Stack,
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
  Description,
  ArrowBack,
  Category,
  AccountBalance,
  FiberManualRecord,
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
import { ASSET_CATEGORIES } from '@/utils/constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Status badge helper ────────────────────────────────────────────────────
const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    approved:               { label: 'Approved',        color: '#4caf50', bg: 'rgba(76,175,80,0.15)'   },
    pending:                { label: 'Pending',         color: '#ff9800', bg: 'rgba(255,152,0,0.15)'   },
    pending_ministry_review:{ label: 'Ministry Review', color: '#2196f3', bg: 'rgba(33,150,243,0.15)'  },
    rejected:               { label: 'Rejected',        color: '#f44336', bg: 'rgba(244,67,54,0.15)'   },
  };
  const s = map[status] ?? { label: status, color: '#aaa', bg: 'rgba(255,255,255,0.08)' };
  return (
    <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.5,
      px:1, py:0.3, borderRadius:1, backgroundColor:s.bg, border:`1px solid ${s.color}40` }}>
      <FiberManualRecord sx={{ fontSize:8, color:s.color }} />
      <Typography sx={{ fontSize:'0.7rem', color:s.color, fontWeight:600, whiteSpace:'nowrap' }}>
        {s.label}
      </Typography>
    </Box>
  );
};

// ─── Labeled cell pair ───────────────────────────────────────────────────────
const InfoCell: React.FC<{ label: string; value?: string | number | null; mono?: boolean }> = ({ label, value, mono }) => (
  <Box>
    <Typography sx={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:0.5 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.9)', fontFamily: mono ? 'monospace' : 'inherit', mt:0.1 }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

// ─── Section header ──────────────────────────────────────────────────────────
const SectionHeading: React.FC<{ icon: React.ReactNode; title: string; count?: number }> = ({ icon, title, count }) => (
  <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2, mt:1 }}>
    <Box sx={{ color:'#00ff88' }}>{icon}</Box>
    <Typography variant="h6" sx={{ color:'#00ff88', fontWeight:700, fontSize:'1rem' }}>{title}</Typography>
    {count !== undefined && (
      <Chip label={`${count} records`} size="small"
        sx={{ backgroundColor:'rgba(0,255,136,0.1)', color:'#00ff88', borderColor:'rgba(0,255,136,0.3)', border:'1px solid' }} />
    )}
  </Box>
);

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const isAdmin = userData?.role === 'admin';
  const isMinistryAdmin = userData?.role === 'ministry-admin';

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
  const [singleAssetType, setSingleAssetType] = useState('');
  const [singleStatus, setSingleStatus] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoadingFilters(true);
        const [ministriesData, locationsData] = await Promise.all([
          getMinistriesForFilter(),
          getUniqueLocations(isMinistryAdmin ? userData?.ministryId : undefined),
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

  const handleReportTypeChange = (type: ReportType) => {
    setSelectedReportType(type);
    setFilters({ ...filters, reportType: type });
    setGeneratedReport(null);
  };

  const handleMultiSelectChange = (field: keyof ReportFilters) => (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFilters({ ...filters, [field]: typeof value === 'string' ? value.split(',') : value });
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const reportFilters: ReportFilters = {
        ...filters,
        assetTypes: singleAssetType ? [singleAssetType] : [],
        statuses: singleStatus ? [singleStatus] : [],
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      const report = await generateReport(
        reportFilters,
        currentUser?.email || '',
        isMinistryAdmin,
        userData?.ministryId,
        userData?.agencyName
      );
      setGeneratedReport(report);
      setActiveTab(0);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // ─── PDF Export ────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!generatedReport) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(0, 135, 81);
    doc.rect(0, 0, pageWidth, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FEDERAL REPUBLIC OF NIGERIA', pageWidth / 2, 13, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Government Asset Management System (GAMS)', pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(generatedReport.title.toUpperCase(), pageWidth / 2, 32, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Generated: ${generatedReport.generatedAt.toLocaleString()}  |  By: ${generatedReport.generatedBy}`, pageWidth / 2, 39, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    let y = 50;

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;

      // Summary banner
      autoTable(doc, {
        startY: y,
        head: [['Total Assets', 'Total Value', 'Asset Types', 'Ministries Covered']],
        body: [[
          data.totalAssets.toLocaleString(),
          formatCurrency(data.totalValue),
          data.byType.length.toString(),
          data.byMinistry?.length?.toString() ?? '—',
        ]],
        theme: 'grid',
        headStyles: { fillColor: [0, 135, 81], fontSize: 9 },
        bodyStyles: { fontSize: 10, fontStyle: 'bold', halign: 'center' },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Detailed asset table
      if (data.assets?.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DETAILED ASSET REGISTER', 14, y);
        y += 4;

        autoTable(doc, {
          startY: y,
          head: [[
            'Asset ID', 'Description', 'Category', 'State', 'Location/Address',
            'Ministry', 'Agency', 'Year', 'Purchase Cost (₦)', 'Market Value (₦)',
            'Condition', 'Status',
          ]],
          body: data.assets.map((a: any) => [
            a.assetId || a.id || '—',
            a.description || a.name || '—',
            a.category || a.type || '—',
            a.state || '—',
            a.location || '—',
            a.ministry || a.ministryName || '—',
            a.agency || a.agencyName || '—',
            a.purchasedDate?.year || a.year || '—',
            a.purchaseCost ? Number(a.purchaseCost).toLocaleString() : '—',
            a.marketValue ? Number(a.marketValue).toLocaleString() : '—',
            a.condition || '—',
            a.status || '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [0, 80, 50], fontSize: 7, textColor: [255,255,255] },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [240, 248, 244] },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 35 },
            2: { cellWidth: 22 },
            3: { cellWidth: 18 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
            6: { cellWidth: 25 },
            7: { cellWidth: 10 },
            8: { cellWidth: 22, halign: 'right' },
            9: { cellWidth: 22, halign: 'right' },
            10: { cellWidth: 18 },
            11: { cellWidth: 16 },
          },
        });
      }

      // By Type summary
      y = (doc as any).lastAutoTable.finalY + 10;
      doc.addPage();
      doc.text('ASSETS BY CATEGORY', 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [['Asset Category', 'Count', 'Total Value (₦)']],
        body: data.byType.map((item: any) => [item.name, item.count, formatCurrency(item.value)]),
        theme: 'grid',
        headStyles: { fillColor: [0, 135, 81] },
      });
    }

    // Footer
    const pages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`GAMS Confidential Report  |  Page ${i} of ${pages}  |  ${new Date().toLocaleDateString()}`,
        pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
    }

    doc.save(`${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  // ─── Excel Export ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!generatedReport) return;
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ['FEDERAL REPUBLIC OF NIGERIA — GOVERNMENT ASSET MANAGEMENT SYSTEM'],
      [''],
      ['Report Title', generatedReport.title],
      ['Generated At', generatedReport.generatedAt.toLocaleString()],
      ['Generated By', generatedReport.generatedBy],
      ['Scope', generatedReport.scope === 'ministry' ? 'Ministry Level' : 'Federal Level'],
      ...(generatedReport.ministryName ? [['Ministry', generatedReport.ministryName]] : []),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryData), 'Cover');

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;

      if (data.assets?.length > 0) {
        const headers = [
          'Asset ID', 'Description', 'Category', 'State', 'Location / Address',
          'Ministry', 'Agency', 'Year Purchased', 'Purchase Cost (₦)', 'Market Value (₦)',
          'Land Title Type', 'Survey Plan No.', 'Condition', 'Land Acquisition Purpose',
          'Equipment Type', 'Capacity', 'Item Type', 'Quantity',
          'Remarks', 'Status', 'Uploaded By', 'Date Uploaded',
        ];
        const rows = data.assets.map((a: any) => [
          a.assetId || a.id || '',
          a.description || a.name || '',
          a.category || a.type || '',
          a.state || '',
          a.location || '',
          a.ministry || a.ministryName || '',
          a.agency || a.agencyName || '',
          a.purchasedDate?.year || a.year || '',
          a.purchaseCost || '',
          a.marketValue || '',
          a.landTitleType || '',
          a.surveyPlanNumber || '',
          a.condition || '',
          a.landAcquisitionPurpose || '',
          a.equipmentType || '',
          a.capacity || '',
          a.itemType || '',
          a.quantity || '',
          a.remarks || '',
          a.status || '',
          a.uploadedBy || a.createdBy || '',
          a.createdAt?.toDate?.()?.toLocaleDateString?.() || a.createdAt || '',
        ]);
        const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        // Column widths
        sheet['!cols'] = headers.map((_, i) => ({ wch: [14,35,18,14,32,32,28,14,18,18,18,16,14,35,20,14,18,10,28,12,28,16][i] ?? 14 }));
        XLSX.utils.book_append_sheet(workbook, sheet, 'Asset Register');
      }

      const byTypeData = [['Asset Category', 'Count', 'Total Value (₦)'], ...data.byType.map((i: any) => [i.name, i.count, i.value])];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(byTypeData), 'By Category');

      if (!isMinistryAdmin && data.byMinistry?.length > 0) {
        const byMinData = [['Ministry', 'Count', 'Total Value (₦)'], ...data.byMinistry.map((i: any) => [i.name, i.count, i.value])];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(byMinData), 'By Ministry');
      }
    }

    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;
      const fin = [
        ['Metric', 'Value (₦)'],
        ['Total Acquisition Cost', data.totalAcquisitionCost],
        ['Total Current Value', data.totalCurrentValue],
        ['Total Depreciation', data.totalDepreciation],
        ['Depreciation Rate (%)', data.depreciationRate.toFixed(2)],
        ['Projected Loss Next Year', data.projectedLossNextYear],
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(fin), 'Financial Summary');
    }

    if (generatedReport.insights.length > 0) {
      const ins = [['Type','Title','Description','Recommendation'], ...generatedReport.insights.map((i) => [i.type,i.title,i.description,i.recommendation||''])];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(ins), 'Insights');
    }

    XLSX.writeFile(workbook, `${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    if (!generatedReport) return;
    let csv = `"${generatedReport.title}"\n"Generated","${generatedReport.generatedAt.toLocaleString()}"\n"By","${generatedReport.generatedBy}"\n\n`;
    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      if (data.assets?.length > 0) {
        csv += 'Asset ID,Description,Category,State,Location,Ministry,Agency,Year,Purchase Cost,Market Value,Condition,Status\n';
        data.assets.forEach((a: any) => {
          csv += `"${a.assetId||a.id||''}","${a.description||a.name||''}","${a.category||a.type||''}","${a.state||''}","${a.location||''}","${a.ministry||a.ministryName||''}","${a.agency||a.agencyName||''}","${a.purchasedDate?.year||''}",${a.purchaseCost||0},${a.marketValue||0},"${a.condition||''}","${a.status||''}"\n`;
        });
      } else {
        csv += 'Asset Type,Count,Total Value\n';
        data.byType.forEach((i: any) => { csv += `"${i.name}",${i.count},${i.value}\n`; });
      }
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    link.click();
  };

  const getInsightIcon = (type: ReportInsight['type']) => {
    switch (type) {
      case 'success': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'warning': return <Warning sx={{ color: '#ff9800' }} />;
      case 'danger':  return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:        return <Info sx={{ color: '#2196f3' }} />;
    }
  };

  // ─── Report type cards ────────────────────────────────────────────────────
  const renderReportTypeCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {(Object.keys(REPORT_TEMPLATES) as ReportType[]).filter((t) => t !== 'custom').map((type) => {
        const template = REPORT_TEMPLATES[type];
        const isSelected = selectedReportType === type;
        const icons: Record<string,React.ReactNode> = {
          Inventory: <Inventory sx={{ fontSize:32 }} />,
          TrendingDown: <TrendingDown sx={{ fontSize:32 }} />,
          Security: <Security sx={{ fontSize:32 }} />,
          Assessment: <ShowChart sx={{ fontSize:32 }} />,
        };
        return (
          <Grid item xs={12} sm={6} md={3} key={type}>
            <Card sx={{ cursor:'pointer', height:'100%', transition:'all 0.3s ease',
              border: isSelected ? '2px solid #00ff88' : '1px solid rgba(0,135,81,0.3)',
              background: isSelected ? 'linear-gradient(135deg,rgba(0,135,81,0.3),rgba(0,135,81,0.1))' : 'transparent',
              '&:hover': { borderColor:'#00ff88', transform:'translateY(-2px)', boxShadow:'0 4px 20px rgba(0,255,136,0.2)' },
            }} onClick={() => handleReportTypeChange(type)}>
              <CardContent>
                <Box sx={{ display:'flex', alignItems:'center', gap:2, mb:1,
                  color: isSelected ? '#00ff88' : 'rgba(255,255,255,0.7)' }}>
                  {icons[template.icon] ?? <Assessment sx={{ fontSize:32 }} />}
                  <Typography variant="subtitle1" sx={{ fontWeight:600, color:'inherit' }}>
                    {template.title.replace(' Report','')}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.6)', fontSize:'0.8rem' }}>
                  {template.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  // ─── Filters panel ────────────────────────────────────────────────────────
  const renderFiltersPanel = () => (
    <Paper sx={{ p:3, mb:3,
      background:'linear-gradient(135deg,rgba(0,135,81,0.1),rgba(0,135,81,0.05))',
      borderLeft:'4px solid #008751' }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}>
        <FilterList sx={{ color:'#00ff88' }} />
        <Typography variant="h6" sx={{ color:'#00ff88' }}>Report Filters</Typography>
      </Box>
      <Grid container spacing={2}>
        {isAdmin && (
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Ministries</InputLabel>
              <Select multiple value={filters.ministryIds||[]}
                onChange={handleMultiSelectChange('ministryIds')}
                input={<OutlinedInput label="Ministries" />}
                renderValue={(sel) => (
                  <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                    {(sel as string[]).map((id) => {
                      const m = ministries.find((x) => x.id === id);
                      return <Chip key={id} label={m?.name||id} size="small" sx={{ backgroundColor:'rgba(0,135,81,0.3)' }} />;
                    })}
                  </Box>
                )} disabled={loadingFilters}>
                {ministries.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid item xs={12} md={isAdmin ? 4 : 6}>
          <FormControl fullWidth size="small">
            <InputLabel>Asset Type</InputLabel>
            <Select value={singleAssetType} onChange={(e) => setSingleAssetType(e.target.value as string)}
              input={<OutlinedInput label="Asset Type" />}>
              <MenuItem value="">All Asset Types</MenuItem>
              {ASSET_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={isAdmin ? 4 : 6}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select value={singleStatus} onChange={(e) => setSingleStatus(e.target.value as string)}
              input={<OutlinedInput label="Status" />}>
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="pending_ministry_review">Ministry Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Locations</InputLabel>
            <Select multiple value={filters.locations||[]}
              onChange={handleMultiSelectChange('locations')}
              input={<OutlinedInput label="Locations" />}
              renderValue={(sel) => (
                <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                  {(sel as string[]).map((v) => <Chip key={v} label={v} size="small" sx={{ backgroundColor:'rgba(0,135,81,0.3)' }} />)}
                </Box>
              )} disabled={loadingFilters}>
              {locations.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField label="From Date" type="date" size="small" fullWidth
            value={dateFrom ? dateFrom.toISOString().split('T')[0] : ''}
            onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : null)}
            InputLabelProps={{ shrink:true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField label="To Date" type="date" size="small" fullWidth
            value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
            onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : null)}
            InputLabelProps={{ shrink:true }} />
        </Grid>
      </Grid>
      <Box sx={{ mt:3, display:'flex', gap:2, justifyContent:'flex-end' }}>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => {
          setFilters({ reportType:selectedReportType, ministryIds:[], assetTypes:[], statuses:[], locations:[],
            includeGraphs:true, includeDetailedTables:true, includeSummaryInsights:true });
          setSingleAssetType(''); setSingleStatus(''); setDateFrom(null); setDateTo(null);
        }}>Clear Filters</Button>
        <Button variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Assessment />}
          onClick={handleGenerateReport} disabled={loading} sx={{ minWidth:180 }}>
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </Box>
    </Paper>
  );

  // ─── Report preview wrapper ───────────────────────────────────────────────
  const renderReportPreview = () => {
    if (!generatedReport) return null;
    return (
      <Paper sx={{ p:3 }}>
        <Box sx={{ mb:3, pb:2, borderBottom:'2px solid rgba(0,135,81,0.3)' }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <Box>
              <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} size="small"
                sx={{ color:'rgba(255,255,255,0.6)', mb:1, '&:hover':{ color:'#00ff88' }, pl:0 }}>
                Back
              </Button>
              <Typography variant="h5" sx={{ color:'#00ff88', fontWeight:700, mb:0.5 }}>
                {generatedReport.title}
              </Typography>
              <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.5)', fontSize:'0.75rem' }}>
                Generated: {generatedReport.generatedAt.toLocaleString()} &nbsp;|&nbsp; By: {generatedReport.generatedBy}
              </Typography>
              {generatedReport.ministryName && (
                <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.5)', fontSize:'0.75rem' }}>
                  Ministry: {generatedReport.ministryName}
                </Typography>
              )}
            </Box>
            <Box sx={{ display:'flex', gap:1 }}>
              <Tooltip title="Export as PDF">
                <IconButton onClick={handleExportPDF}
                  sx={{ color:'#ef5350', border:'1px solid rgba(239,83,80,0.3)', '&:hover':{ backgroundColor:'rgba(239,83,80,0.1)' } }}>
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as Excel">
                <IconButton onClick={handleExportExcel}
                  sx={{ color:'#4caf50', border:'1px solid rgba(76,175,80,0.3)', '&:hover':{ backgroundColor:'rgba(76,175,80,0.1)' } }}>
                  <TableChart />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as CSV">
                <IconButton onClick={handleExportCSV}
                  sx={{ color:'#2196f3', border:'1px solid rgba(33,150,243,0.3)', '&:hover':{ backgroundColor:'rgba(33,150,243,0.1)' } }}>
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Insights */}
        {generatedReport.insights.length > 0 && (
          <Box sx={{ mb:3 }}>
            <Typography variant="h6" sx={{ color:'#FFFFFF', mb:2 }}>Key Insights</Typography>
            <Grid container spacing={2}>
              {generatedReport.insights.map((insight, idx) => (
                <Grid item xs={12} md={6} key={idx}>
                  <Card sx={{
                    backgroundColor: insight.type==='danger' ? 'rgba(244,67,54,0.1)' : insight.type==='warning' ? 'rgba(255,152,0,0.1)' : insight.type==='success' ? 'rgba(76,175,80,0.1)' : 'rgba(33,150,243,0.1)',
                    border:`1px solid ${insight.type==='danger' ? 'rgba(244,67,54,0.3)' : insight.type==='warning' ? 'rgba(255,152,0,0.3)' : insight.type==='success' ? 'rgba(76,175,80,0.3)' : 'rgba(33,150,243,0.3)'}`,
                  }}>
                    <CardContent>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                        {getInsightIcon(insight.type)}
                        <Typography variant="subtitle1" sx={{ fontWeight:600, color:'#FFFFFF' }}>{insight.title}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.8)', mb:1 }}>{insight.description}</Typography>
                      {insight.recommendation && (
                        <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.6)', fontStyle:'italic' }}>
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

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb:2 }}>
          <Tab icon={<BarChart />} label="Summary" iconPosition="start" />
          <Tab icon={<TableChart />} label="Detailed Register" iconPosition="start" />
          <Tab icon={<PieChart />} label="Breakdown" iconPosition="start" />
        </Tabs>
        <Divider sx={{ mb:2 }} />
        {activeTab === 0 && renderSummaryTab()}
        {activeTab === 1 && renderDetailedRegisterTab()}
        {activeTab === 2 && renderBreakdownTab()}
      </Paper>
    );
  };

  // ─── Summary Tab ──────────────────────────────────────────────────────────
  const renderSummaryTab = () => {
    if (!generatedReport) return null;

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      return (
        <Box>
          <Grid container spacing={3} sx={{ mb:4 }}>
            {[
              { label:'Total Assets', value: data.totalAssets.toLocaleString(), grad:'linear-gradient(135deg,#008751,#006038)' },
              { label:'Total Purchase Value', value: formatCurrency(data.totalValue), grad:'linear-gradient(135deg,#2e7d32,#1b5e20)' },
              { label:'Asset Categories', value: data.byType.length.toString(), grad:'linear-gradient(135deg,#b8860b,#8b6914)' },
              { label:'Ministries on Record', value: (data.byMinistry?.length||0).toString(), grad:'linear-gradient(135deg,#1565c0,#0d47a1)' },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.label}>
                <Card sx={{ background:card.grad }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.8)', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:1 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h4" sx={{ color:'#FFFFFF', fontWeight:700, mt:0.5, fontSize:{ xs:'1.4rem', sm:'1.8rem' } }}>
                      {card.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Quick category breakdown */}
          <Typography variant="subtitle1" sx={{ color:'#00ff88', fontWeight:600, mb:1.5 }}>
            Category Breakdown
          </Typography>
          <Grid container spacing={1.5}>
            {data.byType.map((item: any) => (
              <Grid item xs={12} sm={6} md={4} key={item.name}>
                <Box sx={{ p:1.5, borderRadius:1, border:'1px solid rgba(0,135,81,0.25)', background:'rgba(0,135,81,0.06)',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <Category sx={{ fontSize:16, color:'#00ff88' }} />
                    <Typography sx={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.85)' }}>{item.name}</Typography>
                  </Box>
                  <Box sx={{ textAlign:'right' }}>
                    <Typography sx={{ fontSize:'0.9rem', fontWeight:700, color:'#fff' }}>{item.count}</Typography>
                    <Typography sx={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.5)' }}>{formatCurrency(item.value)}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      );
    }

    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;
      return (
        <Grid container spacing={3}>
          {[
            { label:'Acquisition Cost', value: formatCurrency(data.totalAcquisitionCost), grad:'linear-gradient(135deg,#008751,#006038)' },
            { label:'Current Value', value: formatCurrency(data.totalCurrentValue), grad:'linear-gradient(135deg,#2e7d32,#1b5e20)' },
            { label:'Total Depreciation', value: formatCurrency(data.totalDepreciation), grad:'linear-gradient(135deg,#c62828,#8e0000)' },
            { label:'Depreciation Rate', value: `${data.depreciationRate.toFixed(1)}%`, grad:'linear-gradient(135deg,#b8860b,#8b6914)' },
          ].map((card) => (
            <Grid item xs={12} md={3} key={card.label}>
              <Card sx={{ background:card.grad }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.8)', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:1 }}>{card.label}</Typography>
                  <Typography variant="h5" sx={{ color:'#FFFFFF', fontWeight:700, mt:0.5 }}>{card.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    }

    if (generatedReport.type === 'audit_compliance') {
      const data = generatedReport.data as AuditData;
      return (
        <Grid container spacing={3}>
          {[
            { label:'Total Actions', value: data.totalActions.toLocaleString(), grad:'linear-gradient(135deg,#008751,#006038)' },
            { label:'Approval Rate', value: `${data.approvalRate.toFixed(1)}%`, grad:'linear-gradient(135deg,#2e7d32,#1b5e20)' },
            { label:'Rejection Rate', value: `${data.rejectionRate.toFixed(1)}%`, grad:'linear-gradient(135deg,#c62828,#8e0000)' },
            { label:'Anomalies Found', value: data.flaggedAnomalies.length.toString(), grad:'linear-gradient(135deg,#b8860b,#8b6914)' },
          ].map((card) => (
            <Grid item xs={12} md={3} key={card.label}>
              <Card sx={{ background:card.grad }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.8)', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:1 }}>{card.label}</Typography>
                  <Typography variant="h4" sx={{ color:'#FFFFFF', fontWeight:700, mt:0.5 }}>{card.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    }

    if (generatedReport.type === 'utilization_risk') {
      const data = generatedReport.data as UtilizationData;
      return (
        <Grid container spacing={3}>
          {[
            { label:'Avg Utilization', value:`${data.averageUtilization}%`, prog:data.averageUtilization, grad:'linear-gradient(135deg,#008751,#006038)' },
            { label:'Avg Condition', value:`${data.averageConditionScore}%`, prog:data.averageConditionScore, grad:'linear-gradient(135deg,#2e7d32,#1b5e20)' },
            { label:'Avg Risk Score', value:`${data.averageRiskScore}`, prog:data.averageRiskScore, grad:'linear-gradient(135deg,#c62828,#8e0000)' },
          ].map((card) => (
            <Grid item xs={12} md={3} key={card.label}>
              <Card sx={{ background:card.grad }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.8)', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:1 }}>{card.label}</Typography>
                  <Typography variant="h4" sx={{ color:'#FFFFFF', fontWeight:700, mt:0.5 }}>{card.value}</Typography>
                  <LinearProgress variant="determinate" value={card.prog}
                    sx={{ mt:1, backgroundColor:'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar':{ backgroundColor:'rgba(255,255,255,0.8)' } }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12} md={3}>
            <Card sx={{ background:'linear-gradient(135deg,#b8860b,#8b6914)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.8)', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:1 }}>Potential Savings</Typography>
                <Typography variant="h5" sx={{ color:'#FFFFFF', fontWeight:700, mt:0.5 }}>{formatCurrency(data.potentialSavings)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      );
    }
    return null;
  };

  // ─── DETAILED REGISTER TAB ────────────────────────────────────────────────
  const renderDetailedRegisterTab = () => {
    if (!generatedReport) return null;

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      const assets: any[] = data.assets || [];

      if (assets.length === 0) {
        return (
          <Box sx={{ textAlign:'center', py:6 }}>
            <Inventory sx={{ fontSize:60, color:'rgba(255,255,255,0.2)', mb:2 }} />
            <Typography sx={{ color:'rgba(255,255,255,0.5)' }}>
              No individual asset records found. Try broadening your filters.
            </Typography>
          </Box>
        );
      }

      return (
        <Box>
          <SectionHeading icon={<Inventory />} title="Full Asset Register" count={assets.length} />

          {/* ── Asset cards ── */}
          <Stack spacing={2}>
            {assets.map((asset: any, idx: number) => {
              const assetId   = asset.assetId || asset.id || `—`;
              const desc      = asset.description || asset.name || '—';
              const category  = asset.category || asset.type || '—';
              const state     = asset.state || '—';
              const location  = asset.location || '—';
              const ministry  = asset.ministry || asset.ministryName || '—';
              const agency    = asset.agency || asset.agencyName || '—';
              const year      = asset.purchasedDate?.year || asset.year || '—';
              const cost      = asset.purchaseCost ? formatCurrency(Number(asset.purchaseCost)) : '—';
              const mktVal    = asset.marketValue  ? formatCurrency(Number(asset.marketValue))  : '—';
              const condition = asset.condition || '—';
              const status    = asset.status || 'pending';
              const remarks   = asset.remarks || null;

              // Category-specific extras
              const extras: { label:string; value:string }[] = [];
              if (asset.landTitleType)          extras.push({ label:'Land Title',       value: asset.landTitleType });
              if (asset.surveyPlanNumber)        extras.push({ label:'Survey Plan No.',  value: asset.surveyPlanNumber });
              if (asset.landAcquisitionPurpose)  extras.push({ label:'Acquisition Purpose', value: asset.landAcquisitionPurpose });
              if (asset.equipmentType)           extras.push({ label:'Equipment Type',   value: asset.equipmentType });
              if (asset.capacity)                extras.push({ label:'Capacity',         value: asset.capacity });
              if (asset.itemType)                extras.push({ label:'Item Type',        value: asset.itemType });
              if (asset.quantity)                extras.push({ label:'Quantity',         value: String(asset.quantity) });

              return (
                <Paper key={asset.id || idx} elevation={0} sx={{
                  border:'1px solid rgba(0,135,81,0.25)',
                  borderLeft:'4px solid #008751',
                  borderRadius:1,
                  overflow:'hidden',
                  background:'rgba(0,30,15,0.4)',
                  transition:'border-color 0.2s',
                  '&:hover': { borderLeftColor:'#00ff88' },
                }}>
                  {/* Header row */}
                  <Box sx={{ px:2.5, py:1.5, display:'flex', alignItems:'center', justifyContent:'space-between',
                    borderBottom:'1px solid rgba(0,135,81,0.15)', background:'rgba(0,135,81,0.08)',
                    flexWrap:'wrap', gap:1 }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:2, flexWrap:'wrap' }}>
                      <Typography sx={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#00ff88',
                        background:'rgba(0,255,136,0.08)', px:1, py:0.3, borderRadius:0.5,
                        border:'1px solid rgba(0,255,136,0.2)', letterSpacing:1 }}>
                        {assetId}
                      </Typography>
                      <Chip label={category} size="small"
                        sx={{ backgroundColor:'rgba(0,135,81,0.2)', color:'rgba(255,255,255,0.9)',
                          borderColor:'rgba(0,135,81,0.4)', border:'1px solid', fontSize:'0.7rem' }} />
                      <StatusChip status={status} />
                    </Box>
                    <Typography sx={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)' }}>
                      Record #{idx + 1} of {assets.length}
                    </Typography>
                  </Box>

                  {/* Body */}
                  <Box sx={{ p:2.5 }}>
                    {/* Description */}
                    <Typography sx={{ fontSize:'0.95rem', fontWeight:600, color:'#fff', mb:2, lineHeight:1.4 }}>
                      {desc}
                    </Typography>

                    {/* Main info grid */}
                    <Grid container spacing={2} sx={{ mb: extras.length > 0 || remarks ? 2 : 0 }}>
                      <Grid item xs={6} sm={4} md={2}>
                        <InfoCell label="State" value={state} />
                      </Grid>
                      <Grid item xs={6} sm={4} md={3}>
                        <InfoCell label="Location / Address" value={location} />
                      </Grid>
                      <Grid item xs={6} sm={4} md={3}>
                        <InfoCell label="Ministry" value={ministry} />
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <InfoCell label="Agency" value={agency} />
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <InfoCell label="Year Purchased" value={year} />
                      </Grid>
                    </Grid>

                    <Divider sx={{ borderColor:'rgba(255,255,255,0.06)', my:1.5 }} />

                    {/* Financial + condition */}
                    <Grid container spacing={2} sx={{ mb: extras.length > 0 || remarks ? 2 : 0 }}>
                      <Grid item xs={6} sm={4} md={2}>
                        <Box>
                          <Typography sx={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:0.5 }}>
                            Purchase Cost
                          </Typography>
                          <Typography sx={{ fontSize:'0.88rem', color:'#4caf50', fontWeight:700, mt:0.1 }}>
                            {cost}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <Box>
                          <Typography sx={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:0.5 }}>
                            Market Value
                          </Typography>
                          <Typography sx={{ fontSize:'0.88rem', color:'#2196f3', fontWeight:700, mt:0.1 }}>
                            {mktVal}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <InfoCell label="Condition" value={condition} />
                      </Grid>
                    </Grid>

                    {/* Category-specific extras */}
                    {extras.length > 0 && (
                      <>
                        <Divider sx={{ borderColor:'rgba(255,255,255,0.06)', my:1.5 }} />
                        <Typography sx={{ fontSize:'0.65rem', color:'rgba(0,255,136,0.6)', textTransform:'uppercase',
                          letterSpacing:1, mb:1 }}>Category-Specific Details</Typography>
                        <Grid container spacing={2}>
                          {extras.map((ex) => (
                            <Grid item xs={6} sm={4} md={3} key={ex.label}>
                              <InfoCell label={ex.label} value={ex.value} />
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    )}

                    {/* Remarks */}
                    {remarks && (
                      <>
                        <Divider sx={{ borderColor:'rgba(255,255,255,0.06)', my:1.5 }} />
                        <Typography sx={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:0.5 }}>
                          Remarks
                        </Typography>
                        <Typography sx={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.7)', mt:0.3, fontStyle:'italic' }}>
                          {remarks}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      );
    }

    // Valuation detailed table
    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;
      return (
        <Box>
          <SectionHeading icon={<TrendingDown />} title="Depreciation by Asset Type" />
          <TableContainer component={Paper} sx={{ mb:4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Asset Type','Acquisition Cost','Current Value','Depreciation','Loss %'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byType.map((row: any) => {
                  const pct = row.acquisitionCost > 0 ? ((row.depreciation / row.acquisitionCost) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={row.name} sx={{ '&:hover':{ backgroundColor:'rgba(0,135,81,0.05)' } }}>
                      <TableCell sx={{ fontWeight:600 }}>{row.name}</TableCell>
                      <TableCell>{formatCurrency(row.acquisitionCost)}</TableCell>
                      <TableCell sx={{ color:'#4caf50' }}>{formatCurrency(row.currentValue)}</TableCell>
                      <TableCell sx={{ color:'#ef5350' }}>-{formatCurrency(row.depreciation)}</TableCell>
                      <TableCell>
                        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                          <LinearProgress variant="determinate" value={parseFloat(pct)}
                            sx={{ width:60, height:6, borderRadius:3, backgroundColor:'rgba(255,255,255,0.1)',
                              '& .MuiLinearProgress-bar':{ backgroundColor: parseFloat(pct)>50 ? '#f44336' : parseFloat(pct)>25 ? '#ff9800' : '#4caf50' } }} />
                          <Typography sx={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.7)' }}>{pct}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {data.underutilizedAssets?.length > 0 && (
            <>
              <SectionHeading icon={<Warning />} title="Underutilized Assets" count={data.underutilizedAssets.length} />
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Asset Name','Category','State','Location','Acquisition Cost','Current Value','Value Loss'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.underutilizedAssets.map((asset: any) => (
                      <TableRow key={asset.id} sx={{ '&:hover':{ backgroundColor:'rgba(255,152,0,0.05)' } }}>
                        <TableCell sx={{ fontWeight:600 }}>{asset.name}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>{asset.state || '—'}</TableCell>
                        <TableCell>{asset.location || '—'}</TableCell>
                        <TableCell>{formatCurrency(asset.acquisitionCost)}</TableCell>
                        <TableCell sx={{ color:'#4caf50' }}>{formatCurrency(asset.currentValue)}</TableCell>
                        <TableCell sx={{ color:'#ef5350', fontWeight:600 }}>
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
          <SectionHeading icon={<Security />} title="Actions by Type" />
          <TableContainer component={Paper} sx={{ mb:4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase' }}>Action Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase' }}>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.actionsByType.map((row: any) => (
                  <TableRow key={row.action}>
                    <TableCell>{row.action}</TableCell>
                    <TableCell align="right"><Chip label={row.count} size="small" sx={{ backgroundColor:'rgba(0,135,81,0.2)', color:'#00ff88' }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <SectionHeading icon={<Assessment />} title="Top Users by Activity" />
          <TableContainer component={Paper} sx={{ mb:4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase' }}>User</TableCell>
                  <TableCell align="right" sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.actionsByUser.map((row: any) => (
                  <TableRow key={row.user}>
                    <TableCell>{row.user}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {data.flaggedAnomalies?.length > 0 && (
            <>
              <SectionHeading icon={<ErrorIcon />} title="Flagged Anomalies" count={data.flaggedAnomalies.length} />
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Type','Description','Severity','Recommendation'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.flaggedAnomalies.map((anomaly: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{anomaly.type}</TableCell>
                        <TableCell>{anomaly.description}</TableCell>
                        <TableCell>
                          <Chip label={anomaly.severity} size="small" sx={{
                            backgroundColor: anomaly.severity==='high' ? 'rgba(244,67,54,0.2)' : anomaly.severity==='medium' ? 'rgba(255,152,0,0.2)' : 'rgba(76,175,80,0.2)',
                            color: anomaly.severity==='high' ? '#ef5350' : anomaly.severity==='medium' ? '#ff9800' : '#4caf50',
                          }} />
                        </TableCell>
                        <TableCell sx={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.7)' }}>{anomaly.recommendation}</TableCell>
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
          <SectionHeading icon={<ShowChart />} title="Risk Distribution" />
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase' }}>Risk Level</TableCell>
                  <TableCell align="right" sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase' }}>Asset Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byRiskLevel.map((row: any) => (
                  <TableRow key={row.level}>
                    <TableCell>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <Box sx={{ width:10, height:10, borderRadius:'50%', backgroundColor:row.color }} />
                        {row.level}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }
    return null;
  };

  // ─── Breakdown tab (by ministry / location) ───────────────────────────────
  const renderBreakdownTab = () => {
    if (!generatedReport) return null;
    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      return (
        <Box>
          {/* By Category table */}
          <SectionHeading icon={<Category />} title="Assets by Category" count={data.byType.length} />
          <TableContainer component={Paper} sx={{ mb:4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Asset Category','Count','Total Purchase Value','% of Total'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byType.map((row: any) => {
                  const pct = data.totalValue > 0 ? ((row.value / data.totalValue) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={row.name} sx={{ '&:hover':{ backgroundColor:'rgba(0,135,81,0.05)' } }}>
                      <TableCell sx={{ fontWeight:600, display:'flex', alignItems:'center', gap:1 }}>
                        <Category sx={{ fontSize:14, color:'rgba(0,255,136,0.6)' }} /> {row.name}
                      </TableCell>
                      <TableCell><Chip label={row.count} size="small" sx={{ backgroundColor:'rgba(0,135,81,0.2)', color:'#00ff88' }} /></TableCell>
                      <TableCell sx={{ color:'#4caf50', fontWeight:600 }}>{formatCurrency(row.value)}</TableCell>
                      <TableCell>
                        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                          <LinearProgress variant="determinate" value={parseFloat(pct)}
                            sx={{ width:80, height:6, borderRadius:3, backgroundColor:'rgba(255,255,255,0.1)',
                              '& .MuiLinearProgress-bar':{ backgroundColor:'#008751' } }} />
                          <Typography sx={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.7)' }}>{pct}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* By Ministry (admin only) */}
          {!isMinistryAdmin && data.byMinistry?.length > 0 && (
            <>
              <SectionHeading icon={<AccountBalance />} title="Assets by Ministry" count={data.byMinistry.length} />
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Ministry','Asset Count','Total Value','% of Portfolio'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.byMinistry.map((row: any) => {
                      const pct = data.totalValue > 0 ? ((row.value / data.totalValue) * 100).toFixed(1) : '0.0';
                      return (
                        <TableRow key={row.name} sx={{ '&:hover':{ backgroundColor:'rgba(0,135,81,0.05)' } }}>
                          <TableCell sx={{ fontWeight:600 }}>{row.name}</TableCell>
                          <TableCell>{row.count}</TableCell>
                          <TableCell sx={{ color:'#4caf50' }}>{formatCurrency(row.value)}</TableCell>
                          <TableCell>
                            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                              <LinearProgress variant="determinate" value={parseFloat(pct)}
                                sx={{ width:80, height:6, borderRadius:3, backgroundColor:'rgba(255,255,255,0.1)',
                                  '& .MuiLinearProgress-bar':{ backgroundColor:'#1565c0' } }} />
                              <Typography sx={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.7)' }}>{pct}%</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      );
    }

    return (
      <Box sx={{ textAlign:'center', py:4 }}>
        <PieChart sx={{ fontSize:64, color:'rgba(255,255,255,0.2)', mb:2 }} />
        <Typography sx={{ color:'rgba(255,255,255,0.5)' }}>Breakdown view available for Asset Inventory reports.</Typography>
      </Box>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb:2 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}
            sx={{ color:'rgba(255,255,255,0.7)', '&:hover':{ color:'#00ff88', backgroundColor:'transparent' } }}>
            Back to Dashboard
          </Button>
        </Box>

        <Paper elevation={0} sx={{ p:3, mb:3,
          background:'linear-gradient(135deg,rgba(0,135,81,0.2),rgba(0,135,81,0.05))',
          border:'1px solid rgba(0,135,81,0.3)', borderLeft:'4px solid #008751' }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
            <Assessment sx={{ fontSize:40, color:'#00ff88' }} />
            <Box>
              <Typography variant="h4" sx={{ color:'#FFFFFF', fontWeight:700, fontSize:{ xs:'1.5rem', sm:'2rem' } }}>
                Report Generation
              </Typography>
              <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.7)' }}>
                Generate comprehensive, professionally detailed reports with full asset information, financial data, and export options
              </Typography>
            </Box>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb:3 }} onClose={() => setError(null)}>{error}</Alert>}

        {renderReportTypeCards()}
        {renderFiltersPanel()}

        {loading && (
          <Box sx={{ display:'flex', justifyContent:'center', py:4 }}>
            <CircularProgress sx={{ color:'#00ff88' }} />
          </Box>
        )}

        {!loading && generatedReport && renderReportPreview()}

        {!loading && !generatedReport && (
          <Paper sx={{ p:6, textAlign:'center', background:'linear-gradient(135deg,rgba(0,135,81,0.05),transparent)' }}>
            <Description sx={{ fontSize:80, color:'rgba(255,255,255,0.2)', mb:2 }} />
            <Typography variant="h6" sx={{ color:'rgba(255,255,255,0.7)', mb:1 }}>No Report Generated Yet</Typography>
            <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.5)' }}>
              Select a report type, configure filters, and click "Generate Report" to create a comprehensive analysis.
            </Typography>
          </Paper>
        )}
      </Container>
    </AppLayout>
  );
};

export default ReportsPage;
