import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiStrategy } from '../interfaces/ai-strategy.interface';
import { GroqStrategy } from '../strategies/groq.strategy';
import { OpenAiStrategy } from '../strategies/openai.strategy';
import { GeminiStrategy } from '../strategies/gemini.strategy';

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(
    private readonly config: ConfigService,
    private readonly groqStrategy: GroqStrategy,
    private readonly openAiStrategy: OpenAiStrategy,
    private readonly geminiStrategy: GeminiStrategy,
  ) {}

  getStrategy(): AiStrategy {
    const provider = this.config
      .get<string>('ai.provider', 'groq')
      .toLowerCase();

    this.logger.debug(`Resolving AI Strategy for provider: ${provider}`);

    switch (provider) {
      case 'groq':
      case 'grok':
        return this.groqStrategy;
      case 'openai':
        return this.openAiStrategy;
      case 'gemini':
        return this.geminiStrategy;
      default:
        this.logger.warn(
          `Unknown AI provider '${provider}'. Falling back to GroqStrategy.`,
        );
        return this.groqStrategy;
    }
  }
}
