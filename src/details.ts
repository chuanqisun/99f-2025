import { onValue, ref } from "firebase/database";
import { html, render } from "lit-html";
import { toDataURL } from "qrcode";
import { BehaviorSubject, map } from "rxjs";
import "./details.css";
import { db } from "./firebase";
import type { Responder } from "./host";
import { createComponent } from "./sdk/create-component";

const state$ = new BehaviorSubject<{ submission: Responder | null; error: string | null; qrDataUrl: string | null; certificateUrl: string | null }>({
  submission: null,
  error: null,
  qrDataUrl: null,
  certificateUrl: null,
});

const Details = createComponent(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");

  if (!email) {
    state$.next({ submission: null, error: "No Email provided", qrDataUrl: null, certificateUrl: null });
  } else {
    const submissionRef = ref(db, `responders/${email}`);
    onValue(
      submissionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const submission = snapshot.val();
          const url = `certificate.html?email=${email}`;
          toDataURL(url, {
            width: 800,
          })
            .then((qrDataUrl) => {
              state$.next({ submission, error: null, qrDataUrl, certificateUrl: url });
            })
            .catch(() => {
              state$.next({ submission, error: null, qrDataUrl: null, certificateUrl: url });
            });
        } else {
          state$.next({ submission: null, error: "Submission not found", qrDataUrl: null, certificateUrl: null });
        }
      },
      (error) => {
        state$.next({ submission: null, error: `Failed to load data: ${error.message}`, qrDataUrl: null, certificateUrl: null });
      }
    );
  }

  return state$.pipe(
    map(
      ({ submission, error, qrDataUrl, certificateUrl }) => html`
        <header class="app-header"></header>
        <main>
          ${error
            ? html`<p>Error: ${error}</p>`
            : submission
              ? html`
                  <h2>Submission Details</h2>
                  ${submission.headshotDataUrl ? html`<img src="${submission.headshotDataUrl}" alt="Headshot" style="max-width: 200px;" />` : ""}
                  <p><strong>Full Name:</strong> ${submission.fullName || "N/A"}</p>
                  <p><strong>Email:</strong> ${submission.email || "N/A"}</p>
                  <p><strong>Job Area:</strong> ${submission.jobArea || "N/A"}</p>
                  <p><strong>AI Feeling:</strong> ${submission.aiFeeling || "N/A"}</p>
                  <p><strong>Love Language:</strong> ${submission.loveLanguage || "N/A"}</p>
                  <p><strong>Perfect First Date:</strong> ${submission.perfectFirstDate || "N/A"}</p>
                  <p><strong>Ideal Traits:</strong> ${submission.idealTraits || "N/A"}</p>
                  <p><strong>Dealbreakers:</strong> ${submission.dealbreakers || "N/A"}</p>
                  <p><strong>Human Vow:</strong> ${submission.generated?.humanVow || "N/A"}</p>
                  <p><strong>AI Vow:</strong> ${submission.generated?.aiVow || "N/A"}</p>
                  <p><strong>Submitted At:</strong> ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "N/A"}</p>
                  <h3>Generated</h3>
                  ${submission.generated?.photoUrl ? html`<img src="${submission.generated?.photoUrl}" alt="Generated Photo" style="max-width: 200px;" />` : ""}
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
      `
    )
  );
});

render(Details(), document.getElementById("app")!);
