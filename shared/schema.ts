import { z } from "zod";

export type BaseType = "numeric" | "categorical" | "temporal" | "boolean" | "text";

export type SemanticType = 
  | "currency" 
  | "percentage" 
  | "count" 
  | "measurement" 
  | "rate"
  | "id"
  | "timestamp"
  | "date"
  | "year"
  | "email"
  | "url"
  | "phone"
  | "zip_code"
  | "country"
  | "state"
  | "city"
  | "latitude"
  | "longitude"
  | "name"
  | "category"
  | "status"
  | "boolean"
  | "generic_numeric"
  | "generic_text";

export const columnInfoSchema = z.object({
  name: z.string(),
  baseType: z.enum(["numeric", "categorical", "temporal", "boolean", "text"]),
  semanticType: z.string(),
  format: z.string().optional(),
  unit: z.string().optional(),
  cardinality: z.number(),
  missingCount: z.number(),
  missingPercent: z.number(),
  uniquePercent: z.number(),
  sampleValues: z.array(z.string()),
});

export type ColumnInfo = z.infer<typeof columnInfoSchema>;

export const numericStatsSchema = z.object({
  column: z.string(),
  semanticType: z.string(),
  mean: z.number(),
  median: z.number(),
  min: z.number(),
  max: z.number(),
  stdDev: z.number(),
  total: z.number(),
  count: z.number(),
  unit: z.string().optional(),
});

export type NumericStats = z.infer<typeof numericStatsSchema>;

export const correlationSchema = z.object({
  column1: z.string(),
  column2: z.string(),
  coefficient: z.number(),
  strength: z.enum(["strong_positive", "moderate_positive", "weak_positive", "none", "weak_negative", "moderate_negative", "strong_negative"]),
  description: z.string(),
});

export type Correlation = z.infer<typeof correlationSchema>;

export const trendSchema = z.object({
  dateColumn: z.string(),
  valueColumn: z.string(),
  direction: z.enum(["increasing", "decreasing", "stable", "volatile"]),
  rateOfChange: z.number(),
  description: z.string(),
});

export type Trend = z.infer<typeof trendSchema>;

export const outlierSchema = z.object({
  column: z.string(),
  value: z.number(),
  index: z.number(),
  type: z.enum(["high", "low"]),
  zScore: z.number(),
  description: z.string(),
});

export type Outlier = z.infer<typeof outlierSchema>;

export const insightSchema = z.object({
  type: z.enum(["trend", "correlation", "statistic", "outlier", "pattern", "quality", "summary"]),
  icon: z.string(),
  title: z.string(),
  description: z.string(),
  importance: z.enum(["high", "medium", "low"]),
});

export type Insight = z.infer<typeof insightSchema>;

export const chartConfigSchema = z.object({
  id: z.string(),
  type: z.enum(["line", "bar", "scatter", "histogram", "area", "pie"]),
  title: z.string(),
  xAxis: z.string(),
  yAxis: z.string().optional(),
  data: z.array(z.record(z.union([z.string(), z.number()]))),
  priority: z.number().optional(),
});

export type ChartConfig = z.infer<typeof chartConfigSchema>;

export const dataQualitySchema = z.object({
  totalRows: z.number(),
  duplicateRows: z.number(),
  columnsWithMissing: z.array(z.object({
    column: z.string(),
    missingCount: z.number(),
    missingPercent: z.number(),
  })),
});

export type DataQuality = z.infer<typeof dataQualitySchema>;

export const analysisResultSchema = z.object({
  fileName: z.string(),
  rowCount: z.number(),
  columnCount: z.number(),
  columns: z.array(columnInfoSchema),
  numericStats: z.array(numericStatsSchema),
  correlations: z.array(correlationSchema),
  trends: z.array(trendSchema),
  outliers: z.array(outlierSchema),
  insights: z.array(insightSchema),
  charts: z.array(chartConfigSchema),
  dataQuality: dataQualitySchema.optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const uploadResponseSchema = z.object({
  success: z.boolean(),
  data: analysisResultSchema.optional(),
  error: z.string().optional(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
