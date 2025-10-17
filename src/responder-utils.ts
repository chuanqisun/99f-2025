import { html } from "lit-html";
import type { Responder } from "./host";

/**
 * Renders status emojis for a responder
 * @param responder The responder data
 * @returns HTML template with status indicators
 */
export function renderResponderStatus(responder: Responder) {
  return html`
    ${responder.isGenerating
      ? html`
          <span title="Generating vow">⏳</span>
          <span title="Generating photo">⏳</span>
        `
      : html`
          ${responder.generated?.humanVow && responder.generated?.aiVow ? html`<span title="Vow generated">📋</span>` : ""}${responder.generated?.photoUrl
            ? html`<span title="Photo generated">📷</span>`
            : ""}
        `}
    ${responder.error ? html`<span title="${responder.error}">⚠️</span>` : ""} ${responder.isCompleted ? html`<span title="Completed">✅</span>` : ""}
  `;
}
