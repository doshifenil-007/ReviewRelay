import { Request, Response, NextFunction } from 'express';
import { Membership } from '../models/Membership';
import { Repository } from '../models/Repository';
import { OrgRole } from '@reviewrelay/shared';
import { Types } from 'mongoose';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      userRole?: OrgRole;
    }
  }
}

/**
 * Middleware factory to ensure the authenticated user belongs to the target organization
 * and has one of the allowed roles (e.g. OWNER or MEMBER).
 */
export function requireOrgRole(allowedRoles: OrgRole[] = [OrgRole.OWNER, OrgRole.MEMBER]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Check organizationId in params, query, or body
      let organizationId =
        req.params.organizationId ||
        req.params.id || // if route is /api/organizations/:id
        req.query.organizationId?.toString() ||
        req.body?.organizationId;

      // If repositoryId is provided instead, look up repo's organization
      const repositoryId = req.params.repositoryId || req.query.repositoryId?.toString() || req.body?.repositoryId;
      if (!organizationId && repositoryId) {
        if (Types.ObjectId.isValid(repositoryId)) {
          const repo = await Repository.findById(repositoryId);
          if (repo) {
            organizationId = repo.organizationId.toString();
          }
        }
      }

      if (!organizationId || !Types.ObjectId.isValid(organizationId)) {
        res.status(400).json({ error: 'Valid organization identifier required' });
        return;
      }

      const membership = await Membership.findOne({
        userId: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
      });

      if (!membership) {
        res.status(403).json({ error: 'Access denied: You are not a member of this organization' });
        return;
      }

      if (!allowedRoles.includes(membership.role)) {
        res.status(403).json({
          error: `Insufficient permissions: Requires ${allowedRoles.join(' or ')} privileges`,
        });
        return;
      }

      req.organizationId = organizationId;
      req.userRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
