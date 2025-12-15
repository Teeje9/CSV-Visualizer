import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, RowsIcon, Loader2, ArrowLeft, Table2 } from "lucide-react";

interface HeaderRowSelectorProps {
  previewRows: string[][];
  totalRows: number;
  totalCols: number;
  fileName: string;
  sheets: string[] | null;
  file: File;
  onConfirm: (headerRowIndex: number, selectedSheet?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function HeaderRowSelector({
  previewRows,
  totalRows,
  totalCols,
  fileName,
  sheets,
  file,
  onConfirm,
  onCancel,
  isLoading,
}: HeaderRowSelectorProps) {
  const [selectedHeaderRow, setSelectedHeaderRow] = useState(0);
  const [selectedSheet, setSelectedSheet] = useState(sheets?.[0] || undefined);

  const handleConfirm = () => {
    onConfirm(selectedHeaderRow, selectedSheet);
  };

  const getRowPreview = (row: string[], maxCells = 6): string => {
    const nonEmpty = row.filter(cell => cell && cell.trim() !== '');
    if (nonEmpty.length === 0) return '(empty row)';
    const preview = nonEmpty.slice(0, maxCells).join(' | ');
    return nonEmpty.length > maxCells ? `${preview} ...` : preview;
  };

  const detectLikelyHeaderRow = (): number => {
    for (let i = 0; i < Math.min(previewRows.length, 10); i++) {
      const row = previewRows[i];
      const nonEmptyCount = row.filter(cell => cell && cell.trim() !== '').length;
      if (nonEmptyCount >= 3) {
        const hasNumericContent = row.some(cell => {
          const trimmed = (cell || '').trim();
          return trimmed !== '' && !isNaN(parseFloat(trimmed));
        });
        if (!hasNumericContent || nonEmptyCount > totalCols * 0.5) {
          return i;
        }
      }
    }
    return 0;
  };

  const suggestedRow = detectLikelyHeaderRow();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Select Header Row</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Click on the row that contains your column headers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} data-testid="button-confirm-header">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Table2 className="w-4 h-4" />
          <span>{fileName}</span>
        </div>
        <Badge variant="secondary">
          {totalRows.toLocaleString()} rows
        </Badge>
        <Badge variant="secondary">
          {totalCols} columns
        </Badge>
        
        {sheets && sheets.length > 1 && (
          <Select value={selectedSheet} onValueChange={setSelectedSheet}>
            <SelectTrigger className="w-[200px]" data-testid="select-sheet">
              <SelectValue placeholder="Select sheet" />
            </SelectTrigger>
            <SelectContent>
              {sheets.map((sheet) => (
                <SelectItem key={sheet} value={sheet}>
                  {sheet}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RowsIcon className="w-4 h-4" />
            Preview (first {previewRows.length} rows)
          </CardTitle>
          <CardDescription>
            Selected row {selectedHeaderRow + 1} as header
            {selectedHeaderRow === suggestedRow && (
              <Badge variant="outline" className="ml-2 text-xs">
                Suggested
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <table className="w-full text-sm">
                <tbody>
                  {previewRows.map((row, rowIndex) => {
                    const isSelected = rowIndex === selectedHeaderRow;
                    const isData = rowIndex > selectedHeaderRow;
                    const isSuggested = rowIndex === suggestedRow && !isSelected;
                    
                    return (
                      <tr
                        key={rowIndex}
                        onClick={() => setSelectedHeaderRow(rowIndex)}
                        className={`cursor-pointer border-b transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : isData
                            ? 'bg-muted/30 hover:bg-muted/50'
                            : isSuggested
                            ? 'bg-amber-500/10 hover:bg-amber-500/20'
                            : 'hover:bg-muted/50'
                        }`}
                        data-testid={`row-preview-${rowIndex}`}
                      >
                        <td className="px-2 py-2 w-12 text-muted-foreground font-mono text-xs">
                          {rowIndex + 1}
                        </td>
                        <td className="px-2 py-2 w-20">
                          {isSelected ? (
                            <Badge variant="default" className="text-xs">Header</Badge>
                          ) : isData ? (
                            <Badge variant="secondary" className="text-xs">Data</Badge>
                          ) : isSuggested ? (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Suggested</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Skip</Badge>
                          )}
                        </td>
                        {row.slice(0, 10).map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={`px-2 py-2 max-w-[150px] truncate ${
                              isSelected ? 'font-semibold' : ''
                            }`}
                            title={cell}
                          >
                            {cell || <span className="text-muted-foreground italic">empty</span>}
                          </td>
                        ))}
                        {row.length > 10 && (
                          <td className="px-2 py-2 text-muted-foreground">
                            +{row.length - 10} more
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
        <RowsIcon className="w-4 h-4 shrink-0" />
        <span>
          Rows above the selected header will be skipped. 
          {previewRows.length < totalRows && ` Showing ${previewRows.length} of ${totalRows.toLocaleString()} total rows.`}
        </span>
      </div>
    </div>
  );
}
