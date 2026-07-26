import { Injectable, NotFoundException } from '@nestjs/common';
import { SleepQuizRepository } from './sleep-quiz.repository';
import { SubmitSleepQuizDto } from './dto/submit-sleep-quiz.dto';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { SleepQuizDocument } from './sleep-quiz.schema';
import { QUEUE_NAMES } from '../../common/constants/queue-names.constants';

@Injectable()
export class SleepQuizService {
  constructor(
    private readonly sleepQuizRepository: SleepQuizRepository,
    private readonly queueService: QueueService,
  ) {}

  getQuestions() {
    return {
      questions: [
        {
          id: 'sleepingPosition',
          label: 'What is your primary sleeping position?',
          type: 'single-select',
          options: ['side', 'back', 'stomach', 'combination'],
        },
        {
          id: 'bodyWeightKg',
          label: 'What is your weight in kilograms?',
          type: 'number',
          min: 20,
          max: 300,
        },
        {
          id: 'age',
          label: 'How old are you?',
          type: 'number',
          min: 1,
          max: 120,
        },
        {
          id: 'budget',
          label: 'What is your budget in NGN?',
          type: 'number',
        },
        {
          id: 'preferredFirmness',
          label: 'What mattress firmness do you prefer?',
          type: 'single-select',
          options: ['soft', 'medium', 'firm', 'extra-firm'],
        },
        {
          id: 'hasBackPain',
          label: 'Do you experience back pain?',
          type: 'boolean',
        },
        {
          id: 'hasNeckPain',
          label: 'Do you experience neck pain?',
          type: 'boolean',
        },
        {
          id: 'isPregnant',
          label: 'Are you currently pregnant?',
          type: 'boolean',
        },
        {
          id: 'medicalConditions',
          label: 'Do you have any specific medical conditions?',
          type: 'multi-select',
          options: ['Scoliosis', 'Arthritis', 'Asthma', 'Acid Reflux'],
        },
        {
          id: 'preferredSize',
          label: 'What mattress size do you prefer?',
          type: 'single-select',
          options: ['Single', 'Double', 'Queen', 'King', 'Super King'],
        },
        {
          id: 'temperaturePreference',
          label: 'How do you sleep temperature-wise?',
          type: 'single-select',
          options: ['cool', 'neutral', 'warm'],
        },
        {
          id: 'partnerSleep',
          label: 'Do you sleep with a partner?',
          type: 'boolean',
        },
        {
          id: 'kidsOrAdults',
          label: 'Who is this mattress for?',
          type: 'single-select',
          options: ['kids', 'adults', 'both'],
        },
      ],
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
}
