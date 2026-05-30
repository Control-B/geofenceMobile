import { Router } from "express";
import { sendSms } from "../lib/azure-sms.js";
import { notifyTeams } from "../lib/teams.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/** POST /api/notifications/sms */
router.post("/notifications/sms", requireAuth, requireRole("warehouse_clerk", "admin", "dispatcher"), async (req, res) => {
  const { to, message } = req.body as { to: string; message: string };
  if (!to || !message) {
    res.status(400).json({ error: "to and message are required" });
    return;
  }
  const success = await sendSms(to, message);
  res.json({ success });
});

/** POST /api/notifications/teams */
router.post("/notifications/teams", requireAuth, requireRole("warehouse_clerk", "admin", "dispatcher"), async (req, res) => {
  const { title, text, facts } = req.body as {
    title: string; text: string; facts?: { name: string; value: string }[];
  };
  if (!title || !text) {
    res.status(400).json({ error: "title and text are required" });
    return;
  }
  await notifyTeams(title, text, facts);
  res.json({ success: true });
});

export default router;
