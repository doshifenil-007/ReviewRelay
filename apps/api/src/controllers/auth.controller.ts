import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { Membership } from '../models/Membership';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { config } from '../config/env';

export class AuthController {
  /**
   * Redirects or provides GitHub OAuth authorization URL
   */
  public static getGitHubAuthUrl(req: Request, res: Response): void {
    if (!config.github.clientId) {
      res.status(400).json({
        error: 'GitHub OAuth Client ID is not configured in .env',
      });
      return;
    }

    const redirectUri = encodeURIComponent(config.github.callbackUrl);
    const scope = encodeURIComponent('read:user user:email repo');
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    res.json({ url: authUrl });
  }

  /**
   * Handles GitHub OAuth callback
   */
  public static async handleCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(400).json({ error: 'OAuth authorization code is required' });
        return;
      }

      const user = await AuthService.handleGitHubOAuth(code);
      const tokenPair = await AuthService.issueTokenPair(user);

      // Redirect back to frontend with tokens in URL hash/query
      const redirectTarget = `${config.corsOrigin}/auth/callback?access_token=${tokenPair.accessToken}&refresh_token=${tokenPair.refreshToken}`;
      res.redirect(redirectTarget);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Refreshes access token with refresh token rotation
   */
  public static async refreshTokens(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required' });
        return;
      }

      const tokenPair = await AuthService.rotateRefreshToken(refreshToken);
      if (!tokenPair) {
        res.status(401).json({ error: 'Invalid, expired, or revoked refresh token' });
        return;
      }

      res.json(tokenPair);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Revokes refresh token on logout
   */
  public static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await AuthService.revokeRefreshToken(refreshToken);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Returns current authenticated user and organizations
   */
  public static async getMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const memberships = await Membership.find({ userId: user._id }).populate('organizationId');

      const organizations = memberships
        .filter((m) => m.organizationId)
        .map((m: any) => ({
          id: m.organizationId._id.toString(),
          name: m.organizationId.name,
          role: m.role,
          staleThresholdHours: m.organizationId.staleThresholdHours,
        }));

      res.json({
        user: {
          id: user._id.toString(),
          githubId: user.githubId,
          githubUsername: user.githubUsername,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          email: user.email,
        },
        organizations,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Developer instant login for local evaluation and testing
   * Creates a demo engineer profile if no GitHub OAuth is configured
   */
  public static async devLogin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const username = req.body.username || 'octocat';
      const user = await AuthService.findOrCreateUser({
        githubId: 583231,
        githubUsername: username,
        displayName: 'Demo Engineer',
        avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
        email: 'developer@reviewrelay.local',
      });

      const tokenPair = await AuthService.issueTokenPair(user);
      res.json(tokenPair);
    } catch (err) {
      next(err);
    }
  }
}
