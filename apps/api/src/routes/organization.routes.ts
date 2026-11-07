import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { OrgRole } from '@reviewrelay/shared';

const router = Router();

router.use(authenticate);

router.get('/', OrganizationController.listMyOrganizations);
router.post('/', OrganizationController.createOrganization);
router.get('/:id', requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]), OrganizationController.getOrganization);
router.patch(
  '/:id',
  requireOrgRole([OrgRole.OWNER]),
  OrganizationController.updateOrganizationSettings
);
router.get(
  '/:id/members',
  requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]),
  OrganizationController.listMembers
);

export const organizationRouter = router;
