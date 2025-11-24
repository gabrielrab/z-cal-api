import type {
  ZypherContentBlock,
  ZypherChatMessage,
  ZypherRequest,
  ZypherResponse,
} from "../types/index.ts";
import {
  OpenAIModelProvider,
  type StreamChatParams,
  type ContentBlock,
} from "@corespeed/zypher";

type FinalMessagePayload = {
  id?: string;
  content: string | ContentBlock[];
  finishReason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export class ZypherClient {
  private provider: OpenAIModelProvider;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.provider = new OpenAIModelProvider({ apiKey });
  }

  async chat(request: ZypherRequest): Promise<ZypherResponse> {
    let system = "";
    const filteredMessages: ZypherChatMessage[] = [];

    for (const message of request.messages) {
      if (message.role === "system") {
        system = this.contentToText(message.content);
        continue;
      }
      filteredMessages.push(message);
    }

    const params: StreamChatParams = {
      model: request.model,
      messages: this.normalizeMessages(filteredMessages),
      maxTokens: request.max_tokens ?? 4096,
      system,
    };

    const stream = this.provider.streamChat(params);
    const final = await stream.finalMessage();
    if (!this.isFinalMessage(final)) {
      throw new Error("Unexpected response from chat provider");
    }
    return this.convertToZypherResponse(final, request.model);
  }

  async chatWithVision(
    imageBase64: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const visionMessages: ZypherChatMessage[] = [
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
      messages: this.normalizeMessages(visionMessages),
      maxTokens: 500,
      system: systemPrompt || "",
    };

    const stream = this.provider.streamChat(params);
    const final = await stream.finalMessage();
    if (!this.isFinalMessage(final)) {
      throw new Error("Unexpected response from chat provider");
    }
    return this.contentToText(final.content);
  }

  async chatText(userMessage: string, systemPrompt?: string): Promise<string> {
    const messages: ZypherChatMessage[] = [
      { role: "user", content: [{ type: "text", text: userMessage }] },
    ];

    const params: StreamChatParams = {
      model: "gpt-4o",
      messages: this.normalizeMessages(messages),
      maxTokens: 1000,
      system: systemPrompt || "",
    };

    const stream = this.provider.streamChat(params);
    const final = await stream.finalMessage();
    if (!this.isFinalMessage(final)) {
      throw new Error("Unexpected response from chat provider");
    }
    return this.contentToText(final.content);
  }

  private normalizeMessages(
    messages: ZypherChatMessage[]
  ): StreamChatParams["messages"] {
    const baseTime = Date.now();
    return messages.map((msg, index) => ({
      role: msg.role,
      content: this.ensureContentBlocks(msg.content),
      timestamp: new Date(baseTime + index),
    }));
  }

  private ensureContentBlocks(
    content: string | ZypherContentBlock[]
  ): ContentBlock[] {
    if (typeof content === "string") {
      return [{ type: "text", text: content }];
    }
    return content.map((block) => this.toContentBlock(block));
  }

  private toContentBlock(block: ZypherContentBlock): ContentBlock {
    if (block.type === "text") {
      return { type: "text", text: block.text };
    }

    return {
      type: "image",
      source: {
        type: block.source.type,
        mediaType: block.source.mediaType,
        data: block.source.data,
      },
    };
  }

  private contentToText(
    content: string | ContentBlock[] | ZypherContentBlock[]
  ): string {
    if (typeof content === "string") {
      return content;
    }

    return content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text?: string }).text ?? "")
      .join("\n");
  }

  private isFinalMessage(value: unknown): value is FinalMessagePayload {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as { content?: unknown };
    if (!("content" in candidate)) {
      return false;
    }

    const { content } = candidate;
    if (typeof content === "string") {
      return true;
    }

    return (
      Array.isArray(content) &&
      content.every(
        (block) =>
          block &&
          typeof block === "object" &&
          "type" in block &&
          typeof (block as ContentBlock).type === "string"
      )
    );
  }

  private convertToZypherResponse(
    final: FinalMessagePayload,
    model: string
  ): ZypherResponse {
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
            content: this.contentToText(final.content),
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
