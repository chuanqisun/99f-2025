import { html } from "lit-html";
import type { Responder } from "./host";

/**
 * Renders status emojis for a responder
 * @param responder The responder data
 * @returns HTML template with status indicators
 */
export function renderResponderStatus(responder: Responder) {
  const hasVow = responder.generated?.humanVow && responder.generated?.aiVow;
  const hasPhoto = responder.generated?.photoUrl;

  return html`
    ${responder.isGenerating && !hasVow ? html`<span title="Generating vow">⏳</span>` : hasVow ? html`<span title="Vow generated">📋</span>` : ""}
    ${responder.isGenerating && !hasPhoto ? html`<span title="Generating photo">⏳</span>` : hasPhoto ? html`<span title="Photo generated">📷</span>` : ""}
    ${responder.error ? html`<span title="${responder.error}">⚠️</span>` : ""} ${responder.isCompleted ? html`<span title="Completed">✅</span>` : ""}
  `;
}
