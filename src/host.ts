import { onValue, ref } from "firebase/database";
import { html, render } from "lit-html";
import { BehaviorSubject, map } from "rxjs";
import { ConnectionsComponent } from "./connections/connections.component";
import { db } from "./firebase";
import { createComponent } from "./sdk/create-component";

const submissions$ = new BehaviorSubject<Responder[]>([]);

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
            ${submissions.map((sub) => html` <li><a href="details.html?id=${sub.email}">${sub.fullNamePronounsGender}</a></li> `)}
          </ul>
        </main>
      `
    )
  );
});

render(Host(), document.getElementById("app")!);
