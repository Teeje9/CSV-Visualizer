import { useState, useRef } from "react";
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
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Data Analysis Report', margin, 18);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(result.fileName, margin, 27);
      pdf.text(new Date().toLocaleDateString(), pageWidth - margin - 25, 27);
      
      yPos = 45;
      pdf.setTextColor(30, 41, 59);

      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const statsY = yPos + 13;
      const colWidth = contentWidth / 3;
      
      pdf.text(result.rowCount.toLocaleString(), margin + colWidth * 0.5, statsY, { align: 'center' });
      pdf.text(result.columnCount.toString(), margin + colWidth * 1.5, statsY, { align: 'center' });
      pdf.text(result.charts.length.toString(), margin + colWidth * 2.5, statsY, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Rows', margin + colWidth * 0.5, statsY + 6, { align: 'center' });
      pdf.text('Columns', margin + colWidth * 1.5, statsY + 6, { align: 'center' });
      pdf.text('Charts', margin + colWidth * 2.5, statsY + 6, { align: 'center' });
      
      yPos += 30;

      if (result.aiSummary) {
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AI Summary', margin, yPos);
        yPos += 7;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        
        const summaryLines = pdf.splitTextToSize(result.aiSummary, contentWidth);
        for (const line of summaryLines) {
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = margin;
          }
          pdf.text(line, margin, yPos);
          yPos += 5;
        }
        yPos += 8;
      }

      if (result.numericStats.length > 0) {
        if (yPos > pageHeight - 50) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Statistics', margin, yPos);
        yPos += 8;
        
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F');
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(71, 85, 105);
        const headers = ['Column', 'Min', 'Max', 'Mean', 'Median', 'Std Dev'];
        const colWidths = [45, 25, 25, 25, 25, 25];
        let xPos = margin + 2;
        for (let i = 0; i < headers.length; i++) {
          pdf.text(headers[i], xPos, yPos + 5.5);
          xPos += colWidths[i];
        }
        yPos += 10;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(30, 41, 59);
        
        for (const stat of result.numericStats.slice(0, 8)) {
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = margin;
          }
          
          xPos = margin + 2;
          const values = [
            stat.column.substring(0, 18),
            formatNumber(stat.min),
            formatNumber(stat.max),
            formatNumber(stat.mean),
            formatNumber(stat.median),
            formatNumber(stat.stdDev)
          ];
          
          for (let i = 0; i < values.length; i++) {
            pdf.text(values[i], xPos, yPos + 4);
            xPos += colWidths[i];
          }
          yPos += 7;
        }
        yPos += 5;
      }

      if (result.correlations.length > 0) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Correlations', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        for (const corr of result.correlations.slice(0, 5)) {
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = margin;
          }
          
          const corrText = `${corr.column1} vs ${corr.column2}: ${corr.coefficient.toFixed(3)} (${corr.strength.replace(/_/g, ' ')})`;
          pdf.text(corrText, margin, yPos);
          yPos += 6;
        }
        yPos += 5;
      }

      if (result.trends.length > 0) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Trends', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        for (const trend of result.trends) {
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = margin;
          }
          
          pdf.text(`${trend.valueColumn}: ${trend.description}`, margin, yPos);
          yPos += 6;
        }
        yPos += 5;
      }

      if (result.statisticalTests && result.statisticalTests.length > 0) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Statistical Analysis', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        for (const test of result.statisticalTests) {
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = margin;
          }
          
          pdf.setFont('helvetica', 'bold');
          pdf.text(test.title, margin, yPos);
          yPos += 5;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(71, 85, 105);
          const descLines = pdf.splitTextToSize(test.description, contentWidth);
          for (const line of descLines) {
            pdf.text(line, margin, yPos);
            yPos += 4.5;
          }
          pdf.setTextColor(30, 41, 59);
          yPos += 4;
        }
      }

      if (chartsContainerRef?.current) {
        pdf.addPage();
        yPos = margin;
        
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Charts', margin, yPos);
        yPos += 10;

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
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            if (yPos + imgHeight + 10 > pageHeight - 20) {
              pdf.addPage();
              yPos = margin;
            }
            
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(chartTitle, margin, yPos);
            yPos += 6;
            
            pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 12;
          } catch (err) {
            console.error('Failed to capture chart:', err);
          }
        }
      }

      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Generated by CSVVIZ on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      const sanitizedName = result.fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${sanitizedName}_analysis.pdf`);
      
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
