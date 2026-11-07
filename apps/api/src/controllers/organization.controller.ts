import { Request, Response, NextFunction } from 'express';
import { Organization } from '../models/Organization';
import { Membership } from '../models/Membership';
import { User } from '../models/User';
import { OrgRole, CreateOrgSchema, UpdateOrgSettingsSchema } from '@reviewrelay/shared';
import { Types } from 'mongoose';

export class OrganizationController {
  public static async listMyOrganizations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const memberships = await Membership.find({ userId: new Types.ObjectId(userId) })
        .populate('organizationId')
        .exec();

      const orgs = memberships
        .filter((m) => m.organizationId)
        .map((m: any) => ({
          id: m.organizationId._id.toString(),
          name: m.organizationId.name,
          ownerId: m.organizationId.ownerId.toString(),
          staleThresholdHours: m.organizationId.staleThresholdHours,
          role: m.role,
          createdAt: m.organizationId.createdAt,
        }));

      res.json(orgs);
    } catch (err) {
      next(err);
    }
  }

  public static async createOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsed = CreateOrgSchema.parse(req.body);
      const userId = req.user!.id;

      const org = await Organization.create({
        name: parsed.name,
        ownerId: new Types.ObjectId(userId),
        staleThresholdHours: parsed.staleThresholdHours ?? 48,
      });

      await Membership.create({
        userId: new Types.ObjectId(userId),
        organizationId: org._id,
        role: OrgRole.OWNER,
      });

      res.status(201).json({
        id: org._id.toString(),
        name: org.name,
        ownerId: org.ownerId.toString(),
        staleThresholdHours: org.staleThresholdHours,
        role: OrgRole.OWNER,
        createdAt: org.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const org = await Organization.findById(req.params.id);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      res.json({
        id: org._id.toString(),
        name: org.name,
        ownerId: org.ownerId.toString(),
        staleThresholdHours: org.staleThresholdHours,
        role: req.userRole,
        createdAt: org.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateOrganizationSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsed = UpdateOrgSettingsSchema.parse(req.body);
      const org = await Organization.findById(req.params.id);

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
        id: org._id.toString(),
        name: org.name,
        ownerId: org.ownerId.toString(),
        staleThresholdHours: org.staleThresholdHours,
        updatedAt: org.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listMembers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const memberships = await Membership.find({
        organizationId: new Types.ObjectId(req.params.id),
      }).populate('userId', 'githubUsername displayName avatarUrl');

      res.json(
        memberships.map((m: any) => ({
          id: m._id.toString(),
          userId: m.userId?._id?.toString(),
          username: m.userId?.githubUsername,
          displayName: m.userId?.displayName,
          avatarUrl: m.userId?.avatarUrl,
          role: m.role,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
}
