// Tier configuration - limits are defined but NOT enforced yet
// This file serves as the structure for future premium features

export const TIER_CONFIG = {
  free: {
    name: "Free",
    maxFileSize: 2 * 1024 * 1024, // 2MB (not enforced yet)
    maxRows: 5000, // (not enforced yet)
    features: {
      basicCharts: true,
      aiSummary: true,
      pdfExport: true,
      pdfWatermark: true, // watermark always shown for free tier
      savedProjects: false,
      apiAccess: false,
      priorityProcessing: false,
    },
    description: "Perfect for quick analysis",
  },
  premium: {
    name: "Premium",
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxRows: 200000,
    features: {
      basicCharts: true,
      aiSummary: true,
      pdfExport: true,
      pdfWatermark: false, // no watermark for premium
      savedProjects: true,
      apiAccess: false, // separate add-on
      priorityProcessing: true,
    },
    description: "For power users and teams",
  },
  enterprise: {
    name: "Enterprise",
    maxFileSize: -1, // unlimited
    maxRows: -1, // unlimited
    features: {
      basicCharts: true,
      aiSummary: true,
      pdfExport: true,
      pdfWatermark: false,
      savedProjects: true,
      apiAccess: true,
      priorityProcessing: true,
    },
    description: "Custom solutions for large organizations",
  },
} as const;

export const BETA_INFO = {
  isBeta: true,
  version: "0.1.0",
  freeForeverFeatures: [
    "Small file uploads (up to 2MB)",
    "Basic chart generation",
    "AI-powered insights",
    "PDF export (with watermark)",
  ],
  upcomingPremiumFeatures: [
    "Large file support (up to 50MB)",
    "Saved projects",
    "Watermark-free exports",
    "Priority processing",
    "API access (coming soon)",
  ],
};

export type TierName = keyof typeof TIER_CONFIG;
