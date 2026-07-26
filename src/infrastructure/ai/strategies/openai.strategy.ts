import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiRecommendationResult,
  AiStrategy,
  CatalogProductSummary,
  SleepQuizAnswers,
} from '../interfaces/ai-strategy.interface';

@Injectable()
export class OpenAiStrategy implements AiStrategy {
  private readonly logger = new Logger(OpenAiStrategy.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ai.openai.apiKey', '');
    this.model = this.config.get<string>('ai.openai.model', 'gpt-4o');
    this.client = new OpenAI({
      apiKey: apiKey || 'dummy-key-for-initialization',
    });
  }

  async analyzeSleepQuiz(
    answers: SleepQuizAnswers,
    catalog: CatalogProductSummary[],
  ): Promise<AiRecommendationResult> {
    const systemPrompt = `You are an expert orthopedic mattress recommender for Vitafoam.
Analyze the user sleep quiz answers and match them with suitable catalog products.
Respond in valid JSON ONLY matching:
{
  "bestMattressSku": "SKU_HERE",
  "alternativeSkus": ["SKU_1"],
  "accessorySkus": ["SKU_ACC_1"],
  "pillowSkus": ["SKU_PILLOW_1"],
  "protectorSkus": ["SKU_PROT_1"],
  "recommendedFirmness": "soft | medium | firm | extra-firm",
  "rationale": "Clear 2-sentence rationale."
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Profile: ${JSON.stringify(answers)}\nCatalog: ${JSON.stringify(catalog)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content) as AiRecommendationResult;
    } catch (error) {
      this.logger.error(
        `OpenAI Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
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
