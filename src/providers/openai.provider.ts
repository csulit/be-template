import OpenAI from "openai";
import { env } from "../env.js";

export interface ChatCompletionOptions {
  model?: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  responseSchema?: Record<string, unknown>;
}

export type OCROptions = {
  prompt?: string;
} & ({ imageUrl: string; imageBase64?: never } | { imageBase64: string; imageUrl?: never });

export interface ChatCompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface OCRResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface OpenAIProvider {
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
  ocr(options: OCROptions): Promise<OCRResult>;
}

/**
 * Console OpenAI provider for development
 * Replace with OpenAI SDK in production
 */
class ConsoleOpenAIProvider implements OpenAIProvider {
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    console.log("Chat completion (console provider):");
    console.log(`  Model: ${options.model ?? "gpt-4o"}`);
    console.log(`  Messages: ${options.messages.length}`);
    console.log(`  Response schema: ${options.responseSchema ? "provided" : "none"}`);

    return {
      content: "Mock chat completion response",
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };
  }

  async ocr(options: OCROptions): Promise<OCRResult> {
    console.log("OCR (console provider):");
    console.log(`  Image URL: ${options.imageUrl ? "provided" : "none"}`);
    console.log(`  Image Base64: ${options.imageBase64 ? "provided" : "none"}`);
    console.log(`  Prompt: ${options.prompt ?? "none"}`);

    return {
      text: "Mock OCR extracted text from image",
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };
  }
}

/** OpenAI SDK provider for production */
class SDKOpenAIProvider implements OpenAIProvider {
  private client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? "gpt-4o",
      messages: options.messages,
      ...(options.temperature != null && { temperature: options.temperature }),
      ...(options.maxTokens != null && { max_tokens: options.maxTokens }),
      ...(options.responseSchema && {
        response_format: {
          type: "json_schema" as const,
          json_schema: { name: "response", schema: options.responseSchema, strict: true },
        },
      }),
    });

    const choice = response.choices[0];
    return {
      content: choice?.message.content ?? "",
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }

  async ocr(options: OCROptions): Promise<OCRResult> {
    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPartImage = options.imageUrl
      ? { type: "image_url", image_url: { url: options.imageUrl } }
      : { type: "image_url", image_url: { url: `data:image/png;base64,${options.imageBase64}` } };

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt ?? "Extract all text from this image." },
            imageContent,
          ],
        },
      ],
    });

    const choice = response.choices[0];
    return {
      text: choice?.message.content ?? "",
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }
}

// Export provider based on environment
export const openaiProvider: OpenAIProvider = env.OPENAI_API_KEY
  ? new SDKOpenAIProvider()
  : new ConsoleOpenAIProvider();
