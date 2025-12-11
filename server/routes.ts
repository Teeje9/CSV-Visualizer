import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { analyzeData } from "./analysis";
import type { UploadResponse } from "@shared/schema";

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
