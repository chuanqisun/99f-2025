import { GoogleGenAI, Type, type Content, type GenerateContentConfig } from "@google/genai";
import { apiKeys$ } from "./connections/connections.component.js";
import { noIDontPhotoPrompt, noIDontVowPromptV2, yesIDoPhotoPrompt, yesIDoVowPromptV2 } from "./prompts.js";

export function generateVow(mode: "yes" | "no", params: any, abortSignal?: AbortSignal): Promise<{ humanVow: string; aiVow: string }> {
  const ai = new GoogleGenAI({
    apiKey: apiKeys$.value.gemini!,
  });
  const model = "gemini-2.5-flash";
  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        AI_vow: {
          type: Type.STRING,
        },
        Human_vow: {
          type: Type.STRING,
        },
      },
      propertyOrdering: ["AI_vow", "Human_vow"],
    },
    abortSignal,
  } satisfies GenerateContentConfig;
  const contents = [
    {
      role: "model",
      parts: [
        {
          text: mode === "yes" ? yesIDoVowPromptV2 : noIDontVowPromptV2,
        },
      ],
    } satisfies Content,
    {
      role: "user",
      parts: [
        {
          text: JSON.stringify(params),
        },
      ],
    } satisfies Content,
  ];

  return ai.models
    .generateContent({
      model,
      contents,
      config,
    })
    .then((response) => {
      const json = JSON.parse(response.text!);
      return {
        humanVow: json.Human_vow,
        aiVow: json.AI_vow,
      };
    });
}

export async function generatePhoto(mode: "yes" | "no", referencePhotoUrl: string, abortSignal?: AbortSignal): Promise<string> {
  const prompt = mode === "yes" ? yesIDoPhotoPrompt : noIDontPhotoPrompt;
  const ai = new GoogleGenAI({
    apiKey: apiKeys$.value.gemini!,
  });
  const config = {
    responseModalities: ["IMAGE", "TEXT"],
    abortSignal,
  } satisfies GenerateContentConfig;
  const model = "gemini-2.5-flash-image-preview";

  // Parse the reference photo data URL
  const dataUrlMatch = referencePhotoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!dataUrlMatch) {
    throw new Error("Invalid reference photo URL format");
  }
  const mimeType = dataUrlMatch[1];
  const base64Data = dataUrlMatch[2];

  const contents = [
    {
      role: "model",
      parts: [{ text: prompt }],
    } satisfies Content,
    {
      role: "user",
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ],
    } satisfies Content,
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  let imageUrls: string[] = [];

  for await (const chunk of response) {
    if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
      continue;
    }

    const parts = chunk.candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData) {
        const { mimeType, data } = part.inlineData;
        const imageUrl = `data:${mimeType};base64,${data}`;
        imageUrls.push(imageUrl);
      }
    }
  }

  return imageUrls[0] || "";
}
