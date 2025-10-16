import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { from, Observable } from "rxjs";
import { apiKeys$ } from "./connections.component";
import type { ApiKeys } from "./storage";

export interface TestConnectionRequest {
  provider: "openai" | "together" | "gemini";
  apiKeys: ApiKeys;
}

export function testOpenAIConnection(): Observable<string> {
  const request = async (): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKeys$.value.openai!,
      dangerouslyAllowBrowser: true,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: "Please respond with exactly 'OpenAI test success!'",
      max_output_tokens: 16,
    });

    if (response.output && response.output.length > 0) {
      const firstMessage = response.output[0];
      if (firstMessage.type === "message" && firstMessage.content && firstMessage.content.length > 0) {
        const content = firstMessage.content[0];
        if (content.type === "output_text") {
          return content.text;
        }
      }
    }

    return "No response received from OpenAI";
  };

  return from(request());
}

export function testGeminiConnection(): Observable<string> {
  const request = async (): Promise<string> => {
    const ai = new GoogleGenAI({
      apiKey: apiKeys$.value.gemini!,
    });
    const config = {
      thinkingConfig: {
        thinkingBudget: 0,
      },
    };
    const model = "gemini-2.5-flash-lite";
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: "Please respond with exactly 'Gemini test success!'",
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let fullText = "";
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }

    return fullText || "No response received from Gemini";
  };

  return from(request());
}

export function testConnection({ provider, apiKeys }: TestConnectionRequest): Observable<string> {
  switch (provider) {
    case "openai":
      if (!apiKeys.openai) {
        throw new Error("OpenAI API key is not set");
      }
      return testOpenAIConnection();

    case "gemini":
      if (!apiKeys.gemini) {
        throw new Error("Gemini API key is not set");
      }
      return testGeminiConnection();

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
