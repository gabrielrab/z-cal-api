import { FoodIdentifierAgent } from "../agents/food-identifier.ts";
import type { FoodIdentificationRequest } from "../types/index.ts";

export async function handleFoodIdentification(
  req: Request,
  foodAgent: FoodIdentifierAgent
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: FoodIdentificationRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!body.image) {
      return new Response(
        JSON.stringify({ error: "Image field is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await foodAgent.identifyFood(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handleFoodIdentification:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode =
      errorMessage.includes("Invalid") || errorMessage.includes("exceeds")
        ? 400
        : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}
