import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRepositoryDocument extends Document {
  githubRepositoryId: number;
  organizationId: Types.ObjectId;
  name: string;
  fullName: string;
  owner: string;
  webhookConfigured: boolean;
  webhookSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new Schema<IRepositoryDocument>(
  {
    githubRepositoryId: { type: Number, required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    webhookConfigured: { type: Boolean, default: false },
    webhookSecret: { type: String, required: true },
  },
  { timestamps: true }
);

RepositorySchema.index({ organizationId: 1, githubRepositoryId: 1 }, { unique: true });

export const Repository = mongoose.model<IRepositoryDocument>('Repository', RepositorySchema);
