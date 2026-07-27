import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  adminId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  adminEmail!: string;

  @Prop({ required: true, trim: true, index: true })
  action!: string; // e.g. "CREATE_USER", "UPDATE_ROLE", "DELETE_BANNER", "UPDATE_SETTINGS"

  @Prop({ required: true, trim: true, index: true })
  entityType!: string; // e.g. "User", "Banner", "Setting", "Coupon"

  @Prop({ trim: true })
  entityId?: string;

  @Prop({ type: Object, default: {} })
  changes?: Record<string, any>; // { before, after }

  @Prop({ trim: true })
  ipAddress?: string;

  @Prop({ trim: true })
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
