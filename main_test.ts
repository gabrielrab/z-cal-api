import { assertEquals, assertMatch } from "@std/assert";
import { handleHealthCheck } from "./src/routes/health.ts";
import { handleFoodIdentification } from "./src/routes/food.ts";
import { handleRecipeGeneration } from "./src/routes/recipe.ts";
import { Router } from "./src/router.ts";
import type {
  FoodIdentificationRequest,
  FoodIdentificationResponse,
  RecipeChatRequest,
} from "./src/types/index.ts";
import type { FoodIdentifierAgent } from "./src/agents/food-identifier.ts";
import type { RecipeGeneratorAgent } from "./src/agents/recipe-generator.ts";

function mockFoodAgent(
  impl: (req: FoodIdentificationRequest) => Promise<FoodIdentificationResponse>
): FoodIdentifierAgent {
  return { identifyFood: impl } as FoodIdentifierAgent;
}

function mockRecipeAgent(
  impl: (messages: RecipeChatRequest["messages"]) => Promise<string>
): RecipeGeneratorAgent {
  return { generateChatResponse: impl } as RecipeGeneratorAgent;
}

Deno.test("Health route returns structured payload", async () => {
  const res = await handleHealthCheck(
    new Request("http://localhost:8000/health")
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "healthy");
  assertEquals(body.service, "z-cal-api");
  assertMatch(body.timestamp, /\d{4}-\d{2}-\d{2}T/);
});

Deno.test("Food route rejects unsupported methods", async () => {
  const res = await handleFoodIdentification(
    new Request("http://localhost:8000/api/identify-food", { method: "GET" }),
    mockFoodAgent(async () => {
      throw new Error("should not be called");
    })
  );
  assertEquals(res.status, 405);
});

Deno.test("Food route validates body", async () => {
  const invalidJson = await handleFoodIdentification(
    new Request("http://localhost:8000/api/identify-food", {
      method: "POST",
      body: "{invalid",
    }),
    mockFoodAgent(async () => {
      throw new Error("should not run");
    })
  );
  assertEquals(invalidJson.status, 400);

  const missingImage = await handleFoodIdentification(
    new Request("http://localhost:8000/api/identify-food", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }),
    mockFoodAgent(async () => {
      throw new Error("should not run");
    })
  );
  assertEquals(missingImage.status, 400);
});

Deno.test("Food route returns agent payload", async () => {
  const mockResponse: FoodIdentificationResponse = {
    name: "Apple",
    calories: 95,
    macros: { protein: "0g", carbs: "25g", fat: "0g" },
    healthScore: 90,
    insights: "Great snack",
  };

  const agent = mockFoodAgent(async (req) => {
    assertEquals(req.image, "base64-data");
    return mockResponse;
  });

  const res = await handleFoodIdentification(
    new Request("http://localhost:8000/api/identify-food", {
      method: "POST",
      body: JSON.stringify({ image: "base64-data" }),
      headers: { "Content-Type": "application/json" },
    }),
    agent
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body, mockResponse);
});

Deno.test("Food route maps validation errors to 400", async () => {
  const agent = mockFoodAgent(async () => {
    throw new Error("Invalid base64 image format");
  });
  const res = await handleFoodIdentification(
    new Request("http://localhost:8000/api/identify-food", {
      method: "POST",
      body: JSON.stringify({ image: "bad" }),
      headers: { "Content-Type": "application/json" },
    }),
    agent
  );
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Invalid base64 image format");
});

Deno.test("Recipe route performs request validation", async () => {
  const agent = mockRecipeAgent(async () => "ok");
  const badMethod = await handleRecipeGeneration(
    new Request("http://localhost:8000/api/generate-recipe"),
    agent
  );
  assertEquals(badMethod.status, 405);

  const invalidJson = await handleRecipeGeneration(
    new Request("http://localhost:8000/api/generate-recipe", {
      method: "POST",
      body: "{invalid",
    }),
    agent
  );
  assertEquals(invalidJson.status, 400);

  const missingMessages = await handleRecipeGeneration(
    new Request("http://localhost:8000/api/generate-recipe", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
      headers: { "Content-Type": "application/json" },
    }),
    agent
  );
  assertEquals(missingMessages.status, 400);
});

Deno.test("Recipe route returns generated chat response", async () => {
  const agent = mockRecipeAgent(async (messages) => {
    assertEquals(messages.length, 1);
    return "Here is your recipe";
  });

  const res = await handleRecipeGeneration(
    new Request("http://localhost:8000/api/generate-recipe", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "I have rice and beans" }],
      }),
      headers: { "Content-Type": "application/json" },
    }),
    agent
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.response, "Here is your recipe");
});

Deno.test("Router dispatches to endpoints and handles 404", async () => {
  const foodAgent = mockFoodAgent(async () => ({
    name: "Apple",
    calories: 95,
    macros: { protein: "0g", carbs: "25g", fat: "0g" },
    healthScore: 90,
    insights: "Great snack",
  }));
  const recipeAgent = mockRecipeAgent(async () => "Recipe text");
  const router = new Router(foodAgent, recipeAgent);

  const health = await router.route(
    new Request("http://localhost:8000/health")
  );
  assertEquals(health.status, 200);

  const food = await router.route(
    new Request("http://localhost:8000/api/identify-food", {
      method: "POST",
      body: JSON.stringify({ image: "base64" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  assertEquals(food.status, 200);

  const recipe = await router.route(
    new Request("http://localhost:8000/api/generate-recipe", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Need a salad" }],
      }),
      headers: { "Content-Type": "application/json" },
    })
  );
  assertEquals(recipe.status, 200);

  const missing = await router.route(
    new Request("http://localhost:8000/unknown")
  );
  assertEquals(missing.status, 404);
});
