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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Circle, BarChart2, Download, X, Settings, AreaChartIcon, PieChartIcon, Sparkles } from "lucide-react";
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
  // Scale options
  yAxisMin?: number | 'auto';
  yAxisMax?: number | 'auto';
  scaleType: 'linear' | 'log';
  labelRotation: number;
  // Appearance
  curveType: 'linear' | 'smooth' | 'step';
  barWidth: number;
}

const DEFAULT_SETTINGS: ChartCustomSettings = {
  colors: [],
  showGrid: true,
  showLegend: true,
  showDataLabels: false,
  yAxisMin: 'auto',
  yAxisMax: 'auto',
  scaleType: 'linear',
  labelRotation: 0,
  curveType: 'smooth',
  barWidth: 80,
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

interface ChartTypeInfo {
  type: ChartType;
  label: string;
  description: string;
}

const ALL_CHART_TYPES: ChartTypeInfo[] = [
  { type: 'line', label: 'Line', description: 'Best for trends over time' },
  { type: 'bar', label: 'Bar', description: 'Best for comparing categories' },
  { type: 'area', label: 'Area', description: 'Shows cumulative values' },
  { type: 'scatter', label: 'Scatter', description: 'Shows correlations between variables' },
  { type: 'pie', label: 'Pie', description: 'Shows proportions of a whole' },
  { type: 'histogram', label: 'Histogram', description: 'Shows distribution of values' },
];

function getSuggestedTypes(originalType: ChartType, hasTimeData: boolean, hasCategoryData: boolean): ChartType[] {
  const suggested: ChartType[] = [originalType];
  
  if (hasTimeData) {
    if (!suggested.includes('line')) suggested.push('line');
    if (!suggested.includes('area')) suggested.push('area');
  }
  
  if (hasCategoryData) {
    if (!suggested.includes('bar')) suggested.push('bar');
    if (!suggested.includes('pie')) suggested.push('pie');
  }
  
  if (originalType === 'scatter') {
    suggested.push('scatter');
  }
  
  return suggested;
}

function ChartEditor({ 
  settings, 
  onSettingsChange,
  originalType,
  chartData,
  xAxisKey
}: { 
  settings: ChartCustomSettings; 
  onSettingsChange: (settings: ChartCustomSettings) => void;
  originalType: ChartType;
  chartData?: any[];
  xAxisKey?: string;
}) {
  const currentType = settings.chartType || originalType;
  
  const hasTimeData = originalType === 'line' || (chartData && xAxisKey && 
    chartData.some(d => {
      const val = d[xAxisKey];
      return typeof val === 'string' && !isNaN(Date.parse(val));
    }));
  
  const hasCategoryData = originalType === 'bar' || originalType === 'pie' || 
    Boolean(chartData && xAxisKey && chartData.some(d => typeof d[xAxisKey] === 'string'));
  
  const suggestedTypes = getSuggestedTypes(originalType, hasTimeData, hasCategoryData);
  
  const handleYMinChange = (value: string) => {
    const num = parseFloat(value);
    onSettingsChange({ 
      ...settings, 
      yAxisMin: value === '' || isNaN(num) ? 'auto' : num 
    });
  };
  
  const handleYMaxChange = (value: string) => {
    const num = parseFloat(value);
    onSettingsChange({ 
      ...settings, 
      yAxisMax: value === '' || isNaN(num) ? 'auto' : num 
    });
  };
  
  return (
    <Tabs defaultValue="type" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-3">
        <TabsTrigger value="type" className="text-xs">Type</TabsTrigger>
        <TabsTrigger value="scale" className="text-xs">Scale</TabsTrigger>
        <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
      </TabsList>
      
      <TabsContent value="type" className="space-y-3 mt-0">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Chart Type</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_CHART_TYPES.map((info) => {
              const isSuggested = suggestedTypes.includes(info.type);
              const isSelected = currentType === info.type;
              
              return (
                <button
                  key={info.type}
                  className={`flex items-center gap-2 p-2 rounded-md border text-left hover-elevate ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-transparent bg-muted/30'
                  }`}
                  onClick={() => onSettingsChange({ ...settings, chartType: info.type })}
                  data-testid={`button-chart-type-${info.type}`}
                >
                  <span className="text-muted-foreground">{getChartIcon(info.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{info.label}</span>
                      {isSuggested && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          Suggested
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
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
      </TabsContent>
      
      <TabsContent value="scale" className="space-y-4 mt-0">
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Y-Axis Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Min</Label>
              <Input
                type="text"
                placeholder="Auto"
                value={settings.yAxisMin === 'auto' ? '' : settings.yAxisMin}
                onChange={(e) => handleYMinChange(e.target.value)}
                className="h-8 text-xs"
                data-testid="input-y-min"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Max</Label>
              <Input
                type="text"
                placeholder="Auto"
                value={settings.yAxisMax === 'auto' ? '' : settings.yAxisMax}
                onChange={(e) => handleYMaxChange(e.target.value)}
                className="h-8 text-xs"
                data-testid="input-y-max"
              />
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => onSettingsChange({ ...settings, yAxisMin: 'auto', yAxisMax: 'auto' })}
          >
            Reset to Auto
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Scale Type</Label>
          <Select 
            value={settings.scaleType} 
            onValueChange={(v) => onSettingsChange({ ...settings, scaleType: v as 'linear' | 'log' })}
          >
            <SelectTrigger className="h-8 text-xs" data-testid="select-scale-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">
                <div className="flex items-center gap-2">
                  <span>Linear</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    Default
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem value="log">Logarithmic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">X-Axis Label Rotation</Label>
            <span className="text-xs text-muted-foreground font-mono">{settings.labelRotation}</span>
          </div>
          <Slider
            value={[settings.labelRotation]}
            min={-90}
            max={90}
            step={15}
            onValueChange={([v]) => onSettingsChange({ ...settings, labelRotation: v })}
            data-testid="slider-label-rotation"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-90</span>
            <span>0</span>
            <span>90</span>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="style" className="space-y-3 mt-0">
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
        
        {(currentType === 'line' || currentType === 'area') && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Line Style</Label>
            <Select 
              value={settings.curveType} 
              onValueChange={(v) => onSettingsChange({ ...settings, curveType: v as 'linear' | 'smooth' | 'step' })}
            >
              <SelectTrigger className="h-8 text-xs" data-testid="select-curve-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smooth">
                  <div className="flex items-center gap-2">
                    <span>Smooth</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                      Suggested
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="linear">Straight</SelectItem>
                <SelectItem value="step">Stepped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {(currentType === 'bar' || currentType === 'histogram') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Bar Width</Label>
              <span className="text-xs text-muted-foreground font-mono">{settings.barWidth}%</span>
            </div>
            <Slider
              value={[settings.barWidth]}
              min={20}
              max={100}
              step={10}
              onValueChange={([v]) => onSettingsChange({ ...settings, barWidth: v })}
              data-testid="slider-bar-width"
            />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function getCurveType(curveType?: 'linear' | 'smooth' | 'step'): 'linear' | 'monotone' | 'step' {
  switch (curveType) {
    case 'linear': return 'linear';
    case 'step': return 'step';
    case 'smooth':
    default: return 'monotone';
  }
}

function getYAxisDomain(settings?: ChartCustomSettings): [number | 'auto' | 'dataMin', number | 'auto' | 'dataMax'] {
  const min = settings?.yAxisMin === 'auto' || settings?.yAxisMin === undefined ? 'auto' : settings.yAxisMin;
  const max = settings?.yAxisMax === 'auto' || settings?.yAxisMax === undefined ? 'auto' : settings.yAxisMax;
  return [min, max];
}

function LineChartComponent({ config, settings }: ChartComponentProps) {
  const yAxes = config.yAxes || (config.yAxis ? [config.yAxis] : []);
  const colors = getColors(settings);
  const showGrid = settings?.showGrid ?? true;
  const showLegend = settings?.showLegend ?? true;
  const showDataLabels = settings?.showDataLabels ?? false;
  const curveType = getCurveType(settings?.curveType);
  const labelRotation = settings?.labelRotation ?? 0;
  const yDomain = getYAxisDomain(settings);
  const scaleType = settings?.scaleType ?? 'linear';
  const bottomMargin = Math.abs(labelRotation) > 30 ? 40 : 0;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: bottomMargin }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />}
        <XAxis 
          dataKey={config.xAxis} 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          angle={labelRotation}
          textAnchor={labelRotation > 0 ? 'start' : labelRotation < 0 ? 'end' : 'middle'}
          height={Math.abs(labelRotation) > 30 ? 60 : 30}
        />
        <YAxis 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          domain={yDomain}
          scale={scaleType}
          allowDataOverflow={scaleType === 'log'}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && yAxes.length > 1 && <Legend />}
        {yAxes.map((yCol, idx) => (
          <Line 
            key={yCol}
            type={curveType} 
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
  const labelRotation = settings?.labelRotation ?? 0;
  const yDomain = getYAxisDomain(settings);
  const scaleType = settings?.scaleType ?? 'linear';
  const barWidth = settings?.barWidth ?? 80;
  const bottomMargin = Math.abs(labelRotation) > 30 ? 40 : 0;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart 
        data={config.data} 
        margin={{ top: 8, right: 8, left: -20, bottom: bottomMargin }}
        barCategoryGap={`${100 - barWidth}%`}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />}
        <XAxis 
          dataKey={config.xAxis} 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          angle={labelRotation}
          textAnchor={labelRotation > 0 ? 'start' : labelRotation < 0 ? 'end' : 'middle'}
          height={Math.abs(labelRotation) > 30 ? 60 : 30}
        />
        <YAxis 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          domain={yDomain}
          scale={scaleType}
          allowDataOverflow={scaleType === 'log'}
        />
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
  const curveType = getCurveType(settings?.curveType);
  const labelRotation = settings?.labelRotation ?? 0;
  const yDomain = getYAxisDomain(settings);
  const scaleType = settings?.scaleType ?? 'linear';
  const bottomMargin = Math.abs(labelRotation) > 30 ? 40 : 0;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={config.data} margin={{ top: 8, right: 8, left: -20, bottom: bottomMargin }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />}
        <XAxis 
          dataKey={config.xAxis} 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          angle={labelRotation}
          textAnchor={labelRotation > 0 ? 'start' : labelRotation < 0 ? 'end' : 'middle'}
          height={Math.abs(labelRotation) > 30 ? 60 : 30}
        />
        <YAxis 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          domain={yDomain}
          scale={scaleType}
          allowDataOverflow={scaleType === 'log'}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && yAxes.length > 1 && <Legend />}
        {yAxes.map((yCol, idx) => (
          <Area 
            key={yCol}
            type={curveType} 
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
  const labelRotation = settings?.labelRotation ?? 0;
  const yDomain = getYAxisDomain(settings);
  const scaleType = settings?.scaleType ?? 'linear';
  const bottomMargin = Math.abs(labelRotation) > 30 ? 40 : 0;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top: 8, right: 8, left: -20, bottom: bottomMargin }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />}
        <XAxis 
          dataKey={config.xAxis} 
          type="number" 
          name={config.xAxis} 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          angle={labelRotation}
          textAnchor={labelRotation > 0 ? 'start' : labelRotation < 0 ? 'end' : 'middle'}
          height={Math.abs(labelRotation) > 30 ? 60 : 30}
        />
        <YAxis 
          dataKey={config.yAxis} 
          type="number" 
          name={config.yAxis || ''} 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          domain={yDomain}
          scale={scaleType}
          allowDataOverflow={scaleType === 'log'}
        />
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
  const labelRotation = settings?.labelRotation ?? 0;
  const yDomain = getYAxisDomain(settings);
  const scaleType = settings?.scaleType ?? 'linear';
  const barWidth = settings?.barWidth ?? 80;
  const bottomMargin = Math.abs(labelRotation) > 30 ? 40 : 0;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart 
        data={config.data} 
        margin={{ top: 8, right: 8, left: -20, bottom: bottomMargin }}
        barCategoryGap={`${100 - barWidth}%`}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />}
        <XAxis 
          dataKey={config.xAxis} 
          {...axisStyle}
          angle={labelRotation}
          textAnchor={labelRotation > 0 ? 'start' : labelRotation < 0 ? 'end' : 'middle'}
          height={Math.abs(labelRotation) > 30 ? 60 : 30}
        />
        <YAxis 
          {...axisStyle} 
          tickFormatter={formatAxisValue}
          domain={yDomain}
          scale={scaleType}
          allowDataOverflow={scaleType === 'log'}
        />
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
            <PopoverContent className="w-80" align="end">
              <ChartEditor 
                settings={settings} 
                onSettingsChange={onSettingsChange}
                originalType={config.type as ChartType}
                chartData={config.data}
                xAxisKey={config.xAxis}
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
