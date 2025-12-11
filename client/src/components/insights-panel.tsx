import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity,
  BarChart2,
  Lightbulb,
  Zap,
  Target,
  FileText,
  AlertTriangle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AnalysisResult, NumericStats, Insight, Correlation, Trend, Outlier } from "@shared/schema";

interface InsightsPanelProps {
  result: AnalysisResult;
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(2);
}

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="font-mono text-lg font-medium" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
    </div>
  );
}

function InsightBlock({ insight }: { insight: Insight }) {
  const getIcon = () => {
    switch (insight.icon) {
      case 'trending-up': return <TrendingUp className="w-4 h-4" />;
      case 'trending-down': return <TrendingDown className="w-4 h-4" />;
      case 'activity': return <Activity className="w-4 h-4" />;
      case 'target': return <Target className="w-4 h-4" />;
      case 'zap': return <Zap className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getBadgeVariant = () => {
    switch (insight.importance) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="p-4 rounded-lg bg-card border border-border hover-elevate" data-testid={`insight-${insight.type}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm">{insight.title}</span>
            <Badge variant={getBadgeVariant()} className="text-xs">
              {insight.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function NumericStatsSection({ stats }: { stats: NumericStats[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-medium text-lg">Column Statistics</h3>
      </div>
      
      {stats.map((stat) => (
        <div key={stat.column} className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{stat.column}</p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Mean" value={formatNumber(stat.mean)} />
            <StatCard label="Median" value={formatNumber(stat.median)} />
            <StatCard label="Min" value={formatNumber(stat.min)} />
            <StatCard label="Max" value={formatNumber(stat.max)} />
            <StatCard label="Std Dev" value={formatNumber(stat.stdDev)} />
            <StatCard label="Total" value={formatNumber(stat.total)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CorrelationsSection({ correlations }: { correlations: Correlation[] }) {
  if (correlations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-medium text-lg">Correlations</h3>
      </div>
      
      <div className="space-y-3">
        {correlations.map((corr, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span className="text-sm font-medium">
                {corr.column1} vs {corr.column2}
              </span>
              <span className="font-mono text-sm text-primary">
                r = {corr.coefficient.toFixed(3)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{corr.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendsSection({ trends }: { trends: Trend[] }) {
  if (trends.length === 0) return null;

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'volatile': return <Activity className="w-4 h-4 text-yellow-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-medium text-lg">Trends</h3>
      </div>
      
      <div className="space-y-3">
        {trends.map((trend, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(trend.direction)}
              <span className="text-sm font-medium">
                {trend.valueColumn} over {trend.dateColumn}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{trend.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutliersSection({ outliers }: { outliers: Outlier[] }) {
  if (outliers.length === 0) return null;

  const groupedByColumn = outliers.reduce((acc, outlier) => {
    if (!acc[outlier.column]) acc[outlier.column] = [];
    acc[outlier.column].push(outlier);
    return acc;
  }, {} as Record<string, Outlier[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-medium text-lg">Outliers Detected</h3>
      </div>
      
      <div className="space-y-3">
        {Object.entries(groupedByColumn).map(([column, columnOutliers]) => (
          <div key={column} className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{column}</span>
              <Badge variant="secondary" className="text-xs">
                {columnOutliers.length} outlier{columnOutliers.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {columnOutliers.slice(0, 5).map((outlier, i) => (
                <Badge 
                  key={i} 
                  variant={outlier.type === 'high' ? 'default' : 'secondary'}
                  className="font-mono text-xs"
                  data-testid={`outlier-${column}-${i}`}
                >
                  {outlier.type === 'high' ? 'High' : 'Low'}: {formatNumber(outlier.value)}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Values more than 2.5 standard deviations from the mean
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsPanel({ result }: InsightsPanelProps) {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Analysis Results</h2>
          <p className="text-sm text-muted-foreground">
            {result.rowCount.toLocaleString()} rows, {result.columnCount} columns
          </p>
        </div>
      </div>

      <Separator />

      {result.insights.length > 0 && (
        <>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-lg">Key Insights</h3>
            </div>
            <div className="space-y-3">
              {result.insights.map((insight, i) => (
                <InsightBlock key={i} insight={insight} />
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      <TrendsSection trends={result.trends} />
      
      {result.trends.length > 0 && <Separator />}

      <OutliersSection outliers={result.outliers || []} />
      
      {(result.outliers?.length || 0) > 0 && <Separator />}
      
      <CorrelationsSection correlations={result.correlations} />
      
      {result.correlations.length > 0 && <Separator />}
      
      <NumericStatsSection stats={result.numericStats} />
    </div>
  );
}
