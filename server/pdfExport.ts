import PDFDocument from 'pdfkit';
import type { AnalysisResult, NumericStats, Insight, ChartConfig } from '@shared/schema';

interface ExportOptions {
  analysisResult: AnalysisResult;
  aiSummary?: string;
}

export function generatePDF(options: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { analysisResult, aiSummary } = options;
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      bufferPages: true 
    });
    
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = '#3B82F6';
    const secondaryColor = '#64748B';
    const textColor = '#1E293B';

    doc.font('Helvetica-Bold')
       .fontSize(24)
       .fillColor(primaryColor)
       .text('Data Analysis Report', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor(secondaryColor)
       .text(`Generated on ${new Date().toLocaleDateString('en-US', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, { align: 'center' });

    doc.moveDown(2);
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor(textColor)
       .text('Dataset Overview');
    
    doc.moveDown(0.5);
    doc.font('Helvetica')
       .fontSize(11)
       .fillColor(textColor);
    
    const overviewData = [
      ['File Name', analysisResult.fileName],
      ['Total Rows', analysisResult.rowCount.toLocaleString()],
      ['Total Columns', analysisResult.columnCount.toString()],
      ['Numeric Columns', analysisResult.numericStats.length.toString()],
      ['Charts Generated', analysisResult.charts.length.toString()],
    ];

    overviewData.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value);
    });

    if (aiSummary) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor(primaryColor)
         .text('AI-Generated Summary');
      
      doc.moveDown(0.5);
      doc.font('Helvetica')
         .fontSize(11)
         .fillColor(textColor)
         .text(aiSummary, { align: 'justify' });
    }

    if (analysisResult.insights.length > 0) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor(textColor)
         .text('Key Insights');
      
      doc.moveDown(0.5);
      
      const highInsights = analysisResult.insights.filter(i => i.importance === 'high');
      const mediumInsights = analysisResult.insights.filter(i => i.importance === 'medium');
      const displayInsights = [...highInsights, ...mediumInsights].slice(0, 8);
      
      displayInsights.forEach((insight: Insight, index: number) => {
        const importanceLabel = insight.importance === 'high' ? '[HIGH] ' : '[MEDIUM] ';
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor(insight.importance === 'high' ? '#DC2626' : '#D97706')
           .text(importanceLabel, { continued: true });
        
        doc.font('Helvetica-Bold')
           .fillColor(textColor)
           .text(insight.title);
        
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(secondaryColor)
           .text(insight.description);
        
        if (index < displayInsights.length - 1) {
          doc.moveDown(0.5);
        }
      });
    }

    if (analysisResult.numericStats.length > 0) {
      doc.addPage();
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor(textColor)
         .text('Statistical Summary');
      
      doc.moveDown(1);

      const stats = analysisResult.numericStats.slice(0, 10);
      
      stats.forEach((stat: NumericStats, index: number) => {
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(primaryColor)
           .text(stat.column + (stat.unit ? ` (${stat.unit})` : ''));
        
        doc.moveDown(0.3);
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(textColor);
        
        const formatNum = (n: number) => {
          if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
          if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2) + 'K';
          return n.toFixed(2);
        };

        const statsRow = [
          `Mean: ${formatNum(stat.mean)}`,
          `Median: ${formatNum(stat.median)}`,
          `Min: ${formatNum(stat.min)}`,
          `Max: ${formatNum(stat.max)}`,
          `Std Dev: ${formatNum(stat.stdDev)}`,
        ];
        
        doc.text(statsRow.join('  |  '));
        
        if (stat.total !== undefined && stat.count !== undefined) {
          doc.text(`Total: ${formatNum(stat.total)}  |  Count: ${stat.count.toLocaleString()}`);
        }
        
        if (index < stats.length - 1) {
          doc.moveDown(0.8);
        }
      });
    }

    if (analysisResult.correlations.length > 0) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor(textColor)
         .text('Correlations');
      
      doc.moveDown(0.5);
      
      const significantCorrs = analysisResult.correlations.filter(
        c => c.strength !== 'none' && c.strength !== 'weak_positive' && c.strength !== 'weak_negative'
      ).slice(0, 6);
      
      if (significantCorrs.length > 0) {
        significantCorrs.forEach((corr, index) => {
          const strengthLabel = corr.strength.replace(/_/g, ' ').toUpperCase();
          doc.font('Helvetica-Bold')
             .fontSize(10)
             .fillColor(corr.coefficient > 0 ? '#059669' : '#DC2626')
             .text(`[${strengthLabel}] `, { continued: true });
          
          doc.font('Helvetica')
             .fillColor(textColor)
             .text(`${corr.column1} vs ${corr.column2} (r = ${corr.coefficient.toFixed(3)})`);
          
          doc.font('Helvetica')
             .fontSize(9)
             .fillColor(secondaryColor)
             .text(corr.description);
          
          if (index < significantCorrs.length - 1) {
            doc.moveDown(0.4);
          }
        });
      } else {
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(secondaryColor)
           .text('No significant correlations detected in the data.');
      }
    }

    if (analysisResult.trends.length > 0) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor(textColor)
         .text('Trends');
      
      doc.moveDown(0.5);
      
      analysisResult.trends.slice(0, 5).forEach((trend, index) => {
        const directionIcon = trend.direction === 'increasing' ? '[UP]' 
          : trend.direction === 'decreasing' ? '[DOWN]' 
          : trend.direction === 'volatile' ? '[VOLATILE]' 
          : '[STABLE]';
        
        const directionColor = trend.direction === 'increasing' ? '#059669' 
          : trend.direction === 'decreasing' ? '#DC2626' 
          : '#D97706';
        
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor(directionColor)
           .text(`${directionIcon} `, { continued: true });
        
        doc.font('Helvetica')
           .fillColor(textColor)
           .text(`${trend.valueColumn} over ${trend.dateColumn}`);
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(secondaryColor)
           .text(trend.description);
        
        if (index < analysisResult.trends.length - 1) {
          doc.moveDown(0.4);
        }
      });
    }

    if (analysisResult.charts.length > 0) {
      doc.addPage();
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor(textColor)
         .text('Charts Summary');
      
      doc.moveDown(0.5);
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(secondaryColor)
         .text('The following visualizations were generated from your data:');
      
      doc.moveDown(1);
      
      analysisResult.charts.forEach((chart: ChartConfig, index: number) => {
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor(primaryColor)
           .text(`${index + 1}. ${chart.title}`);
        
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(textColor);
        
        const chartDetails = [
          `Type: ${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart`,
          `X-Axis: ${chart.xAxis}`,
        ];
        
        if (chart.yAxis) {
          chartDetails.push(`Y-Axis: ${chart.yAxis}`);
        }
        
        chartDetails.push(`Data Points: ${chart.data.length}`);
        
        doc.text(chartDetails.join('  |  '));
        doc.moveDown(0.6);
      });
      
      doc.moveDown(1);
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(secondaryColor)
         .text('Note: Interactive chart visualizations are available in the web application.', { align: 'center' });
    }

    if (analysisResult.dataQuality) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor(textColor)
         .text('Data Quality Report');
      
      doc.moveDown(0.5);
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(textColor);
      
      const dq = analysisResult.dataQuality;
      doc.text(`Total Rows: ${dq.totalRows.toLocaleString()}`);
      doc.text(`Duplicate Rows: ${dq.duplicateRows.toLocaleString()} (${((dq.duplicateRows / dq.totalRows) * 100).toFixed(1)}%)`);
      
      if (dq.columnsWithMissing.length > 0) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Columns with Missing Data:');
        doc.font('Helvetica');
        dq.columnsWithMissing.slice(0, 8).forEach(col => {
          doc.text(`  - ${col.column}: ${col.missingCount} missing (${col.missingPercent.toFixed(1)}%)`);
        });
      }
    }

    doc.moveDown(2);
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor(secondaryColor)
       .text('Generated by DataViz - CSV Data Visualization & Insights Tool', { align: 'center' });

    doc.end();
  });
}
