import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SleepQuizRepository } from './sleep-quiz.repository';
import { SubmitSleepQuizDto } from './dto/submit-sleep-quiz.dto';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { SleepQuizDocument } from './sleep-quiz.schema';
import { QUEUE_NAMES } from '../../common/constants/queue-names.constants';
import { SleepQuizQuestion } from './sleep-quiz-question.schema';
import { SleepQuizRule } from './sleep-quiz-rule.schema';

@Injectable()
export class SleepQuizService implements OnModuleInit {
  private readonly logger = new Logger(SleepQuizService.name);

  constructor(
    private readonly sleepQuizRepository: SleepQuizRepository,
    private readonly queueService: QueueService,
    @InjectModel(SleepQuizQuestion.name)
    private readonly questionModel: Model<SleepQuizQuestion>,
    @InjectModel(SleepQuizRule.name)
    private readonly ruleModel: Model<SleepQuizRule>,
  ) {}

  async onModuleInit() {
    const count = await this.questionModel.countDocuments();
    if (count === 0) {
      this.logger.log('Seeding initial sleep quiz questions...');
      await this.questionModel.insertMany([
        { id: 'sleepingPosition', label: 'What is your primary sleeping position?', type: 'single-select', options: ['side', 'back', 'stomach', 'combination'], order: 1 },
        { id: 'bodyWeightKg', label: 'What is your weight range?', type: 'single-select', options: ['Under 60 kg (Light)', '60 - 90 kg (Average)', 'Over 90 kg (Heavy Duty)'], order: 2 },
        { id: 'age', label: 'What is your age group?', type: 'single-select', options: ['Under 30 years', '30 - 50 years', 'Above 50 years'], order: 3 },
        { id: 'budget', label: 'What is your preferred mattress budget?', type: 'single-select', options: ['Under ₦100,000', '₦100,000 - ₦300,000', 'Above ₦300,000'], order: 4 },
        { id: 'preferredFirmness', label: 'What mattress firmness do you prefer?', type: 'single-select', options: ['soft', 'medium', 'firm', 'extra-firm'], order: 5 },
        { id: 'hasBackPain', label: 'Do you experience back pain?', type: 'boolean', order: 6 },
        { id: 'hasNeckPain', label: 'Do you experience neck pain?', type: 'boolean', order: 7 },
        { id: 'isPregnant', label: 'Are you currently pregnant?', type: 'boolean', order: 8 },
        { id: 'medicalConditions', label: 'Do you have any specific medical conditions?', type: 'multi-select', options: ['Scoliosis', 'Arthritis', 'Asthma', 'Acid Reflux'], order: 9 },
        { id: 'preferredSize', label: 'What mattress size do you prefer?', type: 'single-select', options: ['Single', 'Double', 'Queen', 'King', 'Super King'], order: 10 },
        { id: 'temperaturePreference', label: 'How do you sleep temperature-wise?', type: 'single-select', options: ['cool', 'neutral', 'warm'], order: 11 },
        { id: 'partnerSleep', label: 'Do you sleep with a partner?', type: 'boolean', order: 12 },
        { id: 'kidsOrAdults', label: 'Who is this mattress for?', type: 'single-select', options: ['kids', 'adults', 'both'], order: 13 }
      ]);
    } else {
      // Ensure existing DB records get updated with multi-choice options for numerical fields
      await this.questionModel.updateOne(
        { id: 'bodyWeightKg' },
        { label: 'What is your weight range?', type: 'single-select', options: ['Under 60 kg (Light)', '60 - 90 kg (Average)', 'Over 90 kg (Heavy Duty)'] }
      );
      await this.questionModel.updateOne(
        { id: 'age' },
        { label: 'What is your age group?', type: 'single-select', options: ['Under 30 years', '30 - 50 years', 'Above 50 years'] }
      );
      await this.questionModel.updateOne(
        { id: 'budget' },
        { label: 'What is your preferred mattress budget?', type: 'single-select', options: ['Under ₦100,000', '₦100,000 - ₦300,000', 'Above ₦300,000'] }
      );
    }
  }

  async getQuestions() {
    const questions = await this.questionModel.find().sort({ order: 1 }).lean().exec();
    // Reformat for the storefront
    return {
      questions: questions.map((q: any) => {
        const { _id, __v, createdAt, updatedAt, ...rest } = q;
        return rest;
      })
    };
  }

  async submitQuiz(
    dto: SubmitSleepQuizDto,
    userId?: string,
  ): Promise<{ quizId: string; status: string }> {
    const quiz = await this.sleepQuizRepository.create(dto, userId);

    // Enqueue background processing job
    await this.queueService.add(
      QUEUE_NAMES.RECOMMENDATION,
      'sleep-quiz-processing',
      {
        quizId: quiz._id.toString(),
        userId,
        answers: dto,
      },
    );

    return {
      quizId: quiz._id.toString(),
      status: quiz.status,
    };
  }

  async getResult(quizId: string): Promise<SleepQuizDocument> {
    const quiz = await this.sleepQuizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundException('Sleep quiz result not found');
    }
    return quiz;
  }

  async getLatestResultForUser(userId: string): Promise<SleepQuizDocument> {
    const quiz = await this.sleepQuizRepository.findLatestByUserId(userId);
    if (!quiz) {
      throw new NotFoundException('No sleep quiz found for this user');
    }
    return quiz;
  }

  // --- Admin Methods: Questions ---
  async createQuestion(data: any) {
    const created = new this.questionModel(data);
    return created.save();
  }

  async updateQuestion(id: string, data: any) {
    return this.questionModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deleteQuestion(id: string) {
    return this.questionModel.findByIdAndDelete(id).exec();
  }

  // --- Admin Methods: Rules ---
  async getRules() {
    return this.ruleModel.find().sort({ weight: -1, createdAt: -1 }).exec();
  }

  async createRule(data: any) {
    const created = new this.ruleModel(data);
    return created.save();
  }

  async updateRule(id: string, data: any) {
    return this.ruleModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deleteRule(id: string) {
    return this.ruleModel.findByIdAndDelete(id).exec();
  }
}
