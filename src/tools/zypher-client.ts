import type { ZypherRequest, ZypherResponse } from "../types/index.ts";
import {
  OpenAIModelProvider,
  type StreamChatParams,
  type ContentBlock,
} from "@corespeed/zypher";

export class ZypherClient {
  private provider: OpenAIModelProvider;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.provider = new OpenAIModelProvider({ apiKey });
  }

  async chat(request: ZypherRequest): Promise<ZypherResponse> {
    const params: StreamChatParams = {
      model: request.model,
      messages: request.messages as any,
      maxTokens: request.max_tokens ?? 4096,
      system:
        (request.messages.find((m) => m.role === "system")
          ?.content as string) || "",
    };

    const stream = this.provider.streamChat(params);
    const final = await stream.finalMessage();
    return this.convertToZypherResponse(final, request.model);
  }

  async chatWithVision(
    imageBase64: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image",
            source: {
              type: "base64",
              mediaType: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ];

    const params: StreamChatParams = {
      model: "gpt-4o",
      messages,
      maxTokens: 500,
      system: systemPrompt || "",
    };

    const stream = this.provider.streamChat(params);
    const final = await stream.finalMessage();
    return this.extractTextContent(final);
  }

  async chatText(userMessage: string, systemPrompt?: string): Promise<string> {
    const messages: any[] = [
      { role: "user", content: [{ type: "text", text: userMessage }] },
    ];

    const params: StreamChatParams = {
      model: "gpt-4o",
      messages,
      maxTokens: 1000,
      system: systemPrompt || "",
    };

    const stream = this.provider.streamChat(params);
    const final = await stream.finalMessage();
    return this.extractTextContent(final);
  }

  private extractTextContent(final: any): string {
    const content = final.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((block: ContentBlock) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("\n");
    }
    return "";
  }

  private convertToZypherResponse(final: any, model: string): ZypherResponse {
    return {
      id: final.id || "generated-id",
      object: "chat.completion",
      created: Date.now(),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: this.extractTextContent(final),
          },
          finish_reason: final.finishReason || "stop",
        },
      ],
      usage: final.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }
}
