import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { analyzeData } from "./analysis";
import type { UploadResponse, AnalysisResult } from "@shared/schema";
import OpenAI from "openai";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";

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

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/export-usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const usage = await storage.getExportUsage(userId, yearMonth);
      const exportCount = usage?.exportCount || 0;
      const freeExportsRemaining = Math.max(0, 1 - exportCount);
      
      res.json({
        exportCount,
        freeExportsRemaining,
        requiresPayment: exportCount >= 1,
        yearMonth,
      });
    } catch (error) {
      console.error("Error fetching export usage:", error);
      res.status(500).json({ message: "Failed to fetch export usage" });
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
      let headers: string[] = [];
      let rows: Record<string, string>[] = [];

      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
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

  const httpServer = createServer(app);
  return httpServer;
}
