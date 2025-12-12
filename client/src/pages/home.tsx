import { useState, useRef } from "react";
import { UploadZone } from "@/components/upload-zone";
import { InsightsPanel } from "@/components/insights-panel";
import { ChartsPanel } from "@/components/charts-panel";
import { Header } from "@/components/header";
import { PdfExport } from "@/components/pdf-export";
import { MetaTags } from "@/components/meta-tags";
import { getVariant, type LandingVariant } from "@/lib/seo-config";
import { sampleDatasets } from "@/lib/sample-data";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@shared/schema";
import { BarChart3, Sparkles, Calculator, FileDown, FileSpreadsheet, Loader2 } from "lucide-react";

interface HomeProps {
  variantSlug?: string;
}

const featureIcons = [BarChart3, Sparkles, Calculator, FileDown];

export default function Home({ variantSlug = "default" }: HomeProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  
  const variant: LandingVariant = getVariant(variantSlug);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setIsAnalyzing(false);
    setLoadingSampleId(null);
  };

  const handleNewUpload = () => {
    setAnalysisResult(null);
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

  if (!analysisResult) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MetaTags variant={variant} />
        <Header onNewUpload={handleNewUpload} showNewUpload={false} />
        
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
            <p>Free to use. No signup required. Your data stays private.</p>
          </footer>
        </main>
      </div>
    );
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
