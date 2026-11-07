import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  githubId: number;
  githubUsername: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  githubTokenEncrypted?: string;
  githubTokenIv?: string;
  githubTokenAuthTag?: string;
  githubTokenScope?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    githubUsername: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    avatarUrl: { type: String },
    email: { type: String, trim: true, lowercase: true },
    githubTokenEncrypted: { type: String, select: false },
    githubTokenIv: { type: String, select: false },
    githubTokenAuthTag: { type: String, select: false },
    githubTokenScope: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUserDocument>('User', UserSchema);
