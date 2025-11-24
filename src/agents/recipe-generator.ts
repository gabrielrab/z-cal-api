import { ZypherClient } from "../tools/zypher-client.ts";
import type { ChatMessage, ZypherRequest } from "../types/index.ts";

export class RecipeGeneratorAgent {
  private openaiClient: ZypherClient;
  private systemPrompt = `You are a chef focused on healthy, nutritious recipes.
Your task is to engage in a conversation to help users create delicious and wholesome meals using their available ingredients.
Discuss ingredients, preferences, and generate recipes when appropriate.
When providing a recipe, include:
1. Recipe title
2. Ingredient list with quantities
3. Detailed preparation steps
4. Estimated total calories
5. Approximate prep time

Keep the conversation natural and helpful.`;

  constructor(zypherClient: ZypherClient) {
    this.openaiClient = zypherClient;
  }

  async generateChatResponse(messages: ChatMessage[]): Promise<string> {
    const fullMessages: ZypherRequest["messages"] = [
      { role: "system", content: this.systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const response = await this.openaiClient.chat({
      model: "gpt-4o",
      messages: fullMessages,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "";
  }
}
