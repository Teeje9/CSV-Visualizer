import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Pencil, 
  Check, 
  X, 
  EyeOff, 
  Eye,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Trash2
} from "lucide-react";
import type { ColumnInfo, BaseType } from "@shared/schema";

export interface ColumnTransform {
  originalName: string;
  newName: string;
  newType: BaseType;
  excluded: boolean;
}

export interface RowTransform {
  removeDuplicates: boolean;
  missingValueAction: "ignore" | "remove_rows" | "fill_zero" | "fill_mean";
}

export interface DataPrepState {
  columnTransforms: ColumnTransform[];
  rowTransform: RowTransform;
}

interface DataPrepPanelProps {
  columns: ColumnInfo[];
  rawData: Record<string, string>[];
  duplicateCount: number;
  onApplyTransforms: (state: DataPrepState) => void;
  onSkip: () => void;
}

const BASE_TYPE_OPTIONS: { value: BaseType; label: string }[] = [
  { value: "numeric", label: "Number" },
  { value: "categorical", label: "Category" },
  { value: "temporal", label: "Date" },
  { value: "boolean", label: "Yes/No" },
  { value: "text", label: "Text" },
];

function getTypeBadgeVariant(type: BaseType): "default" | "secondary" | "outline" {
  switch (type) {
    case "numeric": return "default";
    case "temporal": return "secondary";
    default: return "outline";
  }
}

