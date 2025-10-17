import "./host.css";
import "./prototype.css";

import { onValue, ref } from "firebase/database";
import { html, render } from "lit-html";
import { ifDefined } from "lit-html/directives/if-defined.js";
import { BehaviorSubject, map } from "rxjs";
import { deleteFor, generateFor, markAsDone, markAsNew, resetFor } from "./actions";
import { ConnectionsComponent } from "./connections/connections.component";
import { db } from "./firebase";
import { renderResponderStatus } from "./responder-utils";
import { createComponent } from "./sdk/create-component";

const submissions$ = new BehaviorSubject<Responder[]>([]);

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
    aiAnswer?: string;
    aiVoice?: string;
    aiVowAudioUrl?: string;
    aiAnswerAudioUrl?: string;
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
                <th>Decision</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${sortSubmissions(submissions).map(
                (sub) => html`
                  <tr data-completed=${ifDefined(sub.isCompleted)}>
                    <td>
                      <a target="_blank" href="details.html?id=${sub.guid}">${sub.fullName}</a>
                      ${renderResponderStatus(sub)}
                    </td>
                    <td>
                      <div class="decision-column">
                        ${sub.generated?.decision
                          ? html`<span>${sub.generated.decision === "yes" ? "Yes" : "No"}</span>`
                          : html`
                              <div class="action-buttons">
                                <button @click=${() => generateFor(sub.guid || "", "yes")} ?disabled=${sub.isCompleted}>Yes</button>
                                <button @click=${() => generateFor(sub.guid || "", "no")} ?disabled=${sub.isCompleted}>No</button>
                                <button @click=${() => generateFor(sub.guid || "", "random")} ?disabled=${sub.isCompleted}>Random</button>
                              </div>
                            `}
                      </div>
                    </td>
                    <td>
                      <div class="action-buttons">
                        ${!sub.isCompleted
                          ? html`<button @click=${() => markAsDone(sub.guid || "")}>Done</button>
                              <button @click=${() => resetFor(sub.guid || "")}>Reset</button>`
                          : html`<button @click=${() => markAsNew(sub.guid || "")}>Undone</button>`}
                        <button @click=${() => deleteFor(sub.guid || "")} class="danger">Delete</button>
                      </div>
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
