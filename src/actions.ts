import { ref, remove, update } from "firebase/database";
import { db } from "./firebase";

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
  const responderRef = ref(db, `/responders/${guid}`);
  await update(responderRef, { generated: null, isGenerating: false, error: null });
}
