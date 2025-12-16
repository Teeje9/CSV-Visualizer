// =============================================================================
// TIER UTILITY FUNCTIONS
// =============================================================================
// These functions check limits and feature access based on user's tier
// When PAYWALL_ENABLED is false, all features are unlocked (beta mode)
// =============================================================================

import { 
  PAYWALL_ENABLED, 
  TIER_CONFIG, 
  CHART_TYPES,
  type TierName, 
  type FeatureName,
  type ChartType 
} from "./tier-config";

// =============================================================================
// CURRENT USER TIER
// =============================================================================
// For now, this is a simple getter. Later this will integrate with auth
// to return the actual user's tier from their subscription status.

let currentUserTier: TierName = "free";

export function getCurrentTier(): TierName {
  return currentUserTier;
}

export function setCurrentTier(tier: TierName): void {
  currentUserTier = tier;
}

// =============================================================================
// FEATURE ACCESS CHECKS
// =============================================================================

/**
 * Check if a feature is available for the current user
 * When PAYWALL_ENABLED is false (beta), all features are available
 */
export function hasFeature(feature: FeatureName, tier?: TierName): boolean {
  if (!PAYWALL_ENABLED) {
    return true; // Beta mode: everything unlocked
  }
  
  const userTier = tier || getCurrentTier();
  const tierConfig = TIER_CONFIG[userTier];
  return tierConfig.features[feature] ?? false;
}

/**
 * Check if a feature is Pro-only (for showing badges/labels)
 * This returns true even in beta mode to show users what will be Pro later
 */
export function isProFeature(feature: FeatureName): boolean {
  return !TIER_CONFIG.free.features[feature] && TIER_CONFIG.pro.features[feature];
}

/**
 * Check if a feature is Enterprise-only
 */
export function isEnterpriseFeature(feature: FeatureName): boolean {
  return !TIER_CONFIG.pro.features[feature] && TIER_CONFIG.enterprise.features[feature];
}

/**
 * Get the minimum tier required for a feature
 */
export function getRequiredTier(feature: FeatureName): TierName {
  if (TIER_CONFIG.free.features[feature]) return "free";
  if (TIER_CONFIG.pro.features[feature]) return "pro";
  return "enterprise";
}

// =============================================================================
// LIMIT CHECKS
// =============================================================================

export interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  message?: string;
  upgradeRequired?: boolean;
}

/**
 * Check if file size is within limits
 */
export function checkFileSize(fileSizeBytes: number, tier?: TierName): LimitCheckResult {
  if (!PAYWALL_ENABLED) {
    return { allowed: true, limit: -1, current: fileSizeBytes };
  }
  
  const userTier = tier || getCurrentTier();
  const limit = TIER_CONFIG[userTier].limits.maxFileSize;
  
  if (limit === -1) {
    return { allowed: true, limit: -1, current: fileSizeBytes };
  }
  
  const allowed = fileSizeBytes <= limit;
  return {
    allowed,
    limit,
    current: fileSizeBytes,
    message: allowed 
      ? undefined 
      : `File size (${formatBytes(fileSizeBytes)}) exceeds ${TIER_CONFIG[userTier].name} limit of ${formatBytes(limit)}`,
    upgradeRequired: !allowed,
  };
}

/**
 * Check if row count is within limits
 */
export function checkRowCount(rowCount: number, tier?: TierName): LimitCheckResult {
  if (!PAYWALL_ENABLED) {
    return { allowed: true, limit: -1, current: rowCount };
  }
  
  const userTier = tier || getCurrentTier();
  const limit = TIER_CONFIG[userTier].limits.maxRows;
  
  if (limit === -1) {
    return { allowed: true, limit: -1, current: rowCount };
  }
  
  const allowed = rowCount <= limit;
  return {
    allowed,
    limit,
    current: rowCount,
    message: allowed
      ? undefined
      : `Row count (${rowCount.toLocaleString()}) exceeds ${TIER_CONFIG[userTier].name} limit of ${limit.toLocaleString()} rows`,
    upgradeRequired: !allowed,
  };
}

// =============================================================================
// CHART TYPE CHECKS
// =============================================================================

/**
 * Check if a chart type is available for the current tier
 */
export function isChartTypeAllowed(chartType: string, tier?: TierName): boolean {
  if (!PAYWALL_ENABLED) {
    return true;
  }
  
  const userTier = tier || getCurrentTier();
  
  // Basic charts are always allowed
  if ((CHART_TYPES.basic as readonly string[]).includes(chartType)) {
    return true;
  }
  
  // Advanced charts require Pro
  if ((CHART_TYPES.advanced as readonly string[]).includes(chartType)) {
    return hasFeature("advancedCharts", userTier);
  }
  
  // Unknown chart types default to allowed
  return true;
}

/**
 * Check if a chart type is Pro-only (for badges)
 */
export function isProChartType(chartType: string): boolean {
  return (CHART_TYPES.advanced as readonly string[]).includes(chartType);
}

/**
 * Get list of available chart types for current tier
 */
export function getAvailableChartTypes(tier?: TierName): string[] {
  if (!PAYWALL_ENABLED) {
    return [...(CHART_TYPES.basic as readonly string[]), ...(CHART_TYPES.advanced as readonly string[])];
  }
  
  const userTier = tier || getCurrentTier();
  const available: string[] = [...(CHART_TYPES.basic as readonly string[])];
  
  if (hasFeature("advancedCharts", userTier)) {
    available.push(...(CHART_TYPES.advanced as readonly string[]));
  }
  
  return available;
}

// =============================================================================
// EXPORT CHECKS
// =============================================================================

/**
 * Check if exports should include watermark
 */
export function shouldShowWatermark(tier?: TierName): boolean {
  if (!PAYWALL_ENABLED) {
    return false; // During beta, no watermark - all features unlocked
  }
  
  const userTier = tier || getCurrentTier();
  return TIER_CONFIG[userTier].features.exportWatermark;
}

// =============================================================================
// PAYWALL STATE
// =============================================================================

/**
 * Check if paywall is currently enabled
 */
export function isPaywallEnabled(): boolean {
  return PAYWALL_ENABLED;
}

/**
 * Check if we're in beta mode (paywall disabled)
 */
export function isBetaMode(): boolean {
  return !PAYWALL_ENABLED;
}

// =============================================================================
// UPGRADE PROMPTS
// =============================================================================

export interface UpgradePromptInfo {
  show: boolean;
  feature: string;
  title: string;
  description: string;
  requiredTier: TierName;
}

/**
 * Get upgrade prompt info for a blocked feature
 */
export function getUpgradePrompt(
  feature: FeatureName,
  customTitle?: string
): UpgradePromptInfo | null {
  if (!PAYWALL_ENABLED) {
    return null; // No prompts during beta
  }
  
  if (hasFeature(feature)) {
    return null; // User has access
  }
  
  const requiredTier = getRequiredTier(feature);
  const tierConfig = TIER_CONFIG[requiredTier];
  
  return {
    show: true,
    feature,
    title: customTitle || `Upgrade to ${tierConfig.name}`,
    description: `This feature requires a ${tierConfig.name} plan`,
    requiredTier,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export { formatBytes };
