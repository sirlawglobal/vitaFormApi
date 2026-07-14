import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import { Permission, ROLE_PERMISSIONS } from '../../common/constants/permissions.constants';
import { Address, Device, UserPreferences } from './interfaces/user.interface';

@Schema({ timestamps: true })
export class UserAddress implements Address {
  _id?: any;

  @Prop({ required: true, trim: true, default: 'Home' })
  label!: string;

  @Prop({ required: true, trim: true })
  street!: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ trim: true })
  postalCode?: string;

  @Prop({ required: true, trim: true, default: 'Nigeria' })
  country!: string;

  @Prop({ default: false })
  isDefault!: boolean;

  @Prop({ type: [Number], index: '2dsphere' })
  coordinates?: [number, number]; // [longitude, latitude]
}

export const UserAddressSchema = SchemaFactory.createForClass(UserAddress);

@Schema({ timestamps: false, _id: false })
export class UserDevice implements Device {
  @Prop({ required: true, trim: true })
  deviceId!: string;

  @Prop({ required: true, enum: ['ios', 'android', 'web'] })
  platform!: 'ios' | 'android' | 'web';

  @Prop({ trim: true })
  fcmToken?: string;

  @Prop({ default: Date.now })
  lastSeenAt!: Date;
}

export const UserDeviceSchema = SchemaFactory.createForClass(UserDevice);

@Schema({ timestamps: false, _id: false })
export class UserPreferencesSchemaClass implements UserPreferences {
  @Prop({ enum: ['side', 'back', 'stomach'] })
  sleepPosition?: 'side' | 'back' | 'stomach';

  @Prop({ min: 20, max: 300 })
  bodyWeightKg?: number;

  @Prop({ enum: ['soft', 'medium', 'firm', 'extra-firm'] })
  mattressPreference?: 'soft' | 'medium' | 'firm' | 'extra-firm';

  @Prop({ default: true })
  newsletter!: boolean;

  @Prop({ default: true })
  smsAlerts!: boolean;

  @Prop({ default: true })
  pushNotifications!: boolean;
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferencesSchemaClass);

@Schema({
  collection: 'users',
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: any) => {
      if (ret.passwordHash !== undefined) {
        delete ret.passwordHash;
      }
      if (ret.__v !== undefined) {
        delete ret.__v;
      }
      return ret;
    },
  },
})
export class User extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
  })
  email!: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  phone!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({
    required: true,
    enum: Object.values(Role),
    default: Role.CUSTOMER,
    index: true,
  })
  role!: Role;

  @Prop({
    type: [String],
    default: function (this: User) {
      return ROLE_PERMISSIONS[this.role || Role.CUSTOMER] || [];
    },
  })
  permissions!: Permission[];

  @Prop({ default: false, index: true })
  isVerified!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop({ type: [UserAddressSchema], default: () => [] })
  addresses!: UserAddress[];

  @Prop({ type: [UserDeviceSchema], default: () => [] })
  devices!: UserDevice[];

  @Prop({
    type: UserPreferencesSchema,
    default: () => ({
      newsletter: true,
      smsAlerts: true,
      pushNotifications: true,
    }),
  })
  preferences!: UserPreferencesSchemaClass;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ phone: 1, isActive: 1 });
