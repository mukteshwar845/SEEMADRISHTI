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

// PUT /api/auth/profile - Update Current Authenticated Operator Profile
authRouter.put('/profile', (req: Request, res: Response, next: NextFunction) => {
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
    let decoded: AuthPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as AuthPayload;
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token',
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id) as any;
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Operator not found in database',
        timestamp: new Date().toISOString(),
      });
    }

    const { name, email, shift, assigned_sector, password } = req.body;
    const now = new Date().toISOString();

    const newName = typeof name === 'string' && name.trim() ? name.trim() : existing.name;
    const newEmail = typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : existing.email;
    const newShift = typeof shift === 'string' && shift.trim() ? shift.trim() : existing.shift;
    const newSector = typeof assigned_sector === 'string' && assigned_sector.trim() ? assigned_sector.trim() : existing.assigned_sector;
    const passwordHash = typeof password === 'string' && password.length >= 6 ? bcrypt.hashSync(password, 10) : existing.password_hash;

    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, shift = ?, assigned_sector = ?, updated_at = ?, password_hash = ?
      WHERE id = ?
    `).run(newName, newEmail, newShift, newSector, now, passwordHash, decoded.id);

    const updatedUser = db.prepare(`
      SELECT id, username, name, role, email, shift, status, assigned_sector, created_at, updated_at
      FROM users WHERE id = ?
    `).get(decoded.id) as any;

    res.json({
      success: true,
      user: updatedUser,
      message: 'Operator profile updated successfully',
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register - Operator Registration (Sign Up)
authRouter.post('/register', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { username, password, name, email, role, shift, assigned_sector } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      throw new AppError('Username is required and must be at least 3 characters', 400);
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError('Password is required and must be at least 6 characters', 400);
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new AppError('Full personnel name is required', 400);
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new AppError('Valid personnel email address is required', 400);
    }

    const trimmedUser = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    // Check for duplicate username or email
    const existing = db.prepare(`
      SELECT id, username, email FROM users
      WHERE LOWER(username) = ? OR LOWER(email) = ?
      LIMIT 1
    `).get(trimmedUser, trimmedEmail) as any;

    if (existing) {
      if (existing.username && existing.username.toLowerCase() === trimmedUser) {
        return res.status(409).json({
          success: false,
          error: `Username '${username.trim()}' is already registered in the personnel directory.`,
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(409).json({
        success: false,
        error: `Email '${email.trim()}' is already registered.`,
        timestamp: new Date().toISOString(),
      });
    }

    const id = `usr-${Date.now()}`;
    const now = new Date().toISOString();
    const validRoles = ['Commander', 'Surveillance Operator', 'Patrol Officer', 'AI Analyst'];
    const assignedRole = role && validRoles.includes(role) ? role : 'Surveillance Operator';
    const assignedSector = assigned_sector && typeof assigned_sector === 'string' && assigned_sector.trim()
      ? assigned_sector.trim()
      : 'Sector Alpha - Main Gate';
    const assignedShift = shift && typeof shift === 'string' && shift.trim()
      ? shift.trim()
      : 'Day Shift (0600 - 1800)';

    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (
        id, username, password_hash, name, role, email, shift, status, assigned_sector, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(id, trimmedUser, passwordHash, name.trim(), assignedRole, trimmedEmail, assignedShift, assignedSector, now, now);

    const payload: AuthPayload = {
      id,
      username: trimmedUser,
      name: name.trim(),
      role: assignedRole,
      assigned_sector: assignedSector,
    };

    const jwtSecret = process.env.JWT_SECRET || process.env.API_KEY || 'seemadrishti-jwt-fallback-secret-2026';
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '12h' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id,
        username: trimmedUser,
        name: name.trim(),
        role: assignedRole,
        email: trimmedEmail,
        shift: assignedShift,
        status: 'active',
        assigned_sector: assignedSector,
      },
      message: 'Personnel registered and authenticated successfully',
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/roles - Available Tactical Clearance Roles
authRouter.get('/roles', (_req: Request, res: Response) => {
  const roles = [
    {
      id: 'Commander',
      title: 'Commander / Unit Chief',
      code: 'LVL-4 COMMAND',
      description: 'Full perimeter control, protocol overrides, AI calibration, and incident escalations.',
      clearanceColor: '#ec4899',
    },
    {
      id: 'Surveillance Operator',
      title: 'Surveillance Operator',
      code: 'LVL-3 OPERATOR',
      description: 'Real-time multi-cam matrix supervision, PTZ tracking, alarm triaging, and manual captures.',
      clearanceColor: '#00f0ff',
    },
    {
      id: 'Patrol Officer',
      title: 'Patrol Officer',
      code: 'LVL-2 PATROL',
      description: 'Tactical field response unit, sector alerts verification, and on-ground deployment status.',
      clearanceColor: '#10b981',
    },
    {
      id: 'AI Analyst',
      title: 'Surveillance AI Analyst',
      code: 'LVL-3 ANALYST',
      description: 'Neural trajectory inspection, model confidence profiling, false positive mitigation, and reporting.',
      clearanceColor: '#a855f7',
    },
  ];

  res.json({
    success: true,
    data: roles,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/auth/logout - Operator Logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Operator logged out successfully',
    timestamp: new Date().toISOString(),
  });
});

