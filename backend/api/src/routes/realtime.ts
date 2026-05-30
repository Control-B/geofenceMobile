import { Router } from "express";
import { getSignalRNegotiateUrl, getLocalWssPort } from "../lib/signalr.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/realtime/negotiate
 * Returns connection info for real-time updates.
 * - When Azure SignalR is configured, returns the SignalR hub URL.
 * - Otherwise, returns the local WebSocket server port.
 */
router.get("/realtime/negotiate", requireAuth, (req, res) => {
  const signalRUrl = getSignalRNegotiateUrl();
  if (signalRUrl) {
    res.json({ type: "azure-signalr", url: signalRUrl });
  } else {
    const host = req.hostname;
    res.json({
      type: "websocket",
      url: `ws://${host}:${getLocalWssPort()}`,
    });
  }
});

export default router;
