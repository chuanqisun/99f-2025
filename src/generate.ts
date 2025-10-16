import { GoogleGenAI } from "@google/genai";
import { apiKeys$ } from "./connections/connections.component.js";
import { noIDontPhotoPrompt, noIDontVowPrompt, yesIDoPhotoPrompt, yesIDoVowPrompt } from "./prompts.js";

export function generateVow(mode: "yes" | "no", params: { [key: string]: string }): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: apiKeys$.value.gemini!,
  });
  const model = "gemini-2.5-flash";
  const prompt = mode === "yes" ? yesIDoVowPrompt(params) : noIDontVowPrompt(params);
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ];

  return ai.models
    .generateContent({
      model,
      contents,
    })
    .then((response) => response.text!);
}

export function generatePhotoPrompt(mode: "yes" | "no", params: { [key: string]: string }): Promise<string> {
  const prompt = mode === "yes" ? yesIDoPhotoPrompt(params) : noIDontPhotoPrompt(params);
  return Promise.resolve(prompt);
}

export async function generatePhoto(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: apiKeys$.value.gemini!,
  });
  const config = {
    responseModalities: ["IMAGE", "TEXT"],
  };
  const model = "gemini-2.5-flash-image-preview";
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: prompt,
        },
      ],
    },
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
