import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
