import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProviderFactory } from './factories/ai-provider.factory';
import { GroqStrategy } from './strategies/groq.strategy';
import { OpenAiStrategy } from './strategies/openai.strategy';
import { GeminiStrategy } from './strategies/gemini.strategy';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    GroqStrategy,
    OpenAiStrategy,
    GeminiStrategy,
    AiProviderFactory,
  ],
  exports: [AiProviderFactory],
})
export class AiModule {}
