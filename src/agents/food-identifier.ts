import { ZypherClient } from "../tools/zypher-client.ts";
import { ImageProcessor } from "../tools/image-processor.ts";
import type {
  FoodIdentificationRequest,
  FoodIdentificationResponse,
  FoodMacros,
} from "../types/index.ts";

type FoodResponsePayload = {
  name?: string;
  food?: string;
  calories?: number;
  macros?: Partial<FoodMacros>;
  healthScore?: number;
  insights?: string;
  description?: string;
};

export class FoodIdentifierAgent {
  private openaiClient: ZypherClient;

  constructor(zypherClient: ZypherClient) {
    this.openaiClient = zypherClient;
  }

  async identifyFood(
    request: FoodIdentificationRequest
  ): Promise<FoodIdentificationResponse> {
    if (!ImageProcessor.validateBase64Image(request.image)) {
      throw new Error("Invalid base64 image format");
    }

    if (!ImageProcessor.validateImageSize(request.image, 5)) {
      throw new Error("Image size exceeds 5MB limit");
    }

    const cleanImage = ImageProcessor.cleanBase64String(request.image);

    const systemPrompt = `You are a nutrition expert specialized in food recognition.
Your job is to analyze food images and provide a concise nutritional report containing:
1. The name of the food (English)
2. Estimated calories for the visible portion
3. A macro breakdown (protein, carbs, fat) expressed as strings including the unit (e.g. "25g")
4. A health score from 0 (unhealthy) to 100 (optimal)
5. Actionable insights on why the score was assigned

Return your answer using this exact JSON structure:
{
  "name": "food name",
  "calories": number,
  "macros": {
    "protein": "string with unit",
    "carbs": "string with unit",
    "fat": "string with unit"
  },
  "healthScore": number_between_0_and_100,
  "insights": "brief nutritional insight"
}`;

    const userPrompt = `Identify the food in this image and provide calories, macro distribution, a health score (0-100), and concise nutrition insights following the required JSON schema.`;

    try {
      const response = await this.openaiClient.chatWithVision(
        cleanImage,
        userPrompt,
        systemPrompt
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.normalizeResponse(parsed);
      }

      return this.parseTextResponse(response);
    } catch (error) {
      console.error("Error identifying food:", error);
      throw new Error("Failed to identify food from image");
    }
  }

  private parseTextResponse(text: string): FoodIdentificationResponse {
    const caloriesMatch = text.match(/(\d+)\s*(?:calorias|calories|kcal)/i);
    const calories = caloriesMatch ? parseInt(caloriesMatch[1]) : 0;
    const macros = this.estimateMacros(calories);
    const healthScore = this.estimateHealthScore(calories);

    const payload: FoodResponsePayload = {
      name: this.extractLikelyFoodName(text),
      calories,
      macros,
      healthScore,
      insights: text.substring(0, 280),
    };

    return this.normalizeResponse(payload);
  }

  private normalizeResponse(
    data: FoodResponsePayload
  ): FoodIdentificationResponse {
    const macros = {
      protein: data.macros?.protein ?? "0g",
      carbs: data.macros?.carbs ?? "0g",
      fat: data.macros?.fat ?? "0g",
    };

    const boundedHealthScore =
      typeof data.healthScore === "number"
        ? Math.min(100, Math.max(0, data.healthScore))
        : 50;

    return {
      name: data.name || data.food || "Unknown",
      calories: typeof data.calories === "number" ? data.calories : 0,
      macros,
      healthScore: boundedHealthScore,
      insights: data.insights || data.description || "No insights available.",
    };
  }

  private estimateMacros(calories: number): FoodMacros {
    if (!calories || calories <= 0) {
      return { protein: "0g", carbs: "0g", fat: "0g" };
    }

    const protein = Math.max(0, Math.round((calories * 0.3) / 4));
    const carbs = Math.max(0, Math.round((calories * 0.4) / 4));
    const fat = Math.max(0, Math.round((calories * 0.3) / 9));

    return {
      protein: `${protein}g`,
      carbs: `${carbs}g`,
      fat: `${fat}g`,
    };
  }

  private estimateHealthScore(calories: number): number {
    if (!calories || calories <= 0) {
      return 50;
    }

    if (calories < 250) return 85;
    if (calories < 500) return 75;
    if (calories < 750) return 65;
    if (calories < 1000) return 55;
    return 45;
  }

  private extractLikelyFoodName(text: string): string {
    const firstLine = text.split(/[\n.]/)[0]?.trim();
    if (firstLine && firstLine.length <= 60) {
      return firstLine;
    }
    return "Identified food";
  }
}
