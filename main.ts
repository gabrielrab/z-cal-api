import { load } from "@std/dotenv";
import { ZypherClient } from "./src/tools/zypher-client.ts";
import { FoodIdentifierAgent } from "./src/agents/food-identifier.ts";
import { RecipeGeneratorAgent } from "./src/agents/recipe-generator.ts";
import { Router } from "./src/router.ts";

await load({ export: true });

const PORT = parseInt(Deno.env.get("PORT") || "8000");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY environment variable is required");
  Deno.exit(1);
}

const openaiClient = new ZypherClient(OPENAI_API_KEY);
const foodAgent = new FoodIdentifierAgent(openaiClient);
const recipeAgent = new RecipeGeneratorAgent(openaiClient);
const router = new Router(foodAgent, recipeAgent);

const handler = async (req: Request): Promise<Response> => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const response = await router.route(req);

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};

console.log(`🚀 Z-Cal API running on http://localhost:${PORT}`);
console.log(`📊 Available endpoints:`);
console.log(`   GET  /health - Health check`);
console.log(`   POST /api/identify-food - Identify food from image`);
console.log(`   POST /api/generate-recipe - Generate healthy recipe`);

Deno.serve({ port: PORT }, handler);
