import { get, ref } from "firebase/database";
import { html, render } from "lit-html";
import { ifDefined } from "lit-html/directives/if-defined.js";
import { db } from "./firebase";
import type { Responder } from "./host";
import "./prototype.css";

const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get("email");

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
      const name = responder.fullNamePronounsGender || "Unknown";
      const isMarriage = decision === "yes";
      const title = isMarriage ? "Marriage Certificate" : "Divorce Certificate";
      const message = isMarriage ? "Congratulations on your union!" : "Certificate of Dissolution";
      render(
        html`
          <div class="certificate" style="text-align: center; padding: 20px; border: 2px solid #000; max-width: 600px; margin: 0 auto;">
            <h1 style="font-family: 'Great Vibes', cursive; font-size: 48px;">${title}</h1>
            <img src="${ifDefined(photoUrl)}" alt="Generated Photo" style="display: block; margin: 20px auto; max-width: 300px; border-radius: 10px;" />
            <p style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 20px 0;">${name}</p>
            <p style="font-family: 'Playfair Display', serif; font-size: 18px;">${message}</p>
          </div>
        `,
        document.getElementById("app")!
      );
    })
    .catch((error) => {
      render(html`<p>Error loading data: ${error.message}</p>`, document.getElementById("app")!);
    });
}
