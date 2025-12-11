import { useCallback, useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AnalysisResult } from "@shared/schema";

interface UploadZoneProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onUploadStart: () => void;
  isAnalyzing: boolean;
}

export function UploadZone({ onAnalysisComplete, onUploadStart, isAnalyzing }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    
    const validTypes = [
      'text/csv',
      'text/tab-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.csv', '.tsv', '.xlsx', '.xls'];
    
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(extension);
    
    if (!isValidType) {
      setError("Please upload a CSV, TSV, or Excel file");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be less than 5MB");
      return;
    }

    onUploadStart();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        setError(result.error || "Failed to analyze file");
        return;
      }

      onAnalysisComplete(result.data);
    } catch (err) {
      setError("Failed to upload file. Please try again.");
    }
  }, [onAnalysisComplete, onUploadStart]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.xlsx,.xls"
        onChange={handleInputChange}
        className="sr-only"
        data-testid="upload-input"
      />
      
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-3">
          Transform Your Data Into Insights
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Upload a CSV file and get beautiful charts with auto-generated analysis
        </p>
      </div>

      <Card
        className={`
          relative p-8 md:p-12 border-2 border-dashed cursor-pointer
          transition-all duration-200 ease-out
          ${isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border hover:border-muted-foreground/50'
          }
          ${isAnalyzing ? 'pointer-events-none opacity-75' : ''}
        `}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="upload-zone"
      >
        <div className="flex flex-col items-center gap-4">
          {isAnalyzing ? (
            <>
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-lg mb-1">Analyzing your data...</p>
                <p className="text-sm text-muted-foreground">
                  Detecting columns, calculating statistics, and generating insights
                </p>
              </div>
            </>
          ) : (
            <>
              <div className={`
                w-16 h-16 rounded-xl flex items-center justify-center
                transition-colors duration-200
                ${isDragging ? 'bg-primary/20' : 'bg-muted'}
              `}>
                {isDragging ? (
                  <FileSpreadsheet className="w-8 h-8 text-primary" />
                ) : (
                  <Upload className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="font-medium text-lg mb-1">
                  {isDragging ? 'Drop your file here' : 'Drop your CSV here or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports CSV, TSV, and Excel files up to 5MB
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Upload Failed</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {[
          { label: 'Auto Charts', desc: 'Smart visualization' },
          { label: 'Statistics', desc: 'Mean, median & more' },
          { label: 'Trends', desc: 'Pattern detection' },
          { label: 'Correlations', desc: 'Find relationships' },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-lg bg-card border border-border">
            <p className="font-medium text-sm">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
