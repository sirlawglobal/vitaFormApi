import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  provider: process.env.AI_PROVIDER ?? 'grok',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS ?? '2000', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE ?? '0.7'),
  grok: {
    apiKey: process.env.GROK_API_KEY ?? '',
    model: process.env.GROK_MODEL ?? 'grok-2-latest',
    baseUrl: process.env.GROK_BASE_URL ?? 'https://api.x.ai/v1',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-1.5-pro',
  },
}));
