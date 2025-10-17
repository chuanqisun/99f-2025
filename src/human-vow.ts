import { onValue, ref } from "firebase/database";
import { html, render } from "lit-html";
import { BehaviorSubject, map } from "rxjs";
import { db } from "./firebase";
import "./human-vow.css";
import { createComponent } from "./sdk/create-component";
import { decodeEmail } from "./email-encoding";

const state$ = new BehaviorSubject<{ vow: string | null; error: string | null }>({
  vow: null,
  error: null,
});

const HumanVow = createComponent(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedEmail = urlParams.get("id");
  const email = encodedEmail ? decodeEmail(encodedEmail) : null;

  if (!email) {
    state$.next({ vow: null, error: "No Email provided" });
  } else {
    const submissionRef = ref(db, `responders/${email}`);
    onValue(
      submissionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const submission = snapshot.val();
          const vow = submission.generated?.humanVow || "Vow not found";
          state$.next({ vow, error: null });
        } else {
          state$.next({ vow: null, error: "Submission not found" });
        }
      },
      (error) => {
        state$.next({ vow: null, error: `Failed to load data: ${error.message}` });
      }
    );
  }

  return state$.pipe(
    map(
      ({ vow, error }) => html`
        <div class="vow-container">
          ${error
            ? html`<p class="error">Error: ${error}</p>`
            : vow
              ? html`
                  <h1 class="vow-title">Vow</h1>
                  <p class="vow-text">${vow}</p>
                `
              : html`<p>Loading...</p>`}
        </div>
      `
    )
  );
});

render(HumanVow(), document.getElementById("app")!);
