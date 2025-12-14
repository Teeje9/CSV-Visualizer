import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { AnalysisResult } from "@shared/schema";

interface PdfExportProps {
  result: AnalysisResult;
  chartsContainerRef?: React.RefObject<HTMLDivElement>;
}

export function PdfExport({ result, chartsContainerRef }: PdfExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const formatNumber = (num: number): string => {
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(2);
  };

  const generatePdf = async () => {
    setIsExporting(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 0;

      const colors = {
        primary: [99, 102, 241] as [number, number, number],
        primaryDark: [79, 70, 229] as [number, number, number],
        accent: [139, 92, 246] as [number, number, number],
        success: [34, 197, 94] as [number, number, number],
        warning: [251, 191, 36] as [number, number, number],
        danger: [239, 68, 68] as [number, number, number],
        dark: [15, 23, 42] as [number, number, number],
        text: [30, 41, 59] as [number, number, number],
        textMuted: [100, 116, 139] as [number, number, number],
        bg: [248, 250, 252] as [number, number, number],
        cardBg: [255, 255, 255] as [number, number, number],
        border: [226, 232, 240] as [number, number, number],
      };

      const drawGradientHeader = () => {
        for (let i = 0; i < 55; i++) {
          const ratio = i / 55;
          const r = Math.round(colors.primary[0] * (1 - ratio) + colors.primaryDark[0] * ratio);
          const g = Math.round(colors.primary[1] * (1 - ratio) + colors.primaryDark[1] * ratio);
          const b = Math.round(colors.primary[2] * (1 - ratio) + colors.primaryDark[2] * ratio);
          pdf.setFillColor(r, g, b);
          pdf.rect(0, i, pageWidth, 1, 'F');
        }
        
        pdf.setFillColor(255, 255, 255, 0.1);
        pdf.circle(pageWidth - 30, 20, 40, 'F');
        pdf.circle(pageWidth - 10, 45, 25, 'F');
      };

      const drawCard = (x: number, y: number, w: number, h: number, hasAccent = false, accentColor?: [number, number, number]) => {
        pdf.setFillColor(...colors.cardBg);
        pdf.roundedRect(x, y, w, h, 3, 3, 'F');
        pdf.setDrawColor(...colors.border);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(x, y, w, h, 3, 3, 'S');
        
        if (hasAccent && accentColor) {
          pdf.setFillColor(...accentColor);
          pdf.roundedRect(x, y, 3, h, 1.5, 1.5, 'F');
          pdf.rect(x + 1.5, y, 1.5, h, 'F');
        }
      };

      const drawBadge = (x: number, y: number, text: string, bgColor: [number, number, number]) => {
        pdf.setFontSize(7);
        const textWidth = pdf.getTextWidth(text);
        const badgeWidth = textWidth + 6;
        const badgeHeight = 5;
        
        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2], 0.15);
        pdf.roundedRect(x, y - 3.5, badgeWidth, badgeHeight, 1, 1, 'F');
        pdf.setTextColor(...bgColor);
        pdf.text(text, x + 3, y);
        
        return badgeWidth;
      };

      drawGradientHeader();

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CSVVIZ', margin, 14);
      
      pdf.setFontSize(24);
      pdf.text('Data Analysis Report', margin, 28);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(result.fileName, margin, 38);
      
      pdf.setFontSize(9);
      const dateText = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(dateText, pageWidth - margin - pdf.getTextWidth(dateText), 38);

      yPos = 65;

      const cardWidth = (contentWidth - 8) / 3;
      const statsData = [
        { value: result.rowCount.toLocaleString(), label: 'Data Rows', color: colors.primary },
        { value: result.columnCount.toString(), label: 'Columns', color: colors.accent },
        { value: result.charts.length.toString(), label: 'Charts Generated', color: colors.success },
      ];

      statsData.forEach((stat, i) => {
        const x = margin + (cardWidth + 4) * i;
        drawCard(x, yPos, cardWidth, 22, true, stat.color);
        
        pdf.setTextColor(...stat.color);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(stat.value, x + 10, yPos + 12);
        
        pdf.setTextColor(...colors.textMuted);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(stat.label, x + 10, yPos + 18);
      });

      yPos += 32;

      if (result.aiSummary) {
        drawCard(margin, yPos, contentWidth, 8 + Math.min(result.aiSummary.length / 8, 40));
        
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AI-Powered Summary', margin + 6, yPos + 7);
        
        const sparkleX = margin + 6 + pdf.getTextWidth('AI-Powered Summary') + 3;
        pdf.setFillColor(...colors.accent);
        pdf.circle(sparkleX + 2, yPos + 4.5, 1.5, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...colors.textMuted);
        
        const summaryLines = pdf.splitTextToSize(result.aiSummary, contentWidth - 12);
        let summaryY = yPos + 14;
        for (const line of summaryLines.slice(0, 8)) {
          pdf.text(line, margin + 6, summaryY);
          summaryY += 5;
        }
        
        yPos += 12 + summaryLines.slice(0, 8).length * 5 + 6;
      }

      if (result.numericStats.length > 0) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Statistics', margin, yPos);
        yPos += 8;
        
        pdf.setFillColor(...colors.primary);
        pdf.roundedRect(margin, yPos, contentWidth, 9, 1.5, 1.5, 'F');
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        const headers = ['Column', 'Min', 'Max', 'Mean', 'Median', 'Std Dev'];
        const colWidths = [48, 24, 24, 24, 24, 24];
        let xPos = margin + 4;
        for (let i = 0; i < headers.length; i++) {
          pdf.text(headers[i], xPos, yPos + 6);
          xPos += colWidths[i];
        }
        yPos += 11;
        
        result.numericStats.slice(0, 6).forEach((stat, rowIndex) => {
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = margin;
          }
          
          if (rowIndex % 2 === 0) {
            pdf.setFillColor(...colors.bg);
            pdf.rect(margin, yPos - 1, contentWidth, 8, 'F');
          }
          
          xPos = margin + 4;
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...colors.text);
          pdf.setFontSize(8);
          pdf.text(stat.column.substring(0, 20), xPos, yPos + 4);
          xPos += colWidths[0];
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...colors.textMuted);
          const values = [
            formatNumber(stat.min),
            formatNumber(stat.max),
            formatNumber(stat.mean),
            formatNumber(stat.median),
            formatNumber(stat.stdDev)
          ];
          
          for (let i = 0; i < values.length; i++) {
            pdf.text(values[i], xPos, yPos + 4);
            xPos += colWidths[i + 1];
          }
          yPos += 8;
        });
        yPos += 8;
      }

      const hasCorrelations = result.correlations.length > 0;
      const hasTrends = result.trends.length > 0;
      
      if (hasCorrelations || hasTrends) {
        if (yPos > pageHeight - 50) {
          pdf.addPage();
          yPos = margin;
        }
        
        const halfWidth = (contentWidth - 6) / 2;
        
        if (hasCorrelations) {
          const corrCardHeight = Math.min(result.correlations.length * 12 + 16, 60);
          drawCard(margin, yPos, hasTrends ? halfWidth : contentWidth, corrCardHeight, true, colors.accent);
          
          pdf.setTextColor(...colors.text);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Correlations', margin + 8, yPos + 8);
          
          let corrY = yPos + 16;
          for (const corr of result.correlations.slice(0, 4)) {
            const strength = Math.abs(corr.coefficient);
            let strengthColor = colors.textMuted;
            let strengthLabel = 'weak';
            if (strength > 0.7) {
              strengthColor = colors.success;
              strengthLabel = 'strong';
            } else if (strength > 0.4) {
              strengthColor = colors.warning;
              strengthLabel = 'moderate';
            }
            
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...colors.text);
            const corrText = `${corr.column1.substring(0, 12)} vs ${corr.column2.substring(0, 12)}`;
            pdf.text(corrText, margin + 8, corrY);
            
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(...strengthColor);
            pdf.text(`${corr.coefficient > 0 ? '+' : ''}${corr.coefficient.toFixed(2)} ${strengthLabel}`, margin + 8, corrY + 4);
            
            corrY += 11;
          }
        }
        
        if (hasTrends) {
          const trendX = hasCorrelations ? margin + halfWidth + 6 : margin;
          const trendCardHeight = Math.min(result.trends.length * 12 + 16, 60);
          drawCard(trendX, yPos, hasCorrelations ? halfWidth : contentWidth, trendCardHeight, true, colors.success);
          
          pdf.setTextColor(...colors.text);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Trends', trendX + 8, yPos + 8);
          
          let trendY = yPos + 16;
          for (const trend of result.trends.slice(0, 4)) {
            const isUp = trend.direction.includes('increasing') || trend.direction.includes('up');
            const trendColor = isUp ? colors.success : colors.danger;
            const arrow = isUp ? '↑' : '↓';
            
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...colors.text);
            pdf.text(trend.valueColumn.substring(0, 20), trendX + 8, trendY);
            
            pdf.setTextColor(...trendColor);
            pdf.text(`${arrow} ${trend.direction}`, trendX + 8, trendY + 4);
            
            trendY += 11;
          }
        }
        
        yPos += Math.max(
          hasCorrelations ? Math.min(result.correlations.length * 12 + 16, 60) : 0,
          hasTrends ? Math.min(result.trends.length * 12 + 16, 60) : 0
        ) + 10;
      }

      if (result.statisticalTests && result.statisticalTests.length > 0) {
        if (yPos > pageHeight - 50) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Statistical Analysis', margin, yPos);
        yPos += 8;
        
        for (const test of result.statisticalTests.slice(0, 3)) {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = margin;
          }
          
          const testHeight = 20 + Math.min(test.description.length / 10, 20);
          drawCard(margin, yPos, contentWidth, testHeight);
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...colors.text);
          pdf.text(test.title, margin + 6, yPos + 8);
          
          const isSignificant = test.description.toLowerCase().includes('significant');
          if (isSignificant) {
            drawBadge(margin + 6 + pdf.getTextWidth(test.title) + 4, yPos + 8, 'SIGNIFICANT', colors.success);
          }
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...colors.textMuted);
          const descLines = pdf.splitTextToSize(test.description, contentWidth - 16);
          let descY = yPos + 14;
          for (const line of descLines.slice(0, 3)) {
            pdf.text(line, margin + 6, descY);
            descY += 4;
          }
          
          yPos += testHeight + 4;
        }
      }

      if (chartsContainerRef?.current) {
        pdf.addPage();
        yPos = margin;
        
        for (let i = 0; i < 12; i++) {
          const ratio = i / 12;
          const r = Math.round(colors.primary[0] * (1 - ratio) + 248 * ratio);
          const g = Math.round(colors.primary[1] * (1 - ratio) + 250 * ratio);
          const b = Math.round(colors.primary[2] * (1 - ratio) + 252 * ratio);
          pdf.setFillColor(r, g, b);
          pdf.rect(0, i, pageWidth, 1, 'F');
        }
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Visualizations', margin, 9);
        yPos = 20;

        const chartElements = chartsContainerRef.current.querySelectorAll('[data-chart-container]');
        
        for (let i = 0; i < chartElements.length; i++) {
          const chartEl = chartElements[i] as HTMLElement;
          const chartTitle = chartEl.getAttribute('data-chart-title') || `Chart ${i + 1}`;
          
          try {
            const canvas = await html2canvas(chartEl, {
              scale: 2,
              backgroundColor: '#ffffff',
              logging: false,
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = contentWidth - 8;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            if (yPos + imgHeight + 20 > pageHeight - 20) {
              pdf.addPage();
              yPos = margin;
            }
            
            drawCard(margin, yPos, contentWidth, imgHeight + 16);
            
            pdf.setTextColor(...colors.text);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text(chartTitle, margin + 6, yPos + 8);
            
            pdf.addImage(imgData, 'PNG', margin + 4, yPos + 12, imgWidth, imgHeight);
            yPos += imgHeight + 24;
          } catch (err) {
            console.error('Failed to capture chart:', err);
          }
        }
      }

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        pdf.setFillColor(...colors.bg);
        pdf.rect(0, pageHeight - 14, pageWidth, 14, 'F');
        pdf.setDrawColor(...colors.border);
        pdf.line(0, pageHeight - 14, pageWidth, pageHeight - 14);
        
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.textMuted);
        pdf.text(`Page ${i} of ${totalPages}`, margin, pageHeight - 6);
        
        pdf.setTextColor(...colors.primary);
        pdf.setFont('helvetica', 'bold');
        const footerText = 'Generated by CSVVIZ';
        pdf.text(footerText, pageWidth - margin - pdf.getTextWidth(footerText), pageHeight - 6);
      }

      const sanitizedName = result.fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${sanitizedName}_report.pdf`);
      
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={generatePdf}
      disabled={isExporting}
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
        </>
      )}
    </Button>
  );
}
