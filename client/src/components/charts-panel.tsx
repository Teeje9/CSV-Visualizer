import { useRef, useCallback, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Circle, BarChart2, Download, X } from "lucide-react";
import { ChartBuilder } from "./chart-builder";
import type { ChartConfig, AnalysisResult } from "@shared/schema";

interface ChartsPanelProps {
  result: AnalysisResult;
}

interface ExtendedChartConfig extends ChartConfig {
  yAxes?: string[];
  isCustom?: boolean;
}

const CHART_COLORS = {
  primary: "hsl(217, 91%, 60%)",
  secondary: "hsl(173, 80%, 40%)",
  tertiary: "hsl(280, 65%, 60%)",
};

function getChartIcon(type: string) {
  switch (type) {
    case 'line': return <TrendingUp className="w-3.5 h-3.5" />;
    case 'bar': return <BarChart2 className="w-3.5 h-3.5" />;
    case 'scatter': return <Circle className="w-3.5 h-3.5" />;
    case 'histogram': return <BarChart3 className="w-3.5 h-3.5" />;
    default: return <BarChart3 className="w-3.5 h-3.5" />;
  }
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
  if (typeof value === 'string' && value.length > 10) {
    return value.slice(0, 10) + '...';
  }
  return String(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover/95 backdrop-blur border border-border rounded-md px-3 py-2 shadow-lg">
      <p className="text-xs font-medium mb-1.5 text-muted-foreground">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="font-mono font-medium">{formatAxisValue(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

const axisStyle = {
  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
  axisLine: { stroke: 'hsl(var(--border))' },
  tickLine: false as const,
};

const MULTI_Y_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(173, 80%, 40%)",
  "hsl(280, 65%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 84%, 60%)",
];

function LineChartComponent({ config }: { config: ExtendedChartConfig }) {
  const yAxes = config.yAxes || (config.yAxis ? [config.yAxis] : []);
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
        <XAxis dataKey={config.xAxis} {...axisStyle} tickFormatter={formatAxisValue} />
        <YAxis {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        {yAxes.length > 1 && <Legend />}
        {yAxes.map((yCol, idx) => (
          <Line 
            key={yCol}
            type="monotone" 
            dataKey={yCol} 
            stroke={MULTI_Y_COLORS[idx % MULTI_Y_COLORS.length]} 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: MULTI_Y_COLORS[idx % MULTI_Y_COLORS.length] }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartComponent({ config }: { config: ExtendedChartConfig }) {
  const yAxes = config.yAxes || (config.yAxis ? [config.yAxis] : []);
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
        <XAxis dataKey={config.xAxis} {...axisStyle} tickFormatter={formatAxisValue} />
        <YAxis {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        {yAxes.length > 1 && <Legend />}
        {yAxes.map((yCol, idx) => (
          <Bar 
            key={yCol}
            dataKey={yCol} 
            fill={MULTI_Y_COLORS[idx % MULTI_Y_COLORS.length]} 
            radius={[3, 3, 0, 0]} 
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function ScatterChartComponent({ config }: { config: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis dataKey={config.xAxis} type="number" name={config.xAxis} {...axisStyle} tickFormatter={formatAxisValue} />
        <YAxis dataKey={config.yAxis} type="number" name={config.yAxis || ''} {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={config.data} fill={CHART_COLORS.tertiary} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function HistogramComponent({ config }: { config: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
        <XAxis dataKey={config.xAxis} {...axisStyle} />
        <YAxis {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" fill={CHART_COLORS.secondary} radius={[3, 3, 0, 0]} name="Frequency" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartCard({ config, onRemove }: { config: ExtendedChartConfig; onRemove?: () => void }) {
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
    <div className="group" data-testid={`chart-${config.id}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground">{getChartIcon(config.type)}</span>
          <h3 className="text-sm font-medium truncate">{config.title}</h3>
          {config.isCustom && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">Custom</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDownload}
            data-testid={`button-download-${config.id}`}
          >
            <Download className="w-4 h-4" />
          </Button>
          {config.isCustom && onRemove && (
            <Button 
              variant="ghost" 
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
              data-testid={`button-remove-${config.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div ref={chartRef} className="bg-muted/30 rounded-lg p-3" data-chart-container>
        {renderChart()}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
      <BarChart3 className="w-10 h-10 text-muted-foreground/50 mb-3" />
      <h3 className="font-medium mb-1">No Charts Available</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Upload a file with numeric or date columns to generate charts.
      </p>
    </div>
  );
}

export function ChartsPanel({ result }: ChartsPanelProps) {
  const [customCharts, setCustomCharts] = useState<ExtendedChartConfig[]>([]);
  
  const handleAddCustomChart = (chart: ExtendedChartConfig) => {
    const extendedChart: ExtendedChartConfig = {
      ...chart,
      isCustom: true,
    };
    setCustomCharts(prev => [extendedChart, ...prev]);
  };

  const handleRemoveCustomChart = (chartId: string) => {
    setCustomCharts(prev => prev.filter(c => c.id !== chartId));
  };

  const allCharts: ExtendedChartConfig[] = [
    ...customCharts, 
    ...result.charts.map(c => ({ ...c, isCustom: false }))
  ];

  return (
    <div className="p-4 md:p-5 space-y-6 h-full overflow-y-auto">
      {result.rawData && result.rawData.length > 0 && (
        <ChartBuilder result={result} onAddChart={handleAddCustomChart} />
      )}
      
      {allCharts.length === 0 ? (
        <EmptyState />
      ) : (
        allCharts.map((chart) => (
          <ChartCard 
            key={chart.id} 
            config={chart}
            onRemove={chart.isCustom ? () => handleRemoveCustomChart(chart.id) : undefined}
          />
        ))
      )}
    </div>
  );
}
