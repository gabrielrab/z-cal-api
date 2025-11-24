export interface FoodIdentificationRequest {
  image: string;
}

export interface FoodIdentificationResponse {
  food: string;
  calories: number;
  confidence: number;
  description?: string;
}

export interface RecipeRequest {
  ingredients: string[];
}

export interface RecipeResponse {
  recipe: string;
  estimatedCalories: number;
  preparationTime?: string;
}

export interface ZypherRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content:
      | string
      | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  max_tokens?: number;
  temperature?: number;
}

export interface ZypherResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
