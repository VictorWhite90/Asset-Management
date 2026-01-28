/**
 * Report Types and Interfaces
 * For comprehensive report generation across Federal and Ministry Admin dashboards
 */

export type ReportType =
  | 'asset_inventory'
  | 'valuation_depreciation'
  | 'audit_compliance'
  | 'utilization_risk'
  | 'custom';

export type ReportFormat = 'pdf' | 'csv' | 'excel';

export type ReportScope = 'all' | 'ministry';

export interface ReportFilters {
  reportType: ReportType;
  ministryId?: string; // For ministry-specific reports
  ministryIds?: string[]; // For federal admin multi-select
  assetTypes?: string[];
  statuses?: string[];
  locations?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  includeGraphs?: boolean;
  includeDetailedTables?: boolean;
  includeSummaryInsights?: boolean;
}

export interface ReportConfig {
  title: string;
  description: string;
  icon: string;
  availableFor: ('admin' | 'ministry-admin')[];
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'table' | 'chart' | 'map' | 'timeline' | 'insights';
  chartType?: 'pie' | 'bar' | 'line' | 'area' | 'radar' | 'stacked_bar';
}

// Report Data Structures
export interface AssetInventoryData {
  totalAssets: number;
  totalValue: number;
  byType: { name: string; count: number; value: number }[];
  byStatus: { name: string; count: number }[];
  byMinistry: { name: string; count: number; value: number }[];
  byLocation: { name: string; count: number }[];
  topHighRiskAssets: AssetSummary[];
  assets: AssetSummary[];
}

export interface AssetSummary {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  acquisitionCost: number;
  currentValue: number;
  riskScore?: number;
  ministry?: string;
  condition?: string;
  lastUpdated?: Date;
}

export interface ValuationData {
  totalAcquisitionCost: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  depreciationRate: number;
  projectedLossNextYear: number;
  byType: { name: string; acquisitionCost: number; currentValue: number; depreciation: number }[];
  byMinistry: { name: string; acquisitionCost: number; currentValue: number }[];
  valueTrend: { date: string; value: number }[];
  depreciationByMethod: { method: string; count: number; totalDepreciation: number }[];
  underutilizedAssets: AssetSummary[];
}

export interface AuditData {
  totalActions: number;
  actionsByType: { action: string; count: number }[];
  actionsByUser: { user: string; count: number }[];
  actionsByMonth: { month: string; count: number }[];
  approvalRate: number;
  rejectionRate: number;
  pendingCount: number;
  flaggedAnomalies: AuditAnomaly[];
  recentActions: AuditLogEntry[];
  uploaderApproverNetwork: { uploader: string; approver: string; count: number }[];
}

export interface AuditAnomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  user?: string;
  count?: number;
  recommendation: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
  resourceType: string;
  resourceId: string;
  details: string;
}

export interface UtilizationData {
  averageUtilization: number;
  averageConditionScore: number;
  averageRiskScore: number;
  byRiskLevel: { level: string; count: number; color: string }[];
  byCondition: { condition: string; count: number }[];
  underutilizedAssets: AssetSummary[];
  highRiskAssets: AssetSummary[];
  potentialSavings: number;
  assetHealthRadar: { metric: string; value: number }[];
  locationRiskMap: { location: string; riskScore: number; assetCount: number }[];
}

export interface GeneratedReport {
  id: string;
  title: string;
  type: ReportType;
  generatedAt: Date;
  generatedBy: string;
  filters: ReportFilters;
  scope: ReportScope;
  ministryName?: string;
  data: AssetInventoryData | ValuationData | AuditData | UtilizationData;
  insights: ReportInsight[];
}

export interface ReportInsight {
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  description: string;
  value?: string | number;
  recommendation?: string;
}

// Report Templates Configuration
export const REPORT_TEMPLATES: Record<ReportType, ReportConfig> = {
  asset_inventory: {
    title: 'Asset Inventory Report',
    description: 'Complete inventory of all assets with type, location, and status breakdown',
    icon: 'Inventory',
    availableFor: ['admin', 'ministry-admin'],
    sections: [
      { id: 'summary', title: 'Executive Summary', type: 'summary' },
      { id: 'type_dist', title: 'Asset Distribution by Type', type: 'chart', chartType: 'pie' },
      { id: 'ministry_dist', title: 'Assets by Ministry', type: 'chart', chartType: 'bar' },
      { id: 'status_dist', title: 'Status Overview', type: 'chart', chartType: 'pie' },
      { id: 'high_risk', title: 'Top High-Risk Assets', type: 'table' },
      { id: 'full_list', title: 'Complete Asset List', type: 'table' },
    ],
  },
  valuation_depreciation: {
    title: 'Valuation & Depreciation Report',
    description: 'Financial analysis of asset values, depreciation trends, and projections',
    icon: 'TrendingDown',
    availableFor: ['admin', 'ministry-admin'],
    sections: [
      { id: 'summary', title: 'Financial Summary', type: 'summary' },
      { id: 'value_trend', title: 'Value Trend Over Time', type: 'chart', chartType: 'line' },
      { id: 'depreciation', title: 'Depreciation by Type', type: 'chart', chartType: 'stacked_bar' },
      { id: 'ministry_value', title: 'Value by Ministry', type: 'chart', chartType: 'bar' },
      { id: 'insights', title: 'Financial Insights', type: 'insights' },
      { id: 'underutilized', title: 'Underutilized Assets', type: 'table' },
    ],
  },
  audit_compliance: {
    title: 'Audit & Compliance Report',
    description: 'Full audit trail, compliance status, and anomaly detection',
    icon: 'Security',
    availableFor: ['admin', 'ministry-admin'],
    sections: [
      { id: 'summary', title: 'Audit Summary', type: 'summary' },
      { id: 'timeline', title: 'Activity Timeline', type: 'chart', chartType: 'area' },
      { id: 'actions', title: 'Actions by Type', type: 'chart', chartType: 'pie' },
      { id: 'approval_rate', title: 'Approval Metrics', type: 'chart', chartType: 'bar' },
      { id: 'anomalies', title: 'Flagged Anomalies', type: 'insights' },
      { id: 'recent', title: 'Recent Activity Log', type: 'table' },
    ],
  },
  utilization_risk: {
    title: 'Utilization & Risk Analysis',
    description: 'Asset utilization metrics, risk assessment, and optimization recommendations',
    icon: 'Assessment',
    availableFor: ['admin', 'ministry-admin'],
    sections: [
      { id: 'summary', title: 'Utilization Summary', type: 'summary' },
      { id: 'risk_dist', title: 'Risk Distribution', type: 'chart', chartType: 'pie' },
      { id: 'health_radar', title: 'Asset Health Overview', type: 'chart', chartType: 'radar' },
      { id: 'location_risk', title: 'Risk by Location', type: 'map' },
      { id: 'high_risk', title: 'High-Risk Assets', type: 'table' },
      { id: 'recommendations', title: 'Optimization Recommendations', type: 'insights' },
    ],
  },
  custom: {
    title: 'Custom Report',
    description: 'Build your own report with custom filters and data selection',
    icon: 'Build',
    availableFor: ['admin', 'ministry-admin'],
    sections: [
      { id: 'summary', title: 'Custom Summary', type: 'summary' },
      { id: 'data', title: 'Filtered Data', type: 'table' },
      { id: 'chart', title: 'Visual Analysis', type: 'chart', chartType: 'bar' },
    ],
  },
};
