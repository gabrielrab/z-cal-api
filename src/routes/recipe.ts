import { RecipeGeneratorAgent } from "../agents/recipe-generator.ts";
import type { RecipeRequest } from "../types/index.ts";

export async function handleRecipeGeneration(
  req: Request,
  recipeAgent: RecipeGeneratorAgent
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: RecipeRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      !body.ingredients ||
      !Array.isArray(body.ingredients) ||
      body.ingredients.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "Ingredients field is required and must be a non-empty array",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await recipeAgent.generateHealthyRecipe(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handleRecipeGeneration:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode = errorMessage.includes("required") ? 400 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}
