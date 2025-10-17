import "./host.css";
import "./prototype.css";

import { onValue, ref, update } from "firebase/database";
import { html, render } from "lit-html";
import { ifDefined } from "lit-html/directives/if-defined.js";
import { BehaviorSubject, map } from "rxjs";
import { ConnectionsComponent } from "./connections/connections.component";
import { db } from "./firebase";
import { generatePhoto, generateVow } from "./generate.js";
import { createComponent } from "./sdk/create-component";

const submissions$ = new BehaviorSubject<Responder[]>([]);

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

async function resetFor(guid: string) {
  if (!guid) return;
  const responderRef = ref(db, `/responders/${guid}`);
  await update(responderRef, { generated: null, isGenerating: false, error: null });
}

async function markAsDone(guid: string) {
  if (!guid) return;
  const responderRef = ref(db, `/responders/${guid}`);
  await update(responderRef, { isCompleted: true, modifiedAt: Date.now() });
}

async function markAsNew(guid: string) {
  if (!guid) return;
  const responderRef = ref(db, `/responders/${guid}`);
  await update(responderRef, { isCompleted: false, modifiedAt: null });
}

async function generateFor(guid: string, response: "yes" | "no" | "random") {
  if (!guid) return;
  const responderRef = ref(db, `/responders/${guid}`);
  await update(responderRef, { isGenerating: true, error: null, "generated/humanVow": null, "generated/aiVow": null, "generated/photoUrl": null });
  try {
    const responder = await getResponder(guid);
    if (!responder) return;

    let actualResponse: "yes" | "no" = response === "random" ? (Math.random() < 0.5 ? "yes" : "no") : response;
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
      generateVow(actualResponse, params).then(({ humanVow, aiVow }) => update(responderRef, { "generated/humanVow": humanVow, "generated/aiVow": aiVow })),
      generatePhoto(actualResponse, responder.headshotDataUrl || "").then((photoUrl) => update(responderRef, { "generated/photoUrl": photoUrl })),
    ]);
    await update(responderRef, { "generated/decision": actualResponse, isGenerating: false, error: null });
  } catch (error) {
    await update(responderRef, { isGenerating: false, error: error instanceof Error ? error.message : String(error) });
  }
}

export interface Responder {
  guid?: string;
  email?: string;
  aiFeeling?: string;
  dealbreakers?: string;
  fullName?: string;
  headshotDataUrl?: string;
  idealTraits?: string;
  jobArea?: string;
  loveLanguage?: string;
  perfectFirstDate?: string;
  submittedAt?: number;
  vow?: string;
  isGenerating?: boolean;
  isCompleted?: boolean;
  error?: string;
  modifiedAt?: number;
  generated?: {
    decision?: "yes" | "no";
    humanVow?: string;
    aiVow?: string;
    /* @deprecated */
    vow?: string;
    photoUrl?: string;
  };
}

export type RespondersTable = Record<string, Responder>;

// Listen for realtime updates
const submissionsRef = ref(db, "/responders");
onValue(submissionsRef, (snapshot) => {
  const data = snapshot.val() as RespondersTable | null;
  if (!data) return;

  const recordWithGuid = Object.entries(data).map(([guid, record]) => ({ guid, ...record }));

  submissions$.next(recordWithGuid);
});

function sortSubmissions(submissions: Responder[]): Responder[] {
  const incomplete = submissions.filter((s) => !s.isCompleted);
  const completed = submissions.filter((s) => s.isCompleted).sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));

  return [...incomplete, ...completed];
}

const Host = createComponent(() => {
  return submissions$.pipe(
    map(
      (submissions) => html`
        <header class="app-header">
          <button commandfor="connection-dialog" command="show-modal">Setup</button>
          <span>*For official use only*</span>
        </header>
        <dialog class="connection-form" id="connection-dialog">
          <div class="connections-dialog-body">
            ${ConnectionsComponent()}
            <form method="dialog">
              <button>Close</button>
            </form>
          </div>
        </dialog>
        <main>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${sortSubmissions(submissions).map(
                (sub) => html`
                  <tr data-completed=${ifDefined(sub.isCompleted)}>
                    <td>
                      <a target="_blank" href="details.html?id=${sub.guid}">${sub.fullName}</a>
                    </td>
                    <td>
                      ${sub.generated?.humanVow && sub.generated?.aiVow ? "📋" : ""}${sub.generated?.photoUrl ? "📷" : ""}${sub.error
                        ? html`<span title="${sub.error}">⚠️</span>`
                        : ""}
                      ${sub.isGenerating ? html`<span>generating...</span>` : ""} ${sub.isCompleted ? "✅" : ""}
                    </td>
                    <td>
                      ${sub.isGenerating
                        ? html`<span>Generating...</span>`
                        : sub.generated?.decision
                          ? html`
                              <button @click=${() => resetFor(sub.guid || "")}>Reset</button>
                              ${!sub.isCompleted
                                ? html`<button @click=${() => markAsDone(sub.guid || "")}>Mark as Done</button>`
                                : html`<button @click=${() => markAsNew(sub.guid || "")}>Mark as New</button>`}
                            `
                          : html`
                              <button @click=${() => generateFor(sub.guid || "", "yes")}>Yes</button>
                              <button @click=${() => generateFor(sub.guid || "", "no")}>No</button>
                              <button @click=${() => generateFor(sub.guid || "", "random")}>Random</button>
                            `}
                    </td>
                  </tr>
                `
              )}
            </tbody>
          </table>
        </main>
      `
    )
  );
});

render(Host(), document.getElementById("app")!);
