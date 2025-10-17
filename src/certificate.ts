import { get, ref } from "firebase/database";
import { html, render } from "lit-html";
import { ifDefined } from "lit-html/directives/if-defined.js";
import "./certificate.css";
import { decodeEmail } from "./email-encoding";
import { db } from "./firebase";
import type { Responder } from "./host";
import "./prototype.css";

const urlParams = new URLSearchParams(window.location.search);
const encodedEmail = urlParams.get("id");
const email = encodedEmail ? decodeEmail(encodedEmail) : null;

if (!email) {
  render(html`<p>No email provided</p>`, document.getElementById("app")!);
} else {
  const responderRef = ref(db, `/responders/${email}`);
  get(responderRef)
    .then((snapshot) => {
      const responder = snapshot.val() as Responder;
      if (!responder || !responder.generated) {
        render(html`<p>No data found</p>`, document.getElementById("app")!);
        return;
      }
      const { decision, photoUrl } = responder.generated;
      const name = responder.fullName || "Unknown";
      const isMarriage = decision === "yes";
      const title = isMarriage ? "Marriage Certificate" : "Divorce Certificate";
      const message = isMarriage ? "Congratulations on your union!" : "Certificate of Dissolution";
      render(
        html`
          <div class="certificate">
            <h1 class="certificate-title">${title}</h1>
            <img class="certificate-photo" src="${ifDefined(photoUrl)}" alt="Generated Photo" />
            <p class="certificate-name">${name}</p>
            <p class="certificate-message">${message}</p>
          </div>
        `,
        document.getElementById("app")!
      );
    })
    .catch((error) => {
      render(html`<p>Error loading data: ${error.message}</p>`, document.getElementById("app")!);
    });
}
