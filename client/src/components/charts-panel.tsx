import { useRef, useCallback } from "react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  ScatterChart, 
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Circle, BarChart2, Download } from "lucide-react";
import type { ChartConfig } from "@shared/schema";

interface ChartsPanelProps {
  charts: ChartConfig[];
}

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(173, 80%, 40%)",
  "hsl(280, 65%, 60%)",
  "hsl(43, 95%, 50%)",
  "hsl(340, 75%, 55%)",
];

function getChartIcon(type: string) {
  switch (type) {
    case 'line': return <TrendingUp className="w-4 h-4" />;
    case 'bar': return <BarChart2 className="w-4 h-4" />;
    case 'scatter': return <Circle className="w-4 h-4" />;
    case 'histogram': return <BarChart3 className="w-4 h-4" />;
    default: return <BarChart3 className="w-4 h-4" />;
  }
}

function ChartTypeLabel({ type }: { type: string }) {
  return (
    <Badge variant="secondary" className="text-xs capitalize">
      {getChartIcon(type)}
      <span className="ml-1">{type}</span>
    </Badge>
  );
}

function formatAxisValue(value: any): string {
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(value % 1 === 0 ? 0 : 1);
  }
  if (typeof value === 'string' && value.length > 12) {
    return value.slice(0, 12) + '...';
  }
  return String(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover border border-popover-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium">{formatAxisValue(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function LineChartComponent({ config }: { config: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={config.data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis 
          dataKey={config.xAxis} 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickFormatter={formatAxisValue}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickFormatter={formatAxisValue}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
        />
        {config.yAxis && (
          <Line 
            type="monotone" 
            dataKey={config.yAxis} 
            stroke={CHART_COLORS[0]} 
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[0], strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartComponent({ config }: { config: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={config.data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis 
          dataKey={config.xAxis}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickFormatter={formatAxisValue}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickFormatter={formatAxisValue}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
        />
        {config.yAxis && (
          <Bar 
            dataKey={config.yAxis} 
            fill={CHART_COLORS[0]} 
            radius={[4, 4, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

function ScatterChartComponent({ config }: { config: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey={config.xAxis}
          type="number"
          name={config.xAxis}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickFormatter={formatAxisValue}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis 
          dataKey={config.yAxis}
          type="number"
          name={config.yAxis || ''}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickFormatter={formatAxisValue}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter 
          name={`${config.xAxis} vs ${config.yAxis}`}
          data={config.data} 
          fill={CHART_COLORS[2]}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function HistogramComponent({ config }: { config: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={config.data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis 
          dataKey={config.xAxis}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickFormatter={formatAxisValue}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="count" 
          fill={CHART_COLORS[1]} 
          radius={[4, 4, 0, 0]}
          name="Frequency"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartCard({ config }: { config: ChartConfig }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const scale = 2;
      canvas.width = svgElement.clientWidth * scale;
      canvas.height = svgElement.clientHeight * scale;
      ctx.scale(scale, scale);
      
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? '#121212' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, svgElement.clientWidth, svgElement.clientHeight);
      
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${config.title.replace(/\s+/g, '_')}.png`;
      downloadLink.click();
      
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.error('Failed to load chart image for export');
    };
    
    img.src = url;
  }, [config.title]);

  const renderChart = () => {
    switch (config.type) {
      case 'line': return <LineChartComponent config={config} />;
      case 'bar': return <BarChartComponent config={config} />;
      case 'scatter': return <ScatterChartComponent config={config} />;
      case 'histogram': return <HistogramComponent config={config} />;
      default: return <BarChartComponent config={config} />;
    }
  };

  return (
    <Card className="overflow-visible" data-testid={`chart-${config.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-medium">{config.title}</CardTitle>
          <div className="flex items-center gap-2">
            <ChartTypeLabel type={config.type} />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDownload}
              data-testid={`button-download-${config.id}`}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4" ref={chartRef}>
        {renderChart()}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg mb-2">No Charts Available</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        We couldn't generate any charts from your data. Try uploading a file with numeric or date columns.
      </p>
    </div>
  );
}

export function ChartsPanel({ charts }: ChartsPanelProps) {
  if (charts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Visualizations</h2>
          <p className="text-sm text-muted-foreground">
            {charts.length} chart{charts.length !== 1 ? 's' : ''} generated from your data
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {charts.map((chart) => (
          <ChartCard key={chart.id} config={chart} />
        ))}
      </div>
    </div>
  );
}
