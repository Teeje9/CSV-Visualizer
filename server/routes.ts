import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { analyzeData } from "./analysis";
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
        
        const parsed = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        if (parsed.errors.length > 0 && parsed.data.length === 0) {
          const response: UploadResponse = {
            success: false,
            error: 'Failed to parse CSV file. Please check the file format.'
          };
          return res.status(400).json(response);
        }

        headers = parsed.meta.fields || [];
        rows = parsed.data as Record<string, string>[];
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

      const prompt = `You are a data analyst. Give a brief, punchy summary of this dataset in 2-3 short paragraphs (max 150 words total).

Dataset: ${analysisResult.fileName} (${analysisResult.rowCount} rows, ${analysisResult.columnCount} columns)

Columns: ${columnsSummary}

Stats: ${statsSummary}

Trends: ${trendsSummary}

Correlations: ${correlationsSummary}

Sample: ${dataSample}

Write like you're telling a friend what you found. Lead with the most interesting insight. Be specific with numbers. Skip obvious observations.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 350,
        temperature: 0.7,
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
