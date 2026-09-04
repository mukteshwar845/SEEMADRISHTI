import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/auth';

export const usersRouter = Router();

// SECURITY: All user management endpoints require authenticated Admin or Commander role
usersRouter.use(requireAuth);
usersRouter.use(requireRole(['Admin', 'Commander']));

export interface UserEntity {
  id: string;
  username?: string;
  name: string;
  role: string;
  email: string;
  shift: string;
  status: 'active' | 'on_duty' | 'off_duty';
  assigned_sector: string;
  created_at: string;
  updated_at: string;
}

// GET /api/users - List all surveillance personnel
usersRouter.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const users = (db.prepare(`
      SELECT id, username, name, role, email, shift, status, assigned_sector, created_at, updated_at
      FROM users ORDER BY created_at ASC
    `).all() as unknown) as UserEntity[];
    res.json({
      success: true,
      data: users,
      count: users.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users - Add a new operator
usersRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { name, username, password, role, email, shift, status, assigned_sector } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new AppError('Name is required and must be non-empty', 400);
    }
    if (!role || typeof role !== 'string' || role.trim() === '') {
      throw new AppError('Role is required', 400);
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new AppError('Valid email address is required', 400);
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError('Password is required and must be at least 6 characters', 400);
    }

    const id = `usr-${Date.now()}`;
    const now = new Date().toISOString();
    const userStatus = status && ['active', 'on_duty', 'off_duty'].includes(status) ? status : 'active';
    const sector = assigned_sector && typeof assigned_sector === 'string' ? assigned_sector.trim() : 'General Border Patrol';
    const userShift = shift && typeof shift === 'string' ? shift.trim() : 'Standard Shift';
    const cleanUsername = username && typeof username === 'string' ? username.trim().toLowerCase() : email.split('@')[0].toLowerCase();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, username, password_hash, name, role, email, shift, status, assigned_sector, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanUsername, passwordHash, name.trim(), role.trim(), email.trim(), userShift, userStatus, sector, now, now);

    const created = (db.prepare(`
      SELECT id, username, name, role, email, shift, status, assigned_sector, created_at, updated_at
      FROM users WHERE id = ?
    `).get(id) as unknown) as UserEntity;
    res.status(201).json({
      success: true,
      data: created,
      message: 'Personnel operator registered successfully',
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Update operator details or status
usersRouter.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { name, role, email, shift, status, assigned_sector, password } = req.body;

    const existing = (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown) as any;
    if (!existing) {
      throw new AppError(`User with id '${id}' not found`, 404);
    }

    const now = new Date().toISOString();
    const newName = name || existing.name;
    const newRole = role || existing.role;
    const newEmail = email || existing.email;
    const newShift = shift || existing.shift;
    const newStatus = status || existing.status;
    const newSector = assigned_sector || existing.assigned_sector;
    const passwordHash = password && typeof password === 'string' ? bcrypt.hashSync(password, 10) : existing.password_hash;

    db.prepare(`
      UPDATE users
      SET name = ?, role = ?, email = ?, shift = ?, status = ?, assigned_sector = ?, updated_at = ?, password_hash = ?
      WHERE id = ?
    `).run(newName, newRole, newEmail, newShift, newStatus, newSector, now, passwordHash, id);

    const updated = (db.prepare(`
      SELECT id, username, name, role, email, shift, status, assigned_sector, created_at, updated_at
      FROM users WHERE id = ?
    `).get(id) as unknown) as UserEntity;
    res.json({
      success: true,
      data: updated,
      message: 'Personnel operator updated successfully',
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Remove operator
usersRouter.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(`User with id '${id}' not found`, 404);
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({
      success: true,
      message: `User '${id}' deleted successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
