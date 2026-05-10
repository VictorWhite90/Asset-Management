import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  DoneAll,
  Schedule,
  History,
  LocationOn,
  KeyboardArrowDown,
  KeyboardArrowUp,
  FiberManualRecord,
} from '@/components/icons';
import { Tabs, Tab } from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingAssets, approveAsset, rejectAsset, getApproverAssets } from '@/services/asset.service';
import { getUserById } from '@/services/user.service';
import { Asset } from '@/types/asset.types';
import { formatCurrency } from '@/services/report.service';
import { camelToTitle } from '@/utils/assetHelpers';
import AppLayout from '@/components/AppLayout';
import { deploymentLabels } from '@/utils/deployment';

/** Category-specific and extended fields persisted from the upload form (see seedCategories / AssetUploadForm). */
const EXTRA_FIELD_KEYS: string[] = [
  'landTitleType', 'surveyPlanNumber', 'landAcquisitionPurpose',
  'equipmentType', 'capacity', 'itemType',
  'make', 'model', 'vehicleYear', 'registrationNumber', 'engineNumber', 'chassisNumber', 'colour',
  'buildingType', 'numberOfFloors', 'buildingUse',
  'infrastructureType', 'length', 'width',
  'extractiveType', 'licenceNumber',
  'securityType', 'faceValue', 'issuer',
  'verifiedBy',
];

function extraFieldColumnsForGroup(assets: Asset[]): string[] {
  return EXTRA_FIELD_KEYS.filter((key) =>
    assets.some((a) => {
      const v = (a as Record<string, unknown>)[key];
      if (v == null) return false;
      if (typeof v === 'number') return !Number.isNaN(v);
      if (typeof v === 'string') return v.trim() !== '';
      return true;
    })
  );
}

function headerLabelForExtraField(key: string): string {
  const map: Record<string, string> = {
    itemType: 'Equipment / Furniture Type',
    vehicleYear: 'Vehicle Year',
    licenceNumber: 'Licence Number',
    surveyPlanNumber: 'Survey Plan No.',
    landAcquisitionPurpose: 'Land Acquisition Purpose',
    landTitleType: 'Land Title Type',
    equipmentType: 'Generator / Plant Type',
    buildingType: 'Building Type',
    numberOfFloors: 'Number of Floors',
    buildingUse: 'Building Use',
    infrastructureType: 'Infrastructure Type',
    extractiveType: 'Extractive Type',
    securityType: 'Security Type',
    faceValue: 'Face Value',
    verifiedBy: 'Verified by',
    registrationNumber: 'Registration No.',
    engineNumber: 'Engine No.',
    chassisNumber: 'Chassis No.',
  };
  return map[key] ?? camelToTitle(key);
}

