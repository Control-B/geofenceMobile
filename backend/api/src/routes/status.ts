import { eq } from "drizzle-orm";
import { Router } from "express";
import { auditTrailsTable, loadsTable, db } from "@workspace/db";
import { broadcast } from "../lib/signalr.js";
import { requireAuth } from "../middleware/auth.js";
import { smsLoadComplete } from "../lib/azure-sms.js";
import { teamsLoadComplete } from "../lib/teams.js";

const router = Router();

/** GET /api/status/:loadId — returns the load and its status history */
router.get("/status/:loadId", requireAuth, async (req, res) => {
  try {
    const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, req.params.loadId)).limit(1);
    if (!load) {
      res.status(404).json({ error: "Load not found" });
      return;
    }

    const history = await db
      .select()
      .from(auditTrailsTable)
      .where(eq(auditTrailsTable.loadId, req.params.loadId));

    res.json({ load, history });
  } catch {
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

/** PATCH /api/status/:loadId — update load status (warehouse side) */
router.patch("/status/:loadId", requireAuth, async (req, res) => {
  const { status } = req.body as { status: string };
  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }
  try {
    const [load] = await db.update(loadsTable)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(loadsTable.id, req.params.loadId))
      .returning();

    if (!load) {
      res.status(404).json({ error: "Load not found" });
      return;
    }

    await db.insert(auditTrailsTable).values({
      loadId: req.params.loadId,
      action: `STATUS_UPDATED_TO_${status.toUpperCase()}`,
      actorId: res.locals.userId,
      actorName: res.locals.name,
      actorRole: res.locals.role,
      metadata: JSON.stringify({ status }),
    });

    broadcast(`${status}`, { loadId: req.params.loadId, status }).catch(() => {});

    // Notify on completion
    if (status === "completed" || status === "departed") {
      if (load.driverPhone) smsLoadComplete(load.driverPhone, load.loadNumber).catch(() => {});
      teamsLoadComplete(load.loadNumber, load.carrier).catch(() => {});
    }

    res.json(load);
  } catch {
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
