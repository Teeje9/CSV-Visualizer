import { z } from "zod";
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Export usage tracking table
export const exportUsage = pgTable("export_usage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  yearMonth: varchar("year_month", { length: 7 }).notNull(), // Format: "2025-01"
  exportCount: integer("export_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ExportUsage = typeof exportUsage.$inferSelect;
export type InsertExportUsage = typeof exportUsage.$inferInsert;

// Analysis types (existing)
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
  rawData: z.array(z.record(z.string())).optional(),
  aiSummary: z.string().optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const uploadResponseSchema = z.object({
  success: z.boolean(),
  data: analysisResultSchema.optional(),
  error: z.string().optional(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
