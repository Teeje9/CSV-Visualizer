import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@shared/schema";

interface AISummaryProps {
  result: AnalysisResult;
  onSummaryChange?: (summary: string | null) => void;
}

interface SummaryResponse {
  success: boolean;
  summary?: string;
  error?: string;
}

export function AISummary({ result }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisResult: result })
      });
      const data: SummaryResponse = await res.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to generate summary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">AI Analysis</h3>
        </div>
        {summary && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={generateSummary}
            disabled={isLoading}
            className="text-xs"
            data-testid="button-regenerate-summary"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        )}
      </div>

      {!summary && !isLoading && !error && (
        <Button 
          onClick={generateSummary} 
          variant="outline" 
          className="w-full"
          data-testid="button-generate-summary"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate AI Summary
        </Button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Analyzing your data...</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={generateSummary}
            className="ml-2 h-auto p-0 text-destructive underline"
            data-testid="button-try-again"
          >
            Try again
          </Button>
        </div>
      )}

      {summary && !isLoading && (
        <div 
          className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed space-y-3"
          data-testid="ai-summary-content"
        >
          {summary.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-foreground/90">{paragraph}</p>
          ))}
        </div>
      )}
    </div>
  );
}
