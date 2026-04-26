import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Grid, Button, FormControl, InputLabel,
  Select, MenuItem, Chip, OutlinedInput, CircularProgress, Alert, Card,
  CardContent, Divider, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Tabs, Tab, LinearProgress, SelectChangeEvent,
  TextField, Collapse, Menu,
} from '@mui/material';
import {
  Assessment, Inventory, TrendingDown, Security, ShowChart, PictureAsPdf,
  TableChart, Download, Refresh, FilterList, Info, Warning, CheckCircle,
  Error as ErrorIcon, BarChart, PieChart, Description, ArrowBack,
  Category, AccountBalance, FiberManualRecord, LocationOn, KeyboardArrowDown,
  KeyboardArrowUp, Print, ArrowDropDown,
} from '@mui/icons-material';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  ReportType, ReportFilters, GeneratedReport, REPORT_TEMPLATES,
  AssetInventoryData, ValuationData, AuditData, UtilizationData, ReportInsight,
} from '@/types/report.types';
import {
  generateReport, getMinistriesForFilter, getUniqueLocations, formatCurrency,
} from '@/services/report.service';
import { ASSET_CATEGORIES } from '@/utils/constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Group assets by state (alphabetical), assets within each state sorted by category */
const groupByState = (assets: any[]): { state: string; assets: any[] }[] => {
  const map = new Map<string, any[]>();
  assets.forEach((a) => {
    const key = a.state || 'Unspecified State';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, items]) => ({
      state,
      assets: items.sort((a, b) => (a.category || '').localeCompare(b.category || '')),
    }));
};

/** Condition badge color */
const conditionStyle = (cond?: string | null) => {
  if (!cond) return { color: 'rgba(255,255,255,0.3)', bg: 'transparent', border: 'transparent' };
  const l = cond.toLowerCase();
  if (l.includes('excellent') || l.includes('good'))
    return { color: '#4caf50', bg: 'rgba(76,175,80,0.15)', border: 'rgba(76,175,80,0.3)' };
  if (l.includes('fair') || l.includes('average'))
    return { color: '#ff9800', bg: 'rgba(255,152,0,0.15)', border: 'rgba(255,152,0,0.3)' };
  if (l.includes('poor') || l.includes('bad') || l.includes('dilapidated'))
    return { color: '#f44336', bg: 'rgba(244,67,54,0.15)', border: 'rgba(244,67,54,0.3)' };
  return { color: '#90caf9', bg: 'rgba(144,202,249,0.12)', border: 'rgba(144,202,249,0.3)' };
};

/** Status badge */
const statusStyle = (status: string) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    approved:                { label: 'Approved',          color: '#4caf50', bg: 'rgba(76,175,80,0.15)'  },
    pending:                 { label: 'Pending',           color: '#ff9800', bg: 'rgba(255,152,0,0.15)'  },
    pending_ministry_review: { label: 'Ministry Review',   color: '#2196f3', bg: 'rgba(33,150,243,0.15)' },
    submitted_to_federal:    { label: 'Submitted Federal', color: '#9c27b0', bg: 'rgba(156,39,176,0.15)' },
    rejected:                { label: 'Rejected',          color: '#f44336', bg: 'rgba(244,67,54,0.15)'  },
  };
  return map[status] ?? { label: status, color: '#aaa', bg: 'rgba(255,255,255,0.08)' };
};

// ─── Table header cell ────────────────────────────────────────────────────────
const TH: React.FC<{ children: React.ReactNode; minWidth?: number; align?: 'left' | 'center' | 'right' }> =
  ({ children, minWidth = 120, align = 'left' }) => (
    <TableCell align={align} sx={{
      fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.8,
      color: 'rgba(255,255,255,0.95)', whiteSpace: 'nowrap', minWidth,
      background: 'rgba(0,80,45,0.95)', borderBottom: '2px solid rgba(0,255,136,0.25)',
      py: 1.2, px: 1.5, position: 'sticky', top: 0, zIndex: 2,
    }}>
      {children}
    </TableCell>
  );

// ─── Table data cell ──────────────────────────────────────────────────────────
const TD: React.FC<{ children: React.ReactNode; align?: 'left' | 'center' | 'right'; muted?: boolean; mono?: boolean }> =
  ({ children, align = 'left', muted, mono }) => (
    <TableCell align={align} sx={{
      fontSize: '0.78rem', py: 1, px: 1.5,
      color: muted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)',
      fontFamily: mono ? 'monospace' : 'inherit',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      verticalAlign: 'top',
    }}>
      {children ?? '—'}
    </TableCell>
  );

// ─── Section heading ──────────────────────────────────────────────────────────
const SectionHeading: React.FC<{ icon: React.ReactNode; title: string; count?: number }> = ({ icon, title, count }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, mt: 1 }}>
    <Box sx={{ color: '#00ff88' }}>{icon}</Box>
    <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 700, fontSize: '1rem' }}>{title}</Typography>
    {count !== undefined && (
      <Chip label={`${count} records`} size="small"
        sx={{ backgroundColor: 'rgba(0,255,136,0.1)', color: '#00ff88', borderColor: 'rgba(0,255,136,0.3)', border: '1px solid' }} />
    )}
  </Box>
);

