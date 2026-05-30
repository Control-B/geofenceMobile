import { eq } from "drizzle-orm";
import { Router } from "express";
import {
  alertsTable, auditTrailsTable, checkinSessionsTable,
  facilitiesTable, loadsTable, db,
} from "@workspace/db";
import { isInsideGeofence } from "../lib/geofence.js";
import { broadcast } from "../lib/signalr.js";
import { smsCheckinConfirmation } from "../lib/azure-sms.js";
import { teamsDriverArrived } from "../lib/teams.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** POST /api/checkins/arrival */
router.post("/checkins/arrival", requireAuth, async (req, res) => {
  const { loadId, lat, lng, notes } = req.body as {
    loadId: string; lat?: number; lng?: number; notes?: string;
  };

  if (!loadId) {
    res.status(400).json({ error: "loadId is required" });
    return;
  }

  try {
    const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, loadId)).limit(1);
    if (!load) {
      res.status(404).json({ error: "Load not found" });
      return;
    }

    // Geofence check when coordinates provided
    let isInsideResult: { inside: boolean; distanceMeters: number } | null = null;
    if (lat != null && lng != null && load.deliveryFacilityId) {
      const [facility] = await db
        .select()
        .from(facilitiesTable)
        .where(eq(facilitiesTable.id, load.deliveryFacilityId))
        .limit(1);

      if (facility) {
        isInsideResult = isInsideGeofence(lat, lng, facility.lat, facility.lng, facility.geofenceRadiusMeters);
        if (!isInsideResult.inside) {
          res.status(422).json({
            error: "Outside geofence",
            distanceMeters: Math.round(isInsideResult.distanceMeters),
            geofenceRadiusMeters: facility.geofenceRadiusMeters,
          });
          return;
        }
      }
    }

    // Create checkin session
    const [session] = await db.insert(checkinSessionsTable).values({
      loadId,
      driverId: res.locals.userId,
      lat: lat ?? null,
      lng: lng ?? null,
      distanceMeters: isInsideResult?.distanceMeters ?? null,
      isInsideGeofence: isInsideResult?.inside ?? null,
      status: "pending",
      notes: notes ?? null,
    }).returning();

    // Update load status to arrived
    await db.update(loadsTable)
      .set({ status: "arrived", arrivedTime: new Date(), updatedAt: new Date() })
      .where(eq(loadsTable.id, loadId));

    // Audit trail
    await db.insert(auditTrailsTable).values({
      loadId,
      action: "DRIVER_ARRIVED",
      actorId: res.locals.userId,
      actorName: res.locals.name,
      actorRole: res.locals.role,
      metadata: JSON.stringify({ lat, lng, distanceMeters: isInsideResult?.distanceMeters }),
    });

    // Create driver alert
    await db.insert(alertsTable).values({
      loadId,
      type: "arrival",
      title: "Check-In Submitted",
      message: `You have checked in for Load ${load.loadNumber}. Waiting for dock assignment.`,
    });

    // Async notifications (don't block the response)
    const [facility] = load.deliveryFacilityId
      ? await db.select().from(facilitiesTable).where(eq(facilitiesTable.id, load.deliveryFacilityId)).limit(1)
      : [null];

    if (load.driverPhone) {
      smsCheckinConfirmation(load.driverPhone, load.loadNumber, facility?.name ?? "facility").catch(() => {});
    }
    teamsDriverArrived(load.loadNumber, load.carrier, facility?.name ?? "facility").catch(() => {});
    broadcast("arrival_confirmed", { loadId, loadNumber: load.loadNumber, sessionId: session.id }).catch(() => {});

    res.status(201).json({ session, message: "Check-in submitted. Waiting for dock assignment." });
  } catch (err) {
    res.status(500).json({ error: "Check-in failed" });
  }
});

/** GET /api/checkins/:loadId */
router.get("/checkins/:loadId", requireAuth, async (req, res) => {
  try {
    const sessions = await db
      .select()
      .from(checkinSessionsTable)
      .where(eq(checkinSessionsTable.loadId, req.params.loadId));
    res.json(sessions);
  } catch {
    res.status(500).json({ error: "Failed to fetch checkin sessions" });
  }
});

/** POST /api/checkins/checkout */
router.post("/checkins/checkout", requireAuth, async (req, res) => {
  const { loadId } = req.body as { loadId: string };
  if (!loadId) {
    res.status(400).json({ error: "loadId is required" });
    return;
  }
  try {
    await db.update(loadsTable)
      .set({ status: "departed", updatedAt: new Date() })
      .where(eq(loadsTable.id, loadId));

    await db.insert(auditTrailsTable).values({
      loadId,
      action: "DRIVER_DEPARTED",
      actorId: res.locals.userId,
      actorName: res.locals.name,
      actorRole: res.locals.role,
    });

    broadcast("checkout_completed", { loadId }).catch(() => {});
    res.json({ message: "Checkout successful" });
  } catch {
    res.status(500).json({ error: "Checkout failed" });
  }
});

export default router;
