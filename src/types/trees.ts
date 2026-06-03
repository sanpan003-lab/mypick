export interface TreeDetails {
  commonName: string;
  scientificName?: string;
  description?: string;
  tasteDescription?: string;
  texture?: string;
  climateConditions?: string;
  growingTips?: string;
  healthBenefits?: string[];
  growingZone?: string;
  harvestWindow?: string;
  region?: string;
}

export interface BotanicalInsights {
  tasteDescription?: string;
  texture?: string;
  climateConditions?: string;
  growingTips?: string;
  healthBenefits?: string[];
}

export interface BotanicalEntry {
  id: string;
  name: string;
  botanicalName: string;
  region?: string;
  growingZone: string;
  harvestWindow: string;
  notes: string;
  tasteDescription?: string;
  texture?: string;
  climateConditions?: string;
  growingTips?: string;
  healthBenefits?: string[];
}
