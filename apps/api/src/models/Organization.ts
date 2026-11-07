import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrganizationDocument extends Document {
  name: string;
  ownerId: Types.ObjectId;
  staleThresholdHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    staleThresholdHours: { type: Number, default: 48, min: 1, max: 720 },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganizationDocument>('Organization', OrganizationSchema);
