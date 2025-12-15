import { useState, useRef } from "react";
import { UploadZone } from "@/components/upload-zone";
import { InsightsPanel } from "@/components/insights-panel";
import { ChartsPanel } from "@/components/charts-panel";
import { Header } from "@/components/header";
import { PdfExport } from "@/components/pdf-export";
import { MetaTags } from "@/components/meta-tags";
import { DataPrepPanel, type DataPrepState } from "@/components/data-prep-panel";
import { getVariant, type LandingVariant } from "@/lib/seo-config";
import { sampleDatasets } from "@/lib/sample-data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisResult } from "@shared/schema";
import { BarChart3, Sparkles, Calculator, FileDown, FileSpreadsheet, Loader2, X, Rocket } from "lucide-react";

interface HomeProps {
  variantSlug?: string;
}

const featureIcons = [BarChart3, Sparkles, Calculator, FileDown];

type AppStage = "upload" | "prep" | "results";

interface PrepData {
  result: AnalysisResult;
  duplicateCount: number;
}

export default function Home({ variantSlug = "default" }: HomeProps) {
  const [stage, setStage] = useState<AppStage>("upload");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [prepData, setPrepData] = useState<PrepData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [showBetaBanner, setShowBetaBanner] = useState(true);
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const variant: LandingVariant = getVariant(variantSlug);

  const countDuplicates = (rows: Record<string, string>[]): number => {
    const seen = new Set<string>();
    let dupeCount = 0;
    for (const row of rows) {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        dupeCount++;
      } else {
        seen.add(key);
      }
    }
    return dupeCount;
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setIsAnalyzing(false);
    setLoadingSampleId(null);
    
    if (result.rawData && result.rawData.length > 0) {
      const dupeCount = countDuplicates(result.rawData);
      setPrepData({ result, duplicateCount: dupeCount });
      setStage("prep");
    } else {
      setAnalysisResult(result);
      setStage("results");
    }
  };

  const handleSkipPrep = () => {
    if (prepData) {
      setAnalysisResult(prepData.result);
      setStage("results");
    }
  };

  const handleApplyTransforms = async (state: DataPrepState) => {
    if (!prepData) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawData: prepData.result.rawData,
          fileName: prepData.result.fileName,
          columnTransforms: state.columnTransforms,
          rowTransform: state.rowTransform,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setAnalysisResult(result.data);
        setStage("results");
      } else {
        toast({
          title: "Transform Error",
          description: result.error || "Failed to apply transformations",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to re-analyze data",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewUpload = () => {
    setAnalysisResult(null);
    setPrepData(null);
    setStage("upload");
    setIsAnalyzing(false);
    setLoadingSampleId(null);
  };

  const handleUploadStart = () => {
    setIsAnalyzing(true);
  };

  const handleLoadSample = async (sampleId: string) => {
    const sample = sampleDatasets.find(s => s.id === sampleId);
    if (!sample) return;

    setLoadingSampleId(sampleId);
    setIsAnalyzing(true);

    const blob = new Blob([sample.data], { type: 'text/csv' });
    const file = new File([blob], sample.fileName, { type: 'text/csv' });
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        handleAnalysisComplete(result.data);
      } else {
        setIsAnalyzing(false);
        setLoadingSampleId(null);
      }
    } catch {
      setIsAnalyzing(false);
      setLoadingSampleId(null);
    }
  };

  if (stage === "prep" && prepData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MetaTags variant={variant} />
        <Header 
          onNewUpload={handleNewUpload} 
          showNewUpload={true} 
          fileName={prepData.result.fileName}
        />
        <main className="flex-1 overflow-y-auto">
          {isAnalyzing ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Applying transformations...</span>
            </div>
          ) : (
            <DataPrepPanel
              columns={prepData.result.columns}
              rawData={prepData.result.rawData || []}
              duplicateCount={prepData.duplicateCount}
              onApplyTransforms={handleApplyTransforms}
              onSkip={handleSkipPrep}
            />
          )}
        </main>
      </div>
    );
  }

  if (stage === "upload") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MetaTags variant={variant} />
        <Header onNewUpload={handleNewUpload} showNewUpload={false} />
        
        {showBetaBanner && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Rocket className="w-4 h-4 text-primary shrink-0" />
              <span><strong>CSVVIZ Beta</strong> - Free during beta! Basic features will always be free. Some advanced features will be premium later.</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowBetaBanner(false)} className="shrink-0" data-testid="button-dismiss-banner">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <main className="flex-1 flex flex-col">
          <section className="flex-shrink-0 flex flex-col items-center justify-center p-4 md:p-8 pt-8 md:pt-16">
            <div className="text-center mb-6 md:mb-8 max-w-2xl">
              <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4" data-testid="text-headline">
                {variant.headline}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg" data-testid="text-subheadline">
                {variant.subheadline}
              </p>
            </div>
            
            <UploadZone 
              onAnalysisComplete={handleAnalysisComplete} 
              onUploadStart={handleUploadStart}
              isAnalyzing={isAnalyzing}
            />

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">Or try with sample data:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {sampleDatasets.map((sample) => (
                  <Button
                    key={sample.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadSample(sample.id)}
                    disabled={isAnalyzing}
                    data-testid={`button-sample-${sample.id}`}
                  >
                    {loadingSampleId === sample.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    )}
                    {sample.name}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <section className="py-12 md:py-16 px-4 md:px-8 border-t border-border">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-center mb-8 md:mb-12">
                Why Choose CSVVIZ?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {variant.features.map((feature, index) => {
                  const Icon = featureIcons[index % featureIcons.length];
                  return (
                    <div 
                      key={index} 
                      className="p-5 rounded-lg bg-muted/30 border border-border"
                      data-testid={`card-feature-${index}`}
                    >
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-medium mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="py-12 md:py-16 px-4 md:px-8 bg-muted/20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-xl md:text-2xl font-semibold mb-6">
                Perfect For
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {variant.useCases.map((useCase, index) => (
                  <span 
                    key={index}
                    className="px-4 py-2 rounded-full bg-background border border-border text-sm"
                    data-testid={`badge-usecase-${index}`}
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <footer className="py-6 px-4 text-center text-sm text-muted-foreground border-t border-border">
            <p className="mb-1"><strong>CSVVIZ Beta</strong> - Free during beta. Basic features will always be free.</p>
            <p>No signup required. Your data stays private.</p>
          </footer>
        </main>
      </div>
    );
  }

  if (!analysisResult) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MetaTags variant={variant} />
      <Header 
        onNewUpload={handleNewUpload} 
        showNewUpload={true} 
        fileName={analysisResult.fileName}
        exportButton={<PdfExport result={analysisResult} chartsContainerRef={chartsContainerRef} />}
      />
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-2/5 border-r border-border overflow-y-auto">
          <InsightsPanel result={analysisResult} />
        </div>
        <div className="w-full lg:w-3/5 overflow-y-auto" ref={chartsContainerRef}>
          <ChartsPanel result={analysisResult} />
        </div>
      </main>
    </div>
  );
}
