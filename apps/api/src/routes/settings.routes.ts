import { Router, Request, Response, NextFunction } from 'express';
import { Organization } from '../models/Organization';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { OrgRole, UpdateOrgSettingsSchema } from '@reviewrelay/shared';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const org = await Organization.findById(req.organizationId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }
      res.json({
        organizationId: org._id.toString(),
        name: org.name,
        staleThresholdHours: org.staleThresholdHours,
        role: req.userRole,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/',
  requireOrgRole([OrgRole.OWNER]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = UpdateOrgSettingsSchema.parse(req.body);
      const org = await Organization.findById(req.organizationId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      if (parsed.staleThresholdHours !== undefined) {
        org.staleThresholdHours = parsed.staleThresholdHours;
      }
      if (parsed.name) {
        org.name = parsed.name;
      }

      await org.save();

      res.json({
        organizationId: org._id.toString(),
        name: org.name,
        staleThresholdHours: org.staleThresholdHours,
        updatedAt: org.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

export const settingsRouter = router;
