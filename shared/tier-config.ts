// =============================================================================
// CSVVIZ TIER CONFIGURATION
// =============================================================================
// Master paywall flag - set to true to enable tier restrictions
// During beta, this is false so all features are available
// =============================================================================

export const PAYWALL_ENABLED = false;

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export const TIER_CONFIG = {
  free: {
    name: "Free",
    displayName: "Free Plan",
    limits: {
      maxFileSize: 1 * 1024 * 1024, // 1MB
      maxRows: 5000,
      maxChartsPerSession: 1, // single chart at a time
    },
    features: {
      // Visualization
      tableView: true,
      basicCharts: true, // bar, line, pie
      advancedCharts: false, // scatter, histogram, box plot, correlation, trend lines
      multiChartDashboard: false,
      
      // Analysis
      basicStats: true, // count, min, max, average
      advancedStats: false, // correlations, outlier detection, column profiling
      dataQualityChecks: false,
      autoInsights: false,
      
      // Data manipulation
      basicSorting: true,
      basicFiltering: true,
      
      // Export
      exportCharts: true,
      exportData: true,
      exportWatermark: true, // watermark always shown for free
      
      // Account features
      savedProjects: false,
      shareLinks: false, // persistent share links
      priorityProcessing: false,
      apiAccess: false,
    },
    description: "Perfect for quick analysis of small datasets",
    cta: "Get Started Free",
  },
  pro: {
    name: "Pro",
    displayName: "Pro Plan",
    limits: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxRows: 100000,
      maxChartsPerSession: -1, // unlimited
    },
    features: {
      // Visualization
      tableView: true,
      basicCharts: true,
      advancedCharts: true,
      multiChartDashboard: true,
      
      // Analysis
      basicStats: true,
      advancedStats: true,
      dataQualityChecks: true,
      autoInsights: true,
      
      // Data manipulation
      basicSorting: true,
      basicFiltering: true,
      
      // Export
      exportCharts: true,
      exportData: true,
      exportWatermark: false, // no watermark for Pro
      
      // Account features
      savedProjects: true,
      shareLinks: true,
      priorityProcessing: true,
      apiAccess: false, // future add-on
    },
    description: "For power users who need deeper analysis",
    cta: "Upgrade to Pro",
    price: {
      monthly: 12,
      yearly: 99, // ~$8.25/month
      currency: "USD",
    },
  },
  enterprise: {
    name: "Enterprise",
    displayName: "Enterprise Plan",
    limits: {
      maxFileSize: -1, // unlimited
      maxRows: -1, // unlimited
      maxChartsPerSession: -1,
    },
    features: {
      tableView: true,
      basicCharts: true,
      advancedCharts: true,
      multiChartDashboard: true,
      basicStats: true,
      advancedStats: true,
      dataQualityChecks: true,
      autoInsights: true,
      basicSorting: true,
      basicFiltering: true,
      exportCharts: true,
      exportData: true,
      exportWatermark: false,
      savedProjects: true,
      shareLinks: true,
      priorityProcessing: true,
      apiAccess: true,
    },
    description: "Custom solutions for large organizations",
    cta: "Contact Sales",
  },
} as const;

// =============================================================================
// FEATURE METADATA (for UI display)
// =============================================================================

export const FEATURE_METADATA = {
  // Chart types
  advancedCharts: {
    label: "Advanced Charts",
    description: "Scatter plots, histograms, box plots, correlation views, trend lines",
    tier: "pro" as const,
  },
  multiChartDashboard: {
    label: "Multi-Chart Dashboard",
    description: "View and compare multiple charts simultaneously",
    tier: "pro" as const,
  },
  
  // Analysis features
  advancedStats: {
    label: "Advanced Statistics",
    description: "Correlations, outlier detection, column profiling",
    tier: "pro" as const,
  },
  dataQualityChecks: {
    label: "Data Quality Checks",
    description: "Automatic detection of data issues and inconsistencies",
    tier: "pro" as const,
  },
  autoInsights: {
    label: "Auto-Insights",
    description: "AI-powered automatic discovery of patterns and trends",
    tier: "pro" as const,
  },
  
  // Export features
  exportWatermark: {
    label: "Watermark-Free Exports",
    description: "Export charts and PDFs without CSVVIZ watermark",
    tier: "pro" as const,
  },
  
  // Account features
  savedProjects: {
    label: "Saved Projects",
    description: "Save and return to your analysis projects",
    tier: "pro" as const,
  },
  shareLinks: {
    label: "Share Links",
    description: "Create persistent links to share your analysis",
    tier: "pro" as const,
  },
  priorityProcessing: {
    label: "Priority Processing",
    description: "Faster file processing and analysis",
    tier: "pro" as const,
  },
  apiAccess: {
    label: "API Access",
    description: "Programmatic access to CSVVIZ analysis",
    tier: "enterprise" as const,
  },
} as const;

// =============================================================================
// CHART TYPE CLASSIFICATION
// =============================================================================

export const CHART_TYPES = {
  basic: ["bar", "line", "pie"] as const,
  advanced: ["scatter", "histogram", "boxplot", "correlation", "area"] as const,
};

// =============================================================================
// BETA INFO
// =============================================================================

export const BETA_INFO = {
  isBeta: true,
  version: "0.1.0",
  message: "Free during beta! Basic features will always be free.",
  freeForeverFeatures: [
    "Small file uploads (up to 1MB)",
    "Basic bar, line, and pie charts",
    "Statistical summaries",
    "Sorting and filtering",
    "Export with watermark",
  ],
  upcomingProFeatures: [
    "Large file support (up to 100MB)",
    "Advanced charts (scatter, histogram, box plots)",
    "Correlation analysis & outlier detection",
    "Multi-chart dashboards",
    "Saved projects & share links",
    "Watermark-free exports",
    "Priority processing",
  ],
};

// =============================================================================
// TYPES
// =============================================================================

export type TierName = keyof typeof TIER_CONFIG;
export type FeatureName = keyof typeof TIER_CONFIG.free.features;
export type ChartType = typeof CHART_TYPES.basic[number] | typeof CHART_TYPES.advanced[number];
