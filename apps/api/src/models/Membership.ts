import mongoose, { Schema, Document, Types } from 'mongoose';
import { OrgRole } from '@reviewrelay/shared';

export interface IMembershipDocument extends Document {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembershipDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: { type: String, enum: Object.values(OrgRole), default: OrgRole.MEMBER, required: true },
  },
  { timestamps: true }
);

// Compound unique index so a user is not added twice to the same organization
MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export const Membership = mongoose.model<IMembershipDocument>('Membership', MembershipSchema);
