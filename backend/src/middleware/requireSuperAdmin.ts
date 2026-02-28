import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'SUPERADMIN') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
}
