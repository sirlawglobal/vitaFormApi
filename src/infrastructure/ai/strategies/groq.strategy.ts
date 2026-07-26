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
export class GroqStrategy implements AiStrategy {
  private readonly logger = new Logger(GroqStrategy.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ai.groq.apiKey', '');
    const baseUrl = this.config.get<string>(
      'ai.groq.baseUrl',
      'https://api.groq.com/openai/v1',
    );
    this.model = this.config.get<string>('ai.groq.model', 'llama3-70b-8192');

    this.client = new OpenAI({
      apiKey: apiKey || 'dummy-key-for-initialization',
      baseURL: baseUrl,
    });
  }

  async analyzeSleepQuiz(
    answers: SleepQuizAnswers,
    catalog: CatalogProductSummary[],
  ): Promise<AiRecommendationResult> {
    const systemPrompt = `You are an expert orthopedic mattress recommender for Vitafoam.
Your task is to analyze user sleep quiz answers and match them with the most suitable products from our active catalog.
You MUST respond with valid JSON ONLY matching this structure:
{
  "bestMattressSku": "SKU_HERE",
  "alternativeSkus": ["SKU_1", "SKU_2"],
  "accessorySkus": ["SKU_ACC_1"],
  "pillowSkus": ["SKU_PILLOW_1"],
  "protectorSkus": ["SKU_PROT_1"],
  "recommendedFirmness": "soft | medium | firm | extra-firm",
  "rationale": "Clear 2-sentence orthopedic reasoning."
}`;

    const userPrompt = `
User Profile:
${JSON.stringify(answers, null, 2)}

Available Product Catalog:
${JSON.stringify(catalog, null, 2)}

Select the optimal primary mattress, alternatives, pillows, protectors, and accessories from the catalog. Return valid JSON only.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content) as AiRecommendationResult;

      return {
        bestMattressSku: parsed.bestMattressSku || catalog[0]?.sku || '',
        alternativeSkus: parsed.alternativeSkus || [],
        accessorySkus: parsed.accessorySkus || [],
        pillowSkus: parsed.pillowSkus || [],
        protectorSkus: parsed.protectorSkus || [],
        recommendedFirmness: parsed.recommendedFirmness || 'medium',
        rationale:
          parsed.rationale ||
          'Recommended based on sleep position and orthopedic requirements.',
      };
    } catch (error) {
      this.logger.error(
        `Groq AI Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fallback response if API call fails or key is unconfigured
      return this.getFallbackRecommendation(answers, catalog);
    }
  }

  async generateRecommendations(
    userProfile: Record<string, any>,
    catalog: CatalogProductSummary[],
  ): Promise<AiRecommendationResult> {
    return this.analyzeSleepQuiz(userProfile as SleepQuizAnswers, catalog);
  }

  private getFallbackRecommendation(
    answers: SleepQuizAnswers,
    catalog: CatalogProductSummary[],
  ): AiRecommendationResult {
    const mattresses = catalog.filter((p) =>
      p.category.toLowerCase().includes('mattress'),
    );
    const pillows = catalog.filter((p) =>
      p.category.toLowerCase().includes('pillow'),
    );

    return {
      bestMattressSku: mattresses[0]?.sku || catalog[0]?.sku || 'VF-MAT-DEF',
      alternativeSkus: mattresses.slice(1, 3).map((m) => m.sku),
      accessorySkus: [],
      pillowSkus: pillows.slice(0, 1).map((p) => p.sku),
      protectorSkus: [],
      recommendedFirmness: answers.preferredFirmness || 'medium',
      rationale:
        'Selected standard orthopedic mattress based on your sleep profile.',
    };
  }
}
