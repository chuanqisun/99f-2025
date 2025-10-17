import { GoogleGenAI, Type, type Content, type GenerateContentConfig } from "@google/genai";
import { firstValueFrom } from "rxjs";
import { apiKeys$ } from "./connections/connections.component.js";
import { noIDontPhotoPrompt, noIDontVowPromptV2, yesIDoPhotoPrompt, yesIDoVowPromptV2 } from "./prompts.js";
import { femaleVoices, generateAudioBlob, maleVoices } from "./text-to-speech.js";

/**
 * Convert a Blob to a data URL (base64 encoded string)
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get the appropriate voice based on the AI voice description
 */
function selectVoiceFromDescription(voiceDescription: string): string {
  const lowerDesc = voiceDescription.toLowerCase();

  // Simple heuristic: if description mentions male/masculine/deep, use male voice
  const maleKeywords = ["male", "masculine", "deep", "bass", "baritone", "strong", "commanding"];
  const isMale = maleKeywords.some((keyword) => lowerDesc.includes(keyword));

  const voices = isMale ? maleVoices : femaleVoices;
  // Select a random voice from the appropriate gender category
  return voices[Math.floor(Math.random() * voices.length)];
}

export async function generateVow(
  mode: "yes" | "no",
  params: any,
  abortSignal?: AbortSignal
): Promise<{ humanVow: string; aiVow: string; aiAnswer: string; aiVoice: string; humanVowAudioUrl: string; aiVowAudioUrl: string; aiAnswerAudioUrl: string }> {
  const ai = new GoogleGenAI({
    apiKey: apiKeys$.value.gemini!,
  });
  const model = "gemini-2.5-flash";
  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        Human_vow: {
          type: Type.STRING,
        },
        AI_vow: {
          type: Type.STRING,
        },
        AI_final_answer: {
          type: Type.STRING,
        },
        AI_voice: {
          type: Type.STRING,
        },
      },
      propertyOrdering: ["Human_vow", "AI_vow", "AI_final_answer", "AI_voice"],
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

  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  const json = JSON.parse(response.text!);
  const humanVow = json.Human_vow;
  const aiVow = json.AI_vow;
  const aiAnswer = json.AI_final_answer;
  const aiVoiceDescription = json.AI_voice;

  // Select an appropriate voice based on the description
  const selectedVoice = selectVoiceFromDescription(aiVoiceDescription);

  // Generate audio blobs for each vow and answer
  const [humanVowSpeech, aiVowSpeech, aiAnswerSpeech] = await Promise.all([
    firstValueFrom(generateAudioBlob(humanVow, selectedVoice, aiVoiceDescription)),
    firstValueFrom(generateAudioBlob(aiVow, selectedVoice, aiVoiceDescription)),
    firstValueFrom(generateAudioBlob(aiAnswer, selectedVoice, aiVoiceDescription)),
  ]);

  // Convert blobs to data URLs
  const [humanVowAudioUrl, aiVowAudioUrl, aiAnswerAudioUrl] = await Promise.all([
    blobToDataUrl(humanVowSpeech!.blob),
    blobToDataUrl(aiVowSpeech!.blob),
    blobToDataUrl(aiAnswerSpeech!.blob),
  ]);

  return {
    humanVow,
    aiVow,
    aiAnswer,
    aiVoice: aiVoiceDescription,
    humanVowAudioUrl,
    aiVowAudioUrl,
    aiAnswerAudioUrl,
  };
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
