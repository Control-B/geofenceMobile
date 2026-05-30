import { apiFetch, BASE_URL } from "./apiClient";

type EventHandler = (payload: unknown) => void;

interface NegotiateResponse {
  type: "azure-signalr" | "websocket";
  url: string;
}

let _ws: WebSocket | null = null;
const _handlers = new Map<string, Set<EventHandler>>();

function dispatchEvent(event: string, payload: unknown) {
  _handlers.get(event)?.forEach((h) => h(payload));
  _handlers.get("*")?.forEach((h) => h({ event, payload }));
}

export function onRealtimeEvent(event: string, handler: EventHandler): () => void {
  if (!_handlers.has(event)) _handlers.set(event, new Set());
  _handlers.get(event)!.add(handler);
  return () => _handlers.get(event)?.delete(handler);
}

export async function connectRealtime(): Promise<void> {
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) return;

  try {
    const config = await apiFetch<NegotiateResponse>("/api/realtime/negotiate");
    const wsUrl = config.type === "azure-signalr"
      ? config.url
      : config.url;

    _ws = new WebSocket(wsUrl);

    _ws.onopen = () => console.log("[Realtime] Connected");
    _ws.onclose = () => {
      console.log("[Realtime] Disconnected — reconnecting in 5s");
      setTimeout(() => connectRealtime(), 5_000);
    };
    _ws.onerror = (err) => console.warn("[Realtime] Error", err);
    _ws.onmessage = (evt) => {
      try {
        const { event, payload } = JSON.parse(evt.data as string);
        dispatchEvent(event, payload);
      } catch {
        // ignore malformed messages
      }
    };
  } catch (err) {
    console.warn("[Realtime] Could not connect:", err);
  }
}

export function disconnectRealtime(): void {
  _ws?.close();
  _ws = null;
}
