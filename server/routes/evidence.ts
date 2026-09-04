import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const evidenceRouter = Router();

// SECURITY: All evidence endpoints require authentication
evidenceRouter.use(requireAuth);

const ALLOWED_EXTENSIONS = new Set(['.mp4', '.jpg', '.jpeg', '.png', '.json']);
const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json',
};

// GET /evidence/:filename or /api/evidence/:filename
evidenceRouter.get('/:filename', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;

    // Security: Validate filename against path traversal and special characters
    if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename) || filename.includes('..')) {
      throw new AppError('Access denied: invalid filename or path traversal detected', 400);
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new AppError(`Access denied: file type '${ext}' is not permitted in evidence vault`, 403);
    }

    // Resolve candidate evidence paths
    const allowedDirectories = [
      path.resolve(process.cwd(), 'evidence'),
      path.resolve(process.cwd(), 'data/evidence'),
      path.resolve(process.cwd(), 'cv_service/tests/fixtures'),
    ];

    let foundPath: string | null = null;
    for (const dir of allowedDirectories) {
      const candidate = path.normalize(path.join(dir, filename));
      // Strict root boundary verification
      if (candidate.startsWith(dir) && fs.existsSync(candidate)) {
        foundPath = candidate;
        break;
      }
    }

    if (!foundPath) {
      return res.status(404).json({
        success: false,
        error: `Evidence record '${filename}' not found in secure vault`,
        timestamp: new Date().toISOString(),
      });
    }

    const stat = fs.statSync(foundPath);
    if (stat.size === 0) {
      throw new AppError('Evidence file is corrupted or empty (0 bytes)', 500);
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // res.sendFile handles HTTP Range (206 Partial Content) natively
    return res.sendFile(foundPath, {
      acceptRanges: true,
      headers: {
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err) {
    next(err);
  }
});
