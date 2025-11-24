import { ZypherClient } from "../tools/zypher-client.ts";
import type { RecipeRequest, RecipeResponse } from "../types/index.ts";

export class RecipeGeneratorAgent {
  private openaiClient: ZypherClient;

  constructor(zypherClient: ZypherClient) {
    this.openaiClient = zypherClient;
  }

  async generateHealthyRecipe(request: RecipeRequest): Promise<RecipeResponse> {
    if (!request.ingredients || request.ingredients.length === 0) {
      throw new Error("At least one ingredient is required");
    }

    const systemPrompt = `You are a chef focused on healthy, nutritious recipes.
Your task is to create delicious and wholesome meals using the provided ingredients.
Each recipe must include:
1. Recipe title
2. Ingredient list with quantities
3. Detailed preparation steps
4. Estimated total calories
5. Approximate prep time

Return your response in the following JSON format:
{
  "recipe": "full formatted recipe text",
  "estimatedCalories": total_calories_number,
  "preparationTime": "time in minutes"
}

Prioritize meals with lower calories and high nutritional value.`;

    const ingredientsList = request.ingredients.join(", ");
    const userPrompt = `I have the following ingredients available: ${ingredientsList}.
Create the healthiest and most nutritious recipe possible using these ingredients.
Feel free to suggest common herbs or seasonings if needed.`;

    try {
      const response = await this.openaiClient.chatText(
        userPrompt,
        systemPrompt
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          recipe: parsed.recipe || response,
          estimatedCalories: parsed.estimatedCalories || 0,
          preparationTime: parsed.preparationTime,
        };
      }

      return {
        recipe: response,
        estimatedCalories: this.estimateCaloriesFromText(response),
        preparationTime: this.extractPreparationTime(response),
      };
    } catch (error) {
      console.error("Error generating recipe:", error);
      throw new Error("Failed to generate recipe");
    }
  }

  private estimateCaloriesFromText(text: string): number {
    const caloriesMatch = text.match(/(\d+)\s*(?:calorias|calories|kcal)/i);
    return caloriesMatch ? parseInt(caloriesMatch[1]) : 0;
  }

  private extractPreparationTime(text: string): string | undefined {
    const timeMatch = text.match(/(\d+)\s*(?:minutos|minutes|min)/i);
    return timeMatch ? `${timeMatch[1]} minutes` : undefined;
  }
}
