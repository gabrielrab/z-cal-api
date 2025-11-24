export interface FoodIdentificationRequest {
  image: string;
}

export interface FoodMacros {
  protein: string;
  carbs: string;
  fat: string;
}

export interface FoodIdentificationResponse {
  name: string;
  calories: number;
  macros: FoodMacros;
  healthScore: number;
  insights: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RecipeChatRequest {
  messages: ChatMessage[];
}

export interface RecipeChatResponse {
  response: string;
}

export interface RecipeRequest {
  messages: ChatMessage[];
}

export interface RecipeResponse {
  response: string;
}

export type ZypherTextBlock = {
  type: "text";
  text: string;
};

export type ZypherImageBlock = {
  type: "image";
  source: {
    type: "base64";
    mediaType: string;
    data: string;
  };
};

export type ZypherContentBlock = ZypherTextBlock | ZypherImageBlock;

export interface ZypherChatMessage {
  role: "user" | "assistant";
  content: string | ZypherContentBlock[];
}

export type ZypherMessage =
  | { role: "system"; content: string | ZypherContentBlock[] }
  | ZypherChatMessage;

export interface ZypherRequest {
  model: string;
  messages: ZypherMessage[];
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
