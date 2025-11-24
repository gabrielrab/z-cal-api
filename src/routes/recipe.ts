import { RecipeGeneratorAgent } from "../agents/recipe-generator.ts";
import type { RecipeChatRequest, RecipeChatResponse } from "../types/index.ts";

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

    let body: RecipeChatRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Messages field is required and must be a non-empty array of chat messages",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await recipeAgent.generateChatResponse(body.messages);

    const response: RecipeChatResponse = { response: result };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handleRecipeGeneration:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode = 400;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}
