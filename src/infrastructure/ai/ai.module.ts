import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProviderFactory } from './factories/ai-provider.factory';
import { GroqStrategy } from './strategies/groq.strategy';
import { OpenAiStrategy } from './strategies/openai.strategy';
import { GeminiStrategy } from './strategies/gemini.strategy';

import { MongooseModule } from '@nestjs/mongoose';
import { SleepQuizRule, SleepQuizRuleSchema } from '../../modules/sleep-quiz/sleep-quiz-rule.schema';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: SleepQuizRule.name, schema: SleepQuizRuleSchema }]),
  ],
  providers: [
    GroqStrategy,
    OpenAiStrategy,
    GeminiStrategy,
    AiProviderFactory,
  ],
  exports: [AiProviderFactory],
})
export class AiModule {}
