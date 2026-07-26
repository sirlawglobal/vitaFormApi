import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SleepQuiz, SleepQuizDocument, QuizStatus } from './sleep-quiz.schema';
import { AiRecommendationResult } from '../../infrastructure/ai/interfaces/ai-strategy.interface';

@Injectable()
export class SleepQuizRepository {
  constructor(
    @InjectModel(SleepQuiz.name)
    private readonly model: Model<SleepQuizDocument>,
  ) {}

  async create(
    answers: Record<string, any>,
    userId?: string,
  ): Promise<SleepQuizDocument> {
    return this.model.create({
      userId: userId ? new Types.ObjectId(userId) : undefined,
      answers,
      status: QuizStatus.PENDING,
    });
  }

  async findById(id: string): Promise<SleepQuizDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).exec();
  }

  async findLatestByUserId(userId: string): Promise<SleepQuizDocument | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return this.model
      .findOne({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markCompleted(
    id: string,
    result: AiRecommendationResult,
  ): Promise<SleepQuizDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: QuizStatus.COMPLETED,
            bestMattressSku: result.bestMattressSku,
            alternativeSkus: result.alternativeSkus,
            accessorySkus: result.accessorySkus,
            pillowSkus: result.pillowSkus,
            protectorSkus: result.protectorSkus,
            recommendedFirmness: result.recommendedFirmness,
            aiRationale: result.rationale,
          },
        },
        { new: true },
      )
      .exec();
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, {
        $set: {
          status: QuizStatus.FAILED,
          errorMessage,
        },
      })
      .exec();
  }
}
