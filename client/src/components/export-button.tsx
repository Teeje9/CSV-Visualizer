import { useState, useEffect } from "react";
import { Download, Loader2, CreditCard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { AnalysisResult } from "@shared/schema";

interface ExportButtonProps {
  analysisResult: AnalysisResult;
  aiSummary?: string;
}

interface ExportUsage {
  exportCount: number;
  freeExportsRemaining: number;
  requiresPayment: boolean;
  yearMonth: string;
}

export function ExportButton({ analysisResult, aiSummary }: ExportButtonProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [usage, setUsage] = useState<ExportUsage | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const exportStatus = urlParams.get('export');
    const sessionId = urlParams.get('session_id');
    
    if (exportStatus === 'success' && sessionId) {
      setPendingSessionId(sessionId);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (exportStatus === 'cancelled') {
      toast({
        title: "Export cancelled",
        description: "You can try again when you're ready.",
        variant: "default",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  useEffect(() => {
    if (pendingSessionId && analysisResult) {
      handleExport(pendingSessionId);
      setPendingSessionId(null);
    }
  }, [pendingSessionId, analysisResult]);

  useEffect(() => {
    if (user) {
      fetchUsage();
    }
  }, [user]);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/export-usage', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch export usage:', err);
    }
  };

  const handleExport = async (sessionId?: string) => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    if (usage?.requiresPayment && !sessionId) {
      setShowPaymentDialog(true);
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          analysisResult,
          aiSummary,
          sessionId,
        }),
      });

      if (res.status === 402) {
        setShowPaymentDialog(true);
        setIsExporting(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${analysisResult.fileName.replace(/\.[^/.]+$/, '')}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Your PDF report has been downloaded.",
      });

      fetchUsage();
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: "Export failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePayment = async () => {
    try {
      const res = await fetch('/api/checkout/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast({
        title: "Payment failed",
        description: "Could not start the payment process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <>
      <Button
        onClick={() => handleExport()}
        disabled={isExporting || authLoading}
        variant="outline"
        size="sm"
        data-testid="button-export-pdf"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
            {usage && usage.freeExportsRemaining > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({usage.freeExportsRemaining} free)
              </span>
            )}
          </>
        )}
      </Button>

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to Export</DialogTitle>
            <DialogDescription>
              Create an account or sign in to export your data analysis as a PDF report.
              You get 1 free export per month!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogin} data-testid="button-login-to-export">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Additional Export</DialogTitle>
            <DialogDescription>
              You've used your free export this month. Additional exports are $3 each.
              This is a one-time payment for this export.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-4 rounded-md bg-muted">
              <span className="font-medium">PDF Export</span>
              <span className="text-lg font-semibold">$3.00</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} data-testid="button-pay-for-export">
              <CreditCard className="w-4 h-4 mr-2" />
              Pay $3
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
