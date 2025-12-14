import { useRef, useCallback, useState } from "react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  ScatterChart, 
  Scatter,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LabelList
} from "recharts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BarChart3, TrendingUp, Circle, BarChart2, Download, X, Settings, AreaChartIcon, PieChartIcon } from "lucide-react";
import { ChartBuilder } from "./chart-builder";
import type { ChartConfig, AnalysisResult } from "@shared/schema";

interface ChartsPanelProps {
  result: AnalysisResult;
}

type ChartType = 'line' | 'bar' | 'scatter' | 'histogram' | 'area' | 'pie';

interface ChartCustomSettings {
  chartType?: ChartType;
  colors: string[];
  title?: string;
  showGrid: boolean;
  showLegend: boolean;
  showDataLabels: boolean;
}

const DEFAULT_SETTINGS: ChartCustomSettings = {
  colors: [],
  showGrid: true,
  showLegend: true,
  showDataLabels: false,
};

const COLOR_PALETTES = {
  default: ["hsl(217, 91%, 60%)", "hsl(173, 80%, 40%)", "hsl(280, 65%, 60%)", "hsl(45, 93%, 47%)", "hsl(0, 84%, 60%)"],
  ocean: ["hsl(200, 80%, 50%)", "hsl(180, 70%, 45%)", "hsl(220, 70%, 55%)", "hsl(190, 75%, 40%)", "hsl(210, 65%, 50%)"],
  sunset: ["hsl(20, 90%, 55%)", "hsl(40, 95%, 50%)", "hsl(0, 80%, 55%)", "hsl(350, 75%, 50%)", "hsl(30, 85%, 50%)"],
  forest: ["hsl(120, 50%, 40%)", "hsl(140, 45%, 45%)", "hsl(100, 40%, 50%)", "hsl(160, 55%, 35%)", "hsl(80, 45%, 45%)"],
  berry: ["hsl(300, 70%, 50%)", "hsl(280, 65%, 55%)", "hsl(320, 75%, 45%)", "hsl(260, 60%, 55%)", "hsl(340, 70%, 50%)"],
  mono: ["hsl(0, 0%, 30%)", "hsl(0, 0%, 45%)", "hsl(0, 0%, 55%)", "hsl(0, 0%, 65%)", "hsl(0, 0%, 75%)"],
};

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
    case 'area': return <AreaChartIcon className="w-3.5 h-3.5" />;
    case 'pie': return <PieChartIcon className="w-3.5 h-3.5" />;
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

interface ChartComponentProps {
  config: ExtendedChartConfig;
  settings?: ChartCustomSettings;
}

function getColors(settings?: ChartCustomSettings): string[] {
  return settings?.colors?.length ? settings.colors : MULTI_Y_COLORS;
}

function ChartCustomizer({ 
  settings, 
  onSettingsChange,
  originalType 
}: { 
  settings: ChartCustomSettings; 
  onSettingsChange: (settings: ChartCustomSettings) => void;
  originalType: ChartType;
}) {
  const baseTypes: ChartType[] = ['line', 'bar', 'area'];
  const compatibleTypes: ChartType[] = baseTypes.includes(originalType) 
    ? baseTypes 
    : [originalType, ...baseTypes];
  const currentType = settings.chartType || originalType;
  
  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Chart Type</Label>
        <div className="flex gap-1">
          {compatibleTypes.map((type) => (
            <Button
              key={type}
              variant="ghost"
              size="icon"
              className={`toggle-elevate ${currentType === type ? 'toggle-elevated bg-muted' : ''}`}
              onClick={() => onSettingsChange({ ...settings, chartType: type })}
              data-testid={`button-chart-type-${type}`}
            >
              {getChartIcon(type)}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Color Palette</Label>
        <div className="grid grid-cols-3 gap-1">
          {Object.entries(COLOR_PALETTES).map(([name, colors]) => (
            <button
              key={name}
              className={`flex gap-0.5 p-1.5 rounded-md border hover-elevate ${
                JSON.stringify(settings.colors) === JSON.stringify(colors) 
                  ? 'border-primary bg-muted' 
                  : 'border-transparent'
              }`}
              onClick={() => onSettingsChange({ ...settings, colors })}
              data-testid={`button-palette-${name}`}
            >
              {colors.slice(0, 4).map((color, i) => (
                <div 
                  key={i} 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }} 
                />
              ))}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Show Grid</Label>
          <Switch
            checked={settings.showGrid}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, showGrid: checked })}
            data-testid="switch-show-grid"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Show Legend</Label>
          <Switch
            checked={settings.showLegend}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, showLegend: checked })}
            data-testid="switch-show-legend"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Data Labels</Label>
          <Switch
            checked={settings.showDataLabels}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, showDataLabels: checked })}
            data-testid="switch-data-labels"
          />
        </div>
      </div>
    </div>
  );
}

