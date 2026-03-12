import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { ForbiddenError } from '../lib/errors';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.isAdmin) {
        throw new ForbiddenError('Admin access required');
    }
    next();
}
