import { onValue, ref } from "firebase/database";
import { html, render } from "lit-html";
import { BehaviorSubject, map } from "rxjs";
import { db } from "./firebase";
import { createComponent } from "./sdk/create-component";

const submission$ = new BehaviorSubject<any>(null);

const Details = createComponent(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  if (id) {
    const submissionRef = ref(db, `responders/${id}`);
    onValue(submissionRef, (snapshot) => {
      if (snapshot.exists()) {
        submission$.next(snapshot.val());
      } else {
        submission$.next({ error: "Submission not found" });
      }
    });
  } else {
    submission$.next({ error: "No ID provided" });
  }

  return submission$.pipe(
    map(
      (submission) => html`
        <header class="app-header"></header>
        <main>
          ${submission
            ? html`
                ${submission.error
                  ? html`<p>${submission.error}</p>`
                  : html`
                      <h2>Submission Details</h2>
                      ${submission.headshotDataUrl ? html`<img src="${submission.headshotDataUrl}" alt="Headshot" style="max-width: 200px;" />` : ""}
                      <p><strong>Full Name, Pronouns, Gender:</strong> ${submission.fullNamePronounsGender || "N/A"}</p>
                      <p><strong>Email:</strong> ${submission.email || "N/A"}</p>
                      <p><strong>Job Area:</strong> ${submission.jobArea || "N/A"}</p>
                      <p><strong>AI Feeling:</strong> ${submission.aiFeeling || "N/A"}</p>
                      <p><strong>Love Language:</strong> ${submission.loveLanguage || "N/A"}</p>
                      <p><strong>Perfect First Date:</strong> ${submission.perfectFirstDate || "N/A"}</p>
                      <p><strong>Ideal Traits:</strong> ${submission.idealTraits || "N/A"}</p>
                      <p><strong>Dealbreakers:</strong> ${submission.dealbreakers || "N/A"}</p>
                      <p><strong>Generated Vow:</strong> ${submission.generated?.vow || "N/A"}</p>
                      <p><strong>Submitted At:</strong> ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "N/A"}</p>
                      <h3>Generated</h3>
                      <p><strong>Vow:</strong> ${submission.vow || "N/A"}</p>
                      ${submission.generated?.photoUrl
                        ? html`<img src="${submission.generated?.photoUrl}" alt="Generated Photo" style="max-width: 200px;" />`
                        : ""}
                    `}
              `
            : html`<p>Loading...</p>`}
        </main>
      `
    )
  );
});

render(Details(), document.getElementById("app")!);
