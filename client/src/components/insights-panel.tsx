import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { AnalysisResult, NumericStats, Correlation, Trend, Outlier } from "@shared/schema";

interface InsightsPanelProps {
  result: AnalysisResult;
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(2);
}

function OverviewSection({ result }: { result: AnalysisResult }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <p className="font-mono text-2xl font-semibold" data-testid="stat-rows">{result.rowCount.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Rows</p>
      </div>
      <div className="text-center">
        <p className="font-mono text-2xl font-semibold" data-testid="stat-columns">{result.columnCount}</p>
        <p className="text-xs text-muted-foreground">Columns</p>
      </div>
      <div className="text-center">
        <p className="font-mono text-2xl font-semibold" data-testid="stat-charts">{result.charts.length}</p>
        <p className="text-xs text-muted-foreground">Charts</p>
      </div>
    </div>
  );
}

function TrendItem({ trend }: { trend: Trend }) {
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-rose-500" />;
      case 'volatile': return <Activity className="w-4 h-4 text-amber-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5">{getTrendIcon(trend.direction)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{trend.valueColumn}</span>
          <span className="text-muted-foreground"> is </span>
          <span className={
            trend.direction === 'increasing' ? 'text-emerald-500' : 
            trend.direction === 'decreasing' ? 'text-rose-500' : 
            'text-amber-500'
          }>
            {trend.direction}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{trend.description}</p>
      </div>
    </div>
  );
}

function CorrelationItem({ correlation }: { correlation: Correlation }) {
  const strength = Math.abs(correlation.coefficient);
  const isPositive = correlation.coefficient > 0;
  
  return (
    <div className="flex items-center justify-between py-2 gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          <span className="font-medium">{correlation.column1}</span>
          <span className="text-muted-foreground"> vs </span>
          <span className="font-medium">{correlation.column2}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div 
            className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
        <span className={`font-mono text-xs ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {correlation.coefficient.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function OutlierItem({ column, outliers }: { column: string; outliers: Outlier[] }) {
  return (
    <div className="flex items-center justify-between py-2 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-sm font-medium truncate">{column}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {outliers.slice(0, 3).map((outlier, i) => (
          <Badge 
            key={i} 
            variant="outline"
            className="font-mono text-xs px-1.5 py-0"
            data-testid={`outlier-${column}-${i}`}
          >
            {formatNumber(outlier.value)}
          </Badge>
        ))}
        {outliers.length > 3 && (
          <span className="text-xs text-muted-foreground">+{outliers.length - 3}</span>
        )}
      </div>
    </div>
  );
}

function StatRow({ stat }: { stat: NumericStats }) {
  const [expanded, setExpanded] = useState(false);
  
  const formatWithUnit = (value: number) => {
    const formatted = formatNumber(value);
    if (stat.unit === '$' || stat.unit === '€' || stat.unit === '£') {
      return `${stat.unit}${formatted}`;
    }
    if (stat.unit === '%') {
      return `${formatted}%`;
    }
    return formatted;
  };
  
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full py-2.5 text-left hover-elevate rounded-md -mx-1 px-1"
        data-testid={`stat-toggle-${stat.column}`}
      >
        <span className="text-sm font-medium truncate">{stat.column}</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-sm text-muted-foreground">
            {formatWithUnit(stat.mean)} avg
          </span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {expanded && (
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 pb-3 pl-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Min</span>
            <span className="font-mono">{formatWithUnit(stat.min)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max</span>
            <span className="font-mono">{formatWithUnit(stat.max)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Median</span>
            <span className="font-mono">{formatWithUnit(stat.median)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Std Dev</span>
            <span className="font-mono">{formatNumber(stat.stdDev)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sum</span>
            <span className="font-mono">{formatWithUnit(stat.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mean</span>
            <span className="font-mono">{formatWithUnit(stat.mean)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">{count}</Badge>
        )}
      </div>
      {children}
    </div>
  );
}

export function InsightsPanel({ result }: InsightsPanelProps) {
  const outliersByColumn = (result.outliers || []).reduce((acc, outlier) => {
    if (!acc[outlier.column]) acc[outlier.column] = [];
    acc[outlier.column].push(outlier);
    return acc;
  }, {} as Record<string, Outlier[]>);

  const hasCorrelations = result.correlations.length > 0;
  const hasTrends = result.trends.length > 0;
  const hasOutliers = Object.keys(outliersByColumn).length > 0;
  const hasStats = result.numericStats.length > 0;

  return (
    <div className="p-4 md:p-5 space-y-6 h-full overflow-y-auto">
      <OverviewSection result={result} />
      
      {hasTrends && (
        <Section title="Trends" count={result.trends.length}>
          <div className="divide-y divide-border/50">
            {result.trends.map((trend, i) => (
              <TrendItem key={i} trend={trend} />
            ))}
          </div>
        </Section>
      )}

      {hasOutliers && (
        <Section title="Outliers" count={result.outliers?.length}>
          <div className="divide-y divide-border/50">
            {Object.entries(outliersByColumn).map(([column, outliers]) => (
              <OutlierItem key={column} column={column} outliers={outliers} />
            ))}
          </div>
        </Section>
      )}

      {hasCorrelations && (
        <Section title="Correlations" count={result.correlations.length}>
          <div className="divide-y divide-border/50">
            {result.correlations.slice(0, 5).map((corr, i) => (
              <CorrelationItem key={i} correlation={corr} />
            ))}
          </div>
        </Section>
      )}

      {hasStats && (
        <Section title="Statistics">
          <div>
            {result.numericStats.map((stat) => (
              <StatRow key={stat.column} stat={stat} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
