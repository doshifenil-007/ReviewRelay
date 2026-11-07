import { Router } from 'express';
import { PullRequestController } from '../controllers/pull-request.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { OrgRole } from '@reviewrelay/shared';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]),
  PullRequestController.listOrganizationPrs
);
router.get('/:id', PullRequestController.getPrDetails);

export const pullRequestRouter = router;
