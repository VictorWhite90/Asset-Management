/**
 * Report Generation Service
 * Handles data aggregation and report generation for Federal and Ministry Admins
 */

import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Asset } from '@/types/asset.types';
import {
  ReportFilters,
  ReportType,
  AssetInventoryData,
  ValuationData,
  AuditData,
  UtilizationData,
  AssetSummary,
  ReportInsight,
  AuditLogEntry,
  AuditAnomaly,
  GeneratedReport,
} from '@/types/report.types';

const ASSETS_COLLECTION = 'assets';
const AUDIT_LOGS_COLLECTION = 'audit_logs';
const MINISTRIES_COLLECTION = 'ministries';

/**
 * Format currency in Nigerian Naira
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculate depreciation based on asset age and type
 */
const calculateDepreciation = (asset: Asset): number => {
  const purchaseDate = new Date(
    asset.purchasedDate.year,
    asset.purchasedDate.month - 1,
    asset.purchasedDate.day
  );
  const ageInYears = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  // Depreciation rates by category (annual percentage)
  const depreciationRates: Record<string, number> = {
    'Motor Vehicle': 0.2, // 20% per year
    'Office Equipment': 0.15, // 15% per year
    'Furniture & Fittings': 0.1, // 10% per year
    'Plant/Generator': 0.15, // 15% per year
    'Building': 0.025, // 2.5% per year
    Land: 0, // Land doesn't depreciate
    Infrastructure: 0.05, // 5% per year
    'Extractive Assets': 0.1, // 10% per year
    'Securities/Financial Assets': 0, // May appreciate/depreciate based on market
    Others: 0.1, // Default 10% per year
  };

  const rate = depreciationRates[asset.category] || 0.1;
  const depreciation = asset.purchaseCost * rate * Math.min(ageInYears, 10); // Cap at 10 years

  return Math.min(depreciation, asset.purchaseCost * 0.9); // Max 90% depreciation
};

/**
 * Calculate risk score based on asset condition and utilization
 */
const calculateRiskScore = (asset: Asset): number => {
  let riskScore = 0;

  // Age factor (older = higher risk)
  const purchaseDate = new Date(
    asset.purchasedDate.year,
    asset.purchasedDate.month - 1,
    asset.purchasedDate.day
  );
  const ageInYears = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  if (ageInYears > 10) riskScore += 40;
  else if (ageInYears > 5) riskScore += 20;
  else if (ageInYears > 2) riskScore += 10;

  // Category risk factor
  const highRiskCategories = ['Motor Vehicle', 'Plant/Generator', 'Office Equipment'];
  if (highRiskCategories.includes(asset.category)) {
    riskScore += 20;
  }

  // Status factor
  if (asset.status === 'rejected') riskScore += 30;
  else if (asset.status === 'pending') riskScore += 10;

  // Value depreciation factor
  if (asset.marketValue && asset.purchaseCost) {
    const valueRatio = asset.marketValue / asset.purchaseCost;
    if (valueRatio < 0.3) riskScore += 20;
    else if (valueRatio < 0.5) riskScore += 10;
  }

  return Math.min(riskScore, 100);
};

/**
 * Fetch assets with optional filters
 */