// ─── State group panel ────────────────────────────────────────────────────────
const StateGroup: React.FC<{
  state: string; assets: any[]; serial: number;
  highlighted?: boolean; onClearHighlight?: () => void;
}> = ({ state, assets, serial, highlighted = false, onClearHighlight }) => {
  const [collapsed, setCollapsed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const stateTotal = assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0);
  const stateMktTotal = assets.reduce((s, a) => s + (Number(a.marketValue) || 0), 0);

  useEffect(() => {
    if (highlighted && boxRef.current) {
      setTimeout(() => {
        boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onClearHighlight?.();
      }, 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighted]);

  return (
    <Box ref={boxRef} sx={{ mb: 3, ...(highlighted && { outline: '2px solid rgba(33,150,243,0.55)', outlineOffset: 3, borderRadius: 1 }) }}>
      {/* State header bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.2, borderRadius: '6px 6px 0 0',
        background: 'linear-gradient(90deg, rgba(0,135,81,0.55) 0%, rgba(0,135,81,0.25) 100%)',
        border: '1px solid rgba(0,255,136,0.2)', borderBottom: 'none',
        cursor: 'pointer', userSelect: 'none',
      }} onClick={() => setCollapsed(!collapsed)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocationOn sx={{ fontSize: 18, color: '#00ff88' }} />
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', letterSpacing: 0.5 }}>
            {state.toUpperCase()}
          </Typography>
          <Chip label={`${assets.length} asset${assets.length !== 1 ? 's' : ''}`} size="small"
            sx={{ backgroundColor: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '0.68rem', height: 20 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Purchase Cost
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#4caf50' }}>
              {formatCurrency(stateTotal)}
            </Typography>
          </Box>
          {stateMktTotal > 0 && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Market Value
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#2196f3' }}>
                {formatCurrency(stateMktTotal)}
              </Typography>
            </Box>
          )}
          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.6)', p: 0.3 }}>
            {collapsed ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowUp fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {/* Table */}
      {!collapsed && (
        <TableContainer sx={{
          border: '1px solid rgba(0,255,136,0.15)', borderTop: 'none',
          borderRadius: '0 0 6px 6px', maxHeight: 520, overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 6, height: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,255,136,0.3)', borderRadius: 3 },
          '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(0,0,0,0.2)' },
        }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TH minWidth={40} align="center">#</TH>
                <TH minWidth={160}>Asset ID</TH>
                <TH minWidth={220}>Description</TH>
                <TH minWidth={140}>Category</TH>
                <TH minWidth={200}>Location / Address</TH>
                <TH minWidth={240}>Ministry</TH>
                <TH minWidth={220}>Agency</TH>
                <TH minWidth={220}>Department</TH>
                <TH minWidth={80} align="center">Year</TH>
                <TH minWidth={160} align="right">Purchase Cost (₦)</TH>
                <TH minWidth={160} align="right">Market Value (₦)</TH>
                <TH minWidth={120} align="center">Condition</TH>
                <TH minWidth={140} align="center">Status</TH>
                {/* Category-specific columns — shown when data exists in the group */}
                {assets.some((a) => a.landTitleType)          && <TH minWidth={140}>Land Title Type</TH>}
                {assets.some((a) => a.surveyPlanNumber)        && <TH minWidth={160}>Survey Plan No.</TH>}
                {assets.some((a) => a.landAcquisitionPurpose)  && <TH minWidth={220}>Acquisition Purpose</TH>}
                {assets.some((a) => a.equipmentType)           && <TH minWidth={160}>Equipment Type</TH>}
                {assets.some((a) => a.capacity)                && <TH minWidth={120}>Capacity</TH>}
                {assets.some((a) => a.itemType)                && <TH minWidth={160}>Item Type</TH>}
                
                {assets.some((a) => a.remarks)                 && <TH minWidth={220}>Remarks</TH>}
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset: any, i: number) => {
                const cond = asset.condition || asset.assetCondition || asset.currentCondition || asset.conditionStatus || null;
                const cs = conditionStyle(cond);
                const st = statusStyle(asset.status || 'pending');
                const rowBg = i % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)';

                return (
                  <TableRow key={asset.id || i} sx={{
                    backgroundColor: rowBg,
                    '&:hover': { backgroundColor: 'rgba(0,135,81,0.12)' },
                    '&:last-child td': { borderBottom: 'none' },
                  }}>
                    <TD align="center" muted>{serial + i + 1}</TD>

                    {/* Asset ID */}
                    <TD mono>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem',
                        color: '#00ff88', background: 'rgba(0,255,136,0.07)', px: 0.8, py: 0.2,
                        borderRadius: 0.5, border: '1px solid rgba(0,255,136,0.15)',
                        display: 'inline-block', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                        {asset.assetId || asset.id || '—'}
                      </Typography>
                    </TD>

                    {/* Description */}
                    <TD>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)',
                        lineHeight: 1.3, maxWidth: 220 }}>
                        {asset.description || asset.name || '—'}
                      </Typography>
                    </TD>

                    {/* Category */}
                    <TD>
                      <Chip label={asset.category || asset.type || '—'} size="small" sx={{
                        backgroundColor: 'rgba(0,135,81,0.2)', color: 'rgba(255,255,255,0.85)',
                        border: '1px solid rgba(0,135,81,0.35)', fontSize: '0.68rem', height: 20,
                      }} />
                    </TD>

                    {/* Location */}
                    <TD>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>
                        {asset.location || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </Typography>
                    </TD>

                    {/* Ministry */}
                    <TD>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>
                        {asset.ministry || asset.ministryName || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </Typography>
                    </TD>

                    {/* Agency */}
                    <TD>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>
                        {asset.agency || asset.agencyName || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </Typography>
                    </TD>

                    {/* Department */}
                    <TD>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>
                        {asset.department || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </Typography>
                    </TD>

                    {/* Year */}
                    <TD align="center">
                      {asset.purchasedDate?.year || asset.year || '—'}
                    </TD>

                    {/* Purchase Cost */}
                    <TD align="right">
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#4caf50', whiteSpace: 'nowrap' }}>
                        {asset.purchaseCost ? formatCurrency(Number(asset.purchaseCost)) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </Typography>
                    </TD>

                    {/* Market Value */}
                    <TD align="right">
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#2196f3', whiteSpace: 'nowrap' }}>
                        {asset.marketValue ? formatCurrency(Number(asset.marketValue)) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </Typography>
                    </TD>

                    {/* Condition */}
                    <TD align="center">
                      {cond ? (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4,
                          px: 0.8, py: 0.2, borderRadius: 0.8,
                          backgroundColor: cs.bg, border: `1px solid ${cs.border}` }}>
                          <FiberManualRecord sx={{ fontSize: 7, color: cs.color }} />
                          <Typography sx={{ fontSize: '0.68rem', color: cs.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {cond}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>—</Typography>
                      )}
                    </TD>

                    {/* Status */}
                    <TD align="center">
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4,
                        px: 0.8, py: 0.2, borderRadius: 0.8,
                        backgroundColor: st.bg, border: `1px solid ${st.color}40` }}>
                        <FiberManualRecord sx={{ fontSize: 7, color: st.color }} />
                        <Typography sx={{ fontSize: '0.68rem', color: st.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </Typography>
                      </Box>
                    </TD>

                    {/* Dynamic category-specific columns */}
                    {assets.some((a) => a.landTitleType)         && <TD>{asset.landTitleType || null}</TD>}
                    {assets.some((a) => a.surveyPlanNumber)       && <TD mono>{asset.surveyPlanNumber || null}</TD>}
                    {assets.some((a) => a.landAcquisitionPurpose) && <TD>{asset.landAcquisitionPurpose || null}</TD>}
                    {assets.some((a) => a.equipmentType)          && <TD>{asset.equipmentType || null}</TD>}
                    {assets.some((a) => a.capacity)               && <TD>{asset.capacity || null}</TD>}
                    {assets.some((a) => a.itemType)               && <TD>{asset.itemType || null}</TD>}
                    
                    {assets.some((a) => a.remarks)                && <TD>{asset.remarks || null}</TD>}
                  </TableRow>
                );
              })}

              {/* State subtotal row */}
              <TableRow sx={{ backgroundColor: 'rgba(0,135,81,0.1)', borderTop: '1px solid rgba(0,255,136,0.15)' }}>
                <TableCell colSpan={9} sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,255,136,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {state} — Sub-total ({assets.length} assets)
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#4caf50', whiteSpace: 'nowrap' }}>
                    {formatCurrency(stateTotal)}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#2196f3', whiteSpace: 'nowrap' }}>
                    {stateMktTotal > 0 ? formatCurrency(stateMktTotal) : '—'}
                  </Typography>
                </TableCell>
                <TableCell colSpan={20} sx={{ borderBottom: 'none' }} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const isAdmin = userData?.role === 'admin';
  const isMinistryAdmin = userData?.role === 'ministry-admin';
  const isApprover = userData?.role === 'agency-approver';
  // Approvers are scoped to their ministry just like ministry-admins
  const isScopedToMinistry = isMinistryAdmin || isApprover;

  const [selectedReportType, setSelectedReportType] = useState<ReportType>('asset_inventory');
  const [filters, setFilters] = useState<ReportFilters>({
    reportType: 'asset_inventory', ministryIds: [], assetTypes: [], statuses: [], locations: [],
    includeGraphs: true, includeDetailedTables: true, includeSummaryInsights: true,
  });
  const [singleAssetType, setSingleAssetType] = useState('');
  const [singleStatus, setSingleStatus]       = useState('');
  const [dateFrom, setDateFrom]               = useState<Date | null>(null);
  const [dateTo, setDateTo]                   = useState<Date | null>(null);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [activeTab, setActiveTab]             = useState(0);
  const [highlightedState, setHighlightedState] = useState<string | null>(null);
  const [exportAnchorEl, setExportAnchorEl]   = useState<null | HTMLElement>(null);
  const [mvExpandedCats, setMvExpandedCats]   = useState<Set<string>>(new Set());
  const [ministries, setMinistries]           = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations]             = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoadingFilters(true);
        const [m, l] = await Promise.all([
          getMinistriesForFilter(),
          getUniqueLocations(isScopedToMinistry ? userData?.ministryId : undefined),
        ]);
        setMinistries(m); setLocations(l);
      } catch (e) { console.error(e); }
      finally { setLoadingFilters(false); }
    })();
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

  // ✅ Correct signature: generateReport(filters, email, isMinistryAdmin, ministryId?, ministryName?)
  const handleGenerateReport = async () => {
    setLoading(true); setError(null);
    try {
      const report = await generateReport(
        { ...filters, assetTypes: singleAssetType ? [singleAssetType] : [], statuses: singleStatus ? [singleStatus] : [], dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
        currentUser?.email || '',
        isScopedToMinistry,
        userData?.ministryId,
        userData?.agencyName
      );
      setGeneratedReport(report);
      setActiveTab(0);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally { setLoading(false); }
  };

  // ─── PDF Export ───────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!generatedReport) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pw = doc.internal.pageSize.getWidth();

    // Cover header
    doc.setFillColor(0, 80, 40); doc.rect(0, 0, pw, 38, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('FEDERAL REPUBLIC OF NIGERIA', pw / 2, 11, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Government Asset Management System (GAMS)', pw / 2, 19, { align: 'center' });
    doc.setFontSize(10);
    doc.text(generatedReport.title.toUpperCase(), pw / 2, 27, { align: 'center' });
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${generatedReport.generatedAt.toLocaleString()}  |  By: ${generatedReport.generatedBy}${generatedReport.ministryName ? `  |  ${generatedReport.ministryName}` : ''}`, pw / 2, 35, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      const groups = groupByState(data.assets || []);

      let startY = 44;

      groups.forEach((group, gi) => {
        if (gi > 0) { doc.addPage(); startY = 14; }

        // State banner
        doc.setFillColor(0, 100, 55);
        doc.rect(0, startY, pw, 8, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(`${group.state.toUpperCase()}  —  ${group.assets.length} Asset${group.assets.length !== 1 ? 's' : ''}`, 10, startY + 5.5);
        const stateTotal = group.assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0);
        doc.text(`Total Purchase Cost: ${formatCurrency(stateTotal)}`, pw - 10, startY + 5.5, { align: 'right' });
        doc.setTextColor(0, 0, 0);

        // Determine which optional columns exist in this group
        const hasLandTitle    = group.assets.some((a) => a.landTitleType);
        const hasSurveyPlan   = group.assets.some((a) => a.surveyPlanNumber);
        const hasAcqPurpose   = group.assets.some((a) => a.landAcquisitionPurpose);
        const hasEquipType    = group.assets.some((a) => a.equipmentType);
        const hasCapacity     = group.assets.some((a) => a.capacity);
        const hasItemType     = group.assets.some((a) => a.itemType);
        const hasQty          = group.assets.some((a) => a.quantity != null);
        const hasRemarks      = group.assets.some((a) => a.remarks);

        const head: string[] = [
          '#', 'Asset ID', 'Description', 'Category', 'Location / Address',
          'Ministry', 'Agency', 'Department', 'Year', 'Purchase Cost (₦)', 'Market Value (₦)', 'Condition', 'Status',
        ];
        if (hasLandTitle)  head.push('Land Title');
        if (hasSurveyPlan) head.push('Survey Plan No.');
        if (hasAcqPurpose) head.push('Acquisition Purpose');
        if (hasEquipType)  head.push('Equipment Type');
        if (hasCapacity)   head.push('Capacity');
        if (hasItemType)   head.push('Item Type');
        if (hasQty)        head.push('Qty');
        if (hasRemarks)    head.push('Remarks');

        const body = group.assets.map((a: any, idx: number) => {
          const row = [
            String(idx + 1),
            a.assetId || a.id || '—',
            a.description || a.name || '—',
            a.category || a.type || '—',
            a.location || '—',
            a.ministry || a.ministryName || '—',
            a.agency || a.agencyName || '—',
            a.department || '—',
            String(a.purchasedDate?.year || a.year || '—'),
            a.purchaseCost ? Number(a.purchaseCost).toLocaleString() : '—',
            a.marketValue  ? Number(a.marketValue).toLocaleString()  : '—',
            a.condition || a.assetCondition || a.currentCondition || a.conditionStatus || '—',
            (statusStyle(a.status || 'pending')).label,
          ];
          if (hasLandTitle)  row.push(a.landTitleType || '—');
          if (hasSurveyPlan) row.push(a.surveyPlanNumber || '—');
          if (hasAcqPurpose) row.push(a.landAcquisitionPurpose || '—');
          if (hasEquipType)  row.push(a.equipmentType || '—');
          if (hasCapacity)   row.push(a.capacity || '—');
          if (hasItemType)   row.push(a.itemType || '—');
          if (hasQty)        row.push(a.quantity != null ? String(a.quantity) : '—');
          if (hasRemarks)    row.push(a.remarks || '—');
          return row;
        });

        // Sub-total footer row
        const subtotalRow = new Array(head.length).fill('');
        subtotalRow[0] = 'SUBTOTAL';
        subtotalRow[9] = formatCurrency(stateTotal);

        autoTable(doc, {
          startY: startY + 10,
          head: [head],
          body: [...body, subtotalRow],
          theme: 'grid',
          headStyles: { fillColor: [0, 60, 30], textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold', cellPadding: 2 },
          bodyStyles: { fontSize: 6.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
          alternateRowStyles: { fillColor: [242, 250, 245] },
          styles: { overflow: 'linebreak', minCellWidth: 12 },
          didParseCell(data) {
            // Subtotal row style
            if (data.row.index === body.length) {
              data.cell.styles.fillColor = [0, 100, 55];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });

        startY = (doc as any).lastAutoTable.finalY + 6;
      });

      // Grand total page
      doc.addPage();
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('GRAND SUMMARY', 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [['State', 'Asset Count', 'Total Purchase Cost (₦)', 'Total Market Value (₦)']],
        body: groupByState(data.assets || []).map((g) => [
          g.state,
          String(g.assets.length),
          formatCurrency(g.assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0)),
          formatCurrency(g.assets.reduce((s, a) => s + (Number(a.marketValue) || 0), 0)),
        ]),
        foot: [[
          'GRAND TOTAL',
          String(data.totalAssets),
          formatCurrency(data.assets?.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0) || 0),
          formatCurrency(data.assets?.reduce((s, a) => s + (Number(a.marketValue) || 0), 0) || 0),
        ]],
        theme: 'grid',
        headStyles: { fillColor: [0, 80, 40], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        footStyles: { fillColor: [0, 50, 25], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [242, 250, 245] },
      });
    }

    // Page numbers
    const pages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i); doc.setFontSize(6.5); doc.setTextColor(150, 150, 150);
      doc.text(`GAMS CONFIDENTIAL  |  Page ${i} of ${pages}  |  ${new Date().toLocaleDateString()}`,
        doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
    }

    doc.save(`GAMS_${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  // ─── Excel Export ─────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!generatedReport) return;
    const wb = XLSX.utils.book_new();

    // Cover sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['FEDERAL REPUBLIC OF NIGERIA'], ['GOVERNMENT ASSET MANAGEMENT SYSTEM (GAMS)'], [''],
      ['Report Title', generatedReport.title],
      ['Generated At', generatedReport.generatedAt.toLocaleString()],
      ['Generated By', generatedReport.generatedBy],
      ...(generatedReport.ministryName ? [['Ministry/Agency', generatedReport.ministryName]] : []),
    ]), 'Cover');

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      const groups = groupByState(data.assets || []);

      // One sheet per state
      groups.forEach((group) => {
        const headers = [
          '#', 'Asset ID', 'Description', 'Category', 'State', 'Location / Address',
          'Ministry', 'Agency', 'Department', 'Year Purchased', 'Purchase Cost (₦)', 'Market Value (₦)',
          'Condition', 'Status', 'Land Title Type', 'Survey Plan No.', 'Land Acquisition Purpose',
          'Equipment Type', 'Capacity', 'Item Type', 'Quantity', 'Remarks',
        ];
        const rows = group.assets.map((a: any, idx: number) => [
          idx + 1,
          a.assetId || a.id || '',
          a.description || a.name || '',
          a.category || a.type || '',
          a.state || '',
          a.location || '',
          a.ministry || a.ministryName || '',
          a.agency || a.agencyName || '',
          a.department || '',
          a.purchasedDate?.year || a.year || '',
          a.purchaseCost || '',
          a.marketValue || '',
          a.condition || a.assetCondition || a.currentCondition || a.conditionStatus || '',
          (statusStyle(a.status || 'pending')).label,
          a.landTitleType || '',
          a.surveyPlanNumber || '',
          a.landAcquisitionPurpose || '',
          a.equipmentType || '',
          a.capacity || '',
          a.itemType || '',
          a.quantity ?? '',
          a.remarks || '',
        ]);

        // Subtotal row
        const subtotal = new Array(headers.length).fill('');
        subtotal[0] = 'SUBTOTAL';
        subtotal[10] = group.assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0);
        subtotal[11] = group.assets.reduce((s, a) => s + (Number(a.marketValue) || 0), 0);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, subtotal]);
        ws['!cols'] = headers.map((_, i) => ({ wch: [5,18,35,18,16,32,30,24,24,12,18,18,14,18,16,18,35,18,14,18,8,30][i] ?? 14 }));
        // Safe sheet name (max 31 chars)
        const sheetName = group.state.substring(0, 28).replace(/[:\\/?*[\]]/g, '');
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Grand Summary sheet
      const summaryHeaders = ['State', 'Asset Count', 'Total Purchase Cost (₦)', 'Total Market Value (₦)'];
      const summaryRows = groups.map((g) => [
        g.state,
        g.assets.length,
        g.assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0),
        g.assets.reduce((s, a) => s + (Number(a.marketValue) || 0), 0),
      ]);
      const grandTotal = [
        'GRAND TOTAL',
        data.totalAssets,
        data.assets?.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0) || 0,
        data.assets?.reduce((s, a) => s + (Number(a.marketValue) || 0), 0) || 0,
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows, grandTotal]);
      summaryWs['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 26 }, { wch: 26 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Grand Summary');
    }

    XLSX.writeFile(wb, `GAMS_${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
  };

  // ─── CSV Export ───────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!generatedReport) return;
    let csv = `"${generatedReport.title}"\n"Generated","${generatedReport.generatedAt.toLocaleString()}"\n"By","${generatedReport.generatedBy}"\n\n`;
    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      const groups = groupByState(data.assets || []);
      groups.forEach((group) => {
        csv += `\n"=== ${group.state.toUpperCase()} (${group.assets.length} assets) ==="\n`;
        csv += '#,Asset ID,Description,Category,State,Location,Ministry,Agency,Department,Year,Purchase Cost,Market Value,Condition,Status,Land Title,Survey Plan,Acq Purpose,Equip Type,Capacity,Item Type,Qty,Remarks\n';
        group.assets.forEach((a: any, i: number) => {
          csv += `${i+1},"${a.assetId||a.id||''}","${a.description||a.name||''}","${a.category||''}","${a.state||''}","${a.location||''}","${a.ministry||a.ministryName||''}","${a.agency||a.agencyName||''}","${a.department||''}","${a.purchasedDate?.year||''}",${a.purchaseCost||0},${a.marketValue||0},"${a.condition||a.assetCondition||a.currentCondition||a.conditionStatus||''}","${(statusStyle(a.status||'pending')).label}","${a.landTitleType||''}","${a.surveyPlanNumber||''}","${a.landAcquisitionPurpose||''}","${a.equipmentType||''}","${a.capacity||''}","${a.itemType||''}","${a.quantity??''}","${a.remarks||''}"\n`;
        });
      });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GAMS_${generatedReport.title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
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

  // ─── Report type cards ─────────────────────────────────────────────────────────
  const renderReportTypeCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {(Object.keys(REPORT_TEMPLATES) as ReportType[]).filter((t) => t !== 'custom').map((type) => {
        const template = REPORT_TEMPLATES[type];
        const isSelected = selectedReportType === type;
        const icons: Record<string, React.ReactNode> = {
          Inventory: <Inventory sx={{ fontSize: 32 }} />, TrendingDown: <TrendingDown sx={{ fontSize: 32 }} />,
          Security: <Security sx={{ fontSize: 32 }} />, Assessment: <ShowChart sx={{ fontSize: 32 }} />,
        };
        return (
          <Grid item xs={12} sm={6} md={3} key={type}>
            <Card sx={{ cursor: 'pointer', height: '100%', transition: 'all 0.3s',
              border: isSelected ? '2px solid #00ff88' : '1px solid rgba(0,135,81,0.3)',
              background: isSelected ? 'linear-gradient(135deg,rgba(0,135,81,0.3),rgba(0,135,81,0.1))' : 'transparent',
              '&:hover': { borderColor: '#00ff88', transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,255,136,0.2)' },
            }} onClick={() => handleReportTypeChange(type)}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, color: isSelected ? '#00ff88' : 'rgba(255,255,255,0.7)' }}>
                  {icons[template.icon] ?? <Assessment sx={{ fontSize: 32 }} />}
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'inherit' }}>
                    {template.title.replace(' Report', '')}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                  {template.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  // ─── Filters panel ─────────────────────────────────────────────────────────────
  const renderFiltersPanel = () => (
    <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg,rgba(0,135,81,0.1),rgba(0,135,81,0.05))', borderLeft: '4px solid #008751' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FilterList sx={{ color: '#00ff88' }} />
        <Typography variant="h6" sx={{ color: '#00ff88' }}>Report Filters</Typography>
      </Box>
      <Grid container spacing={2}>
        {isAdmin && (
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Ministries</InputLabel>
              <Select multiple value={filters.ministryIds || []} onChange={handleMultiSelectChange('ministryIds')}
                input={<OutlinedInput label="Ministries" />}
                renderValue={(sel) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(sel as string[]).map((id) => { const m = ministries.find((x) => x.id === id); return <Chip key={id} label={m?.name || id} size="small" sx={{ backgroundColor: 'rgba(0,135,81,0.3)' }} />; })}
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
            <Select value={singleAssetType} onChange={(e) => setSingleAssetType(e.target.value as string)} input={<OutlinedInput label="Asset Type" />}>
              <MenuItem value="">All Asset Types</MenuItem>
              {ASSET_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={isAdmin ? 4 : 6}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select value={singleStatus} onChange={(e) => setSingleStatus(e.target.value as string)} input={<OutlinedInput label="Status" />}>
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="pending_ministry_review">Ministry Review</MenuItem>
              <MenuItem value="submitted_to_federal">Submitted to Federal</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Locations</InputLabel>
            <Select multiple value={filters.locations || []} onChange={handleMultiSelectChange('locations')}
              input={<OutlinedInput label="Locations" />}
              renderValue={(sel) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(sel as string[]).map((v) => <Chip key={v} label={v} size="small" sx={{ backgroundColor: 'rgba(0,135,81,0.3)' }} />)}
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
            InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField label="To Date" type="date" size="small" fullWidth
            value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
            onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : null)}
            InputLabelProps={{ shrink: true }} />
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => {
          setFilters({ reportType: selectedReportType, ministryIds: [], assetTypes: [], statuses: [], locations: [], includeGraphs: true, includeDetailedTables: true, includeSummaryInsights: true });
          setSingleAssetType(''); setSingleStatus(''); setDateFrom(null); setDateTo(null);
        }}>Clear Filters</Button>
        <Button variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Assessment />}
          onClick={handleGenerateReport} disabled={loading} sx={{ minWidth: 180 }}>
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </Box>
    </Paper>
  );

  // ─── Summary tab ───────────────────────────────────────────────────────────────
  const [expandedStateRows, setExpandedStateRows] = useState<Set<string>>(new Set());

  const toggleStateRow = (state: string) => {
    setExpandedStateRows((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  };

  const renderSummaryTab = () => {
    if (!generatedReport) return null;
    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      const groups = groupByState(data.assets || []);
      return (
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: 'Total Assets',        value: data.totalAssets.toLocaleString(),        grad: 'linear-gradient(135deg,#008751,#006038)' },
              { label: 'States Covered',       value: groups.length.toString(),                 grad: 'linear-gradient(135deg,#1565c0,#0d47a1)' },
              { label: 'Total Value',          value: formatCurrency(data.totalValue),           grad: 'linear-gradient(135deg,#2e7d32,#1b5e20)' },
              { label: 'Asset Categories',     value: data.byType.length.toString(),             grad: 'linear-gradient(135deg,#b8860b,#8b6914)' },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.label}>
                <Card sx={{ background: card.grad }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</Typography>
                    <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mt: 0.5, fontSize: { xs: '1.4rem', sm: '1.8rem' } }}>{card.value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* State summary table */}
          <SectionHeading icon={<LocationOn />} title="Summary by State" count={groups.length} />
          <TableContainer component={Paper} sx={{ mb: 4, border: '1px solid rgba(0,135,81,0.2)' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TH minWidth={220}>State</TH>
                  <TH minWidth={200} align="center">Total Market Value</TH>
                  <TH minWidth={260} align="center">{''}</TH>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((group, idx) => {
                  const gTotal  = group.assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0);
                  const gMkt    = group.assets.reduce((s, a) => s + (Number(a.marketValue)  || 0), 0);
                  const isExpanded = expandedStateRows.has(group.state);

                  // Build per-category breakdown for this state
                  const catMap = new Map<string, { count: number; purchaseCost: number; marketValue: number }>();
                  group.assets.forEach((a) => {
                    const key = a.category || a.type || 'Uncategorized';
                    const existing = catMap.get(key) || { count: 0, purchaseCost: 0, marketValue: 0 };
                    catMap.set(key, {
                      count: existing.count + 1,
                      purchaseCost: existing.purchaseCost + (Number(a.purchaseCost) || 0),
                      marketValue: existing.marketValue + (Number(a.marketValue) || 0),
                    });
                  });
                  const catBreakdown = Array.from(catMap.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([name, stats]) => ({ name, ...stats }));

                  return (
                    <React.Fragment key={group.state}>
                      <TableRow sx={{ backgroundColor: idx % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)', '&:hover': { backgroundColor: 'rgba(0,135,81,0.1)' } }}>
                        <TD>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <LocationOn sx={{ fontSize: 13, color: '#00ff88' }} />
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{group.state}</Typography>
                            <Chip label={group.assets.length} size="small" sx={{ backgroundColor: 'rgba(0,135,81,0.2)', color: '#00ff88', fontSize: '0.65rem', height: 18, ml: 0.5 }} />
                          </Box>
                        </TD>
                        <TD align="center">
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#2196f3' }}>
                            {gMkt > 0 ? formatCurrency(gMkt) : '—'}
                          </Typography>
                        </TD>
                        <TableCell sx={{ py: 0.5, px: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Tooltip title={isExpanded ? 'Hide category breakdown' : 'View asset category summary'}>
                              <Button
                                size="small"
                                variant="outlined"
                                endIcon={isExpanded ? <KeyboardArrowUp sx={{ fontSize: 14 }} /> : <KeyboardArrowDown sx={{ fontSize: 14 }} />}
                                onClick={() => toggleStateRow(group.state)}
                                sx={{
                                  fontSize: '0.65rem', py: 0.3, px: 1, whiteSpace: 'nowrap',
                                  borderColor: isExpanded ? 'rgba(0,255,136,0.6)' : 'rgba(0,255,136,0.25)',
                                  color: isExpanded ? '#00ff88' : 'rgba(0,255,136,0.7)',
                                  backgroundColor: isExpanded ? 'rgba(0,255,136,0.08)' : 'transparent',
                                  '&:hover': { borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.1)', color: '#00ff88' },
                                  minWidth: 'unset',
                                }}
                              >
                                {isExpanded ? 'Hide' : 'View Categories'}
                              </Button>
                            </Tooltip>
                            
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* Expandable category breakdown row */}
                      <TableRow>
                        <TableCell colSpan={3} sx={{ p: 0, borderBottom: isExpanded ? '2px solid rgba(0,255,136,0.2)' : 'none' }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{
                              mx: 2, my: 1.5, borderRadius: 1,
                              border: '1px solid rgba(0,255,136,0.2)',
                              background: 'linear-gradient(135deg,rgba(0,80,40,0.35),rgba(0,40,20,0.5))',
                              overflow: 'hidden',
                            }}>
                              {/* Sub-header */}
                              <Box sx={{
                                px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                                background: 'rgba(0,135,81,0.25)', borderBottom: '1px solid rgba(0,255,136,0.15)',
                              }}>
                                <Category sx={{ fontSize: 14, color: '#00ff88' }} />
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#00ff88', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                  {group.state} — Asset Category Summary
                                </Typography>
                                <Chip
                                  label={`${catBreakdown.length} ${catBreakdown.length === 1 ? 'category' : 'categories'}`}
                                  size="small"
                                  sx={{ backgroundColor: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '0.65rem', height: 18 }}
                                />
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => { setHighlightedState(group.state); setActiveTab(1); }}
                                  sx={{
                                    ml: 'auto', fontSize: '0.62rem', py: 0.3, px: 1.2,
                                    backgroundColor: 'rgba(33,150,243,0.25)',
                                    border: '1px solid rgba(33,150,243,0.5)',
                                    color: '#2196f3',
                                    boxShadow: 'none',
                                    '&:hover': { backgroundColor: 'rgba(33,150,243,0.4)', boxShadow: 'none' },
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  View All Assets in {group.state} →
                                </Button>
                              </Box>

                              {/* Category table */}
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ backgroundColor: 'rgba(0,60,30,0.6)' }}>
                                    {['Asset Category', 'Total Assets', 'Total Purchase Cost', 'Total Market Value', '% of State'].map((h) => (
                                      <TableCell key={h} sx={{
                                        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: 0.6, color: 'rgba(255,255,255,0.75)',
                                        py: 0.8, px: 1.5, borderBottom: '1px solid rgba(0,255,136,0.1)',
                                        whiteSpace: 'nowrap',
                                      }}>
                                        {h}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {catBreakdown.map((cat, ci) => {
                                    const catPct = gTotal > 0 ? ((cat.purchaseCost / gTotal) * 100).toFixed(1) : '0.0';
                                    return (
                                      <TableRow key={cat.name} sx={{
                                        backgroundColor: ci % 2 === 0 ? 'rgba(0,30,15,0.5)' : 'rgba(0,50,25,0.3)',
                                        '&:hover': { backgroundColor: 'rgba(0,135,81,0.15)' },
                                        '&:last-child td': { borderBottom: 'none' },
                                      }}>
                                        <TableCell sx={{ py: 0.8, px: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Category sx={{ fontSize: 12, color: 'rgba(0,255,136,0.5)' }} />
                                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                                              {cat.name}
                                            </Typography>
                                          </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 0.8, px: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                          <Chip
                                            label={cat.count}
                                            size="small"
                                            sx={{ backgroundColor: 'rgba(0,135,81,0.3)', color: '#00ff88', fontSize: '0.72rem', fontWeight: 700, minWidth: 32 }}
                                          />
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#4caf50', whiteSpace: 'nowrap' }}>
                                            {formatCurrency(cat.purchaseCost)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#2196f3', whiteSpace: 'nowrap' }}>
                                            {cat.marketValue > 0 ? formatCurrency(cat.marketValue) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 0.8, px: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                            <LinearProgress
                                              variant="determinate"
                                              value={parseFloat(catPct)}
                                              sx={{
                                                width: 50, height: 4, borderRadius: 2,
                                                backgroundColor: 'rgba(255,255,255,0.08)',
                                                '& .MuiLinearProgress-bar': { backgroundColor: '#00aa66' },
                                              }}
                                            />
                                            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', minWidth: 30 }}>
                                              {catPct}%
                                            </Typography>
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}

                                  {/* Category subtotal */}
                                  <TableRow sx={{ backgroundColor: 'rgba(0,100,50,0.25)', borderTop: '1px solid rgba(0,255,136,0.12)' }}>
                                    <TableCell sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,255,136,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        State Total
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                                      <Chip label={group.assets.length} size="small" sx={{ backgroundColor: 'rgba(0,255,136,0.2)', color: '#00ff88', fontWeight: 700, fontSize: '0.72rem' }} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#4caf50', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(gTotal)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#2196f3', whiteSpace: 'nowrap' }}>
                                        {gMkt > 0 ? formatCurrency(gMkt) : '—'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ borderBottom: 'none' }} />
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {/* Grand total market value row */}
                {(() => {
                  const grandMV = groups.reduce((s, g) => s + g.assets.reduce((as, a) => as + (Number(a.marketValue) || 0), 0), 0);
                  return (
                    <TableRow sx={{ backgroundColor: 'rgba(0,100,50,0.2)', borderTop: '2px solid rgba(0,255,136,0.2)' }}>
                      <TableCell sx={{ py: 1, px: 1.5, fontWeight: 700, color: 'rgba(0,255,136,0.9)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 0.5, borderBottom: 'none' }}>
                        Grand Total — {groups.reduce((s, g) => s + g.assets.length, 0)} Assets
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1, px: 1.5, fontWeight: 700, color: '#2196f3', fontSize: '0.92rem', whiteSpace: 'nowrap', borderBottom: 'none' }}>
                        {formatCurrency(grandMV)}
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none' }} />
                    </TableRow>
                  );
                })()}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Category breakdown */}
          <SectionHeading icon={<Category />} title="Category Breakdown" count={data.byType.length} />
          <Grid container spacing={1.5}>
            {data.byType.map((item: any) => (
              <Grid item xs={12} sm={6} md={4} key={item.name}>
                <Box sx={{ p: 1.5, borderRadius: 1, border: '1px solid rgba(0,135,81,0.25)', background: 'rgba(0,135,81,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Category sx={{ fontSize: 14, color: '#00ff88' }} />
                    <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>{item.name}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{item.count}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{formatCurrency(item.value)}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      );
    }

    // Valuation summary
    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;
      return (
        <Grid container spacing={3}>
          {[
            { label: 'Acquisition Cost',   value: formatCurrency(data.totalAcquisitionCost), grad: 'linear-gradient(135deg,#008751,#006038)' },
            { label: 'Current Value',      value: formatCurrency(data.totalCurrentValue),    grad: 'linear-gradient(135deg,#2e7d32,#1b5e20)' },
            { label: 'Total Depreciation', value: formatCurrency(data.totalDepreciation),    grad: 'linear-gradient(135deg,#c62828,#8e0000)' },
            { label: 'Depreciation Rate',  value: `${data.depreciationRate.toFixed(1)}%`,   grad: 'linear-gradient(135deg,#b8860b,#8b6914)' },
          ].map((c) => (
            <Grid item xs={12} md={3} key={c.label}>
              <Card sx={{ background: c.grad }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</Typography>
                  <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700, mt: 0.5 }}>{c.value}</Typography>
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
            { label: 'Total Actions',   value: data.totalActions.toLocaleString(),       grad: 'linear-gradient(135deg,#008751,#006038)' },
            { label: 'Approval Rate',   value: `${data.approvalRate.toFixed(1)}%`,       grad: 'linear-gradient(135deg,#2e7d32,#1b5e20)' },
            { label: 'Rejection Rate',  value: `${data.rejectionRate.toFixed(1)}%`,      grad: 'linear-gradient(135deg,#c62828,#8e0000)' },
            { label: 'Anomalies Found', value: data.flaggedAnomalies.length.toString(),  grad: 'linear-gradient(135deg,#b8860b,#8b6914)' },
          ].map((c) => (
            <Grid item xs={12} md={3} key={c.label}>
              <Card sx={{ background: c.grad }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</Typography>
                  <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mt: 0.5 }}>{c.value}</Typography>
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
            { label: 'Avg Utilization', value: `${data.averageUtilization}%`,    prog: data.averageUtilization,    grad: 'linear-gradient(135deg,#008751,#006038)' },
            { label: 'Avg Condition',   value: `${data.averageConditionScore}%`, prog: data.averageConditionScore, grad: 'linear-gradient(135deg,#2e7d32,#1b5e20)' },
            { label: 'Avg Risk Score',  value: `${data.averageRiskScore}`,       prog: data.averageRiskScore,      grad: 'linear-gradient(135deg,#c62828,#8e0000)' },
          ].map((c) => (
            <Grid item xs={12} md={3} key={c.label}>
              <Card sx={{ background: c.grad }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</Typography>
                  <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mt: 0.5 }}>{c.value}</Typography>
                  <LinearProgress variant="determinate" value={c.prog}
                    sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { backgroundColor: 'rgba(255,255,255,0.8)' } }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg,#b8860b,#8b6914)' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>Potential Savings</Typography>
                <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700, mt: 0.5 }}>{formatCurrency(data.potentialSavings)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      );
    }
    return null;
  };

  // ─── STATE-GROUPED TABLE REGISTER ─────────────────────────────────────────────
  const renderDetailedRegisterTab = () => {
    if (!generatedReport) return null;

    if (generatedReport.type === 'asset_inventory') {
      const data = generatedReport.data as AssetInventoryData;
      const groups = groupByState(data.assets || []);

      if (groups.length === 0) {
        return (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Inventory sx={{ fontSize: 60, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>No asset records found. Try broadening your filters.</Typography>
          </Box>
        );
      }

      let globalSerial = 0;
      return (
        <Box>
          {/* Legend */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', mr: 0.5 }}>Condition:</Typography>
            {[['Excellent/Good','#4caf50'], ['Fair/Average','#ff9800'], ['Poor/Bad','#f44336']].map(([l, c]) => (
              <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FiberManualRecord sx={{ fontSize: 9, color: c }} />
                <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>{l}</Typography>
              </Box>
            ))}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <KeyboardArrowUp sx={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }} />
              <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Click state header to collapse/expand</Typography>
            </Box>
          </Box>

          {/* State groups */}
          {groups.map((group) => {
            const serial = globalSerial;
            globalSerial += group.assets.length;
            return (
              <StateGroup
                key={group.state}
                state={group.state}
                assets={group.assets}
                serial={serial}
                highlighted={group.state === highlightedState}
                onClearHighlight={() => setHighlightedState(null)}
              />
            );
          })}

          {/* Grand total footer */}
          <Box sx={{ mt: 2, p: 2, borderRadius: 1, background: 'linear-gradient(90deg,rgba(0,135,81,0.3),rgba(0,135,81,0.15))', border: '1px solid rgba(0,255,136,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography sx={{ fontWeight: 700, color: '#00ff88', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Grand Total — {data.totalAssets} Assets across {groups.length} State{groups.length !== 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Total Purchase Cost</Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#4caf50' }}>
                  {formatCurrency(data.assets?.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0) || 0)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Total Market Value</Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#2196f3' }}>
                  {formatCurrency(data.assets?.reduce((s, a) => s + (Number(a.marketValue) || 0), 0) || 0)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      );
    }

    // Valuation & Depreciation table
    if (generatedReport.type === 'valuation_depreciation') {
      const data = generatedReport.data as ValuationData;
      return (
        <Box>
          <SectionHeading icon={<TrendingDown />} title="Depreciation by Asset Type" />
          <TableContainer component={Paper} sx={{ mb: 4, border: '1px solid rgba(0,135,81,0.2)' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Asset Type', 'Acquisition Cost', 'Current Value', 'Depreciation', 'Loss %'].map((h) => <TH key={h}>{h}</TH>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byType.map((row: any, i: number) => {
                  const pct = row.acquisitionCost > 0 ? ((row.depreciation / row.acquisitionCost) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={row.name} sx={{ backgroundColor: i % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)', '&:hover': { backgroundColor: 'rgba(0,135,81,0.1)' } }}>
                      <TD><Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{row.name}</Typography></TD>
                      <TD align="right"><Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>{formatCurrency(row.acquisitionCost)}</Typography></TD>
                      <TD align="right"><Typography sx={{ fontSize: '0.78rem', color: '#4caf50', fontWeight: 600 }}>{formatCurrency(row.currentValue)}</Typography></TD>
                      <TD align="right"><Typography sx={{ fontSize: '0.78rem', color: '#ef5350', fontWeight: 600 }}>-{formatCurrency(row.depreciation)}</Typography></TD>
                      <TD align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                          <LinearProgress variant="determinate" value={parseFloat(pct)}
                            sx={{ width: 60, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: parseFloat(pct) > 50 ? '#f44336' : parseFloat(pct) > 25 ? '#ff9800' : '#4caf50' } }} />
                          <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{pct}%</Typography>
                        </Box>
                      </TD>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }

    if (generatedReport.type === 'audit_compliance') {
      const data = generatedReport.data as AuditData;
      return (
        <Box>
          <SectionHeading icon={<Security />} title="Actions by Type" />
          <TableContainer component={Paper} sx={{ mb: 4, border: '1px solid rgba(0,135,81,0.2)' }}>
            <Table size="small">
              <TableHead><TableRow><TH>Action Type</TH><TH align="right">Count</TH></TableRow></TableHead>
              <TableBody>
                {data.actionsByType.map((row: any, i: number) => (
                  <TableRow key={row.action} sx={{ backgroundColor: i % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)' }}>
                    <TD>{row.action}</TD>
                    <TD align="right"><Chip label={row.count} size="small" sx={{ backgroundColor: 'rgba(0,135,81,0.2)', color: '#00ff88' }} /></TD>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data.flaggedAnomalies?.length > 0 && (
            <>
              <SectionHeading icon={<ErrorIcon />} title="Flagged Anomalies" count={data.flaggedAnomalies.length} />
              <TableContainer component={Paper} sx={{ border: '1px solid rgba(0,135,81,0.2)' }}>
                <Table size="small">
                  <TableHead><TableRow>{['Type', 'Description', 'Severity', 'Recommendation'].map((h) => <TH key={h}>{h}</TH>)}</TableRow></TableHead>
                  <TableBody>
                    {data.flaggedAnomalies.map((a: any, i: number) => (
                      <TableRow key={i} sx={{ backgroundColor: i % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)' }}>
                        <TD>{a.type}</TD><TD>{a.description}</TD>
                        <TD align="center"><Chip label={a.severity} size="small" sx={{ backgroundColor: a.severity === 'high' ? 'rgba(244,67,54,0.2)' : a.severity === 'medium' ? 'rgba(255,152,0,0.2)' : 'rgba(76,175,80,0.2)', color: a.severity === 'high' ? '#ef5350' : a.severity === 'medium' ? '#ff9800' : '#4caf50' }} /></TD>
                        <TD>{a.recommendation}</TD>
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
          <TableContainer component={Paper} sx={{ border: '1px solid rgba(0,135,81,0.2)' }}>
            <Table size="small">
              <TableHead><TableRow><TH>Risk Level</TH><TH align="right">Asset Count</TH></TableRow></TableHead>
              <TableBody>
                {data.byRiskLevel.map((row: any, i: number) => (
                  <TableRow key={row.level} sx={{ backgroundColor: i % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)' }}>
                    <TD><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: row.color }} />{row.level}</Box></TD>
                    <TD align="right">{row.count}</TD>
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

  // ─── Market Value tab ──────────────────────────────────────────────────────────
  const renderMarketValueTab = () => {
    if (!generatedReport || generatedReport.type !== 'asset_inventory') {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <ShowChart sx={{ fontSize: 64, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Market Value view is available for Asset Inventory reports.
          </Typography>
        </Box>
      );
    }
    const data = generatedReport.data as AssetInventoryData;
    const allAssets = data.assets || [];

    // Group by category, sort by total market value desc
    const catMap = new Map<string, any[]>();
    allAssets.forEach((a) => {
      const cat = a.category || a.type || 'Uncategorized';
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(a);
    });
    const categories = Array.from(catMap.entries())
      .map(([name, assets]) => ({
        name,
        assets,
        totalMV: assets.reduce((s, a) => s + (Number(a.marketValue) || 0), 0),
        totalPC: assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0),
        count: assets.length,
      }))
      .sort((a, b) => b.totalMV - a.totalMV);
    const grandTotalMV = categories.reduce((s, c) => s + c.totalMV, 0);

    const miniHeadSx = {
      fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase' as const,
      letterSpacing: 0.5, py: 0.6, px: 1.2,
      color: 'rgba(255,255,255,0.7)',
      background: 'rgba(0,55,28,0.85)',
      borderBottom: '1px solid rgba(0,255,136,0.1)',
      whiteSpace: 'nowrap' as const,
    };
    const miniCellSx = {
      fontSize: '0.72rem', py: 0.55, px: 1.2,
      color: 'rgba(255,255,255,0.82)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    };

    return (
      <Box>
        {/* ── Summary by Market Value ── */}
        <SectionHeading icon={<ShowChart />} title="Summary by Market Value" count={categories.length} />
        <TableContainer component={Paper} sx={{ mb: 4, border: '1px solid rgba(0,135,81,0.2)' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TH minWidth={180}>Asset Category</TH>
                <TH minWidth={160} align="right">Total Market Value</TH>
                <TH minWidth={70} align="center">Assets</TH>
                <TH minWidth={120} align="center">% of Total</TH>
                <TH minWidth={50} align="center">{''}</TH>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((cat, idx) => {
                const pct = grandTotalMV > 0 ? ((cat.totalMV / grandTotalMV) * 100).toFixed(1) : '0.0';
                const isExp = mvExpandedCats.has(cat.name);

                // Group assets by state within this category
                const stateMap = new Map<string, any[]>();
                cat.assets.forEach((a) => {
                  const st = a.state || 'Unspecified State';
                  if (!stateMap.has(st)) stateMap.set(st, []);
                  stateMap.get(st)!.push(a);
                });
                const stateGroups = Array.from(stateMap.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([st, sa]) => ({
                    state: st,
                    assets: sa,
                    totalMV: sa.reduce((s, a) => s + (Number(a.marketValue) || 0), 0),
                  }));

                return (
                  <React.Fragment key={cat.name}>
                    <TableRow
                      sx={{ backgroundColor: idx % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)', '&:hover': { backgroundColor: 'rgba(0,135,81,0.1)' }, cursor: 'pointer' }}
                      onClick={() => setMvExpandedCats((prev) => { const n = new Set(prev); if (n.has(cat.name)) n.delete(cat.name); else n.add(cat.name); return n; })}
                    >
                      <TD>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Category sx={{ fontSize: 13, color: '#00ff88' }} />
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{cat.name}</Typography>
                        </Box>
                      </TD>
                      <TD align="right">
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#2196f3' }}>
                          {cat.totalMV > 0 ? formatCurrency(cat.totalMV) : '—'}
                        </Typography>
                      </TD>
                      <TD align="center">
                        <Chip label={cat.count} size="small" sx={{ backgroundColor: 'rgba(0,135,81,0.25)', color: '#00ff88', fontSize: '0.68rem' }} />
                      </TD>
                      <TD align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                          <LinearProgress variant="determinate" value={parseFloat(pct)}
                            sx={{ width: 55, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: '#2196f3' } }} />
                          <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', minWidth: 32 }}>{pct}%</Typography>
                        </Box>
                      </TD>
                      <TD align="center">
                        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)', p: 0.2 }}>
                          {isExp ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                        </IconButton>
                      </TD>
                    </TableRow>

                    {/* Expandable: states + assets within this category */}
                    <TableRow>
                      <TableCell colSpan={5} sx={{ p: 0, borderBottom: isExp ? '2px solid rgba(33,150,243,0.2)' : 'none' }}>
                        <Collapse in={isExp} timeout="auto" unmountOnExit>
                          <Box sx={{ mx: 2, my: 1.5 }}>
                            {stateGroups.map((sg) => (
                              <Box key={sg.state} sx={{ mb: 2 }}>
                                {/* State sub-header */}
                                <Box sx={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  px: 1.5, py: 0.7, borderRadius: '4px 4px 0 0',
                                  background: 'rgba(0,75,40,0.5)', border: '1px solid rgba(0,255,136,0.12)', borderBottom: 'none',
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    <LocationOn sx={{ fontSize: 12, color: '#00ff88' }} />
                                    <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.78rem' }}>{sg.state}</Typography>
                                    <Chip label={sg.assets.length} size="small" sx={{ backgroundColor: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '0.62rem', height: 16 }} />
                                  </Box>
                                  <Typography sx={{ fontWeight: 700, color: '#2196f3', fontSize: '0.75rem' }}>
                                    {sg.totalMV > 0 ? formatCurrency(sg.totalMV) : '—'}
                                  </Typography>
                                </Box>

                                {/* Assets in this state for this category */}
                                <TableContainer sx={{ border: '1px solid rgba(0,255,136,0.1)', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={miniHeadSx}>Asset ID</TableCell>
                                        <TableCell sx={miniHeadSx}>Description</TableCell>
                                        <TableCell sx={{ ...miniHeadSx, textAlign: 'right' }}>Market Value (₦)</TableCell>
                                        <TableCell sx={{ ...miniHeadSx, textAlign: 'right' }}>Purchase Cost (₦)</TableCell>
                                        <TableCell sx={miniHeadSx}>Condition</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {[...sg.assets]
                                        .sort((a, b) => (Number(b.marketValue) || 0) - (Number(a.marketValue) || 0))
                                        .map((asset, ai) => (
                                          <TableRow key={asset.id || ai} sx={{ backgroundColor: ai % 2 === 0 ? 'rgba(0,22,10,0.5)' : 'rgba(0,38,18,0.3)', '&:last-child td': { borderBottom: 'none' } }}>
                                            <TableCell sx={{ ...miniCellSx, fontFamily: 'monospace', color: '#00ff88' }}>
                                              {asset.assetId || asset.id || '—'}
                                            </TableCell>
                                            <TableCell sx={miniCellSx}>{asset.description || asset.name || '—'}</TableCell>
                                            <TableCell sx={{ ...miniCellSx, textAlign: 'right', fontWeight: 700, color: '#2196f3' }}>
                                              {asset.marketValue ? formatCurrency(Number(asset.marketValue)) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                                            </TableCell>
                                            <TableCell sx={{ ...miniCellSx, textAlign: 'right', color: '#4caf50' }}>
                                              {asset.purchaseCost ? formatCurrency(Number(asset.purchaseCost)) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                                            </TableCell>
                                            <TableCell sx={miniCellSx}>
                                              {asset.condition || asset.assetCondition || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            ))}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}

              {/* Grand total row */}
              <TableRow sx={{ backgroundColor: 'rgba(0,100,50,0.2)', borderTop: '2px solid rgba(0,255,136,0.2)' }}>
                <TableCell sx={{ py: 1, px: 1.5, fontWeight: 700, color: 'rgba(0,255,136,0.9)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 0.5, borderBottom: 'none' }}>
                  Grand Total
                </TableCell>
                <TableCell align="right" sx={{ py: 1, px: 1.5, fontWeight: 700, color: '#2196f3', fontSize: '0.9rem', whiteSpace: 'nowrap', borderBottom: 'none' }}>
                  {formatCurrency(grandTotalMV)}
                </TableCell>
                <TableCell align="center" sx={{ py: 1, px: 1.5, borderBottom: 'none' }}>
                  <Chip label={allAssets.length} size="small" sx={{ backgroundColor: 'rgba(0,255,136,0.2)', color: '#00ff88', fontWeight: 700 }} />
                </TableCell>
                <TableCell colSpan={2} sx={{ borderBottom: 'none' }} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Detailed by Market Value ── */}
        <SectionHeading icon={<BarChart />} title="Detailed Assets by Market Value" count={data.totalAssets} />
        <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', mb: 2 }}>
          Assets grouped by category and sorted by highest market value within each category.
        </Typography>

        {categories.map((cat) => (
          <Box key={cat.name} sx={{ mb: 3 }}>
            {/* Category header */}
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2, py: 1.2, borderRadius: '6px 6px 0 0',
              background: 'linear-gradient(90deg, rgba(0,100,65,0.6) 0%, rgba(0,100,65,0.25) 100%)',
              border: '1px solid rgba(0,255,136,0.2)', borderBottom: 'none',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Category sx={{ fontSize: 16, color: '#00ff88' }} />
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem', letterSpacing: 0.5 }}>
                  {cat.name.toUpperCase()}
                </Typography>
                <Chip label={`${cat.count} asset${cat.count !== 1 ? 's' : ''}`} size="small"
                  sx={{ backgroundColor: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: '0.68rem', height: 20 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Purchase Cost</Typography>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#4caf50' }}>{formatCurrency(cat.totalPC)}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Market Value</Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#2196f3' }}>
                    {cat.totalMV > 0 ? formatCurrency(cat.totalMV) : '—'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <TableContainer sx={{
              border: '1px solid rgba(0,255,136,0.15)', borderTop: 'none',
              borderRadius: '0 0 6px 6px', maxHeight: 420, overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,255,136,0.3)', borderRadius: 3 },
            }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TH minWidth={40} align="center">#</TH>
                    <TH minWidth={140}>Asset ID</TH>
                    <TH minWidth={220}>Description</TH>
                    <TH minWidth={110}>State</TH>
                    <TH minWidth={180}>Location</TH>
                    <TH minWidth={200}>Ministry</TH>
                    <TH minWidth={160}>Agency</TH>
                    <TH minWidth={120} align="center">Condition</TH>
                    <TH minWidth={140} align="right">Purchase Cost (₦)</TH>
                    <TH minWidth={160} align="right">Market Value (₦) ↓</TH>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...cat.assets]
                    .sort((a, b) => (Number(b.marketValue) || 0) - (Number(a.marketValue) || 0))
                    .map((asset, ai) => {
                      const cond = asset.condition || asset.assetCondition || asset.currentCondition || asset.conditionStatus || null;
                      const cs = conditionStyle(cond);
                      return (
                        <TableRow key={asset.id || ai} sx={{
                          backgroundColor: ai % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)',
                          '&:hover': { backgroundColor: 'rgba(0,135,81,0.12)' },
                          '&:last-child td': { borderBottom: 'none' },
                        }}>
                          <TD align="center" muted>{ai + 1}</TD>
                          <TD mono>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#00ff88', background: 'rgba(0,255,136,0.07)', px: 0.8, py: 0.2, borderRadius: 0.5, border: '1px solid rgba(0,255,136,0.15)', display: 'inline-block', letterSpacing: 0.5 }}>
                              {asset.assetId || asset.id || '—'}
                            </Typography>
                          </TD>
                          <TD>
                            <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                              {asset.description || asset.name || '—'}
                            </Typography>
                          </TD>
                          <TD>{asset.state || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}</TD>
                          <TD>{asset.location || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}</TD>
                          <TD>{asset.ministry || asset.ministryName || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}</TD>
                          <TD>{asset.agency || asset.agencyName || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}</TD>
                          <TD align="center">
                            {cond ? (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.8, py: 0.2, borderRadius: 0.8, backgroundColor: cs.bg, border: `1px solid ${cs.border}` }}>
                                <FiberManualRecord sx={{ fontSize: 7, color: cs.color }} />
                                <Typography sx={{ fontSize: '0.68rem', color: cs.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{cond}</Typography>
                              </Box>
                            ) : <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>—</Typography>}
                          </TD>
                          <TD align="right">
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#4caf50', whiteSpace: 'nowrap' }}>
                              {asset.purchaseCost ? formatCurrency(Number(asset.purchaseCost)) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                            </Typography>
                          </TD>
                          <TD align="right">
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#2196f3', whiteSpace: 'nowrap' }}>
                              {asset.marketValue ? formatCurrency(Number(asset.marketValue)) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                            </Typography>
                          </TD>
                        </TableRow>
                      );
                    })}
                  {/* Category subtotal */}
                  <TableRow sx={{ backgroundColor: 'rgba(0,135,81,0.1)', borderTop: '1px solid rgba(0,255,136,0.15)' }}>
                    <TableCell colSpan={8} sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,255,136,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {cat.name} — Sub-total ({cat.count} assets)
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#4caf50', whiteSpace: 'nowrap' }}>{formatCurrency(cat.totalPC)}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#2196f3', whiteSpace: 'nowrap' }}>
                        {cat.totalMV > 0 ? formatCurrency(cat.totalMV) : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}

        {/* Grand total footer */}
        <Box sx={{ mt: 2, p: 2, borderRadius: 1, background: 'linear-gradient(90deg,rgba(33,150,243,0.2),rgba(33,150,243,0.08))', border: '1px solid rgba(33,150,243,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography sx={{ fontWeight: 700, color: '#2196f3', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Grand Total — {allAssets.length} Assets across {categories.length} Categor{categories.length !== 1 ? 'ies' : 'y'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Total Purchase Cost</Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#4caf50' }}>
                {formatCurrency(categories.reduce((s, c) => s + c.totalPC, 0))}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Total Market Value</Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#2196f3' }}>
                {formatCurrency(grandTotalMV)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  // ─── Breakdown tab ─────────────────────────────────────────────────────────────
  const renderBreakdownTab = () => {
    if (!generatedReport || generatedReport.type !== 'asset_inventory') {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <PieChart sx={{ fontSize: 64, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Breakdown view is available for Asset Inventory reports.</Typography>
        </Box>
      );
    }
    const data = generatedReport.data as AssetInventoryData;
    return (
      <Box>
        <SectionHeading icon={<Category />} title="Assets by Category" count={data.byType.length} />
        <TableContainer component={Paper} sx={{ mb: 4, border: '1px solid rgba(0,135,81,0.2)' }}>
          <Table size="small">
            <TableHead><TableRow>{['Asset Category', 'Count', 'Total Value', '% of Total'].map((h) => <TH key={h}>{h}</TH>)}</TableRow></TableHead>
            <TableBody>
              {data.byType.map((row: any, i: number) => {
                const pct = data.totalValue > 0 ? ((row.value / data.totalValue) * 100).toFixed(1) : '0.0';
                return (
                  <TableRow key={row.name} sx={{ backgroundColor: i % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)', '&:hover': { backgroundColor: 'rgba(0,135,81,0.1)' } }}>
                    <TD><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Category sx={{ fontSize: 13, color: 'rgba(0,255,136,0.6)' }} /><Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{row.name}</Typography></Box></TD>
                    <TD align="center"><Chip label={row.count} size="small" sx={{ backgroundColor: 'rgba(0,135,81,0.2)', color: '#00ff88' }} /></TD>
                    <TD align="right"><Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#4caf50' }}>{formatCurrency(row.value)}</Typography></TD>
                    <TD align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        <LinearProgress variant="determinate" value={parseFloat(pct)} sx={{ width: 80, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: '#008751' } }} />
                        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', minWidth: 36 }}>{pct}%</Typography>
                      </Box>
                    </TD>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {!isScopedToMinistry && data.byMinistry?.length > 0 && (
          <>
            <SectionHeading icon={<AccountBalance />} title="Assets by Ministry" count={data.byMinistry.length} />
            <TableContainer component={Paper} sx={{ border: '1px solid rgba(0,135,81,0.2)' }}>
              <Table size="small">
                <TableHead><TableRow>{['Ministry', 'Count', 'Total Value', '% of Portfolio'].map((h) => <TH key={h}>{h}</TH>)}</TableRow></TableHead>
                <TableBody>
                  {data.byMinistry.map((row: any, i: number) => {
                    const pct = data.totalValue > 0 ? ((row.value / data.totalValue) * 100).toFixed(1) : '0.0';
                    return (
                      <TableRow key={row.name} sx={{ backgroundColor: i % 2 === 0 ? 'rgba(0,40,20,0.4)' : 'rgba(0,20,10,0.3)', '&:hover': { backgroundColor: 'rgba(0,135,81,0.1)' } }}>
                        <TD><Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{row.name}</Typography></TD>
                        <TD align="center">{row.count}</TD>
                        <TD align="right"><Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#4caf50' }}>{formatCurrency(row.value)}</Typography></TD>
                        <TD align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                            <LinearProgress variant="determinate" value={parseFloat(pct)} sx={{ width: 80, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: '#1565c0' } }} />
                            <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', minWidth: 36 }}>{pct}%</Typography>
                          </Box>
                        </TD>
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
  };

  // ─── Main render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 2 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}
            sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#00ff88', backgroundColor: 'transparent' } }}>
            Back to Dashboard
          </Button>
        </Box>

        <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg,rgba(0,135,81,0.2),rgba(0,135,81,0.05))', border: '1px solid rgba(0,135,81,0.3)', borderLeft: '4px solid #008751' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assessment sx={{ fontSize: 40, color: '#00ff88' }} />
            <Box>
              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Report Generation
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Assets grouped by state in alphabetical order · All form fields included · Exportable to PDF, Excel, CSV
              </Typography>
            </Box>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
        {renderReportTypeCards()}
        {renderFiltersPanel()}
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#00ff88' }} /></Box>}

        {!loading && generatedReport && (
          <Paper sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid rgba(0,135,81,0.3)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h5" sx={{ color: '#00ff88', fontWeight: 700, mb: 0.5 }}>{generatedReport.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                    Generated: {generatedReport.generatedAt.toLocaleString()} &nbsp;|&nbsp; By: {generatedReport.generatedBy}
                    {generatedReport.ministryName && ` | ${generatedReport.ministryName}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    endIcon={<ArrowDropDown />}
                    onClick={(e) => setExportAnchorEl(e.currentTarget)}
                    sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', '&:hover': { borderColor: '#00ff88', color: '#00ff88', backgroundColor: 'rgba(0,255,136,0.07)' } }}
                  >
                    Export
                  </Button>
                  <Menu
                    anchorEl={exportAnchorEl}
                    open={Boolean(exportAnchorEl)}
                    onClose={() => setExportAnchorEl(null)}
                    PaperProps={{ sx: { background: '#0d1f13', border: '1px solid rgba(0,255,136,0.2)', minWidth: 220 } }}
                  >
                    <MenuItem
                      onClick={() => { handleExportPDF(); setExportAnchorEl(null); }}
                      sx={{ color: '#ef5350', fontSize: '0.85rem', gap: 1.5, '&:hover': { backgroundColor: 'rgba(239,83,80,0.1)' } }}
                    >
                      <PictureAsPdf fontSize="small" /> Export as PDF (A3 Landscape)
                    </MenuItem>
                    <MenuItem
                      onClick={() => { handleExportExcel(); setExportAnchorEl(null); }}
                      sx={{ color: '#4caf50', fontSize: '0.85rem', gap: 1.5, '&:hover': { backgroundColor: 'rgba(76,175,80,0.1)' } }}
                    >
                      <TableChart fontSize="small" /> Export to Excel (.xlsx)
                    </MenuItem>
                    <MenuItem
                      onClick={() => { handleExportCSV(); setExportAnchorEl(null); }}
                      sx={{ color: '#2196f3', fontSize: '0.85rem', gap: 1.5, '&:hover': { backgroundColor: 'rgba(33,150,243,0.1)' } }}
                    >
                      <Download fontSize="small" /> Download CSV (Google Sheets)
                    </MenuItem>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />
                    <MenuItem
                      onClick={() => { window.print(); setExportAnchorEl(null); }}
                      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', gap: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)' } }}
                    >
                      <Print fontSize="small" /> Print
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>
            </Box>

            {/* Insights */}
            {generatedReport.insights.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2 }}>Key Insights</Typography>
                <Grid container spacing={2}>
                  {generatedReport.insights.map((insight, idx) => (
                    <Grid item xs={12} md={6} key={idx}>
                      <Card sx={{
                        backgroundColor: insight.type === 'danger' ? 'rgba(244,67,54,0.1)' : insight.type === 'warning' ? 'rgba(255,152,0,0.1)' : insight.type === 'success' ? 'rgba(76,175,80,0.1)' : 'rgba(33,150,243,0.1)',
                        border: `1px solid ${insight.type === 'danger' ? 'rgba(244,67,54,0.3)' : insight.type === 'warning' ? 'rgba(255,152,0,0.3)' : insight.type === 'success' ? 'rgba(76,175,80,0.3)' : 'rgba(33,150,243,0.3)'}`,
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {getInsightIcon(insight.type)}
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#FFFFFF' }}>{insight.title}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>{insight.description}</Typography>
                          {insight.recommendation && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>Recommendation: {insight.recommendation}</Typography>}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
              <Tab icon={<BarChart />} label="Summary" iconPosition="start" />
              <Tab icon={<TableChart />} label="Asset Register by State" iconPosition="start" />
              <Tab icon={<ShowChart />} label="Asset Register by Market Value" iconPosition="start" />
              <Tab icon={<PieChart />} label="Breakdown" iconPosition="start" />
            </Tabs>
            <Divider sx={{ mb: 2 }} />
            {activeTab === 0 && renderSummaryTab()}
            {activeTab === 1 && renderDetailedRegisterTab()}
            {activeTab === 2 && renderMarketValueTab()}
            {activeTab === 3 && renderBreakdownTab()}
          </Paper>
        )}

        {!loading && !generatedReport && (
          <Paper sx={{ p: 6, textAlign: 'center', background: 'linear-gradient(135deg,rgba(0,135,81,0.05),transparent)' }}>
            <Description sx={{ fontSize: 80, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>No Report Generated Yet</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              Select a report type, configure filters, and click "Generate Report" to create a comprehensive analysis.
            </Typography>
          </Paper>
        )}
      </Container>
    </AppLayout>
  );
};

export default ReportsPage;
