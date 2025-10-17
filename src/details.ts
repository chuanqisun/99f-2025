import "./details.css";
import "./prototype.css";

import { onValue, ref } from "firebase/database";
import { html, render } from "lit-html";
import { toDataURL } from "qrcode";
import { BehaviorSubject, map, Subscription } from "rxjs";
import { deleteFor, generateFor, markAsDone, markAsNew, resetFor } from "./actions";
import { db } from "./firebase";
import type { Responder } from "./host";
import { renderResponderStatus } from "./responder-utils";
import { createComponent } from "./sdk/create-component";
import { playAudioBlob } from "./text-to-speech";

const state$ = new BehaviorSubject<{
  submission: Responder | null;
  error: string | null;
  qrDataUrl: string | null;
  certificateUrl: string | null;
  humanVowQrDataUrl: string | null;
  humanVowUrl: string | null;
  playingAiVow: boolean;
  playingAiAnswer: boolean;
}>({
  submission: null,
  error: null,
  qrDataUrl: null,
  certificateUrl: null,
  humanVowQrDataUrl: null,
  humanVowUrl: null,
  playingAiVow: false,
  playingAiAnswer: false,
});

let aiVowSubscription: Subscription | null = null;
let aiAnswerSubscription: Subscription | null = null;

const Details = createComponent(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const guid = urlParams.get("id");

  if (!guid) {
    state$.next({
      submission: null,
      error: "No ID provided",
      qrDataUrl: null,
      certificateUrl: null,
      humanVowQrDataUrl: null,
      humanVowUrl: null,
      playingAiVow: false,
      playingAiAnswer: false,
    });
  } else {
    const submissionRef = ref(db, `responders/${guid}`);
    const certificateUrl = `${window.location.origin}${import.meta.env.BASE_URL}certificate.html?id=${guid}`;
    const humanVowUrl = `${window.location.origin}${import.meta.env.BASE_URL}human-vow.html?id=${guid}`;

    onValue(
      submissionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const submission = snapshot.val();
          Promise.all([toDataURL(certificateUrl, { width: 800 }).catch(() => null), toDataURL(humanVowUrl, { width: 800 }).catch(() => null)]).then(
            ([qrDataUrl, humanVowQrDataUrl]) => {
              state$.next({ ...state$.value, submission, error: null, qrDataUrl, certificateUrl, humanVowQrDataUrl, humanVowUrl });
            }
          );
        } else {
          state$.next({
            submission: null,
            error: "Submission not found",
            qrDataUrl: null,
            certificateUrl: null,
            humanVowQrDataUrl: null,
            humanVowUrl: null,
            playingAiVow: false,
            playingAiAnswer: false,
          });
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
          playingAiVow: false,
          playingAiAnswer: false,
        });
      }
    );
  }

  const playAudio = (audioUrl: string, field: "aiVow" | "aiAnswer") => {
    if (!audioUrl) return;

    // Convert data URL to blob
    fetch(audioUrl)
      .then((res) => res.blob())
      .then((blob) => {
        // Update state to show playing
        if (field === "aiVow") {
          state$.next({ ...state$.value, playingAiVow: true });
          const subscription = playAudioBlob(blob).subscribe({
            complete: () => {
              state$.next({ ...state$.value, playingAiVow: false });
              aiVowSubscription = null;
            },
            error: () => {
              state$.next({ ...state$.value, playingAiVow: false });
              aiVowSubscription = null;
            },
          });
          aiVowSubscription = subscription;
        } else {
          state$.next({ ...state$.value, playingAiAnswer: true });
          const subscription = playAudioBlob(blob).subscribe({
            complete: () => {
              state$.next({ ...state$.value, playingAiAnswer: false });
              aiAnswerSubscription = null;
            },
            error: () => {
              state$.next({ ...state$.value, playingAiAnswer: false });
              aiAnswerSubscription = null;
            },
          });
          aiAnswerSubscription = subscription;
        }
      })
      .catch((err) => {
        console.error("Error loading audio:", err);
        if (field === "aiVow") {
          state$.next({ ...state$.value, playingAiVow: false });
        } else {
          state$.next({ ...state$.value, playingAiAnswer: false });
        }
      });
  };

  const stopAudio = (field: "aiVow" | "aiAnswer") => {
    if (field === "aiVow" && aiVowSubscription) {
      aiVowSubscription.unsubscribe();
      aiVowSubscription = null;
      state$.next({ ...state$.value, playingAiVow: false });
    } else if (field === "aiAnswer" && aiAnswerSubscription) {
      aiAnswerSubscription.unsubscribe();
      aiAnswerSubscription = null;
      state$.next({ ...state$.value, playingAiAnswer: false });
    }
  };

  return state$.pipe(
    map(
      ({ submission, error, qrDataUrl, certificateUrl, humanVowQrDataUrl, humanVowUrl, playingAiVow, playingAiAnswer }) => html`
        <header class="app-header">
          <div class="action-buttons">
            <button
              @click=${() => {
                window.location.href = "./host.html";
              }}
            >
              Back
            </button>
            ${submission?.generated?.decision
              ? html`<strong>Decision:</strong> ${submission.generated.decision}`
              : html`
                  <button @click=${() => generateFor(submission?.guid || "", "yes")} ?disabled=${submission?.isCompleted}>Yes</button>
                  <button @click=${() => generateFor(submission?.guid || "", "no")} ?disabled=${submission?.isCompleted}>No</button>
                  <button @click=${() => generateFor(submission?.guid || "", "random")} ?disabled=${submission?.isCompleted}>Random</button>
                `}
            ${submission?.generated?.humanVow && humanVowQrDataUrl
              ? html`<button
                  @click=${() => {
                    const dialog = document.getElementById("human-vow-qr-dialog") as HTMLDialogElement;
                    dialog.showModal();
                  }}
                >
                  Show Human Vow QR
                </button>`
              : ""}
            ${submission?.generated && qrDataUrl
              ? html`<button
                  @click=${() => {
                    const dialog = document.getElementById("qr-dialog") as HTMLDialogElement;
                    dialog.showModal();
                  }}
                >
                  Show Certificate QR
                </button>`
              : ""}
            ${!submission?.isCompleted
              ? html`<button @click=${() => markAsDone(submission?.guid || "")}>Done</button>
                  <button @click=${() => resetFor(submission?.guid || "")}>Reset</button>`
              : html` <button @click=${() => markAsNew(submission?.guid || "")}>Undone</button> `}
            <button class="danger" @click=${() => deleteFor(submission?.guid || "")}>Delete</button>
          </div>
        </header>
        <main>
          ${error
            ? html`<p>Error: ${error}</p>`
            : submission
              ? html`
                  <h2>${submission.fullName} ${renderResponderStatus(submission)}</h2>
                  <p><strong>Human Vow:</strong> ${submission.generated?.humanVow || "N/A"}</p>
                  <p>
                    ${playingAiVow
                      ? html`<button @click=${() => stopAudio("aiVow")}>Stop</button>`
                      : html`<button
                          @click=${() => playAudio(submission.generated?.aiVowAudioUrl || "", "aiVow")}
                          ?disabled=${!submission.generated?.aiVowAudioUrl}
                        >
                          ▶️
                        </button>`}
                    <strong>AI Vow:</strong> ${submission.generated?.aiVow || "N/A"}
                  </p>
                  <p>
                    ${playingAiAnswer
                      ? html`<button @click=${() => stopAudio("aiAnswer")}>Stop</button>`
                      : html`<button
                          @click=${() => playAudio(submission.generated?.aiAnswerAudioUrl || "", "aiAnswer")}
                          ?disabled=${!submission.generated?.aiAnswerAudioUrl}
                        >
                          ▶️
                        </button>`}
                    <strong>AI Final Answer:</strong> ${submission.generated?.aiAnswer || "N/A"}
                  </p>
                  <p><strong>AI Voice:</strong> ${submission.generated?.aiVoice || "N/A"}</p>
                  ${submission.generated?.photoUrl ? html`<img src="${submission.generated?.photoUrl}" alt="Generated Photo" style="max-width: 200px;" />` : ""}

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