export const fetchAssetsForReport = async (
  filters: ReportFilters,
  isMinistryAdmin: boolean,
  userMinistryId?: string
): Promise<Asset[]> => {
  try {
    const assetsRef = collection(db, ASSETS_COLLECTION);
    let assets: Asset[] = [];

    // Base query
    const querySnapshot = await getDocs(assetsRef);
    assets = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Asset[];

    // Ministry-level filtering
    if (isMinistryAdmin && userMinistryId) {
      assets = assets.filter((a) => a.ministryId === userMinistryId);
    } else if (filters.ministryIds && filters.ministryIds.length > 0) {
      assets = assets.filter((a) => filters.ministryIds?.includes(a.ministryId || ''));
    } else if (filters.ministryId) {
      assets = assets.filter((a) => a.ministryId === filters.ministryId);
    }

    // Apply additional filters
    if (filters.assetTypes && filters.assetTypes.length > 0) {
      assets = assets.filter((a) => filters.assetTypes?.includes(a.category));
    }

    if (filters.statuses && filters.statuses.length > 0) {
      assets = assets.filter((a) => filters.statuses?.includes(a.status));
    }

    if (filters.locations && filters.locations.length > 0) {
      assets = assets.filter((a) =>
        filters.locations?.some((loc) => a.location?.toLowerCase().includes(loc.toLowerCase()))
      );
    }

    if (filters.dateFrom) {
      assets = assets.filter((a) => {
        const assetDate = new Date(
          a.purchasedDate.year,
          a.purchasedDate.month - 1,
          a.purchasedDate.day
        );
        return assetDate >= filters.dateFrom!;
      });
    }

    if (filters.dateTo) {
      assets = assets.filter((a) => {
        const assetDate = new Date(
          a.purchasedDate.year,
          a.purchasedDate.month - 1,
          a.purchasedDate.day
        );
        return assetDate <= filters.dateTo!;
      });
    }

    return assets;
  } catch (error: any) {
    console.error('Error fetching assets for report:', error);
    throw new Error('Failed to fetch asset data for report');
  }
};

/**
 * Fetch audit logs with optional filters
 */
export const fetchAuditLogsForReport = async (
  filters: ReportFilters,
  _isMinistryAdmin: boolean,
  _userMinistryId?: string
): Promise<AuditLogEntry[]> => {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
    const q = query(logsRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);

    let logs: AuditLogEntry[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action,
        user: data.userEmail || data.userId,
        timestamp: data.timestamp?.toDate() || new Date(),
        resourceType: data.resourceType,
        resourceId: data.resourceId || '',
        details: data.details,
      };
    });

    // Filter by date range if specified
    if (filters.dateFrom) {
      logs = logs.filter((log) => log.timestamp >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      logs = logs.filter((log) => log.timestamp <= filters.dateTo!);
    }

    return logs.slice(0, 500); // Limit to 500 entries
  } catch (error: any) {
    console.error('Error fetching audit logs for report:', error);
    throw new Error('Failed to fetch audit data for report');
  }
};

/**
 * Generate Asset Inventory Report Data
 */
export const generateAssetInventoryReport = async (
  filters: ReportFilters,
  isMinistryAdmin: boolean,
  userMinistryId?: string
): Promise<AssetInventoryData> => {
  const assets = await fetchAssetsForReport(filters, isMinistryAdmin, userMinistryId);

  // Calculate totals
  const totalValue = assets.reduce((sum, a) => sum + (a.marketValue || a.purchaseCost || 0), 0);

  // Group by type
  const typeMap = new Map<string, { count: number; value: number }>();
  assets.forEach((asset) => {
    const current = typeMap.get(asset.category) || { count: 0, value: 0 };
    typeMap.set(asset.category, {
      count: current.count + 1,
      value: current.value + (asset.marketValue || asset.purchaseCost || 0),
    });
  });

  const byType = Array.from(typeMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    value: data.value,
  }));

  // Group by status
  const statusMap = new Map<string, number>();
  assets.forEach((asset) => {
    statusMap.set(asset.status, (statusMap.get(asset.status) || 0) + 1);
  });

  const byStatus = Array.from(statusMap.entries()).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count,
  }));

  // Group by ministry
  const ministryMap = new Map<string, { count: number; value: number }>();
  assets.forEach((asset) => {
    const ministry = asset.agencyName || 'Unknown';
    const current = ministryMap.get(ministry) || { count: 0, value: 0 };
    ministryMap.set(ministry, {
      count: current.count + 1,
      value: current.value + (asset.marketValue || asset.purchaseCost || 0),
    });
  });

  const byMinistry = Array.from(ministryMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      value: data.value,
    }))
    .sort((a, b) => b.count - a.count);

  // Group by location
  const locationMap = new Map<string, number>();
  assets.forEach((asset) => {
    const location = asset.location || 'Unknown';
    locationMap.set(location, (locationMap.get(location) || 0) + 1);
  });

  const byLocation = Array.from(locationMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get high-risk assets
  const assetsWithRisk = assets.map((asset) => ({
    ...asset,
    riskScore: calculateRiskScore(asset),
  }));

  const topHighRiskAssets: AssetSummary[] = assetsWithRisk
    .filter((a) => a.riskScore >= 50)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map((a) => ({
      id: a.id || a.assetId,
      name: a.description,
      type: a.category,
      location: a.location,
      status: a.status,
      acquisitionCost: a.purchaseCost,
      currentValue: a.marketValue || a.purchaseCost - calculateDepreciation(a),
      riskScore: a.riskScore,
      ministry: a.agencyName,
    }));

  // Asset summaries for table
  const assetSummaries: AssetSummary[] = assets.map((a) => ({
    id: a.id || a.assetId,
    name: a.description,
    type: a.category,
    location: a.location,
    status: a.status,
    acquisitionCost: a.purchaseCost,
    currentValue: a.marketValue || a.purchaseCost - calculateDepreciation(a),
    riskScore: calculateRiskScore(a),
    ministry: a.agencyName,
  }));

  return {
    totalAssets: assets.length,
    totalValue,
    byType,
    byStatus,
    byMinistry,
    byLocation,
    topHighRiskAssets,
    assets: assetSummaries,
  };
};

