/**
 * Real-time event broadcaster.
 *
 * When AZURE_SIGNALR_CONNECTION_STRING is set, events are published to Azure
 * SignalR Service via its REST Management API.  When it is not set, events are
 * broadcast over the local WebSocket server that is started alongside the HTTP
 * server (see src/index.ts).
 */

import { WebSocketServer, WebSocket } from "ws";
import { logger } from "./logger.js";

// ─── Local WebSocket fallback ─────────────────────────────────────────────────

let _wss: WebSocketServer | null = null;

export function startLocalWss(port: number) {
  _wss = new WebSocketServer({ port });
  _wss.on("connection", (ws) => {
    logger.info("WS client connected");
    ws.on("error", (err) => logger.warn({ err }, "WS client error"));
  });
  logger.info({ port }, "Local WebSocket server started (Azure SignalR not configured)");
}

// ─── Azure SignalR REST broadcast ─────────────────────────────────────────────

interface SignalRMessage {
  target: string;
  arguments: unknown[];
}

async function broadcastViaAzure(event: string, payload: unknown) {
  const connStr = process.env.AZURE_SIGNALR_CONNECTION_STRING;
  if (!connStr) return false;

  try {
    // Parse endpoint and key from connection string
    const endpointMatch = connStr.match(/Endpoint=([^;]+)/);
    const keyMatch = connStr.match(/AccessKey=([^;]+)/);
    if (!endpointMatch || !keyMatch) return false;

    const endpoint = endpointMatch[1].replace(/\/$/, "");
    const hubName = process.env.AZURE_SIGNALR_HUB ?? "dockflow";
    const url = `${endpoint}/api/v1/hubs/${hubName}`;

    const message: SignalRMessage = { target: event, arguments: [payload] };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keyMatch[1]}`,
      },
      body: JSON.stringify(message),
    });

    return res.ok;
  } catch (err) {
    logger.warn({ err }, "Azure SignalR broadcast failed");
    return false;
  }
}

// ─── Public broadcast function ────────────────────────────────────────────────

export async function broadcast(event: string, payload: unknown) {
  const azureSent = await broadcastViaAzure(event, payload);

  if (!azureSent && _wss) {
    const msg = JSON.stringify({ event, payload });
    _wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  logger.info({ event, azureSent }, "Realtime event broadcast");
}

// ─── SignalR negotiate endpoint helper ────────────────────────────────────────

export function getSignalRNegotiateUrl(): string | null {
  const connStr = process.env.AZURE_SIGNALR_CONNECTION_STRING;
  if (!connStr) return null;
  const endpointMatch = connStr.match(/Endpoint=([^;]+)/);
  if (!endpointMatch) return null;
  const hubName = process.env.AZURE_SIGNALR_HUB ?? "dockflow";
  return `${endpointMatch[1].replace(/\/$/, "")}/client/?hub=${hubName}`;
}

export function getLocalWssPort(): number {
  return Number(process.env.WS_PORT ?? 4001);
}
