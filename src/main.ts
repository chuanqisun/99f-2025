import { push, ref } from "firebase/database";
import { html, render } from "lit-html";
import { ConnectionsComponent } from "./connections/connections.component";
import { db } from "./firebase";
import "./prototype.css";
import { createComponent } from "./sdk/create-component";

const Main = createComponent(() => {
  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const nameInput = form.elements.namedItem("name") as HTMLInputElement;
    if (nameInput.value) {
      try {
        await push(ref(db, "surveys"), { name: nameInput.value });
        alert("Submitted successfully!");
        form.reset();
      } catch (error) {
        console.error("Error submitting:", error);
        alert("Error submitting form");
      }
    }
  };

  const template = html`
    <header class="app-header"></header>
    <main>
      <form @submit=${handleSubmit}>
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" />
        <button type="submit">Submit</button>
      </form>
    </main>
    <dialog class="connection-form" id="connection-dialog">
      <div class="connections-dialog-body">
        ${ConnectionsComponent()}
        <form method="dialog">
          <button>Close</button>
        </form>
      </div>
    </dialog>
  `;

  return template;
});

render(Main(), document.getElementById("app")!);
