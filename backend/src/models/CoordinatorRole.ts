import mongoose, { Schema, Document } from 'mongoose';

export interface ICoordinatorRole extends Document {
  title: string;
    name?: string;
  order?: number;
  isActive?: boolean;
description?: string;
}

const coordinatorRoleSchema = new Schema<ICoordinatorRole>({
  title: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export const CoordinatorRole = mongoose.model<ICoordinatorRole>('CoordinatorRole', coordinatorRoleSchema);
