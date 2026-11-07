import { Router } from 'express';
import { webhookRouter } from './webhook.routes';
import { authRouter } from './auth.routes';
import { organizationRouter } from './organization.routes';
import { repositoryRouter } from './repository.routes';
import { pullRequestRouter } from './pull-request.routes';
import { analyticsRouter } from './analytics.routes';
import { settingsRouter } from './settings.routes';

const router = Router();

router.use('/webhooks', webhookRouter);
router.use('/auth', authRouter);
router.use('/organizations', organizationRouter);
router.use('/repositories', repositoryRouter);
router.use('/pull-requests', pullRequestRouter);
router.use('/analytics', analyticsRouter);
router.use('/settings', settingsRouter);

export const apiRouter = router;
