import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SleepQuizDocument = SleepQuiz & Document;

export enum QuizStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true, collection: 'sleep_quizzes' })
export class SleepQuiz {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  userId?: Types.ObjectId;

  @Prop({ type: Object, required: true })
  answers: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(QuizStatus),
    default: QuizStatus.PENDING,
    index: true,
  })
  status: QuizStatus;

  @Prop({ type: String, required: false })
  recommendedFirmness?: string;

  @Prop({ type: String, required: false })
  bestMattressSku?: string;

  @Prop({ type: [String], default: [] })
  alternativeSkus: string[];

  @Prop({ type: [String], default: [] })
  accessorySkus: string[];

  @Prop({ type: [String], default: [] })
  pillowSkus: string[];

  @Prop({ type: [String], default: [] })
  protectorSkus: string[];

  @Prop({ type: String, required: false })
  aiRationale?: string;

  @Prop({ type: String, required: false })
  errorMessage?: string;
}

export const SleepQuizSchema = SchemaFactory.createForClass(SleepQuiz);

SleepQuizSchema.index({ createdAt: -1 });
