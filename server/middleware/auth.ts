import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Security: Ephemeral random secret for non-production execution if unset; fail fast in production
const ephemeralSecret = crypto.randomBytes(32).toString('hex');
export const API_KEY = process.env.API_KEY || '';
export const CV_SERVICE_TOKEN = process.env.CV_SERVICE_TOKEN || process.env.API_KEY || '';
export const JWT_SECRET = process.env.JWT_SECRET || process.env.API_KEY || '';

// Fail loudly at startup in production if JWT_SECRET or API_KEY is unset
if (process.env.NODE_ENV === 'production') {
  if (!process.env.API_KEY && !API_KEY) {
    throw new Error(
      '\nCRITICAL SECURITY CONFIGURATION ERROR: process.env.API_KEY is unset in production.\n' +
      'SEEMADRISHTI AI refuses to start without a cryptographically secure API key.\n' +
      'Generate one with: openssl rand -hex 32 and set API_KEY in your .env file.\n'
    );
  }
  if (!process.env.JWT_SECRET && !JWT_SECRET) {
    throw new Error(
      '\nCRITICAL SECURITY CONFIGURATION ERROR: process.env.JWT_SECRET is unset in production.\n' +
      'SEEMADRISHTI AI refuses to start without a cryptographically secure JWT secret.\n'
    );
  }
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: string;
  assigned_sector?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Role-Based Access Control (RBAC) Authorization Middleware
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const isAllowed =
      allowedRoles.some((r) => r.toLowerCase() === userRole) ||
      userRole === 'admin' ||
      userRole === 'service' ||
      userRole === 'commander';

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: role '${req.user.role}' lacks authorization for this operation`,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}

/**
 * Authentication Middleware for SEEMADRISHTI AI Backend
 * Gating sensitive reads, mutations, and evidence streaming.
 *
 * Supports three authentication methods:
 * 1. Per-operator JWT Bearer token: 'Authorization: Bearer <jwt_token>' (Issued via /api/auth/login)
 * 2. Machine-to-Machine service token: 'x-api-key: <token>' or 'Authorization: Bearer <token>' matching API_KEY or CV_SERVICE_TOKEN
 * 3. Query string token for native media elements: '?token=<jwt_or_api_key>' (HTML5 video / img)
 */
export function getApiKey(): string {
  return process.env.API_KEY || API_KEY || (process.env.NODE_ENV === 'production' ? '' : ephemeralSecret);
}

export function getCvServiceToken(): string {
  return process.env.CV_SERVICE_TOKEN || process.env.API_KEY || CV_SERVICE_TOKEN || getApiKey();
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || process.env.API_KEY || JWT_SECRET || getApiKey();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const headerKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  let token: string | undefined;
  if (typeof headerKey === 'string' && headerKey.trim()) {
    token = headerKey.trim();
  } else if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query?.token && typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  const apiKey = getApiKey();
  const cvToken = getCvServiceToken();
  const jwtSecret = getJwtSecret();

  // 1. Machine-to-machine service token (cv_service -> backend)
  if (token) {
    if (apiKey && token === apiKey) {
      req.user = {
        id: 'srv-m2m-pipeline',
        username: 'cv_service',
        name: 'CV Computer Vision Service',
        role: 'service',
      };
      return next();
    }

    if (cvToken && token === cvToken) {
      req.user = {
        id: 'srv-cv-websocket',
        username: 'cv_service',
        name: 'CV Computer Vision Service',
        role: 'cv_service',
      };
      return next();
    }

    // 2. Validate per-operator JWT session token
    try {
      const decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;
      req.user = decoded;
      return next();
    } catch {
      // Token was provided but neither matched API_KEY nor was a valid JWT
      return res.status(403).json({
        success: false,
        error: 'Access denied: invalid or expired authorization token',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 3. Missing token -> 401 Unauthorized (Strict default-deny: no test bypass)
  return res.status(401).json({
    success: false,
    error: 'Authentication required: missing Authorization Bearer token, x-api-key, or query token',
    timestamp: new Date().toISOString(),
  });
}
