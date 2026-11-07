import { Request, Response, NextFunction } from 'express';
import { Repository } from '../models/Repository';
import { ConnectRepositorySchema } from '@reviewrelay/shared';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { config } from '../config/env';
import { AuthService } from '../services/auth.service';
import { GitHubService } from '../services/github.service';

export class RepositoryController {
  public static async listAccessibleGitHubRepositories(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const accessToken = await AuthService.getGitHubAccessTokenForUser(userId);
      if (!accessToken) {
        res.status(409).json({
          error: 'GitHub OAuth connection is required before syncing repositories',
        });
        return;
      }

      const repos = await GitHubService.fetchAccessibleRepositories(accessToken);
      res.json(
        repos.map((repo) => ({
          githubRepositoryId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
        }))
      );
    } catch (err) {
      next(err);
    }
  }

  public static async syncGitHubRepositories(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.body?.organizationId || req.organizationId;
      if (!userId || !organizationId) {
        res.status(400).json({ error: 'organizationId is required' });
        return;
      }

      const accessToken = await AuthService.getGitHubAccessTokenForUser(userId);
      if (!accessToken) {
        res.status(409).json({
          error: 'GitHub OAuth connection is required before syncing repositories',
        });
        return;
      }

      const result = await GitHubService.syncAccessibleRepositoriesAndPullRequests({
        accessToken,
        organizationId,
      });

      res.json({
        message: 'GitHub repositories and pull requests synced',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listRepositories(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organizationId = req.query.organizationId?.toString();
      if (!organizationId) {
        res.status(400).json({ error: 'organizationId query parameter is required' });
        return;
      }

      const repos = await Repository.find({
        organizationId: new Types.ObjectId(organizationId),
      }).sort({ createdAt: -1 });

      res.json(
        repos.map((r) => ({
          id: r._id.toString(),
          githubRepositoryId: r.githubRepositoryId,
          organizationId: r.organizationId.toString(),
          name: r.name,
          fullName: r.fullName,
          owner: r.owner,
          webhookConfigured: r.webhookConfigured,
          createdAt: r.createdAt,
        }))
      );
    } catch (err) {
      next(err);
    }
  }

  public static async connectRepository(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsed = ConnectRepositorySchema.parse(req.body);

      // Check if already connected in this organization
      let existing = await Repository.findOne({
        organizationId: new Types.ObjectId(parsed.organizationId),
        $or: [
          { githubRepositoryId: parsed.githubRepositoryId },
          { fullName: parsed.fullName },
        ],
      });

      if (existing) {
        res.status(409).json({ error: 'Repository is already connected to this organization' });
        return;
      }

      const webhookSecret = parsed.webhookSecret || crypto.randomBytes(24).toString('hex');

      const repo = await Repository.create({
        githubRepositoryId: parsed.githubRepositoryId,
        organizationId: new Types.ObjectId(parsed.organizationId),
        name: parsed.name,
        fullName: parsed.fullName,
        owner: parsed.owner,
        webhookConfigured: false,
        webhookSecret,
      });

      res.status(201).json({
        id: repo._id.toString(),
        githubRepositoryId: repo.githubRepositoryId,
        organizationId: repo.organizationId.toString(),
        name: repo.name,
        fullName: repo.fullName,
        owner: repo.owner,
        webhookConfigured: repo.webhookConfigured,
        webhookSecret: repo.webhookSecret,
        webhookUrl: `${config.corsOrigin.replace('5173', '4000')}/api/webhooks/github`,
        createdAt: repo.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getRepository(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const repo = await Repository.findById(req.params.repositoryId);
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      res.json({
        id: repo._id.toString(),
        githubRepositoryId: repo.githubRepositoryId,
        organizationId: repo.organizationId.toString(),
        name: repo.name,
        fullName: repo.fullName,
        owner: repo.owner,
        webhookConfigured: repo.webhookConfigured,
        createdAt: repo.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async disconnectRepository(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const repo = await Repository.findById(req.params.repositoryId);
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      await repo.deleteOne();
      res.json({ message: 'Repository disconnected successfully' });
    } catch (err) {
      next(err);
    }
  }
}
