import { onValue, ref, remove, update } from "firebase/database";
import { db } from "./firebase";
import { generatePhoto, generateVow } from "./generate";
import type { Responder } from "./host";

// Map to track abort controllers for ongoing generation per GUID
export const generationAbortControllers = new Map<string, AbortController>();

// Helper to get responder data from guid
async function getResponder(guid: string): Promise<Responder | null> {
  const responderRef = ref(db, `/responders/${guid}`);
  return new Promise((resolve) => {
    onValue(
      responderRef,
      (snapshot) => {
        resolve(snapshot.val() as Responder | null);
      },
      { onlyOnce: true }
    );
  });
}

export async function generateFor(guid: string, response: "yes" | "no" | "random") {
  if (!guid) return;
  const responderRef = ref(db, `/responders/${guid}`);

  // Create a new abort controller for this generation request
  const abortController = new AbortController();
  generationAbortControllers.set(guid, abortController);

  // Calculate the actual decision first
  let actualResponse: "yes" | "no" = response === "random" ? (Math.random() < 0.5 ? "yes" : "no") : response;

  // Update eagerly with the decision
  await update(responderRef, {
    isGenerating: true,
    error: null,
    "generated/humanVow": null,
    "generated/aiVow": null,
    "generated/aiAnswer": null,
    "generated/aiVoice": null,
    "generated/photoUrl": null,
    "generated/decision": actualResponse,
  });
  try {
    const responder = await getResponder(guid);
    if (!responder) return;
    const params = {
      fullName: responder.fullName || "",
      aiFeeling: responder.aiFeeling || "",
      dealbreakers: responder.dealbreakers || "",
      idealTraits: responder.idealTraits || "",
      jobArea: responder.jobArea || "",
      loveLanguage: responder.loveLanguage || "",
      perfectFirstDate: responder.perfectFirstDate || "",
    };
    await Promise.all([
      generateVow(actualResponse, params, abortController.signal).then(
        ({ humanVow, aiVow, aiAnswer, aiVoice, humanVowAudioUrl, aiVowAudioUrl, aiAnswerAudioUrl }) =>
          update(responderRef, {
            "generated/humanVow": humanVow,
            "generated/aiVow": aiVow,
            "generated/aiAnswer": aiAnswer,
            "generated/aiVoice": aiVoice,
            "generated/humanVowAudioUrl": humanVowAudioUrl,
            "generated/aiVowAudioUrl": aiVowAudioUrl,
            "generated/aiAnswerAudioUrl": aiAnswerAudioUrl,
          })
      ),
      generatePhoto(actualResponse, responder.headshotDataUrl || "", abortController.signal).then((photoUrl) =>
        update(responderRef, { "generated/photoUrl": photoUrl })
      ),
    ]);
    await update(responderRef, { isGenerating: false, error: null });
  } catch (error) {
    await update(responderRef, { isGenerating: false, error: error instanceof Error ? error.message : String(error) });
  } finally {
    // Clean up the abort controller
    generationAbortControllers.delete(guid);
  }
}

export async function markAsDone(guid: string): Promise<void> {
  if (!guid) return;
  const responderRef = ref(db, `/responders/${guid}`);
  await update(responderRef, { isCompleted: true, modifiedAt: Date.now() });
}

export async function markAsNew(guid: string): Promise<void> {
  if (!guid) return;
  const responderRef = ref(db, `/responders/${guid}`);
  await update(responderRef, { isCompleted: false, modifiedAt: null });
}

export async function deleteFor(guid: string): Promise<void> {
  if (!guid) return;
  const responderRef = ref(db, `/responders/${guid}`);
  await remove(responderRef);
}

export async function resetFor(guid: string): Promise<void> {
  if (!guid) return;

  // Cancel any ongoing generation
  const abortController = generationAbortControllers.get(guid);
  if (abortController) {
    abortController.abort();
    generationAbortControllers.delete(guid);
  }

  const responderRef = ref(db, `/responders/${guid}`);
  await update(responderRef, { generated: null, isGenerating: false, error: null });
}
