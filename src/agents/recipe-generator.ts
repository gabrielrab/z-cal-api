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

    const systemPrompt = `Você é um chef especializado em receitas saudáveis e nutritivas.
Sua tarefa é criar receitas deliciosas e saudáveis usando os ingredientes fornecidos.
Para cada receita, inclua:
1. Nome da receita
2. Lista de ingredientes com quantidades
3. Modo de preparo detalhado
4. Estimativa de calorias totais
5. Tempo de preparo aproximado

Retorne sua resposta no seguinte formato JSON:
{
  "recipe": "texto completo da receita formatado",
  "estimatedCalories": número_total_calorias,
  "preparationTime": "tempo em minutos"
}

Priorize receitas com baixo teor calórico e alto valor nutricional.`;

    const ingredientsList = request.ingredients.join(", ");
    const userPrompt = `Tenho os seguintes ingredientes disponíveis: ${ingredientsList}.
Crie a receita mais saudável e nutritiva possível usando estes ingredientes. 
Pode sugerir alguns temperos básicos se necessário.`;

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
    return timeMatch ? `${timeMatch[1]} minutos` : undefined;
  }
}