/**
 * Generate Valuation & Depreciation Report Data
 */
export const generateValuationReport = async (
  filters: ReportFilters,
  isMinistryAdmin: boolean,
  userMinistryId?: string
): Promise<ValuationData> => {
  const assets = await fetchAssetsForReport(filters, isMinistryAdmin, userMinistryId);

  // Calculate totals
  const totalAcquisitionCost = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
  const totalDepreciationAmount = assets.reduce((sum, a) => sum + calculateDepreciation(a), 0);
  const totalCurrentValue = assets.reduce(
    (sum, a) => sum + (a.marketValue || a.purchaseCost - calculateDepreciation(a)),
    0
  );

  const depreciationRate =
    totalAcquisitionCost > 0 ? (totalDepreciationAmount / totalAcquisitionCost) * 100 : 0;

  // Projected loss (simplified: 10% of current depreciable assets)
  const projectedLossNextYear = totalCurrentValue * 0.1;

  // Group by type with depreciation
  const typeMap = new Map<
    string,
    { acquisitionCost: number; currentValue: number; depreciation: number }
  >();
  assets.forEach((asset) => {
    const depreciation = calculateDepreciation(asset);
    const current = typeMap.get(asset.category) || {
      acquisitionCost: 0,
      currentValue: 0,
      depreciation: 0,
    };
    typeMap.set(asset.category, {
      acquisitionCost: current.acquisitionCost + (asset.purchaseCost || 0),
      currentValue:
        current.currentValue + (asset.marketValue || asset.purchaseCost - depreciation),
      depreciation: current.depreciation + depreciation,
    });
  });

  const byType = Array.from(typeMap.entries()).map(([name, data]) => ({
    name,
    ...data,
  }));

  // Group by ministry
  const ministryMap = new Map<string, { acquisitionCost: number; currentValue: number }>();
  assets.forEach((asset) => {
    const ministry = asset.agencyName || 'Unknown';
    const current = ministryMap.get(ministry) || { acquisitionCost: 0, currentValue: 0 };
    ministryMap.set(ministry, {
      acquisitionCost: current.acquisitionCost + (asset.purchaseCost || 0),
      currentValue:
        current.currentValue +
        (asset.marketValue || asset.purchaseCost - calculateDepreciation(asset)),
    });
  });

  const byMinistry = Array.from(ministryMap.entries())
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => b.acquisitionCost - a.acquisitionCost);

  // Generate value trend (last 12 months simulation)
  const valueTrend: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    // Simulate value trend (in production, this would be historical data)
    const factor = 1 - (i * 0.008); // Slight depreciation over time
    valueTrend.push({
      date: monthStr,
      value: Math.round(totalCurrentValue * factor),
    });
  }

  // Depreciation by method (simplified)
  const depreciationByMethod = [
    { method: 'Straight Line', count: Math.floor(assets.length * 0.6), totalDepreciation: totalDepreciationAmount * 0.6 },
    { method: 'Declining Balance', count: Math.floor(assets.length * 0.3), totalDepreciation: totalDepreciationAmount * 0.3 },
    { method: 'Sum of Years', count: Math.floor(assets.length * 0.1), totalDepreciation: totalDepreciationAmount * 0.1 },
  ];

  // Underutilized assets (high depreciation, low market value)
  const underutilizedAssets: AssetSummary[] = assets
    .filter((a) => {
      const depreciation = calculateDepreciation(a);
      const currentValue = a.marketValue || a.purchaseCost - depreciation;
      return currentValue < a.purchaseCost * 0.4; // Less than 40% of original value
    })
    .slice(0, 10)
    .map((a) => ({
      id: a.id || a.assetId,
      name: a.description,
      type: a.category,
      location: a.location,
      status: a.status,
      acquisitionCost: a.purchaseCost,
      currentValue: a.marketValue || a.purchaseCost - calculateDepreciation(a),
      ministry: a.agencyName,
    }));

  return {
    totalAcquisitionCost,
    totalCurrentValue,
    totalDepreciation: totalDepreciationAmount,
    depreciationRate,
    projectedLossNextYear,
    byType,
    byMinistry,
    valueTrend,
    depreciationByMethod,
    underutilizedAssets,
  };
};

