import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
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
      'text/plain',
    ];
    const allowedExts = ['.csv', '.tsv'];
    
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and TSV files are allowed'));
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

      const headers = parsed.meta.fields || [];
      const rows = parsed.data as Record<string, string>[];

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
    
    if (err.message === 'Only CSV and TSV files are allowed') {
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
