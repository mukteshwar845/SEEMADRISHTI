import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

export const JWT_SECRET = process.env.JWT_SECRET || process.env.API_KEY || 'seemadrishti-jwt-fallback-secret-2026';

export interface AuthPayload {
  id: string;
  username: string;
  name: string;
  role: string;
  assigned_sector: string;
}

// POST /api/auth/login - Operator Login
authRouter.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      throw new AppError('Username and password are required', 400);
    }

    const trimmedUser = username.trim().toLowerCase();

    // Query user by username or email
    const user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(username) = ? OR LOWER(email) = ?
      LIMIT 1
    `).get(trimmedUser, trimmedUser) as any;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials: user not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify password hash
    let passwordValid = false;
    if (user.password_hash) {
      passwordValid = bcrypt.compareSync(password, user.password_hash);
    } else {
      // Fallback for default demo accounts if unhashed
      passwordValid = (password === 'Admin@123' || password === 'Operator@123');
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials: password incorrect',
        timestamp: new Date().toISOString(),
      });
    }

    const payload: AuthPayload = {
      id: user.id,
      username: user.username || user.email,
      name: user.name,
      role: user.role,
      assigned_sector: user.assigned_sector,
    };

    const jwtSecret = process.env.JWT_SECRET || process.env.API_KEY || 'seemadrishti-jwt-fallback-secret-2026';
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '12h' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username || user.email,
        name: user.name,
        role: user.role,
        email: user.email,
        shift: user.shift,
        status: user.status,
        assigned_sector: user.assigned_sector,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - Current Authenticated Operator
authRouter.get('/me', (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid format',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7).trim();
    const jwtSecret = process.env.JWT_SECRET || process.env.API_KEY || 'seemadrishti-jwt-fallback-secret-2026';
    try {
      const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
      const db = getDatabase();
      const user = db.prepare(`
        SELECT id, username, name, role, email, shift, status, assigned_sector, created_at, updated_at
        FROM users WHERE id = ?
      `).get(decoded.id) as any;

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        user,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout - Operator Logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Operator logged out successfully',
    timestamp: new Date().toISOString(),
  });
});
