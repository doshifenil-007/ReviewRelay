import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { createRateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();
const strictAuthLimiter = createRateLimiter(20, 60); // 20 requests per minute

router.get('/github', AuthController.getGitHubAuthUrl);
router.get('/github/callback', AuthController.handleCallback);
router.post('/refresh', strictAuthLimiter, AuthController.refreshTokens);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', strictAuthLimiter, AuthController.devLogin);
}

export const authRouter = router;
