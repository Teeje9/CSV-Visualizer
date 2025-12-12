import { useState, useRef } from "react";
import { UploadZone } from "@/components/upload-zone";
import { InsightsPanel } from "@/components/insights-panel";
import { ChartsPanel } from "@/components/charts-panel";
import { Header } from "@/components/header";
import { PdfExport } from "@/components/pdf-export";
import type { AnalysisResult } from "@shared/schema";

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const chartsContainerRef = useRef<HTMLDivElement>(null);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const handleNewUpload = () => {
    setAnalysisResult(null);
    setIsAnalyzing(false);
  };

  const handleUploadStart = () => {
    setIsAnalyzing(true);
  };

  if (!analysisResult) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onNewUpload={handleNewUpload} showNewUpload={false} />
        <main className="flex-1 flex items-center justify-center p-4 md:p-8">
          <UploadZone 
            onAnalysisComplete={handleAnalysisComplete} 
            onUploadStart={handleUploadStart}
            isAnalyzing={isAnalyzing}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
