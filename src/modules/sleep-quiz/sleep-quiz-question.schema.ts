import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'sleep_quiz_questions' })
export class SleepQuizQuestion extends Document {
  @Prop({ required: true, unique: true, trim: true })
  id!: string; // e.g. "sleepingPosition"

  @Prop({ required: true })
  label!: string; // e.g. "What is your primary sleeping position?"

  @Prop({ required: true })
  type!: string; // 'single-select', 'multi-select', 'number', 'text'

  @Prop({ type: [String], default: [] })
  options!: string[];

  @Prop()
  min?: number;

  @Prop()
  max?: number;

  @Prop({ default: 0 })
  order!: number;
}

export const SleepQuizQuestionSchema = SchemaFactory.createForClass(SleepQuizQuestion);
