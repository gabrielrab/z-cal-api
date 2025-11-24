import { FoodIdentifierAgent } from "./agents/food-identifier.ts";
import { RecipeGeneratorAgent } from "./agents/recipe-generator.ts";
import { handleHealthCheck } from "./routes/health.ts";
import { handleFoodIdentification } from "./routes/food.ts";
import { handleRecipeGeneration } from "./routes/recipe.ts";

export class Router {
  private foodAgent: FoodIdentifierAgent;
  private recipeAgent: RecipeGeneratorAgent;

  constructor(
    foodAgent: FoodIdentifierAgent,
    recipeAgent: RecipeGeneratorAgent
  ) {
    this.foodAgent = foodAgent;
    this.recipeAgent = recipeAgent;
  }

  async route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // Health check
    if (path === "/health" || path === "/") {
      return handleHealthCheck(req);
    }

    // Food identification endpoint
    if (path === "/api/identify-food") {
      return await handleFoodIdentification(req, this.foodAgent);
    }

    // Recipe generation endpoint
    if (path === "/api/generate-recipe") {
      return await handleRecipeGeneration(req, this.recipeAgent);
    }

    // 404 Not Found
    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
}

