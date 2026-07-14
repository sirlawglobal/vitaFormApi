import { Document } from 'mongoose';
import { Role } from '../../../common/enums/role.enum';
import { Permission } from '../../../common/constants/permissions.constants';

export interface Address {
  _id?: any;
  label: string;      // e.g. 'Home', 'Work'
  street: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface Device {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  fcmToken?: string;
  lastSeenAt: Date;
}

export interface UserPreferences {
  sleepPosition?: 'side' | 'back' | 'stomach';
  bodyWeightKg?: number;
  mattressPreference?: 'soft' | 'medium' | 'firm' | 'extra-firm';
  newsletter: boolean;
  smsAlerts: boolean;
  pushNotifications: boolean;
}

export interface IUser extends Document {
  email: string;
  phone: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  permissions: Permission[];
  isVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  addresses: Address[];
  devices: Device[];
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}
