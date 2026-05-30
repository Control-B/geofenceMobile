import { eq } from "drizzle-orm";
import { Router } from "express";
import { alertsTable, auditTrailsTable, dockAssignmentsTable, loadsTable, db } from "@workspace/db";
import { broadcast } from "../lib/signalr.js";
import { smsDockAssigned } from "../lib/azure-sms.js";
import { teamsDockAssigned } from "../lib/teams.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/** POST /api/dock-assignments — warehouse assigns a dock */
router.post("/dock-assignments", requireAuth, requireRole("warehouse_clerk", "admin", "dispatcher"), async (req, res) => {
  const { loadId, dockName, notes } = req.body as { loadId: string; dockName: string; notes?: string };
  if (!loadId || !dockName) {
    res.status(400).json({ error: "loadId and dockName are required" });
    return;
  }
  try {
    const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, loadId)).limit(1);
    if (!load) {
      res.status(404).json({ error: "Load not found" });
      return;
    }

    const [assignment] = await db.insert(dockAssignmentsTable).values({
      loadId, dockName, notes: notes ?? null,
      assignedBy: res.locals.userId,
      assignedByName: res.locals.name,
    }).returning();

    await db.update(loadsTable)
      .set({ status: "dock_assigned", dockAssignment: dockName, updatedAt: new Date() })
      .where(eq(loadsTable.id, loadId));

    await db.insert(auditTrailsTable).values({
      loadId,
      action: "DOCK_ASSIGNED",
      actorId: res.locals.userId,
      actorName: res.locals.name,
      actorRole: res.locals.role,
      metadata: JSON.stringify({ dockName }),
    });

    await db.insert(alertsTable).values({
      loadId,
      type: "dock_assigned",
      title: "Dock Assigned",
      message: `Dock ${dockName} has been assigned for Load ${load.loadNumber}.`,
    });

    broadcast("dock_assigned", { loadId, dockName, loadNumber: load.loadNumber }).catch(() => {});
    if (load.driverPhone) smsDockAssigned(load.driverPhone, load.loadNumber, dockName).catch(() => {});
    if (load.trailerNumber) teamsDockAssigned(load.loadNumber, dockName, load.trailerNumber).catch(() => {});

    res.status(201).json(assignment);
  } catch {
    res.status(500).json({ error: "Dock assignment failed" });
  }
});

/** GET /api/dock-assignments/:loadId */
router.get("/dock-assignments/:loadId", requireAuth, async (req, res) => {
  try {
    const assignments = await db
      .select()
      .from(dockAssignmentsTable)
      .where(eq(dockAssignmentsTable.loadId, req.params.loadId));
    res.json(assignments);
  } catch {
    res.status(500).json({ error: "Failed to fetch dock assignments" });
  }
});

export default router;
