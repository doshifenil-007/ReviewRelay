import { Router } from 'express';
import { RepositoryController } from '../controllers/repository.controller';
import { PullRequestController } from '../controllers/pull-request.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { OrgRole } from '@reviewrelay/shared';

const router = Router();

router.use(authenticate);

router.get('/github/accessible', RepositoryController.listAccessibleGitHubRepositories);
router.post('/sync-github', requireOrgRole([OrgRole.OWNER]), RepositoryController.syncGitHubRepositories);
router.get('/', requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]), RepositoryController.listRepositories);
router.post('/', requireOrgRole([OrgRole.OWNER]), RepositoryController.connectRepository);
router.get(
  '/:repositoryId',
  requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]),
  RepositoryController.getRepository
);
router.delete('/:repositoryId', requireOrgRole([OrgRole.OWNER]), RepositoryController.disconnectRepository);
router.get(
  '/:repositoryId/pull-requests',
  requireOrgRole([OrgRole.OWNER, OrgRole.MEMBER]),
  PullRequestController.listRepositoryPrs
);

export const repositoryRouter = router;
