import { useState } from "react";
import { ChevronDown, ChevronUp, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnInfo } from "@shared/schema";

interface DataTableProps {
  data: Record<string, string>[];
  columns: ColumnInfo[];
  totalRows: number;
}

export function DataTable({ data, columns, totalRows }: DataTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayData = isExpanded ? data : data.slice(0, 5);

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Data Preview</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {displayData.length} of {totalRows} rows, {columns.length} columns
        </span>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <TableUI>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map((col) => (
                  <TableHead 
                    key={col.name} 
                    className="text-xs font-medium whitespace-nowrap px-3 py-2"
                    data-testid={`header-${col.name}`}
                  >
                    <div className="flex flex-col">
                      <span>{col.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {col.semanticType}{col.unit ? ` (${col.unit})` : ''}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.map((row, i) => (
                <TableRow key={i} className="hover-elevate" data-testid={`row-${i}`}>
                  {columns.map((col) => (
                    <TableCell 
                      key={col.name} 
                      className="text-xs font-mono whitespace-nowrap px-3 py-1.5 max-w-[200px] truncate"
                    >
                      {row[col.name] || <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </TableUI>
        </div>
      </div>

      {data.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-xs"
          data-testid="button-toggle-data"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Show More ({Math.min(data.length, 50)} rows)
            </>
          )}
        </Button>
      )}
    </div>
  );
}
