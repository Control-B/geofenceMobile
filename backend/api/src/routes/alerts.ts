import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { alertsTable, db } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/alerts — returns alerts for the current user's loads */
router.get("/alerts", requireAuth, async (req, res) => {
  try {
    const { loadId, unreadOnly } = req.query as { loadId?: string; unreadOnly?: string };
    const conditions = [];
    if (loadId) conditions.push(eq(alertsTable.loadId, loadId));
    if (unreadOnly === "true") conditions.push(eq(alertsTable.read, false));

    const alerts = await db
      .select()
      .from(alertsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(alertsTable.createdAt))
      .limit(100);

    res.json(alerts);
  } catch {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

/** POST /api/alerts — create a new alert */
router.post("/alerts", requireAuth, async (req, res) => {
  const { loadId, type, title, message, companyId } = req.body as {
    loadId?: string; type: string; title: string; message: string; companyId?: string;
  };
  if (!type || !title || !message) {
    res.status(400).json({ error: "type, title, and message are required" });
    return;
  }
  try {
    const [alert] = await db.insert(alertsTable).values({
      loadId: loadId ?? null,
      companyId: companyId ?? null,
      type: type as any,
      title,
      message,
    }).returning();
    res.status(201).json(alert);
  } catch {
    res.status(500).json({ error: "Failed to create alert" });
  }
});

/** PATCH /api/alerts/:id/read */
router.patch("/alerts/:id/read", requireAuth, async (req, res) => {
  try {
    await db.update(alertsTable).set({ read: true }).where(eq(alertsTable.id, req.params.id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to mark alert as read" });
  }
});

/** PATCH /api/alerts/read-all */
router.patch("/alerts/read-all", requireAuth, async (req, res) => {
  const { loadId } = req.body as { loadId?: string };
  try {
    await db.update(alertsTable)
      .set({ read: true })
      .where(loadId ? eq(alertsTable.loadId, loadId) : undefined);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to mark alerts as read" });
  }
});

export default router;