function formatPurchasedDate(asset: Asset): string {
  const d = asset.purchasedDate;
  if (!d || d.year == null) return '—';
  const day = d.day ?? 1;
  const month = d.month ?? 1;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${d.year}`;
}

const stickyThSx = {
  fontWeight: 700,
  fontSize: '0.7rem',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  color: 'rgba(255,255,255,0.95)',
  background: 'rgba(0,80,45,0.95)',
  borderBottom: '2px solid rgba(0,255,136,0.25)',
  py: 1.2,
  px: 1.5,
  position: 'sticky' as const,
  top: 0,
  zIndex: 2,
  whiteSpace: 'nowrap' as const,
};

const dataCellSx = {
  fontSize: '0.78rem',
  py: 1,
  px: 1.5,
  color: 'rgba(255,255,255,0.88)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  verticalAlign: 'top' as const,
};

function renderExtraFieldCell(asset: Asset, key: string): React.ReactNode {
  const v = (asset as Record<string, unknown>)[key];
  if (v == null || v === '') {
    return <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>;
  }
  if (typeof v === 'number') return String(v);
  return String(v);
}

// State Group Component
const StateGroup: React.FC<{
  state: string;
  assets: Asset[];
  serial: number;
  onApprove: (assetId: string) => void;
  onReject: (asset: Asset) => void;
  processingId: string | null;
  calculateCurrentValue: (asset: Asset) => number;
  getConditionStyle: (condition?: string | null) => any;
  uploaderUuids: Map<string, string>;
}> = ({ state, assets, serial, onApprove, onReject, processingId, calculateCurrentValue, getConditionStyle, uploaderUuids }) => {
  const [collapsed, setCollapsed] = useState(false);
  const extraKeys = extraFieldColumnsForGroup(assets);
  const stateTotal = assets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
  const stateMarketEnteredTotal = assets.reduce((s, a) => s + (a.marketValue && a.marketValue > 0 ? a.marketValue : 0), 0);
  const stateMktTotal = assets.reduce((s, a) => s + calculateCurrentValue(a), 0);
  /** Columns from # through purchase date (before purchase cost). */
  const subtotalLabelColSpan = 13;

  return (
    <Box sx={{ mb: 3 }}>
      {/* State header bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.2, borderRadius: '6px 6px 0 0',
        background: 'linear-gradient(90deg, rgba(0,135,81,0.55) 0%, rgba(0,135,81,0.25) 100%)',
        border: '1px solid rgba(0,255,136,0.2)', borderBottom: 'none',
        cursor: 'pointer', userSelect: 'none',
      }} onClick={() => setCollapsed(!collapsed)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocationOn sx={{ fontSize: 18, color: '#008751' }} />
          <Typography sx={{ fontWeight: 700, color: '#143625', fontSize: '0.95rem', letterSpacing: 0.5 }}>
            {state.toUpperCase()}
          </Typography>
          <Chip label={`${assets.length} asset${assets.length !== 1 ? 's' : ''}`} size="small"
            sx={{ backgroundColor: 'rgba(0,255,136,0.15)', color: '#008751', fontSize: '0.68rem', height: 20 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(15,48,31,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Purchase Cost
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#4caf50' }}>
              {formatCurrency(stateTotal)}
            </Typography>
          </Box>
          {stateMktTotal > 0 && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(15,48,31,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Current Value
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#2196f3' }}>
                {formatCurrency(stateMktTotal)}
              </Typography>
            </Box>
          )}
          <IconButton size="small" sx={{ color: 'rgba(15,48,31,0.58)', p: 0.3 }}>
            {collapsed ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowUp fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {/* Table */}
      <Collapse in={!collapsed}>
        <TableContainer sx={{
          border: '1px solid rgba(0,255,136,0.15)', borderTop: 'none',
          borderRadius: '0 0 6px 6px', maxHeight: 560, overflowX: 'auto', overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 6, height: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,255,136,0.3)', borderRadius: 3 },
          '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(0,0,0,0.2)' },
        }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1400 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...stickyThSx, minWidth: 40 }} align="center">#</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 140 }}>Asset ID</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 100 }}>Uploader</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 200 }}>Description</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 130 }}>Category</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 110 }}>State</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 180 }}>Location / Address</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 200 }}>Ministry</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 180 }}>Agency (form)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 160 }}>Department</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 180 }}>Agency name (account)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 120 }}>Ministry type</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 110 }} align="center">Purchase date</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 130 }} align="right">Purchase cost (₦)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 130 }} align="right">Market value entered (₦)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 130 }} align="right">Current value (₦)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 120 }} align="center">Condition</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 200 }}>Remarks</TableCell>
                {extraKeys.map((key) => (
                  <TableCell key={key} sx={{ ...stickyThSx, minWidth: 140 }}>{headerLabelForExtraField(key)}</TableCell>
                ))}
                <TableCell sx={{ ...stickyThSx, minWidth: 100 }} align="center">Review</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset: Asset, i: number) => {
                const condition = asset.condition || asset.assetCondition || asset.currentCondition || asset.conditionStatus || null;
                const cs = getConditionStyle(condition);
                const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.42)';
                const currentValue = calculateCurrentValue(asset);

                return (
                  <TableRow key={asset.id || i} sx={{
                    backgroundColor: rowBg,
                    '&:hover': { backgroundColor: 'rgba(0,135,81,0.12)' },
                    '&:last-child td': { borderBottom: 'none' },
                  }}>
                    <TableCell align="center" sx={{ ...dataCellSx, color: 'rgba(255,255,255,0.35)' }}>{serial + i + 1}</TableCell>
                    <TableCell sx={{ ...dataCellSx, fontFamily: 'monospace' }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem',
                        color: '#008751', background: 'rgba(0,255,136,0.07)', px: 0.8, py: 0.2,
                        borderRadius: 0.5, border: '1px solid rgba(0,255,136,0.15)',
                        display: 'inline-block', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                        {asset.assetId || asset.id || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{
                        fontSize: '0.74rem', color: '#008751', fontFamily: 'monospace', letterSpacing: 0.5, fontWeight: 600,
                        background: 'rgba(0,255,136,0.1)', px: 0.8, py: 0.3, borderRadius: 0.5,
                        border: '1px solid rgba(0,255,136,0.2)', display: 'inline-block',
                      }}>
                        {uploaderUuids.get(asset.uploadedBy) || 'UNKNOWN'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.35, maxWidth: 280 }}>
                        {asset.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Chip label={asset.category || '—'} size="small" sx={{
                        backgroundColor: 'rgba(0,135,81,0.2)', color: 'rgba(255,255,255,0.85)',
                        border: '1px solid rgba(0,135,81,0.35)', fontSize: '0.68rem', height: 20,
                      }} />
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>
                        {asset.state || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(15,48,31,0.76)', lineHeight: 1.3 }}>
                        {asset.location || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(15,48,31,0.76)', lineHeight: 1.3 }}>
                        {asset.ministry || asset.ministryName || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(15,48,31,0.76)', lineHeight: 1.3 }}>
                        {asset.agency || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(15,48,31,0.76)', lineHeight: 1.3 }}>
                        {asset.department || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>
                        {asset.agencyName || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>
                        {asset.ministryType || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={dataCellSx}>{formatPurchasedDate(asset)}</TableCell>
                    <TableCell align="right" sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#4caf50', whiteSpace: 'nowrap' }}>
                        {asset.purchaseCost ? formatCurrency(asset.purchaseCost) : <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#81c784', whiteSpace: 'nowrap' }}>
                        {asset.marketValue && asset.marketValue > 0 ? formatCurrency(asset.marketValue) : <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#2196f3', whiteSpace: 'nowrap' }}>
                        {formatCurrency(currentValue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={dataCellSx}>
                      {condition ? (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4,
                          px: 0.8, py: 0.2, borderRadius: 0.8,
                          backgroundColor: cs.bg, border: `1px solid ${cs.border}` }}>
                          <FiberManualRecord sx={{ fontSize: 7, color: cs.color }} />
                          <Typography sx={{ fontSize: '0.68rem', color: cs.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {condition}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ color: 'rgba(15,48,31,0.28)', fontSize: '0.75rem' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.35, maxWidth: 260 }}>
                        {asset.remarks || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    {extraKeys.map((key) => (
                      <TableCell key={key} sx={dataCellSx}>
                        <Typography sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>{renderExtraFieldCell(asset, key)}</Typography>
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={dataCellSx}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Approve asset">
                          <IconButton
                            size="small"
                            onClick={() => asset.id && onApprove(asset.id)}
                            disabled={processingId === asset.id || processingId === 'all'}
                            sx={{
                              color: '#4caf50',
                              '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                              '&.Mui-disabled': { color: 'rgba(76, 175, 80, 0.3)' },
                            }}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject asset">
                          <IconButton
                            size="small"
                            onClick={() => onReject(asset)}
                            disabled={processingId === asset.id || processingId === 'all'}
                            sx={{
                              color: '#f44336',
                              '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
                              '&.Mui-disabled': { color: 'rgba(244, 67, 54, 0.3)' },
                            }}
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}

              <TableRow sx={{ backgroundColor: 'rgba(0,135,81,0.1)', borderTop: '1px solid rgba(0,255,136,0.15)' }}>
                <TableCell colSpan={subtotalLabelColSpan} sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
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
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#81c784', whiteSpace: 'nowrap' }}>
                    {stateMarketEnteredTotal > 0 ? formatCurrency(stateMarketEnteredTotal) : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#2196f3', whiteSpace: 'nowrap' }}>
                    {formatCurrency(stateMktTotal)}
                  </Typography>
                </TableCell>
                <TableCell colSpan={3 + extraKeys.length} sx={{ borderBottom: 'none' }} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Box>
  );
};

// History State Group Component (read-only)
const HistoryStateGroup: React.FC<{
  state: string;
  assets: Asset[];
  serial: number;
  calculateCurrentValue: (asset: Asset) => number;
  getConditionStyle: (condition?: string | null) => any;
  getStatusStyle: (status: string) => any;
  uploaderUuids: Map<string, string>;
}> = ({ state, assets, serial, calculateCurrentValue, getConditionStyle, getStatusStyle, uploaderUuids }) => {
  const [collapsed, setCollapsed] = useState(false);
  const extraKeys = extraFieldColumnsForGroup(assets);
  const stateTotal = assets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
  const stateMarketEnteredTotal = assets.reduce((s, a) => s + (a.marketValue && a.marketValue > 0 ? a.marketValue : 0), 0);
  const stateMktTotal = assets.reduce((s, a) => s + calculateCurrentValue(a), 0);
  const historySubtotalLabelColSpan = 13;

  return (
    <Box sx={{ mb: 3 }}>
      {/* State header bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.2, borderRadius: '6px 6px 0 0',
        background: 'linear-gradient(90deg, rgba(0,80,45,0.55) 0%, rgba(0,80,45,0.25) 100%)',
        border: '1px solid rgba(0,255,136,0.2)', borderBottom: 'none',
        cursor: 'pointer', userSelect: 'none',
      }} onClick={() => setCollapsed(!collapsed)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocationOn sx={{ fontSize: 18, color: '#008751' }} />
          <Typography sx={{ fontWeight: 700, color: '#143625', fontSize: '0.95rem', letterSpacing: 0.5 }}>
            {state.toUpperCase()}
          </Typography>
          <Chip label={`${assets.length} asset${assets.length !== 1 ? 's' : ''}`} size="small"
            sx={{ backgroundColor: 'rgba(0,255,136,0.15)', color: '#008751', fontSize: '0.68rem', height: 20 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(15,48,31,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Purchase Cost
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#4caf50' }}>
              {formatCurrency(stateTotal)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(15,48,31,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Current Value
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#2196f3' }}>
              {formatCurrency(stateMktTotal)}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: 'rgba(15,48,31,0.58)', p: 0.3 }}>
            {collapsed ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowUp fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {/* Table */}
      <Collapse in={!collapsed}>
        <TableContainer sx={{
          border: '1px solid rgba(0,255,136,0.15)', borderTop: 'none',
          borderRadius: '0 0 6px 6px', maxHeight: 560, overflowX: 'auto', overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 6, height: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,255,136,0.3)', borderRadius: 3 },
          '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(0,0,0,0.2)' },
        }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...stickyThSx, minWidth: 40 }} align="center">#</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 140 }}>Asset ID</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 100 }}>Uploader</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 200 }}>Description</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 130 }}>Category</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 110 }}>State</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 180 }}>Location / Address</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 200 }}>Ministry</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 180 }}>Agency (form)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 160 }}>Department</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 180 }}>Agency name (account)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 120 }}>Ministry type</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 110 }} align="center">Purchase date</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 130 }} align="right">Purchase cost (₦)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 130 }} align="right">Market value entered (₦)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 130 }} align="right">Current value (₦)</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 120 }} align="center">Condition</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 200 }}>Remarks</TableCell>
                {extraKeys.map((key) => (
                  <TableCell key={key} sx={{ ...stickyThSx, minWidth: 140 }}>{headerLabelForExtraField(key)}</TableCell>
                ))}
                <TableCell sx={{ ...stickyThSx, minWidth: 120 }} align="center">Status</TableCell>
                <TableCell sx={{ ...stickyThSx, minWidth: 220 }}>Rejection reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset: Asset, i: number) => {
                const condition = asset.condition || asset.assetCondition || asset.currentCondition || asset.conditionStatus || null;
                const cs = getConditionStyle(condition);
                const st = getStatusStyle(asset.status);
                const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.42)';
                const currentValue = calculateCurrentValue(asset);

                return (
                  <TableRow key={asset.id || i} sx={{
                    backgroundColor: rowBg,
                    '&:hover': { backgroundColor: 'rgba(0,135,81,0.12)' },
                    '&:last-child td': { borderBottom: 'none' },
                  }}>
                    <TableCell align="center" sx={{ ...dataCellSx, color: 'rgba(255,255,255,0.35)' }}>{serial + i + 1}</TableCell>
                    <TableCell sx={{ ...dataCellSx, fontFamily: 'monospace' }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem',
                        color: '#008751', background: 'rgba(0,255,136,0.07)', px: 0.8, py: 0.2,
                        borderRadius: 0.5, border: '1px solid rgba(0,255,136,0.15)',
                        display: 'inline-block', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                        {asset.assetId || asset.id || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{
                        fontSize: '0.74rem', color: '#008751', fontFamily: 'monospace', letterSpacing: 0.5, fontWeight: 600,
                        background: 'rgba(0,255,136,0.1)', px: 0.8, py: 0.3, borderRadius: 0.5,
                        border: '1px solid rgba(0,255,136,0.2)', display: 'inline-block',
                      }}>
                        {uploaderUuids.get(asset.uploadedBy) || 'UNKNOWN'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.35, maxWidth: 280 }}>
                        {asset.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Chip label={asset.category || '—'} size="small" sx={{
                        backgroundColor: 'rgba(0,135,81,0.2)', color: 'rgba(255,255,255,0.85)',
                        border: '1px solid rgba(0,135,81,0.35)', fontSize: '0.68rem', height: 20,
                      }} />
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>
                        {asset.state || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(15,48,31,0.76)', lineHeight: 1.3 }}>
                        {asset.location || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(15,48,31,0.76)', lineHeight: 1.3 }}>
                        {asset.ministry || asset.ministryName || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(15,48,31,0.76)', lineHeight: 1.3 }}>
                        {asset.agency || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'rgba(15,48,31,0.76)', lineHeight: 1.3 }}>
                        {asset.department || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>
                        {asset.agencyName || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>
                        {asset.ministryType || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={dataCellSx}>{formatPurchasedDate(asset)}</TableCell>
                    <TableCell align="right" sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#4caf50', whiteSpace: 'nowrap' }}>
                        {asset.purchaseCost ? formatCurrency(asset.purchaseCost) : <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#81c784', whiteSpace: 'nowrap' }}>
                        {asset.marketValue && asset.marketValue > 0 ? formatCurrency(asset.marketValue) : <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#2196f3', whiteSpace: 'nowrap' }}>
                        {formatCurrency(currentValue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={dataCellSx}>
                      {condition ? (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4,
                          px: 0.8, py: 0.2, borderRadius: 0.8,
                          backgroundColor: cs.bg, border: `1px solid ${cs.border}` }}>
                          <FiberManualRecord sx={{ fontSize: 7, color: cs.color }} />
                          <Typography sx={{ fontSize: '0.68rem', color: cs.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {condition}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ color: 'rgba(15,48,31,0.28)', fontSize: '0.75rem' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.35, maxWidth: 260 }}>
                        {asset.remarks || <span style={{ color: 'rgba(15,48,31,0.28)' }}>—</span>}
                      </Typography>
                    </TableCell>
                    {extraKeys.map((key) => (
                      <TableCell key={key} sx={dataCellSx}>
                        <Typography sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>{renderExtraFieldCell(asset, key)}</Typography>
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={dataCellSx}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4,
                        px: 0.8, py: 0.2, borderRadius: 0.8,
                        backgroundColor: st.bg, border: `1px solid ${st.color}40` }}>
                        <FiberManualRecord sx={{ fontSize: 7, color: st.color }} />
                        <Typography sx={{ fontSize: '0.68rem', color: st.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={dataCellSx}>
                      <Typography sx={{ color: 'rgba(255,180,180,0.95)', fontSize: '0.74rem', lineHeight: 1.35, maxWidth: 280 }}>
                        {asset.rejectionReason || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}

              <TableRow sx={{ backgroundColor: 'rgba(0,135,81,0.1)', borderTop: '1px solid rgba(0,255,136,0.15)' }}>
                <TableCell colSpan={historySubtotalLabelColSpan} sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
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
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#81c784', whiteSpace: 'nowrap' }}>
                    {stateMarketEnteredTotal > 0 ? formatCurrency(stateMarketEnteredTotal) : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.8, px: 1.5, borderBottom: 'none' }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#2196f3', whiteSpace: 'nowrap' }}>
                    {formatCurrency(stateMktTotal)}
                  </Typography>
                </TableCell>
                <TableCell colSpan={4 + extraKeys.length} sx={{ borderBottom: 'none' }} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Box>
  );
};

const ReviewUploadsPage = () => {
  const { userData, currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [uploaderUuids, setUploaderUuids] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'history' ? 1 : 0
  );

  // Removed pagination since we're using state grouping

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingAssets();
  }, []);

  const fetchPendingAssets = async () => {
    if (!userData?.userId || !userData?.ministryId || !userData?.state) {
      setError('User data not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch pending assets and all ministry assets in parallel
      const [pendingAssets, ministryAssets] = await Promise.all([
        getPendingAssets(userData.ministryId, userData.state),
        getApproverAssets(userData.ministryId, userData.state),
      ]);
      setAssets(pendingAssets);
      setAllAssets(ministryAssets);

      // Build uploader display ID map
      // Priority: 1) uploaderDisplayId stored on asset, 2) user doc displayId, 3) user doc uuid, 4) fallback
      const allAssetsList = [...pendingAssets, ...ministryAssets];

      // First pass: pull displayIds that are already embedded on the asset documents
      const uuidMap = new Map<string, string>();
      for (const asset of allAssetsList) {
        if (asset.uploaderDisplayId && !uuidMap.has(asset.uploadedBy)) {
          uuidMap.set(asset.uploadedBy, asset.uploaderDisplayId);
        }
      }

      // Second pass: fetch user docs for uploaders whose displayId wasn't on any asset
      const missingUploaderIds = [
        ...new Set(allAssetsList.map(a => a.uploadedBy).filter(id => !uuidMap.has(id))),
      ];

      await Promise.all(
        missingUploaderIds.map(async (uploaderId, index) => {
          try {
            const user = await getUserById(uploaderId);
            if (user?.displayId) {
              uuidMap.set(uploaderId, user.displayId);
            } else if (user?.uuid && user.uuid.length <= 12) {
              uuidMap.set(uploaderId, user.uuid);
            } else {
              const prefix = user?.role === 'agency-approver' ? 'APV' : 'STF';
              uuidMap.set(uploaderId, `${prefix}${String(index + 1).padStart(3, '0')}`);
            }
          } catch {
            uuidMap.set(uploaderId, `STF${String(index + 1).padStart(3, '0')}`);
          }
        })
      );
      setUploaderUuids(uuidMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending assets');
      toast.error(err.message || 'Failed to load pending assets');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (assetId: string) => {
    if (!userData?.userId) return;

    setProcessingId(assetId);
    try {
      // Debug: verify token claims (role, ministryId) before approve – helps diagnose permission errors
      // NOTE: This page runs under Next. `import.meta.env.DEV` is Vite-only and will be undefined here.
      if (process.env.NODE_ENV !== 'production' && currentUser) {
        const token = await currentUser.getIdTokenResult(true);
        console.log('[ReviewUploads] Token claims before approve:', {
          role: token.claims.role,
          ministryId: token.claims.ministryId,
          uid: currentUser.uid,
        });
      }
      await approveAsset(
        assetId,
        userData.userId,
        currentUser?.email || undefined,
        userData.agencyName
      );
      toast.success('Asset approved successfully');
      await fetchPendingAssets(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve asset');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedAsset?.id || !userData?.userId) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedAsset.id);
    try {
      await rejectAsset(
        selectedAsset.id,
        userData.userId,
        rejectionReason,
        'approver',
        currentUser?.email || undefined,
        userData.agencyName
      );
      toast.success('Asset rejected successfully');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedAsset(null);
      await fetchPendingAssets(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject asset');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (!userData?.userId || assets.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to approve all ${assets.length} pending assets?`
    );

    if (!confirmed) return;

    setProcessingId('all');
    let successCount = 0;
    let failCount = 0;

    try {
      for (const asset of assets) {
        if (asset.id) {
          try {
            await approveAsset(
              asset.id,
              userData.userId,
              currentUser?.email || undefined,
              userData.agencyName
            );
            successCount++;
          } catch {
            failCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} asset(s) approved successfully`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} asset(s) failed to approve`);
      }

      await fetchPendingAssets(); // Refresh list
    } finally {
      setProcessingId(null);
    }
  };

  // Pagination handlers removed since we're using state grouping

  // Calculate current/market value with depreciation
  const calculateCurrentValue = (asset: Asset): number => {
    if (asset.marketValue && asset.marketValue > 0) {
      return asset.marketValue;
    }
    
    // Simple depreciation calculation
    const purchaseDate = new Date(
      asset.purchasedDate.year,
      asset.purchasedDate.month - 1,
      asset.purchasedDate.day
    );
    const ageInYears = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Depreciation rates by category (annual percentage)
    const depreciationRates: Record<string, number> = {
      'Motor Vehicle': 0.2,
      'Office Equipment': 0.15,
      'Furniture & Fittings': 0.1,
      'Plant/Generator': 0.15,
      'Building': 0.025,
      'Land': 0,
      'Infrastructure': 0.05,
      'Extractive Assets': 0.1,
      'Securities/Financial Assets': 0,
      'Others': 0.1,
    };
    
    const rate = depreciationRates[asset.category] || 0.1;
    const depreciation = asset.purchaseCost * rate * Math.min(ageInYears, 10);
    
    return Math.max(asset.purchaseCost - depreciation, asset.purchaseCost * 0.1);
  };

  // Group assets by state
  const groupAssetsByState = (assets: Asset[]) => {
    const grouped = new Map<string, Asset[]>();
    assets.forEach((asset) => {
      const state = asset.state || 'Unspecified State';
      if (!grouped.has(state)) grouped.set(state, []);
      grouped.get(state)!.push(asset);
    });
    
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([state, items]) => ({
        state,
        assets: items.sort((a, b) => (a.category || '').localeCompare(b.category || '')),
      }));
  };

  // Status styling
  const getStatusStyle = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      approved: { label: 'Approved', color: '#4caf50', bg: 'rgba(76,175,80,0.15)' },
      pending: { label: 'Pending', color: '#ff9800', bg: 'rgba(255,152,0,0.15)' },
      pending_ministry_review: { label: 'Ministry Review', color: '#2196f3', bg: 'rgba(33,150,243,0.15)' },
      submitted_to_federal: { label: deploymentLabels.submittedToTopAdmin, color: '#9c27b0', bg: 'rgba(156,39,176,0.15)' },
      rejected: { label: 'Rejected', color: '#f44336', bg: 'rgba(244,67,54,0.15)' },
    };
    return map[status] ?? { label: status, color: '#aaa', bg: 'rgba(255,255,255,0.08)' };
  };

  // Condition styling
  const getConditionStyle = (condition?: string | null) => {
    if (!condition) return { color: 'rgba(15,48,31,0.3)', bg: 'transparent', border: 'transparent' };
    const l = condition.toLowerCase();
    if (l.includes('excellent') || l.includes('good'))
      return { color: '#4caf50', bg: 'rgba(76,175,80,0.15)', border: 'rgba(76,175,80,0.3)' };
    if (l.includes('fair') || l.includes('average'))
      return { color: '#ff9800', bg: 'rgba(255,152,0,0.15)', border: 'rgba(255,152,0,0.3)' };
    if (l.includes('poor') || l.includes('bad') || l.includes('dilapidated'))
      return { color: '#f44336', bg: 'rgba(244,67,54,0.15)', border: 'rgba(244,67,54,0.3)' };
    return { color: '#90caf9', bg: 'rgba(144,202,249,0.12)', border: 'rgba(144,202,249,0.3)' };
  };

  // Pagination removed in favor of state grouping

  if (loading) {
    return (
      <AppLayout>
        <Container component="main" maxWidth="lg">
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
          >
            <CircularProgress sx={{ color: '#008751' }} />
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
              color: 'rgba(15, 48, 31, 0.68)',
              '&:hover': {
                color: '#008751',
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
            p: { xs: 2, sm: 3 },
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
            borderLeft: '4px solid #008751',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h4" sx={{ color: '#143625', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}>
                Review Pending Uploads
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(15, 48, 31, 0.68)', mt: 1, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                Review and approve asset submissions from your ministry/agency
              </Typography>
            </Box>
            {assets.length > 0 && userData?.accountStatus === 'verified' && (
              <Button
                variant="contained"
                startIcon={<DoneAll />}
                onClick={handleApproveAll}
                disabled={processingId === 'all'}
                size="small"
                sx={{
                  backgroundColor: '#2e7d32',
                  '&:hover': { backgroundColor: '#1b5e20' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  flexShrink: 0,
                }}
              >
                {processingId === 'all' ? 'Processing...' : 'Approve All'}
              </Button>
            )}
          </Box>
        </Paper>

        {/* Account Pending Verification Warning */}
        {userData?.accountStatus === 'pending_verification' && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(237, 108, 2, 0.1)',
              border: '1px solid rgba(237, 108, 2, 0.3)',
              '& .MuiAlert-icon': { color: '#ed6c02' },
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#143625' }}>
              Account Pending Verification
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'rgba(15, 48, 31, 0.76)' }}>
              Your approver account is awaiting verification by your ministry administrator.
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'rgba(15, 48, 31, 0.76)' }}>
              <strong>Registered:</strong> {userData.createdAt?.toDate().toLocaleDateString('en-GB')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(15, 48, 31, 0.76)' }}>
              You will be notified via email once your account is approved. After approval, you will be able to review and approve asset uploads from {userData.agencyName} ({userData.location}).
            </Typography>
          </Alert>
        )}

        {/* Account Rejected Warning */}
        {userData?.accountStatus === 'rejected' && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              border: '1px solid rgba(211, 47, 47, 0.3)',
              '& .MuiAlert-icon': { color: '#d32f2f' },
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#143625' }}>
              Account Verification Rejected
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'rgba(15, 48, 31, 0.76)' }}>
              Your approver account was rejected by your ministry administrator.
            </Typography>
            {userData.rejectionReason && (
              <Typography variant="body2" paragraph sx={{ color: 'rgba(15, 48, 31, 0.76)' }}>
                <strong>Reason:</strong> {userData.rejectionReason}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: 'rgba(15, 48, 31, 0.76)' }}>
              Please contact the system administrator for more information.
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Summary and Assets Table - Only show if account is verified */}
        {(!userData?.accountStatus || userData?.accountStatus === 'verified') && (
          <>
            {/* Tabs: Pending vs History */}
            <Tabs
              value={activeTab}
              onChange={(_e, v) => {
                setActiveTab(v);
                if (v === 1) setSearchParams({ tab: 'history' }, { replace: true });
                else setSearchParams({}, { replace: true });
              }}
              sx={{
                mb: 2,
                '& .MuiTab-root': { color: 'rgba(15,48,31,0.58)' },
                '& .Mui-selected': { color: '#008751' },
                '& .MuiTabs-indicator': { backgroundColor: '#008751' },
              }}
            >
              <Tab icon={<Schedule sx={{ fontSize: 18 }} />} iconPosition="start" label={`Pending (${assets.length})`} />
              <Tab icon={<History sx={{ fontSize: 18 }} />} iconPosition="start" label={`History (${allAssets.filter(a => a.status !== 'pending').length})`} />
            </Tabs>

            {/* PENDING TAB */}
            {activeTab === 0 && (
            <>
            {/* Summary Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                backgroundColor: 'rgba(0, 135, 81, 0.1)',
                border: '1px solid rgba(0, 135, 81, 0.3)',
              }}
            >
              <Schedule sx={{ fontSize: { xs: 30, sm: 40 }, color: '#ff9800' }} />
              <Box>
                <Typography variant="h4" sx={{ color: '#143625', fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                  {assets.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(15, 48, 31, 0.68)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  asset(s) awaiting your approval
                </Typography>
              </Box>
            </Paper>

            {/* Assets Table - Grouped by State */}
            {assets.length === 0 ? (
              <Paper elevation={0} sx={{ p: 5, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 60, color: '#008751', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#143625' }}>
                  No pending uploads to review
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(15, 48, 31, 0.58)', mt: 1 }}>
                  {userData?.agencyName && userData?.location
                    ? `All uploads from ${userData.agencyName} (${userData.location}) have been reviewed`
                    : 'All uploads from your agency have been reviewed'}
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ p: { xs: 1, sm: 2 } }}>
                {groupAssetsByState(assets).map((group, groupIndex) => {
                  const serial = groupAssetsByState(assets)
                    .slice(0, groupIndex)
                    .reduce((total, g) => total + g.assets.length, 0);
                  
                  return (
                    <StateGroup
                      key={group.state}
                      state={group.state}
                      assets={group.assets}
                      serial={serial}
                      onApprove={handleApprove}
                      onReject={handleRejectClick}
                      processingId={processingId}
                      calculateCurrentValue={calculateCurrentValue}
                      getConditionStyle={getConditionStyle}
                      uploaderUuids={uploaderUuids}
                    />
                  );
                })}
              </Box>
            )}
            </>
            )}

            {/* HISTORY TAB */}
            {activeTab === 1 && (
              <>
                {allAssets.filter(a => a.status !== 'pending').length === 0 ? (
                  <Paper elevation={0} sx={{ p: 5, textAlign: 'center' }}>
                    <History sx={{ fontSize: 60, color: 'rgba(15,48,31,0.3)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#143625' }}>No processed assets yet</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(15,48,31,0.58)', mt: 1 }}>
                      Assets you approve or reject will appear here
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ p: { xs: 1, sm: 2 } }}>
                    {groupAssetsByState(allAssets.filter(a => a.status !== 'pending')).map((group, groupIndex) => {
                      const serial = groupAssetsByState(allAssets.filter(a => a.status !== 'pending'))
                        .slice(0, groupIndex)
                        .reduce((total, g) => total + g.assets.length, 0);
                      
                      return (
                        <HistoryStateGroup
                          key={group.state}
                          state={group.state}
                          assets={group.assets}
                          serial={serial}
                          calculateCurrentValue={calculateCurrentValue}
                          getConditionStyle={getConditionStyle}
                          getStatusStyle={getStatusStyle}
                          uploaderUuids={uploaderUuids}
                        />
                      );
                    })}
                  </Box>
                )}
              </>
            )}
          </>
        )}

        {/* Rejection Dialog */}
        <Dialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 135, 81, 0.2)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#f44336', fontWeight: 600 }}>
            Reject Asset Upload
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.65)', mb: 2 }}>
              Please provide a reason for rejecting this asset. The uploader will see this message.
            </Typography>
            {selectedAsset && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  backgroundColor: 'rgba(0, 135, 81, 0.1)',
                  border: '1px solid rgba(0, 135, 81, 0.3)',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" sx={{ color: '#008751', fontWeight: 600 }}>
                  Asset ID: {selectedAsset.assetId}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(15, 48, 31, 0.76)' }}>
                  {selectedAsset.description}
                </Typography>
              </Box>
            )}
            <TextField
              autoFocus
              multiline
              rows={4}
              fullWidth
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Incorrect purchase cost, missing documentation, duplicate entry..."
              required
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setRejectDialogOpen(false)}
              sx={{ color: 'rgba(15, 48, 31, 0.68)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              variant="contained"
              disabled={!rejectionReason.trim() || processingId === selectedAsset?.id}
              sx={{
                backgroundColor: '#c62828',
                '&:hover': { backgroundColor: '#8e0000' },
              }}
            >
              Confirm Rejection
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default ReviewUploadsPage;
