import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = PlatformSettings & Document;

@Schema({ timestamps: true, collection: 'platform_settings' })
export class PlatformSettings {
  @Prop({ required: true, default: 'Vitafoam Nigeria' })
  appName!: string;

  @Prop({ required: true, default: 'support@vitafoam.com.ng' })
  contactEmail!: string;

  @Prop({ required: true, default: '+234700VITAFOAM' })
  supportPhone!: string;

  @Prop({ default: 'https://vitafoam.com.ng/privacy' })
  privacyPolicyUrl!: string;

  @Prop({ default: 'https://vitafoam.com.ng/terms' })
  termsOfServiceUrl!: string;

  @Prop({ default: 'NGN' })
  defaultCurrency!: string;

  @Prop({ default: 'en' })
  defaultLanguage!: string;

  @Prop({ default: false })
  maintenanceMode!: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const SettingsSchema = SchemaFactory.createForClass(PlatformSettings);
