import { onValue, ref, update } from "firebase/database";
import { html, render } from "lit-html";
import { BehaviorSubject, map } from "rxjs";
import { ConnectionsComponent } from "./connections/connections.component";
import { db } from "./firebase";
import { generatePhoto, generatePhotoPrompt, generateVow } from "./generate.js";
import { createComponent } from "./sdk/create-component";

const submissions$ = new BehaviorSubject<Responder[]>([]);

async function generateFor(responder: Responder, response: "yes" | "no" | "random") {
  if (!responder.email) return;
  const responderRef = ref(db, `/responders/${responder.email}`);
  await update(responderRef, { isGenerating: true });
  try {
    let actualResponse: "yes" | "no" = response === "random" ? (Math.random() < 0.5 ? "yes" : "no") : response;
    const params = {
      fullNamePronounsGender: responder.fullNamePronounsGender || "",
      aiFeeling: responder.aiFeeling || "",
      dealbreakers: responder.dealbreakers || "",
      idealTraits: responder.idealTraits || "",
      jobArea: responder.jobArea || "",
      loveLanguage: responder.loveLanguage || "",
      perfectFirstDate: responder.perfectFirstDate || "",
    };
    const vow = await generateVow(actualResponse, params);
    const photoPrompt = await generatePhotoPrompt(actualResponse, params);
    const photoUrl = await generatePhoto(photoPrompt);
    await update(responderRef, { generated: { decision: actualResponse, vow, photoUrl }, isGenerating: false });
  } catch (error) {
    await update(responderRef, { isGenerating: false });
  }
}

export interface Responder {
  email?: string;
  aiFeeling?: string;
  dealbreakers?: string;
  fullNamePronounsGender?: string;
  headshotDataUrl?: string;
  idealTraits?: string;
  jobArea?: string;
  loveLanguage?: string;
  perfectFirstDate?: string;
  submittedAt?: number;
  vow?: string;
  isGenerating?: boolean;
  generated?: {
    decision?: "yes" | "no";
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

  const recordWithEmail = Object.entries(data).map(([email, record]) => ({ email, ...record }));

  submissions$.next(recordWithEmail);
});

const Host = createComponent(() => {
  return submissions$.pipe(
    map(
      (submissions) => html`
        <header class="app-header">
          <button commandfor="connection-dialog" command="show-modal">Setup</button>
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
          <ul>
            ${submissions.map(
              (sub) => html`
                <li>
                  <a href="details.html?email=${sub.email}">${sub.fullNamePronounsGender}</a> ${sub.generated?.vow ? "📋" : ""}${sub.generated?.photoUrl
                    ? "📷"
                    : ""}
                  ${sub.isGenerating
                    ? html`<span>generating...</span>`
                    : html`
                        <button @click=${() => generateFor(sub, "yes")}>Yes</button>

                        <button @click=${() => generateFor(sub, "no")}>No</button>

                        <button @click=${() => generateFor(sub, "random")}>Random</button>
                      `}
                </li>
              `
            )}
          </ul>
        </main>
      `
    )
  );
});

render(Host(), document.getElementById("app")!);
