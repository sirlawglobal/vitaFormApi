import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AiRecommendationResult,
  AiStrategy,
  CatalogProductSummary,
  SleepQuizAnswers,
} from '../interfaces/ai-strategy.interface';

@Injectable()
export class GeminiStrategy implements AiStrategy {
  private readonly logger = new Logger(GeminiStrategy.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ai.gemini.apiKey', '');
    this.modelName = this.config.get<string>(
      'ai.gemini.model',
      'gemini-1.5-pro',
    );
    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key-for-init');
  }

  async analyzeSleepQuiz(
    answers: SleepQuizAnswers,
    catalog: CatalogProductSummary[],
  ): Promise<AiRecommendationResult> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `You are an expert orthopedic mattress recommender for Vitafoam.
Analyze the user sleep quiz answers and match them with products from the catalog.
Profile: ${JSON.stringify(answers)}
Catalog: ${JSON.stringify(catalog)}

Return JSON ONLY matching:
{
  "bestMattressSku": "SKU_HERE",
  "alternativeSkus": ["SKU_1"],
  "accessorySkus": ["SKU_ACC_1"],
  "pillowSkus": ["SKU_PILLOW_1"],
  "protectorSkus": ["SKU_PROT_1"],
  "recommendedFirmness": "soft | medium | firm | extra-firm",
  "rationale": "2-sentence rationale."
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text) as AiRecommendationResult;
    } catch (error) {
      this.logger.error(
        `Gemini AI Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        bestMattressSku: catalog[0]?.sku || '',
        alternativeSkus: [],
        accessorySkus: [],
        pillowSkus: [],
        protectorSkus: [],
        recommendedFirmness: answers.preferredFirmness || 'medium',
        rationale: 'Fallback recommendation generated.',
      };
    }
  }

  async generateRecommendations(
    userProfile: Record<string, any>,
    catalog: CatalogProductSummary[],
  ): Promise<AiRecommendationResult> {
    return this.analyzeSleepQuiz(userProfile as SleepQuizAnswers, catalog);
  }
}
