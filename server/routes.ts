import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { analyzeData } from "./analysis";
import { sendFeedbackEmail } from "./resend";
import type { UploadResponse, AnalysisResult } from "@shared/schema";
import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'text/tab-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    const allowedExts = ['.csv', '.tsv', '.xlsx', '.xls'];
    
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, TSV, and Excel files are allowed'));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /

Sitemap: https://csvviz.com/sitemap.xml
`);
  });

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://csvviz.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://csvviz.com/csv-charts</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://csvviz.com/excel-analysis</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://csvviz.com/sales-dashboard</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
`);
  });

  // Preview endpoint - returns raw rows without parsing headers
  app.post('/api/preview', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
      const selectedSheet = req.body?.sheet as string | undefined;
      let rawRows: string[][] = [];
      let sheets: string[] | null = null;

      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        sheets = workbook.SheetNames.length > 1 ? workbook.SheetNames : null;
        const sheetName = selectedSheet || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        if (!sheet) {
          return res.status(400).json({ success: false, error: `Sheet "${sheetName}" not found` });
        }
        
        rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
      } else {
        const content = req.file.buffer.toString('utf-8');
        const parsed = Papa.parse(content, { header: false, skipEmptyLines: false });
        rawRows = parsed.data as string[][];
      }

      // Return first 20 rows for preview
      const previewRows = rawRows.slice(0, 20);
      const totalRows = rawRows.length;
      const totalCols = rawRows.length > 0 ? Math.max(...rawRows.slice(0, 20).map(r => r.length)) : 0;

      res.json({
        success: true,
        previewRows,
        totalRows,
        totalCols,
        sheets,
        fileName: req.file.originalname,
      });
    } catch (error) {
      console.error('Preview error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview file'
      });
    }
  });

  // Analyze with header row selection
  app.post('/api/analyze-with-header', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
      const selectedSheet = req.body?.sheet as string | undefined;
      const headerRowIndex = parseInt(req.body?.headerRow || '0', 10);
      
      let rawRows: string[][] = [];

      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = selectedSheet || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        if (!sheet) {
          return res.status(400).json({ success: false, error: `Sheet "${sheetName}" not found` });
        }
        
        rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
      } else {
        const content = req.file.buffer.toString('utf-8');
        const parsed = Papa.parse(content, { header: false, skipEmptyLines: false });
        rawRows = parsed.data as string[][];
      }

      if (rawRows.length <= headerRowIndex) {
        return res.status(400).json({ success: false, error: 'Header row index is out of range' });
      }

      // Extract headers and data rows based on selected header row
      const headerRow = rawRows[headerRowIndex];
      const dataRows = rawRows.slice(headerRowIndex + 1);

      // Generate unique header names
      const usedNames = new Set<string>();
      const headers = headerRow.map((h, i) => {
        let name = (h || '').toString().trim() || `Column${i + 1}`;
        let originalName = name;
        let counter = 2;
        while (usedNames.has(name)) {
          name = `${originalName}_${counter}`;
          counter++;
        }
        usedNames.add(name);
        return name;
      });

      // Convert data rows to record objects
      const rows = dataRows
        .filter(row => row.some(cell => cell && cell.toString().trim() !== ''))
        .map(row => {
          const record: Record<string, string> = {};
          headers.forEach((header, i) => {
            record[header] = (row[i] || '').toString().trim();
          });
          return record;
        });

      if (headers.length === 0 || rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid data found' });
      }

      const result = analyzeData(
        { headers, rows },
        req.file.originalname
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  });

  // Pivot/unpivot data transformation
  app.post('/api/pivot', async (req, res) => {
    try {
      const { rawData, fileName, idColumns, valueColumns, pivotType } = req.body;
      
      if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        return res.status(400).json({ success: false, error: 'No data provided' });
      }

      if (!idColumns || !Array.isArray(idColumns) || idColumns.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one identifier column is required' });
      }

      if (!valueColumns || !Array.isArray(valueColumns) || valueColumns.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one value column is required' });
      }

      // Unpivot: convert wide format to long format
      // Each value column becomes a row with Period (column name) and Value
      const unpivotedRows: Record<string, string>[] = [];
      
      for (const row of rawData) {
        for (const valueCol of valueColumns) {
          const value = row[valueCol];
          // Skip empty values
          if (value === '' || value === null || value === undefined) continue;
          
          const newRow: Record<string, string> = {};
          // Add ID columns
          for (const idCol of idColumns) {
            newRow[idCol] = row[idCol] || '';
          }
          // Add Period and Value
          newRow['Period'] = valueCol;
          newRow['Value'] = String(value);
          unpivotedRows.push(newRow);
        }
      }

      if (unpivotedRows.length === 0) {
        return res.status(400).json({ success: false, error: 'No data after reshaping. Check that value columns have data.' });
      }

      const headers = [...idColumns, 'Period', 'Value'];
      
      const result = analyzeData(
        { headers, rows: unpivotedRows },
        fileName || 'reshaped_data.csv'
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Pivot error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reshape data'
      });
    }
  });

  app.post('/api/sheets', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
      
      if (ext !== '.xlsx' && ext !== '.xls') {
        return res.json({ success: true, sheets: null });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      
      if (workbook.SheetNames.length <= 1) {
        return res.json({ success: true, sheets: null });
      }

      return res.json({ 
        success: true, 
        sheets: workbook.SheetNames,
        fileName: req.file.originalname
      });
    } catch (error) {
      console.error('Sheet detection error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read Excel file'
      });
    }
  });
  
  app.post('/api/analyze', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        const response: UploadResponse = {
          success: false,
          error: 'No file uploaded'
        };
        return res.status(400).json(response);
      }

      const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
      const selectedSheet = req.body?.sheet as string | undefined;
      let headers: string[] = [];
      let rows: Record<string, string>[] = [];

      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = selectedSheet || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        if (!sheet) {
          const response: UploadResponse = {
            success: false,
            error: `Sheet "${sheetName}" not found in the Excel file.`
          };
          return res.status(400).json(response);
        }
        
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false, defval: '' });
        
        if (jsonData.length === 0) {
          const response: UploadResponse = {
            success: false,
            error: 'The Excel file appears to be empty or has no valid data.'
          };
          return res.status(400).json(response);
        }

        headers = Object.keys(jsonData[0]).map(h => String(h).trim());
        rows = jsonData.map(row => {
          const strRow: Record<string, string> = {};
          for (const key of headers) {
            strRow[key] = String(row[key] ?? '');
          }
          return strRow;
        });
      } else {
        const content = req.file.buffer.toString('utf-8');
        
        // First parse without headers to detect title rows
        const rawParsed = Papa.parse(content, {
          header: false,
          skipEmptyLines: true,
        });
        
        if (rawParsed.errors.length > 0 && rawParsed.data.length === 0) {
          const response: UploadResponse = {
            success: false,
            error: 'Failed to parse CSV file. Please check the file format.'
          };
          return res.status(400).json(response);
        }
        
        const rawRows = rawParsed.data as string[][];
        if (rawRows.length < 2) {
          const response: UploadResponse = {
            success: false,
            error: 'The file appears to be empty or has insufficient data.'
          };
          return res.status(400).json(response);
        }
        
        // Detect if first row is a title row (mostly empty, single value, or doesn't look like headers)
        const firstRow = rawRows[0];
        const secondRow = rawRows[1];
        const nonEmptyInFirst = firstRow.filter(v => v && v.trim() !== '').length;
        const nonEmptyInSecond = secondRow.filter(v => v && v.trim() !== '').length;
        
        // If first row has only 1-2 non-empty values and second row has significantly more,
        // treat first row as a title and use second row as headers
        const isTitleRow = nonEmptyInFirst <= 2 && nonEmptyInSecond > nonEmptyInFirst * 2;
        
        let headerRow: string[];
        let dataRows: string[][];
        
        if (isTitleRow) {
          headerRow = secondRow.map(h => (h || '').trim());
          dataRows = rawRows.slice(2);
        } else {
          headerRow = firstRow.map(h => (h || '').trim());
          dataRows = rawRows.slice(1);
        }
        
        // Generate unique header names for empty/duplicate headers
        const usedNames = new Set<string>();
        headers = headerRow.map((h, i) => {
          let name = h || `Column${i + 1}`;
          let originalName = name;
          let counter = 2;
          while (usedNames.has(name)) {
            name = `${originalName}_${counter}`;
            counter++;
          }
          usedNames.add(name);
          return name;
        });
        
        // Convert data rows to record objects
        rows = dataRows.map(row => {
          const record: Record<string, string> = {};
          headers.forEach((header, i) => {
            record[header] = (row[i] || '').trim();
          });
          return record;
        });
      }

      if (headers.length === 0 || rows.length === 0) {
        const response: UploadResponse = {
          success: false,
          error: 'The file appears to be empty or has no valid data.'
        };
        return res.status(400).json(response);
      }

      const result = analyzeData(
        { headers, rows },
        req.file.originalname
      );

      const response: UploadResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (error) {
      console.error('Analysis error:', error);
      const response: UploadResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
      res.status(500).json(response);
    }
  });

  app.post('/api/reanalyze', async (req, res) => {
    try {
      const { rawData, fileName, columnTransforms, rowTransform } = req.body;
      
      if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        return res.status(400).json({ success: false, error: 'No data provided' });
      }

      let transformedRows = [...rawData] as Record<string, string>[];

      if (rowTransform?.removeDuplicates) {
        const seen = new Set<string>();
        transformedRows = transformedRows.filter(row => {
          const key = JSON.stringify(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      if (rowTransform?.missingValueAction === 'remove_rows') {
        transformedRows = transformedRows.filter(row => 
          Object.values(row).every(v => v !== '' && v !== null && v !== undefined)
        );
      }

      const activeTransforms = (columnTransforms || []).filter((t: any) => !t.excluded);
      const excludedColumns = (columnTransforms || []).filter((t: any) => t.excluded).map((t: any) => t.originalName);

      // Apply per-column cleaning transformations
      transformedRows = transformedRows.map(row => {
        const newRow = { ...row };
        for (const t of activeTransforms as any[]) {
          let value = newRow[t.originalName] ?? '';
          
          // Trim whitespace
          if (t.trimWhitespace && typeof value === 'string') {
            value = value.trim();
          }
          
          // Strip non-numeric characters (for numeric columns)
          if (t.stripNonNumeric && t.newType === 'numeric' && typeof value === 'string') {
            // Keep only digits, decimal points, minus signs, and scientific notation
            value = value.replace(/[^0-9.\-eE]/g, '');
            // Clean up multiple decimal points or minus signs
            const parts = value.split('.');
            if (parts.length > 2) {
              value = parts[0] + '.' + parts.slice(1).join('');
            }
          }
          
          // Custom fill value for empty cells
          if (t.customFillValue && (value === '' || value === null || value === undefined)) {
            value = t.customFillValue;
          }
          
          newRow[t.originalName] = value;
        }
        return newRow;
      });

      if (rowTransform?.missingValueAction === 'fill_zero' || rowTransform?.missingValueAction === 'fill_mean') {
        const numericCols = activeTransforms
          .filter((t: any) => t.newType === 'numeric' && !t.customFillValue)
          .map((t: any) => t.originalName);

        if (rowTransform.missingValueAction === 'fill_mean') {
          const means: Record<string, number> = {};
          for (const col of numericCols) {
            const values = transformedRows
              .map(r => parseFloat(r[col]))
              .filter(v => !isNaN(v));
            means[col] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          }
          transformedRows = transformedRows.map(row => {
            const newRow = { ...row };
            for (const col of numericCols) {
              if (newRow[col] === '' || newRow[col] === null || newRow[col] === undefined) {
                newRow[col] = String(means[col]);
              }
            }
            return newRow;
          });
        } else {
          transformedRows = transformedRows.map(row => {
            const newRow = { ...row };
            for (const col of numericCols) {
              if (newRow[col] === '' || newRow[col] === null || newRow[col] === undefined) {
                newRow[col] = '0';
              }
            }
            return newRow;
          });
        }
      }

      const finalRows = transformedRows.map(row => {
        const newRow: Record<string, string> = {};
        for (const t of activeTransforms as any[]) {
          newRow[t.newName] = row[t.originalName] ?? '';
        }
        return newRow;
      });

      const headers = activeTransforms.map((t: any) => t.newName);
      
      // Collect columns marked as unique/ID for special handling
      const uniqueColumns = activeTransforms
        .filter((t: any) => t.treatAsUnique)
        .map((t: any) => t.newName);

      if (headers.length === 0 || finalRows.length === 0) {
        return res.status(400).json({ success: false, error: 'No data after transformations' });
      }

      const result = analyzeData(
        { headers, rows: finalRows },
        fileName || 'transformed_data.csv',
        uniqueColumns
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Reanalyze error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reanalyze data'
      });
    }
  });

  // Pivot/unpivot endpoint - converts wide format data to long format
  app.post('/api/pivot', async (req, res) => {
    try {
      const { rawData, fileName, idColumns, valueColumns } = req.body;
      
      if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        return res.status(400).json({ success: false, error: 'No data provided' });
      }
      
      if (!idColumns || !Array.isArray(idColumns) || idColumns.length === 0) {
        return res.status(400).json({ success: false, error: 'No identifier columns selected' });
      }
      
      if (!valueColumns || !Array.isArray(valueColumns) || valueColumns.length === 0) {
        return res.status(400).json({ success: false, error: 'No value columns selected' });
      }

      // Transform wide format to long format (unpivot)
      const pivotedRows: Record<string, string>[] = [];
      
      for (const row of rawData) {
        // For each value column, create a new row with Period and Value
        for (const valueCol of valueColumns) {
          const newRow: Record<string, string> = {};
          
          // Copy identifier columns
          for (const idCol of idColumns) {
            newRow[idCol] = row[idCol] ?? '';
          }
          
          // Add Period (the column name) and Value (the cell value)
          newRow['Period'] = valueCol;
          newRow['Value'] = row[valueCol] ?? '';
          
          // Only include rows with non-empty values
          if (newRow['Value'] !== '' && newRow['Value'] !== null && newRow['Value'] !== undefined) {
            pivotedRows.push(newRow);
          }
        }
      }

      if (pivotedRows.length === 0) {
        return res.status(400).json({ success: false, error: 'No data after reshaping' });
      }

      const headers = [...idColumns, 'Period', 'Value'];
      
      const result = analyzeData(
        { headers, rows: pivotedRows },
        `${fileName?.replace(/\.[^/.]+$/, '') || 'data'}_reshaped.csv`
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Pivot error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reshape data'
      });
    }
  });

  app.post('/api/generate-summary', async (req, res) => {
    try {
      const { analysisResult } = req.body as { analysisResult: AnalysisResult };
      
      if (!analysisResult) {
        return res.status(400).json({ success: false, error: 'No analysis data provided' });
      }

      const columnsSummary = analysisResult.columns.map(c => 
        `- ${c.name}: ${c.semanticType}${c.unit ? ` (${c.unit})` : ''}, ${c.missingPercent > 0 ? `${c.missingPercent.toFixed(0)}% missing` : 'complete'}`
      ).join('\n');

      const statsSummary = analysisResult.numericStats.map(s => 
        `- ${s.column}: min=${s.min.toFixed(2)}, max=${s.max.toFixed(2)}, avg=${s.mean.toFixed(2)}${s.unit ? ` ${s.unit}` : ''}`
      ).join('\n');

      const trendsSummary = analysisResult.trends.map(t => 
        `- ${t.valueColumn} is ${t.direction}`
      ).join('\n') || 'No significant trends detected';

      const correlationsSummary = analysisResult.correlations.slice(0, 3).map(c => 
        `- ${c.column1} and ${c.column2}: ${c.strength.replace(/_/g, ' ')} (${c.coefficient.toFixed(2)})`
      ).join('\n') || 'No strong correlations detected';

      const dataSample = analysisResult.rawData?.slice(0, 5).map(row => 
        Object.entries(row).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join(', ')
      ).join('\n') || '';

      const prompt = `You are a senior data analyst preparing an executive briefing. Provide a concise, professional analysis of this dataset in 2-3 paragraphs (max 150 words).

Dataset: ${analysisResult.fileName} (${analysisResult.rowCount} rows, ${analysisResult.columnCount} columns)

Columns: ${columnsSummary}

Statistics: ${statsSummary}

Trends: ${trendsSummary}

Correlations: ${correlationsSummary}

Sample Data: ${dataSample}

Guidelines:
- Use formal, business-appropriate language
- Lead with the most significant finding and its business implication
- Cite specific metrics, percentages, and statistical values
- Highlight actionable insights and potential areas of concern
- Avoid casual phrases, humor, or conversational tone
- Focus on data-driven observations and measurable outcomes
- Structure findings clearly with emphasis on key takeaways`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 350,
        temperature: 0.5,
      });

      const summary = response.choices[0]?.message?.content || 'Unable to generate summary';

      res.json({ success: true, summary });
    } catch (error) {
      console.error('AI summary error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate summary' 
      });
    }
  });

  // Feedback endpoint - sends email via Resend
  app.post('/api/feedback', async (req, res) => {
    try {
      const { name, email, message } = req.body;
      
      if (!name || !email || !message) {
        return res.status(400).json({ 
          success: false, 
          error: 'Name, email, and message are required' 
        });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Please provide a valid email address' 
        });
      }
      
      await sendFeedbackEmail(name, email, message);
      
      res.json({ success: true, message: 'Feedback sent successfully' });
    } catch (error) {
      console.error('Feedback email error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send feedback. Please try again later.' 
      });
    }
  });

  app.use((err: Error, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds the 5MB limit'
        });
      }
    }
    
    if (err.message === 'Only CSV, TSV, and Excel files are allowed') {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  });

  return httpServer;
}
