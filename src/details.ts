import "./details.css";
import "./prototype.css";

import { onValue, ref, update } from "firebase/database";
import { html, render } from "lit-html";
import { toDataURL } from "qrcode";
import { BehaviorSubject, map } from "rxjs";
import { decodeEmail } from "./email-encoding";
import { db } from "./firebase";
import type { Responder } from "./host";
import { createComponent } from "./sdk/create-component";

const state$ = new BehaviorSubject<{
  submission: Responder | null;
  error: string | null;
  qrDataUrl: string | null;
  certificateUrl: string | null;
  humanVowQrDataUrl: string | null;
  humanVowUrl: string | null;
}>({
  submission: null,
  error: null,
  qrDataUrl: null,
  certificateUrl: null,
  humanVowQrDataUrl: null,
  humanVowUrl: null,
});

async function markAsDone(responder: Responder) {
  if (!responder.email) return;
  const responderRef = ref(db, `/responders/${responder.email}`);
  await update(responderRef, { isCompleted: true, modifiedAt: Date.now() });
}

const Details = createComponent(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedEmail = urlParams.get("id");
  const email = encodedEmail ? decodeEmail(encodedEmail) : null;

  if (!email) {
    state$.next({ submission: null, error: "No Email provided", qrDataUrl: null, certificateUrl: null, humanVowQrDataUrl: null, humanVowUrl: null });
  } else {
    const submissionRef = ref(db, `responders/${email}`);
    onValue(
      submissionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const submission = snapshot.val();
          const certificateUrl = `certificate.html?id=${encodedEmail}`;
          const humanVowUrl = `human-vow.html?id=${encodedEmail}`;
          Promise.all([toDataURL(certificateUrl, { width: 800 }).catch(() => null), toDataURL(humanVowUrl, { width: 800 }).catch(() => null)]).then(
            ([qrDataUrl, humanVowQrDataUrl]) => {
              state$.next({ submission, error: null, qrDataUrl, certificateUrl, humanVowQrDataUrl, humanVowUrl });
            }
          );
        } else {
          state$.next({ submission: null, error: "Submission not found", qrDataUrl: null, certificateUrl: null, humanVowQrDataUrl: null, humanVowUrl: null });
        }
      },
      (error) => {
        state$.next({
          submission: null,
          error: `Failed to load data: ${error.message}`,
          qrDataUrl: null,
          certificateUrl: null,
          humanVowQrDataUrl: null,
          humanVowUrl: null,
        });
      }
    );
  }

  return state$.pipe(
    map(
      ({ submission, error, qrDataUrl, certificateUrl, humanVowQrDataUrl, humanVowUrl }) => html`
        <header class="app-header"></header>
        <main>
          ${error
            ? html`<p>Error: ${error}</p>`
            : submission
              ? html`
                  <div class="action-buttons">
                    ${submission.generated && qrDataUrl
                      ? html`<button
                          @click=${() => {
                            const dialog = document.getElementById("qr-dialog") as HTMLDialogElement;
                            dialog.showModal();
                          }}
                        >
                          Show Certificate QR
                        </button>`
                      : ""}
                    ${submission.generated?.humanVow && humanVowQrDataUrl
                      ? html`<button
                          @click=${() => {
                            const dialog = document.getElementById("human-vow-qr-dialog") as HTMLDialogElement;
                            dialog.showModal();
                          }}
                        >
                          Show Human Vow QR
                        </button>`
                      : ""}
                    ${submission.generated && !submission.isCompleted ? html`<button @click=${() => markAsDone(submission)}>Mark as Done</button>` : ""}
                  </div>

                  <h2>${submission.fullName}</h2>
                  <p><strong>Human Vow:</strong> ${submission.generated?.humanVow || "N/A"}</p>
                  <p><strong>AI Vow:</strong> ${submission.generated?.aiVow || "N/A"}</p>
                  ${submission.generated?.photoUrl ? html`<img src="${submission.generated?.photoUrl}" alt="Generated Photo" style="max-width: 200px;" />` : ""}

                  <hr />
                  <h2>Details</h2>
                  ${submission.headshotDataUrl ? html`<img src="${submission.headshotDataUrl}" alt="Headshot" style="max-width: 200px;" />` : ""}
                  <p><strong>Full Name:</strong> ${submission.fullName || "N/A"}</p>
                  <p><strong>Email:</strong> ${submission.email || "N/A"}</p>
                  <p><strong>Job Area:</strong> ${submission.jobArea || "N/A"}</p>
                  <p><strong>AI Feeling:</strong> ${submission.aiFeeling || "N/A"}</p>
                  <p><strong>Love Language:</strong> ${submission.loveLanguage || "N/A"}</p>
                  <p><strong>Perfect First Date:</strong> ${submission.perfectFirstDate || "N/A"}</p>
                  <p><strong>Ideal Traits:</strong> ${submission.idealTraits || "N/A"}</p>
                  <p><strong>Dealbreakers:</strong> ${submission.dealbreakers || "N/A"}</p>
                  <p><strong>Submitted At:</strong> ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "N/A"}</p>
                `
              : html`<p>Loading...</p>`}
        </main>
        <dialog id="qr-dialog">
          ${qrDataUrl ? html`<img src="${qrDataUrl}" alt="QR Code" />` : ""}
          ${certificateUrl ? html`<a href="${certificateUrl}" class="link">View Certificate</a>` : ""}
          <button
            @click=${() => {
              const dialog = document.getElementById("qr-dialog") as HTMLDialogElement;
              dialog.close();
            }}
          >
            Close
          </button>
        </dialog>
        <dialog id="human-vow-qr-dialog">
          ${humanVowQrDataUrl ? html`<img src="${humanVowQrDataUrl}" alt="QR Code" />` : ""}
          ${humanVowUrl ? html`<a href="${humanVowUrl}" class="link">View Human Vow</a>` : ""}
          <button
            @click=${() => {
              const dialog = document.getElementById("human-vow-qr-dialog") as HTMLDialogElement;
              dialog.close();
            }}
          >
            Close
          </button>
        </dialog>
      `
    )
  );
});

render(Details(), document.getElementById("app")!);
