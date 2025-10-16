import { GoogleGenAI, type Content } from "@google/genai";
import { apiKeys$ } from "./connections/connections.component.js";
import { noIDontPhotoPrompt, noIDontVowPrompt, yesIDoPhotoPrompt, yesIDoVowPrompt } from "./prompts.js";

export function generateVow(mode: "yes" | "no", params: any): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: apiKeys$.value.gemini!,
  });
  const model = "gemini-2.5-flash";
  const contents = [
    {
      role: "model",
      parts: [
        {
          text: mode === "yes" ? yesIDoVowPrompt : noIDontVowPrompt,
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
    })
    .then((response) => response.text!);
}

export async function generatePhoto(mode: "yes" | "no", referencePhotoUrl: string): Promise<string> {
  const prompt = mode === "yes" ? yesIDoPhotoPrompt : noIDontPhotoPrompt;
  const ai = new GoogleGenAI({
    apiKey: apiKeys$.value.gemini!,
  });
  const config = {
    responseModalities: ["IMAGE", "TEXT"],
  };
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
