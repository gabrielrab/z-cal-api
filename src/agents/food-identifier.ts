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

    const systemPrompt = `Você é um especialista em nutrição e identificação de alimentos. 
Sua tarefa é analisar imagens de alimentos e fornecer:
1. O nome do alimento em português
2. Uma estimativa precisa de calorias (considerando porção média visível)
3. Uma breve descrição nutricional

Retorne sua resposta no seguinte formato JSON:
{
  "food": "nome do alimento",
  "calories": número_de_calorias,
  "confidence": porcentagem_de_confiança (0-100),
  "description": "breve descrição nutricional"
}`;

    const userPrompt = `Por favor, identifique o alimento nesta imagem e forneça informações nutricionais detalhadas, especialmente as calorias estimadas.`;

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
      food: "Alimento identificado",
      calories,
      confidence: 70,
      description: text.substring(0, 200),
    };
  }
}