function LineChartComponent({ config, settings }: ChartComponentProps) {
  const yAxes = config.yAxes || (config.yAxis ? [config.yAxis] : []);
  const colors = getColors(settings);
  const showGrid = settings?.showGrid ?? true;
  const showLegend = settings?.showLegend ?? true;
  const showDataLabels = settings?.showDataLabels ?? false;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />}
        <XAxis dataKey={config.xAxis} {...axisStyle} tickFormatter={formatAxisValue} />
        <YAxis {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && yAxes.length > 1 && <Legend />}
        {yAxes.map((yCol, idx) => (
          <Line 
            key={yCol}
            type="monotone" 
            dataKey={yCol} 
            stroke={colors[idx % colors.length]} 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: colors[idx % colors.length] }}
          >
            {showDataLabels && <LabelList dataKey={yCol} position="top" fontSize={10} />}
          </Line>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartComponent({ config, settings }: ChartComponentProps) {
  const yAxes = config.yAxes || (config.yAxis ? [config.yAxis] : []);
  const colors = getColors(settings);
  const showGrid = settings?.showGrid ?? true;
  const showLegend = settings?.showLegend ?? true;
  const showDataLabels = settings?.showDataLabels ?? false;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />}
        <XAxis dataKey={config.xAxis} {...axisStyle} tickFormatter={formatAxisValue} />
        <YAxis {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && yAxes.length > 1 && <Legend />}
        {yAxes.map((yCol, idx) => (
          <Bar 
            key={yCol}
            dataKey={yCol} 
            fill={colors[idx % colors.length]} 
            radius={[3, 3, 0, 0]} 
          >
            {showDataLabels && <LabelList dataKey={yCol} position="top" fontSize={10} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function AreaChartComponent({ config, settings }: ChartComponentProps) {
  const yAxes = config.yAxes || (config.yAxis ? [config.yAxis] : []);
  const colors = getColors(settings);
  const showGrid = settings?.showGrid ?? true;
  const showLegend = settings?.showLegend ?? true;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />}
        <XAxis dataKey={config.xAxis} {...axisStyle} tickFormatter={formatAxisValue} />
        <YAxis {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && yAxes.length > 1 && <Legend />}
        {yAxes.map((yCol, idx) => (
          <Area 
            key={yCol}
            type="monotone" 
            dataKey={yCol} 
            stroke={colors[idx % colors.length]} 
            fill={colors[idx % colors.length]}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PieChartComponent({ config, settings }: ChartComponentProps) {
  const colors = getColors(settings);
  const showLegend = settings?.showLegend ?? true;
  const showDataLabels = settings?.showDataLabels ?? false;
  const yAxis = config.yAxis || 'count';
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        <Pie
          data={config.data}
          dataKey={yAxis}
          nameKey={config.xAxis}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={showDataLabels ? ({ name, value }) => `${name}: ${formatAxisValue(value)}` : false}
          labelLine={showDataLabels}
        >
          {config.data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function ScatterChartComponent({ config, settings }: ChartComponentProps) {
  const colors = getColors(settings);
  const showGrid = settings?.showGrid ?? true;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />}
        <XAxis dataKey={config.xAxis} type="number" name={config.xAxis} {...axisStyle} tickFormatter={formatAxisValue} />
        <YAxis dataKey={config.yAxis} type="number" name={config.yAxis || ''} {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={config.data} fill={colors[2]} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function HistogramComponent({ config, settings }: ChartComponentProps) {
  const colors = getColors(settings);
  const showGrid = settings?.showGrid ?? true;
  const showDataLabels = settings?.showDataLabels ?? false;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />}
        <XAxis dataKey={config.xAxis} {...axisStyle} />
        <YAxis {...axisStyle} tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" fill={colors[1]} radius={[3, 3, 0, 0]} name="Frequency">
          {showDataLabels && <LabelList dataKey="count" position="top" fontSize={10} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartCard({ 
  config, 
  onRemove,
  settings,
  onSettingsChange 
}: { 
  config: ExtendedChartConfig; 
  onRemove?: () => void;
  settings: ChartCustomSettings;
  onSettingsChange: (settings: ChartCustomSettings) => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const effectiveType = settings.chartType || config.type;

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
    const chartConfig = { ...config, type: effectiveType };
    switch (effectiveType) {
      case 'line': return <LineChartComponent config={chartConfig} settings={settings} />;
      case 'bar': return <BarChartComponent config={chartConfig} settings={settings} />;
      case 'area': return <AreaChartComponent config={chartConfig} settings={settings} />;
      case 'pie': return <PieChartComponent config={chartConfig} settings={settings} />;
      case 'scatter': return <ScatterChartComponent config={chartConfig} settings={settings} />;
      case 'histogram': return <HistogramComponent config={chartConfig} settings={settings} />;
      default: return <BarChartComponent config={chartConfig} settings={settings} />;
    }
  };

  return (
    <div className="group" data-testid={`chart-${config.id}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground">{getChartIcon(effectiveType)}</span>
          <h3 className="text-sm font-medium truncate">{config.title}</h3>
          {config.isCustom && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">Custom</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-settings-${config.id}`}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <ChartCustomizer 
                settings={settings} 
                onSettingsChange={onSettingsChange}
                originalType={config.type as ChartType}
              />
            </PopoverContent>
          </Popover>
          <Button 
            variant="ghost" 
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDownload}
            data-testid={`button-download-${config.id}`}
          >
            <Download className="w-4 h-4" />
          </Button>
          {onRemove && (
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
      <div ref={chartRef} className="bg-muted/30 rounded-lg p-3" data-chart-container data-chart-title={config.title}>
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
  const [hiddenAutoCharts, setHiddenAutoCharts] = useState<Set<string>>(new Set());
  const [chartSettings, setChartSettings] = useState<Record<string, ChartCustomSettings>>({});
  
  const handleAddCustomChart = (chart: ExtendedChartConfig) => {
    const extendedChart: ExtendedChartConfig = {
      ...chart,
      isCustom: true,
    };
    setCustomCharts(prev => [extendedChart, ...prev]);
  };

  const handleRemoveChart = (chartId: string, isCustom: boolean) => {
    if (isCustom) {
      setCustomCharts(prev => prev.filter(c => c.id !== chartId));
    } else {
      setHiddenAutoCharts(prev => new Set(Array.from(prev).concat(chartId)));
    }
    setChartSettings(prev => {
      const next = { ...prev };
      delete next[chartId];
      return next;
    });
  };

  const handleSettingsChange = (chartId: string, newSettings: ChartCustomSettings) => {
    setChartSettings(prev => ({
      ...prev,
      [chartId]: newSettings,
    }));
  };

  const getSettingsForChart = (chartId: string): ChartCustomSettings => {
    return chartSettings[chartId] || { ...DEFAULT_SETTINGS };
  };

  const allCharts: ExtendedChartConfig[] = [
    ...customCharts, 
    ...result.charts
      .filter(c => !hiddenAutoCharts.has(c.id))
      .map(c => ({ ...c, isCustom: false }))
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
            settings={getSettingsForChart(chart.id)}
            onSettingsChange={(newSettings) => handleSettingsChange(chart.id, newSettings)}
            onRemove={() => handleRemoveChart(chart.id, chart.isCustom || false)}
          />
        ))
      )}
    </div>
  );
}
