import { ZypherClient } from "../tools/zypher-client.ts";
import { ImageProcessor } from "../tools/image-processor.ts";
import type {
  FoodIdentificationRequest,
  FoodIdentificationResponse,
} from "../types/index.ts";

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
Your job is to analyze food images and provide:
1. The name of the food (in English)
2. An accurate calorie estimate (based on the visible portion)
3. A brief nutritional description

Return your answer using the following JSON structure:
{
  "food": "food name",
  "calories": calorie_amount,
  "confidence": confidence_percentage (0-100),
  "description": "brief nutritional description"
}`;

    const userPrompt = `Please identify the food in this image and provide detailed nutritional information, especially the estimated calories.`;

    try {
      const response = await this.openaiClient.chatWithVision(
        cleanImage,
        userPrompt,
        systemPrompt
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          food: parsed.food || "Unknown",
          calories: parsed.calories || 0,
          confidence: parsed.confidence || 0,
          description: parsed.description,
        };
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

    return {
      food: "Identified food",
      calories,
      confidence: 70,
      description: text.substring(0, 200),
    };
  }
}