/**
 * Generate Audit & Compliance Report Data
 */
export const generateAuditReport = async (
  filters: ReportFilters,
  isMinistryAdmin: boolean,
  userMinistryId?: string
): Promise<AuditData> => {
  const logs = await fetchAuditLogsForReport(filters, isMinistryAdmin, userMinistryId);

  // Actions by type
  const actionTypeMap = new Map<string, number>();
  logs.forEach((log) => {
    actionTypeMap.set(log.action, (actionTypeMap.get(log.action) || 0) + 1);
  });

  const actionsByType = Array.from(actionTypeMap.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);

  // Actions by user
  const userMap = new Map<string, number>();
  logs.forEach((log) => {
    userMap.set(log.user, (userMap.get(log.user) || 0) + 1);
  });

  const actionsByUser = Array.from(userMap.entries())
    .map(([user, count]) => ({ user, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Actions by month
  const monthMap = new Map<string, number>();
  logs.forEach((log) => {
    const monthStr = log.timestamp.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthMap.set(monthStr, (monthMap.get(monthStr) || 0) + 1);
  });

  const actionsByMonth = Array.from(monthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .slice(0, 12);

  // Calculate approval metrics
  const approveActions = logs.filter((l) => l.action.includes('approve')).length;
  const rejectActions = logs.filter((l) => l.action.includes('reject')).length;
  const pendingCount = logs.filter((l) => l.action.includes('pending') || l.action.includes('upload')).length;
  const totalDecisions = approveActions + rejectActions;

  const approvalRate = totalDecisions > 0 ? (approveActions / totalDecisions) * 100 : 0;
  const rejectionRate = totalDecisions > 0 ? (rejectActions / totalDecisions) * 100 : 0;

  // Detect anomalies
  const anomalies: AuditAnomaly[] = [];

  // Check for high rejection rates by user
  const userRejections = new Map<string, number>();
  logs.filter((l) => l.action.includes('reject')).forEach((log) => {
    userRejections.set(log.user, (userRejections.get(log.user) || 0) + 1);
  });

  userRejections.forEach((count, user) => {
    if (count >= 5) {
      anomalies.push({
        type: 'High Rejection Rate',
        description: `${user} has ${count} rejected submissions`,
        severity: count >= 10 ? 'high' : 'medium',
        user,
        count,
        recommendation: 'Review submission quality or provide additional training',
      });
    }
  });

  // Check for unusual activity patterns
  const hourlyActivity = new Map<number, number>();
  logs.forEach((log) => {
    const hour = log.timestamp.getHours();
    hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
  });

  hourlyActivity.forEach((count, hour) => {
    if ((hour < 6 || hour > 22) && count > 10) {
      anomalies.push({
        type: 'Off-Hours Activity',
        description: `${count} actions performed during non-business hours (${hour}:00)`,
        severity: 'low',
        recommendation: 'Verify if off-hours access is authorized',
      });
    }
  });

  // Uploader-approver network (simplified)
  const networkMap = new Map<string, number>();
  // This would require more complex tracking in production
  const uploaderApproverNetwork = Array.from(networkMap.entries())
    .map(([key, count]) => {
      const [uploader, approver] = key.split('->');
      return { uploader, approver, count };
    })
    .slice(0, 10);

  return {
    totalActions: logs.length,
    actionsByType,
    actionsByUser,
    actionsByMonth,
    approvalRate,
    rejectionRate,
    pendingCount,
    flaggedAnomalies: anomalies,
    recentActions: logs.slice(0, 50),
    uploaderApproverNetwork,
  };
};

/**
 * Generate Utilization & Risk Report Data
 */
export const generateUtilizationReport = async (
  filters: ReportFilters,
  isMinistryAdmin: boolean,
  userMinistryId?: string
): Promise<UtilizationData> => {
  const assets = await fetchAssetsForReport(filters, isMinistryAdmin, userMinistryId);

  // Calculate risk scores for all assets
  const assetsWithMetrics = assets.map((asset) => ({
    ...asset,
    riskScore: calculateRiskScore(asset),
    conditionScore: 100 - calculateRiskScore(asset), // Inverse of risk
    utilizationPct: Math.random() * 100, // Would be tracked in production
  }));

  // Calculate averages
  const avgUtilization =
    assetsWithMetrics.length > 0
      ? assetsWithMetrics.reduce((sum, a) => sum + a.utilizationPct, 0) / assetsWithMetrics.length
      : 0;

  const avgCondition =
    assetsWithMetrics.length > 0
      ? assetsWithMetrics.reduce((sum, a) => sum + a.conditionScore, 0) / assetsWithMetrics.length
      : 0;

  const avgRisk =
    assetsWithMetrics.length > 0
      ? assetsWithMetrics.reduce((sum, a) => sum + a.riskScore, 0) / assetsWithMetrics.length
      : 0;

  // Risk distribution
  const byRiskLevel = [
    {
      level: 'Low Risk (0-30)',
      count: assetsWithMetrics.filter((a) => a.riskScore <= 30).length,
      color: '#4caf50',
    },
    {
      level: 'Medium Risk (31-60)',
      count: assetsWithMetrics.filter((a) => a.riskScore > 30 && a.riskScore <= 60).length,
      color: '#ff9800',
    },
    {
      level: 'High Risk (61-100)',
      count: assetsWithMetrics.filter((a) => a.riskScore > 60).length,
      color: '#f44336',
    },
  ];

  // Condition distribution
  const byCondition = [
    { condition: 'Excellent', count: assetsWithMetrics.filter((a) => a.conditionScore >= 80).length },
    {
      condition: 'Good',
      count: assetsWithMetrics.filter((a) => a.conditionScore >= 60 && a.conditionScore < 80).length,
    },
    {
      condition: 'Fair',
      count: assetsWithMetrics.filter((a) => a.conditionScore >= 40 && a.conditionScore < 60).length,
    },
    { condition: 'Poor', count: assetsWithMetrics.filter((a) => a.conditionScore < 40).length },
  ];

  // Underutilized assets
  const underutilizedAssets: AssetSummary[] = assetsWithMetrics
    .filter((a) => a.utilizationPct < 30)
    .slice(0, 10)
    .map((a) => ({
      id: a.id || a.assetId,
      name: a.description,
      type: a.category,
      location: a.location,
      status: a.status,
      acquisitionCost: a.purchaseCost,
      currentValue: a.marketValue || a.purchaseCost - calculateDepreciation(a),
      ministry: a.agencyName,
    }));

  // High-risk assets
  const highRiskAssets: AssetSummary[] = assetsWithMetrics
    .filter((a) => a.riskScore >= 60)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map((a) => ({
      id: a.id || a.assetId,
      name: a.description,
      type: a.category,
      location: a.location,
      status: a.status,
      acquisitionCost: a.purchaseCost,
      currentValue: a.marketValue || a.purchaseCost - calculateDepreciation(a),
      riskScore: a.riskScore,
      ministry: a.agencyName,
    }));

  // Potential savings (underutilized assets value)
  const potentialSavings = underutilizedAssets.reduce((sum, a) => sum + a.currentValue, 0);

  // Asset health radar data
  const assetHealthRadar = [
    { metric: 'Utilization', value: avgUtilization },
    { metric: 'Condition', value: avgCondition },
    { metric: 'Compliance', value: 100 - avgRisk },
    { metric: 'Maintenance', value: 100 - avgRisk * 0.5 },
    { metric: 'Documentation', value: 85 }, // Would be calculated in production
  ];

  // Location risk map
  const locationMap = new Map<string, { riskScore: number; count: number }>();
  assetsWithMetrics.forEach((asset) => {
    const location = asset.location || 'Unknown';
    const current = locationMap.get(location) || { riskScore: 0, count: 0 };
    locationMap.set(location, {
      riskScore: current.riskScore + asset.riskScore,
      count: current.count + 1,
    });
  });

  const locationRiskMap = Array.from(locationMap.entries())
    .map(([location, data]) => ({
      location,
      riskScore: Math.round(data.riskScore / data.count),
      assetCount: data.count,
    }))
    .sort((a, b) => b.riskScore - a.riskScore);

  return {
    averageUtilization: Math.round(avgUtilization),
    averageConditionScore: Math.round(avgCondition),
    averageRiskScore: Math.round(avgRisk),
    byRiskLevel,
    byCondition,
    underutilizedAssets,
    highRiskAssets,
    potentialSavings,
    assetHealthRadar,
    locationRiskMap,
  };
};

/**
 * Generate insights based on report data
 */
export const generateReportInsights = (
  reportType: ReportType,
  data: AssetInventoryData | ValuationData | AuditData | UtilizationData
): ReportInsight[] => {
  const insights: ReportInsight[] = [];

  if (reportType === 'asset_inventory') {
    const invData = data as AssetInventoryData;
    insights.push({
      type: 'info',
      title: 'Total Asset Base',
      description: `Managing ${invData.totalAssets} assets with total value of ${formatCurrency(invData.totalValue)}`,
      value: invData.totalAssets,
    });

    if (invData.topHighRiskAssets.length > 0) {
      insights.push({
        type: 'warning',
        title: 'High-Risk Assets Detected',
        description: `${invData.topHighRiskAssets.length} assets have risk scores above 50%`,
        recommendation: 'Review and address high-risk assets to prevent potential losses',
      });
    }
  }

  if (reportType === 'valuation_depreciation') {
    const valData = data as ValuationData;
    insights.push({
      type: 'info',
      title: 'Total Depreciation',
      description: `Assets have depreciated by ${formatCurrency(valData.totalDepreciation)} (${valData.depreciationRate.toFixed(1)}%)`,
      value: formatCurrency(valData.totalDepreciation),
    });

    if (valData.projectedLossNextYear > 0) {
      insights.push({
        type: 'warning',
        title: 'Projected Value Loss',
        description: `Estimated ${formatCurrency(valData.projectedLossNextYear)} in depreciation over the next year`,
        recommendation: 'Consider disposal or replacement of heavily depreciated assets',
      });
    }

    if (valData.underutilizedAssets.length > 0) {
      const totalUnderutilizedValue = valData.underutilizedAssets.reduce(
        (sum, a) => sum + a.currentValue,
        0
      );
      insights.push({
        type: 'danger',
        title: 'Underutilized Assets',
        description: `${valData.underutilizedAssets.length} assets valued at ${formatCurrency(totalUnderutilizedValue)} are significantly undervalued`,
        recommendation: 'Evaluate for disposal or reallocation to optimize returns',
      });
    }
  }

  if (reportType === 'audit_compliance') {
    const auditData = data as AuditData;
    insights.push({
      type: 'info',
      title: 'Audit Activity',
      description: `${auditData.totalActions} actions recorded in the selected period`,
      value: auditData.totalActions,
    });

    if (auditData.approvalRate > 80) {
      insights.push({
        type: 'success',
        title: 'High Approval Rate',
        description: `${auditData.approvalRate.toFixed(1)}% of submissions were approved`,
        value: `${auditData.approvalRate.toFixed(1)}%`,
      });
    }

    if (auditData.flaggedAnomalies.length > 0) {
      const highSeverity = auditData.flaggedAnomalies.filter((a) => a.severity === 'high').length;
      insights.push({
        type: highSeverity > 0 ? 'danger' : 'warning',
        title: 'Anomalies Detected',
        description: `${auditData.flaggedAnomalies.length} potential issues identified (${highSeverity} high severity)`,
        recommendation: 'Review flagged anomalies for potential compliance issues',
      });
    }
  }

  if (reportType === 'utilization_risk') {
    const utilData = data as UtilizationData;
    insights.push({
      type: utilData.averageUtilization >= 60 ? 'success' : 'warning',
      title: 'Average Utilization',
      description: `Assets are utilized at ${utilData.averageUtilization}% on average`,
      value: `${utilData.averageUtilization}%`,
    });

    if (utilData.potentialSavings > 0) {
      insights.push({
        type: 'info',
        title: 'Optimization Opportunity',
        description: `Potential savings of ${formatCurrency(utilData.potentialSavings)} from underutilized assets`,
        recommendation: 'Consider reallocating or disposing of underutilized assets',
      });
    }

    if (utilData.highRiskAssets.length > 0) {
      insights.push({
        type: 'danger',
        title: 'Risk Alert',
        description: `${utilData.highRiskAssets.length} assets require immediate attention due to high risk scores`,
        recommendation: 'Prioritize maintenance or replacement of high-risk assets',
      });
    }
  }

  return insights;
};

/**
 * Generate a complete report
 */
export const generateReport = async (
  filters: ReportFilters,
  _userId: string,
  userEmail: string,
  isMinistryAdmin: boolean,
  userMinistryId?: string,
  ministryName?: string
): Promise<GeneratedReport> => {
  let data: AssetInventoryData | ValuationData | AuditData | UtilizationData;

  switch (filters.reportType) {
    case 'asset_inventory':
      data = await generateAssetInventoryReport(filters, isMinistryAdmin, userMinistryId);
      break;
    case 'valuation_depreciation':
      data = await generateValuationReport(filters, isMinistryAdmin, userMinistryId);
      break;
    case 'audit_compliance':
      data = await generateAuditReport(filters, isMinistryAdmin, userMinistryId);
      break;
    case 'utilization_risk':
      data = await generateUtilizationReport(filters, isMinistryAdmin, userMinistryId);
      break;
    case 'custom':
    default:
      data = await generateAssetInventoryReport(filters, isMinistryAdmin, userMinistryId);
      break;
  }

  const insights = generateReportInsights(filters.reportType, data);

  return {
    id: `report_${Date.now()}`,
    title: getReportTitle(filters.reportType),
    type: filters.reportType,
    generatedAt: new Date(),
    generatedBy: userEmail,
    filters,
    scope: isMinistryAdmin ? 'ministry' : 'all',
    ministryName,
    data,
    insights,
  };
};

/**
 * Get report title based on type
 */
const getReportTitle = (type: ReportType): string => {
  const titles: Record<ReportType, string> = {
    asset_inventory: 'Asset Inventory Report',
    valuation_depreciation: 'Valuation & Depreciation Report',
    audit_compliance: 'Audit & Compliance Report',
    utilization_risk: 'Utilization & Risk Analysis Report',
    custom: 'Custom Report',
  };
  return titles[type];
};

/**
 * Get all unique locations from assets
 */
export const getUniqueLocations = async (): Promise<string[]> => {
  try {
    const assetsRef = collection(db, ASSETS_COLLECTION);
    const querySnapshot = await getDocs(assetsRef);

    const locations = new Set<string>();
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.location) {
        locations.add(data.location);
      }
    });

    return Array.from(locations).sort();
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
};

/**
 * Get all ministries for filter dropdown
 */
export const getMinistriesForFilter = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const ministriesRef = collection(db, MINISTRIES_COLLECTION);
    const querySnapshot = await getDocs(ministriesRef);

    return querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        name: doc.data().name || 'Unknown Ministry',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching ministries:', error);
    return [];
  }
};
