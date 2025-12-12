import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, TrendingUp, BarChart2, Circle } from "lucide-react";
import type { AnalysisResult, ChartConfig, ColumnInfo } from "@shared/schema";

interface ExtendedChartConfig extends ChartConfig {
  yAxes?: string[];
  isCustom?: boolean;
}

interface ChartBuilderProps {
  result: AnalysisResult;
  onAddChart: (chart: ExtendedChartConfig) => void;
}

type ChartType = "line" | "bar" | "scatter";

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: JSX.Element }[] = [
  { value: "line", label: "Line", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { value: "bar", label: "Bar", icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { value: "scatter", label: "Scatter", icon: <Circle className="w-3.5 h-3.5" /> },
];

const MULTI_Y_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(173, 80%, 40%)",
  "hsl(280, 65%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 84%, 60%)",
];

function getColumnTypeBadge(col: ColumnInfo) {
  const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    numeric: { label: "Num", variant: "default" },
    temporal: { label: "Date", variant: "secondary" },
    categorical: { label: "Cat", variant: "outline" },
    text: { label: "Text", variant: "outline" },
    boolean: { label: "Bool", variant: "outline" },
  };
  const info = typeMap[col.baseType] || { label: col.baseType, variant: "outline" as const };
  return <Badge variant={info.variant} className="text-[10px] px-1.5 py-0">{info.label}</Badge>;
}

function suggestChartType(xColumn: ColumnInfo | undefined, yColumns: ColumnInfo[]): ChartType {
  if (!xColumn || yColumns.length === 0) return "bar";
  
  if (xColumn.baseType === "temporal" && yColumns.every(c => c.baseType === "numeric")) {
    return "line";
  }
  
  if (xColumn.baseType === "numeric" && yColumns.length === 1 && yColumns[0].baseType === "numeric") {
    return "scatter";
  }
  
  if (xColumn.baseType === "categorical" || xColumn.semanticType === "category") {
    return "bar";
  }
  
  return "bar";
}

export function ChartBuilder({ result, onAddChart }: ChartBuilderProps) {
  const [xAxis, setXAxis] = useState<string>("");
  const [yAxes, setYAxes] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [isOpen, setIsOpen] = useState(false);
  const [ySelectKey, setYSelectKey] = useState(0);

  const allColumns = result.columns;
  const numericColumns = useMemo(
    () => allColumns.filter(c => c.baseType === "numeric"),
    [allColumns]
  );

  const xColumn = allColumns.find(c => c.name === xAxis);
  const yColumnInfos = yAxes.map(y => numericColumns.find(c => c.name === y)).filter(Boolean) as ColumnInfo[];

  const suggestedType = useMemo(
    () => suggestChartType(xColumn, yColumnInfos),
    [xColumn, yColumnInfos]
  );

  const handleXAxisChange = (value: string) => {
    setXAxis(value);
    const newXCol = allColumns.find(c => c.name === value);
    const newSuggested = suggestChartType(newXCol, yColumnInfos);
    setChartType(newSuggested);
  };

  const handleAddYAxis = (value: string) => {
    if (value && !yAxes.includes(value)) {
      const newYAxes = [...yAxes, value];
      setYAxes(newYAxes);
      const newYCols = newYAxes.map(y => numericColumns.find(c => c.name === y)).filter(Boolean) as ColumnInfo[];
      setChartType(suggestChartType(xColumn, newYCols));
      setYSelectKey(k => k + 1);
    }
  };

  const handleRemoveYAxis = (value: string) => {
    const newYAxes = yAxes.filter(y => y !== value);
    setYAxes(newYAxes);
    const newYCols = newYAxes.map(y => numericColumns.find(c => c.name === y)).filter(Boolean) as ColumnInfo[];
    if (newYCols.length > 0) {
      setChartType(suggestChartType(xColumn, newYCols));
    }
  };

  const availableYColumns = numericColumns.filter(c => !yAxes.includes(c.name));

  const handleAddChart = () => {
    if (!xAxis || yAxes.length === 0 || !result.rawData) return;

    const chartData = result.rawData.slice(0, 100).map(row => {
      const point: Record<string, string | number> = {};
      point[xAxis] = row[xAxis];
      
      yAxes.forEach(yCol => {
        const val = parseFloat(row[yCol]);
        point[yCol] = isNaN(val) ? 0 : val;
      });
      
      return point;
    });

    const title = yAxes.length === 1 
      ? `${yAxes[0]} by ${xAxis}`
      : `${yAxes.join(", ")} by ${xAxis}`;

    const newChart: ExtendedChartConfig = {
      id: `custom-${Date.now()}`,
      type: chartType,
      title,
      xAxis,
      yAxis: yAxes[0],
      yAxes: yAxes,
      data: chartData,
      priority: 0,
    };

    onAddChart(newChart);
    
    setXAxis("");
    setYAxes([]);
    setChartType("bar");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-chart-builder"
      >
        <Plus className="w-4 h-4 mr-2" />
        Build Custom Chart
      </Button>
    );
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Custom Chart Builder</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          data-testid="button-close-chart-builder"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="x-axis" className="text-xs">X-Axis</Label>
          <Select value={xAxis} onValueChange={handleXAxisChange}>
            <SelectTrigger id="x-axis" data-testid="select-x-axis">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {allColumns.map(col => (
                <SelectItem key={col.name} value={col.name} data-testid={`option-x-${col.name}`}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{col.name}</span>
                    {getColumnTypeBadge(col)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chart-type" className="text-xs">
            Chart Type
            {suggestedType !== chartType && (
              <span className="text-muted-foreground ml-1">(suggested: {suggestedType})</span>
            )}
          </Label>
          <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
            <SelectTrigger id="chart-type" data-testid="select-chart-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Y-Axis (numeric columns)</Label>
        
        {yAxes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {yAxes.map((y, idx) => (
              <Badge
                key={y}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
                style={{ borderLeft: `3px solid ${MULTI_Y_COLORS[idx % MULTI_Y_COLORS.length]}` }}
              >
                {y}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemoveYAxis(y)}
                  data-testid={`button-remove-y-${y}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {availableYColumns.length > 0 && (
          <Select key={ySelectKey} onValueChange={handleAddYAxis}>
            <SelectTrigger data-testid="select-y-axis">
              <SelectValue placeholder={yAxes.length === 0 ? "Select Y-axis column(s)" : "Add another column"} />
            </SelectTrigger>
            <SelectContent>
              {availableYColumns.map(col => (
                <SelectItem key={col.name} value={col.name} data-testid={`option-y-${col.name}`}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{col.name}</span>
                    {col.unit && (
                      <span className="text-muted-foreground text-xs">({col.unit})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        className="w-full"
        onClick={handleAddChart}
        disabled={!xAxis || yAxes.length === 0}
        data-testid="button-add-chart"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Chart
      </Button>
    </div>
  );
}
