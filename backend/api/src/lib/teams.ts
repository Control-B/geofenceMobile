import { logger } from "./logger.js";

/** Teams message payload using the Adaptive Card / simple message card format */
async function postToTeams(webhookUrl: string, payload: object): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    logger.warn({ status: res.status }, "Teams webhook returned non-OK status");
  }
}

function buildCard(title: string, text: string, facts: { name: string; value: string }[] = []) {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: "🚛 DockFlow", weight: "Bolder", size: "Small", color: "Accent" },
            { type: "TextBlock", text: title, weight: "Bolder", size: "Medium", wrap: true },
            { type: "TextBlock", text, wrap: true },
            ...(facts.length > 0 ? [{ type: "FactSet", facts }] : []),
          ],
        },
      },
    ],
  };
}

export async function notifyTeams(title: string, text: string, facts?: { name: string; value: string }[]): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.info({ title, text }, "[TEAMS MOCK] Would send Teams notification");
    return;
  }
  try {
    await postToTeams(webhookUrl, buildCard(title, text, facts));
  } catch (err) {
    logger.error({ err }, "Teams notification failed");
  }
}

// ─── Pre-built templates ──────────────────────────────────────────────────────

export async function teamsDriverArrived(loadNumber: string, carrier: string, facility: string) {
  return notifyTeams(
    "Driver Arrived",
    `Driver arrived for Load **${loadNumber}** at **${facility}**.`,
    [{ name: "Carrier", value: carrier }, { name: "Load #", value: loadNumber }],
  );
}

export async function teamsDocumentUploaded(loadNumber: string, docName: string, needsSignature: boolean) {
  return notifyTeams(
    "Document Uploaded",
    needsSignature
      ? `**${docName}** uploaded for Load ${loadNumber} and needs clerk signature.`
      : `**${docName}** uploaded for Load ${loadNumber}.`,
  );
}

export async function teamsDockAssigned(loadNumber: string, dock: string, trailer: string) {
  return notifyTeams(
    "Dock Assigned",
    `Dock **${dock}** assigned to trailer **${trailer}** for Load ${loadNumber}.`,
    [{ name: "Dock", value: dock }, { name: "Trailer", value: trailer }],
  );
}

export async function teamsLoadComplete(loadNumber: string, carrier: string) {
  return notifyTeams(
    "Load Completed",
    `Load **${loadNumber}** completed and driver released.`,
    [{ name: "Carrier", value: carrier }],
  );
}
