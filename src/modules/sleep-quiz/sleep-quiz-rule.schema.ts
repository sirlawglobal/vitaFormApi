import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'sleep_quiz_rules' })
export class SleepQuizRule extends Document {
  @Prop({ required: true })
  condition!: string; // e.g. "User has severe back pain and sleeps on their back"

  @Prop({ required: true })
  recommendedSku!: string; // e.g. "VITA-ORTHO-001"

  @Prop({ required: true, default: 10 })
  weight!: number; // Priority

  @Prop({ default: true })
  isActive!: boolean;
}

export const SleepQuizRuleSchema = SchemaFactory.createForClass(SleepQuizRule);
