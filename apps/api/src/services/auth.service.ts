import crypto from 'crypto';
import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios, { AxiosError } from 'axios';
import { Types } from 'mongoose';
import { User, IUserDocument } from '../models/User';
import { Organization } from '../models/Organization';
import { Membership } from '../models/Membership';
import { RefreshToken } from '../models/RefreshToken';
import { config } from '../config/env';
import { OrgRole } from '@reviewrelay/shared';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    githubId: number;
    githubUsername: string;
    displayName?: string;
    avatarUrl?: string;
    email?: string;
  };
}

export class AuthService {
  private static getGitHubTokenKey(): Buffer {
    return crypto.createHash('sha256').update(config.github.tokenEncryptionKey).digest();
  }

  private static encryptGitHubToken(token: string): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.getGitHubTokenKey(), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }

  private static decryptGitHubToken(user: IUserDocument): string | null {
    if (!user.githubTokenEncrypted || !user.githubTokenIv || !user.githubTokenAuthTag) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.getGitHubTokenKey(),
      Buffer.from(user.githubTokenIv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(user.githubTokenAuthTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(user.githubTokenEncrypted, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private static sanitizeGitHubOAuthError(err: unknown): Error {
    if (!axios.isAxiosError(err)) {
      return err instanceof Error ? err : new Error('Unknown GitHub OAuth error');
    }

    const axiosErr = err as AxiosError<any>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const githubError = data?.error || data?.message || axiosErr.code || 'request_failed';
    const description = data?.error_description || data?.error_uri || axiosErr.message;

    console.error('[GitHub OAuth] Request failed', {
      status,
      error: githubError,
      description,
    });

    return new Error(
      `GitHub OAuth failed${status ? ` (${status})` : ''}: ${githubError}${
        description ? ` - ${description}` : ''
      }`
    );
  }

  /**
   * Generates a short-lived access JWT token (15 mins)
   */
  public static generateAccessToken(user: IUserDocument): string {
    return jsonwebtoken.sign(
      {
        sub: user._id.toString(),
        githubId: user.githubId,
        githubUsername: user.githubUsername,
      },
      config.jwt.accessSecret,
      { expiresIn: '15m' }
    );
  }

  /**
   * Generates a cryptographically random refresh token and stores its hash in MongoDB
   */
  public static async generateRefreshToken(userId: Types.ObjectId): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresInDays);

    await RefreshToken.create({
      userId,
      tokenHash,
      expiresAt,
    });

    return rawToken;
  }

  /**
   * Issues both access token and refresh token
   */
  public static async issueTokenPair(user: IUserDocument): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user._id as Types.ObjectId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        githubId: user.githubId,
        githubUsername: user.githubUsername,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
      },
    };
  }

  /**
   * Finds or creates a user and ensures they have a default organization
   */
  public static async findOrCreateUser(githubProfile: {
    githubId: number;
    githubUsername: string;
    displayName?: string;
    avatarUrl?: string;
    email?: string;
    accessToken?: string;
    tokenScope?: string;
  }): Promise<IUserDocument> {
    let user = await User.findOne({ githubId: githubProfile.githubId }).select(
      '+githubTokenEncrypted +githubTokenIv +githubTokenAuthTag'
    );

    if (!user) {
      user = await User.create({
        githubId: githubProfile.githubId,
        githubUsername: githubProfile.githubUsername,
        displayName: githubProfile.displayName || githubProfile.githubUsername,
        avatarUrl: githubProfile.avatarUrl,
        email: githubProfile.email,
      });

      // Create default workspace organization for the user
      const org = await Organization.create({
        name: `${githubProfile.githubUsername}'s Org`,
        ownerId: user._id,
        staleThresholdHours: 48,
      });

      await Membership.create({
        userId: user._id,
        organizationId: org._id,
        role: OrgRole.OWNER,
      });
    } else {
      // Update details if changed
      let changed = false;
      if (githubProfile.displayName && user.displayName !== githubProfile.displayName) {
        user.displayName = githubProfile.displayName;
        changed = true;
      }
      if (githubProfile.avatarUrl && user.avatarUrl !== githubProfile.avatarUrl) {
        user.avatarUrl = githubProfile.avatarUrl;
        changed = true;
      }
      if (githubProfile.email && user.email !== githubProfile.email) {
        user.email = githubProfile.email;
        changed = true;
      }
      if (githubProfile.accessToken) {
        const encrypted = this.encryptGitHubToken(githubProfile.accessToken);
        user.githubTokenEncrypted = encrypted.encrypted;
        user.githubTokenIv = encrypted.iv;
        user.githubTokenAuthTag = encrypted.authTag;
        user.githubTokenScope = githubProfile.tokenScope;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    }

    return user;
  }

  /**
   * Rotates a refresh token: verifies hash, revokes old token, issues new tokens
   */
  public static async rotateRefreshToken(rawToken: string): Promise<TokenPair | null> {
    if (!rawToken) return null;

    // Retrieve active non-revoked tokens
    const now = new Date();
    const activeTokens = await RefreshToken.find({
      revokedAt: null,
      expiresAt: { $gt: now },
    });

    let matchedTokenDoc = null;
    for (const doc of activeTokens) {
      const isMatch = await bcrypt.compare(rawToken, doc.tokenHash);
      if (isMatch) {
        matchedTokenDoc = doc;
        break;
      }
    }

    if (!matchedTokenDoc) {
      return null;
    }

    // Invalidate / revoke previous token immediately
    matchedTokenDoc.revokedAt = new Date();
    await matchedTokenDoc.save();

    // Fetch user
    const user = await User.findById(matchedTokenDoc.userId);
    if (!user) {
      return null;
    }

    // Issue new pair
    return await this.issueTokenPair(user);
  }

  /**
   * Revokes a refresh token on logout
   */
  public static async revokeRefreshToken(rawToken: string): Promise<boolean> {
    if (!rawToken) return false;

    const activeTokens = await RefreshToken.find({ revokedAt: null });
    for (const doc of activeTokens) {
      const isMatch = await bcrypt.compare(rawToken, doc.tokenHash);
      if (isMatch) {
        doc.revokedAt = new Date();
        await doc.save();
        return true;
      }
    }
    return false;
  }

  /**
   * Exchanges GitHub OAuth code for access token and profile
   */
  public static async handleGitHubOAuth(code: string): Promise<IUserDocument> {
    if (!config.github.clientId || !config.github.clientSecret) {
      throw new Error('GitHub OAuth client ID/secret are not configured');
    }

    try {
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
          redirect_uri: config.github.callbackUrl,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      if (tokenResponse.data?.error) {
        console.error('[GitHub OAuth] Token exchange rejected', {
          error: tokenResponse.data.error,
          description: tokenResponse.data.error_description,
        });
        throw new Error(
          `GitHub OAuth failed: ${tokenResponse.data.error}${
            tokenResponse.data.error_description
              ? ` - ${tokenResponse.data.error_description}`
              : ''
          }`
        );
      }

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        throw new Error('Failed to acquire access token from GitHub');
      }

      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ReviewRelay-App',
        },
      });

      const ghUser = userResponse.data;

      return await this.findOrCreateUser({
        githubId: ghUser.id,
        githubUsername: ghUser.login,
        displayName: ghUser.name,
        avatarUrl: ghUser.avatar_url,
        email: ghUser.email,
        accessToken,
        tokenScope: tokenResponse.headers?.['x-oauth-scopes'] || tokenResponse.data?.scope,
      });
    } catch (err) {
      throw this.sanitizeGitHubOAuthError(err);
    }
  }

  public static async getGitHubAccessTokenForUser(userId: string): Promise<string | null> {
    const user = await User.findById(userId).select(
      '+githubTokenEncrypted +githubTokenIv +githubTokenAuthTag'
    );
    if (!user) {
      return null;
    }

    return this.decryptGitHubToken(user);
  }
}
