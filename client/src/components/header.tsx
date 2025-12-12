import { BarChart3, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onNewUpload: () => void;
  showNewUpload: boolean;
  fileName?: string;
  exportButton?: React.ReactNode;
}

export function Header({ onNewUpload, showNewUpload, fileName, exportButton }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg hidden sm:inline">DataViz</span>
        </div>
      </div>

      {fileName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground max-w-[200px] md:max-w-none truncate">
          <FileText className="w-4 h-4 shrink-0" />
          <span className="truncate" data-testid="text-filename">{fileName}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {exportButton}
        {showNewUpload && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onNewUpload}
            data-testid="button-new-upload"
          >
            <Upload className="w-4 h-4 mr-2" />
            New Upload
          </Button>
        )}
      </div>
    </header>
  );
}
