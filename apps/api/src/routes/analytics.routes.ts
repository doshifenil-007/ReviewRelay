import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { OrgRole } from '@reviewrelay/shared';

const router = Router();

router.use(authenticate);

router.get(
  '/overview',
  requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]),
  AnalyticsController.getOverview
);

router.get(
  '/review-speed',
  requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]),
  AnalyticsController.getReviewSpeed
);

router.get(
  '/reviewer-workload',
  requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]),
  AnalyticsController.getReviewerWorkload
);

export const analyticsRouter = router;
