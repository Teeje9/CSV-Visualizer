export interface LandingVariant {
  slug: string;
  title: string;
  description: string;
  headline: string;
  subheadline: string;
  features: {
    title: string;
    description: string;
  }[];
  useCases: string[];
  keywords: string[];
}

export const landingVariants: Record<string, LandingVariant> = {
  default: {
    slug: "",
    title: "DataViz - CSV to Beautiful Charts & Insights",
    description: "Transform your CSV and Excel files into stunning charts and auto-generated insights. No data analysis skills required.",
    headline: "Turn Data Into Insights in Seconds",
    subheadline: "Upload your CSV or Excel file and get beautiful charts with AI-powered analysis instantly",
    features: [
      {
        title: "Automatic Chart Generation",
        description: "Smart detection of your data types creates the perfect visualizations automatically"
      },
      {
        title: "AI-Powered Insights",
        description: "Get plain-English summaries of trends, correlations, and patterns in your data"
      },
      {
        title: "Statistical Analysis",
        description: "T-tests, ANOVA, PCA and more - advanced statistics made accessible"
      },
      {
        title: "Free PDF Export",
        description: "Download comprehensive reports with all charts and insights"
      }
    ],
    useCases: ["Business analytics", "Research data", "Survey results", "Financial reports"],
    keywords: ["csv visualization", "data analysis", "chart generator", "excel charts"]
  },
  "csv-charts": {
    slug: "csv-charts",
    title: "CSV to Charts - Instant Data Visualization Tool",
    description: "Convert CSV files to beautiful charts in seconds. Automatic chart type selection, no coding required. Free to use.",
    headline: "Convert CSV to Beautiful Charts",
    subheadline: "Drag and drop your CSV file to instantly generate line charts, bar charts, scatter plots and more",
    features: [
      {
        title: "Smart Chart Selection",
        description: "Automatically picks the best chart type based on your data columns"
      },
      {
        title: "Multiple Chart Types",
        description: "Line charts, bar charts, scatter plots, histograms - all generated automatically"
      },
      {
        title: "Custom Chart Builder",
        description: "Create your own charts with multi-axis support and custom configurations"
      },
      {
        title: "Export Options",
        description: "Download charts as PDF reports for presentations and sharing"
      }
    ],
    useCases: ["Data reports", "Presentations", "Quick analysis", "Data exploration"],
    keywords: ["csv to chart", "csv visualization", "convert csv", "csv graph maker"]
  },
  "excel-analysis": {
    slug: "excel-analysis",
    title: "Excel Data Analysis Tool - Visualize Spreadsheets Instantly",
    description: "Analyze Excel and CSV spreadsheets with automatic chart generation and AI insights. No formulas needed.",
    headline: "Excel Analysis Made Simple",
    subheadline: "Upload your spreadsheet and get instant visualizations with statistical insights",
    features: [
      {
        title: "Excel & CSV Support",
        description: "Works with .xlsx, .xls, .csv and .tsv files seamlessly"
      },
      {
        title: "Statistical Summaries",
        description: "Mean, median, standard deviation and more calculated automatically"
      },
      {
        title: "Correlation Detection",
        description: "Discover relationships between columns in your data"
      },
      {
        title: "Trend Analysis",
        description: "Identify increasing, decreasing or stable patterns"
      }
    ],
    useCases: ["Spreadsheet analysis", "Data cleanup", "Quick statistics", "Trend spotting"],
    keywords: ["excel analysis", "spreadsheet visualization", "excel charts", "data analysis tool"]
  },
  "sales-dashboard": {
    slug: "sales-dashboard",
    title: "Sales Data Visualization - Create Sales Dashboards Instantly",
    description: "Transform sales data into actionable insights. Upload your sales CSV and get charts, trends, and performance analysis.",
    headline: "Visualize Your Sales Data",
    subheadline: "Upload sales reports and instantly see performance trends, comparisons, and key metrics",
    features: [
      {
        title: "Performance Trends",
        description: "See sales growth, seasonality, and patterns over time"
      },
      {
        title: "Comparative Analysis",
        description: "Compare products, regions, or time periods automatically"
      },
      {
        title: "Key Metrics",
        description: "Total revenue, averages, and outlier detection built-in"
      },
      {
        title: "Shareable Reports",
        description: "Export professional PDF reports for stakeholders"
      }
    ],
    useCases: ["Sales reporting", "Revenue analysis", "Performance tracking", "Quarterly reviews"],
    keywords: ["sales dashboard", "sales visualization", "revenue charts", "sales analytics"]
  }
};

export function getVariant(slug: string): LandingVariant {
  return landingVariants[slug] || landingVariants.default;
}