export function DataPrepPanel({
  columns,
  rawData,
  duplicateCount,
  onApplyTransforms,
  onSkip,
}: DataPrepPanelProps) {
  const [columnTransforms, setColumnTransforms] = useState<ColumnTransform[]>(
    columns.map(col => ({
      originalName: col.name,
      newName: col.name,
      newType: col.baseType,
      excluded: false,
    }))
  );

  const [rowTransform, setRowTransform] = useState<RowTransform>({
    removeDuplicates: false,
    missingValueAction: "ignore",
  });

  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const columnsWithMissing = useMemo(
    () => columns.filter(c => c.missingCount > 0),
    [columns]
  );

  const totalMissingValues = useMemo(
    () => columns.reduce((sum, c) => sum + c.missingCount, 0),
    [columns]
  );

  const handleStartEdit = (colName: string, currentName: string) => {
    setEditingColumn(colName);
    setEditingName(currentName);
  };

  const handleSaveEdit = (originalName: string) => {
    if (editingName.trim()) {
      setColumnTransforms(prev =>
        prev.map(t =>
          t.originalName === originalName
            ? { ...t, newName: editingName.trim() }
            : t
        )
      );
    }
    setEditingColumn(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingColumn(null);
    setEditingName("");
  };

  const handleTypeChange = (originalName: string, newType: BaseType) => {
    setColumnTransforms(prev =>
      prev.map(t =>
        t.originalName === originalName ? { ...t, newType } : t
      )
    );
  };

  const handleToggleExclude = (originalName: string) => {
    setColumnTransforms(prev =>
      prev.map(t =>
        t.originalName === originalName ? { ...t, excluded: !t.excluded } : t
      )
    );
  };

  const handleApply = () => {
    onApplyTransforms({
      columnTransforms,
      rowTransform,
    });
  };

  const hasChanges = useMemo(() => {
    const hasColumnChanges = columnTransforms.some(
      (t, i) =>
        t.newName !== columns[i].name ||
        t.newType !== columns[i].baseType ||
        t.excluded
    );
    const hasRowChanges =
      rowTransform.removeDuplicates ||
      rowTransform.missingValueAction !== "ignore";
    return hasColumnChanges || hasRowChanges;
  }, [columnTransforms, columns, rowTransform]);

  const excludedCount = columnTransforms.filter(t => t.excluded).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Data Preparation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and clean your data before analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onSkip}
            data-testid="button-skip-prep"
          >
            Skip
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            onClick={handleApply}
            disabled={!hasChanges && excludedCount === 0}
            data-testid="button-apply-prep"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Apply & Analyze
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Column Settings
            {excludedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {excludedCount} excluded
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Column Name</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Sample Values</TableHead>
                  <TableHead className="w-[100px] text-right">Missing</TableHead>
                  <TableHead className="w-[80px] text-center">Include</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((col, idx) => {
                  const transform = columnTransforms[idx];
                  const isEditing = editingColumn === col.name;
                  const isExcluded = transform.excluded;

                  return (
                    <TableRow
                      key={col.name}
                      className={isExcluded ? "opacity-50" : ""}
                      data-testid={`row-column-${col.name}`}
                    >
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === "Enter") handleSaveEdit(col.name);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              data-testid={`input-rename-${col.name}`}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleSaveEdit(col.name)}
                              data-testid={`button-save-rename-${col.name}`}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm truncate max-w-[140px]">
                              {transform.newName}
                            </span>
                            {transform.newName !== col.name && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-[10px] px-1">
                                    renamed
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Original: {col.name}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                              onClick={() => handleStartEdit(col.name, transform.newName)}
                              data-testid={`button-edit-${col.name}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={transform.newType}
                          onValueChange={(v) => handleTypeChange(col.name, v as BaseType)}
                          disabled={isExcluded}
                        >
                          <SelectTrigger 
                            className="h-7 text-xs w-[100px]"
                            data-testid={`select-type-${col.name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BASE_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {transform.newType !== col.baseType && (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1 mt-1 block w-fit"
                          >
                            was: {col.baseType}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {col.sampleValues.slice(0, 3).map((val, i) => (
                            <Badge
                              key={i}
                              variant={getTypeBadgeVariant(col.baseType)}
                              className="text-[10px] font-mono max-w-[100px] truncate"
                            >
                              {val}
                            </Badge>
                          ))}
                          {col.sampleValues.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{col.sampleValues.length - 3} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {col.missingCount > 0 ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="destructive" className="text-xs">
                                {col.missingCount}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {col.missingPercent.toFixed(1)}% missing
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!isExcluded}
                          onCheckedChange={() => handleToggleExclude(col.name)}
                          data-testid={`checkbox-include-${col.name}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Row Operations
            {(duplicateCount > 0 || totalMissingValues > 0) && (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {duplicateCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="remove-duplicates"
                  checked={rowTransform.removeDuplicates}
                  onCheckedChange={(checked) =>
                    setRowTransform(prev => ({
                      ...prev,
                      removeDuplicates: checked === true,
                    }))
                  }
                  data-testid="checkbox-remove-duplicates"
                />
                <Label htmlFor="remove-duplicates" className="cursor-pointer">
                  Remove duplicate rows
                </Label>
              </div>
              <Badge variant="secondary">{duplicateCount} duplicates found</Badge>
            </div>
          )}

          {totalMissingValues > 0 && (
            <div className="p-3 bg-muted/30 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <Label>Handle missing values</Label>
                <Badge variant="secondary">
                  {totalMissingValues} missing across {columnsWithMissing.length} columns
                </Badge>
              </div>
              <Select
                value={rowTransform.missingValueAction}
                onValueChange={(v) =>
                  setRowTransform(prev => ({
                    ...prev,
                    missingValueAction: v as RowTransform["missingValueAction"],
                  }))
                }
              >
                <SelectTrigger 
                  className="w-full md:w-[300px]"
                  data-testid="select-missing-action"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ignore">Keep as-is (ignore)</SelectItem>
                  <SelectItem value="remove_rows">Remove rows with missing values</SelectItem>
                  <SelectItem value="fill_zero">Fill with zero (numeric only)</SelectItem>
                  <SelectItem value="fill_mean">Fill with column mean (numeric only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {duplicateCount === 0 && totalMissingValues === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              No duplicate rows or missing values detected. Your data looks clean!
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onSkip}
          data-testid="button-skip-prep-bottom"
        >
          Skip Prep
        </Button>
        <Button
          onClick={handleApply}
          data-testid="button-apply-prep-bottom"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Apply Changes & Analyze
        </Button>
      </div>
    </div>
  );
}
