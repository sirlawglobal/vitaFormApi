export interface SleepQuizAnswers {
  sleepingPosition: 'side' | 'back' | 'stomach' | 'combination';
  bodyWeightKg?: number;
  age?: number;
  budget?: number;
  preferredFirmness?: 'soft' | 'medium' | 'firm' | 'extra-firm';
  hasBackPain?: boolean;
  hasNeckPain?: boolean;
  isPregnant?: boolean;
  medicalConditions?: string[];
  preferredSize?: string;
  temperaturePreference?: 'cool' | 'neutral' | 'warm';
  partnerSleep?: boolean;
  kidsOrAdults?: 'kids' | 'adults' | 'both';
}

export interface CatalogProductSummary {
  id: string;
  sku: string;
  name: string;
  category: string;
  firmness?: string;
  price: number;
  description?: string;
}

export interface AiRecommendationResult {
  bestMattressSku: string;
  alternativeSkus: string[];
  accessorySkus: string[];
  pillowSkus: string[];
  protectorSkus: string[];
  rationale: string;
  recommendedFirmness: string;
}

export interface AiStrategy {
  analyzeSleepQuiz(
    answers: SleepQuizAnswers,
    catalog: CatalogProductSummary[],
  ): Promise<AiRecommendationResult>;

  generateRecommendations(
    userProfile: Record<string, any>,
    catalog: CatalogProductSummary[],
  ): Promise<AiRecommendationResult>;
}
