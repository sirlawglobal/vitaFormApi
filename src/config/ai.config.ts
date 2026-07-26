import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  provider: process.env.AI_PROVIDER ?? 'groq',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS ?? '2000', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE ?? '0.7'),
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? process.env.GROK_API_KEY ?? '',
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    baseUrl: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
  },
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
