import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface ServerConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  host: string;
  databasePath: string;
  jwtSecret: string;
  apiKey: string;
  pythonCvUrl: string;
  evidenceDir: string;
  fixturesDir: string;
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export const config: ServerConfig = {
  env: (process.env.NODE_ENV as any) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  databasePath: process.env.DATABASE_PATH || './data/seemadrishti.sqlite',
  jwtSecret: process.env.JWT_SECRET || 'seemadrishti-tactical-jwt-secret-key-2026',
  apiKey: process.env.M2M_API_KEY || 'seemadrishti-m2m-edge-secure-key-2026',
  pythonCvUrl: process.env.PYTHON_CV_URL || 'http://127.0.0.1:8088',
  evidenceDir: path.resolve(process.cwd(), 'evidence'),
  fixturesDir: path.resolve(process.cwd(), 'public/fixtures'),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()),
  rateLimitWindowMs: 15 * 60 * 1000,
  rateLimitMaxRequests: 1000,
};

export default config;
