import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { db, facilitiesTable, loadsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/trips/current — returns the active load for the authenticated driver */
router.get("/trips/current", requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const [load] = await db
      .select()
      .from(loadsTable)
      .where(and(eq(loadsTable.driverUserId, userId)))
      .orderBy(desc(loadsTable.createdAt))
      .limit(1);

    if (!load) {
      res.status(404).json({ error: "No active trip found" });
      return;
    }

    // Enrich with facility names
    const [pickup] = load.pickupFacilityId
      ? await db.select().from(facilitiesTable).where(eq(facilitiesTable.id, load.pickupFacilityId)).limit(1)
      : [null];
    const [delivery] = load.deliveryFacilityId
      ? await db.select().from(facilitiesTable).where(eq(facilitiesTable.id, load.deliveryFacilityId)).limit(1)
      : [null];

    res.json({
      ...load,
      pickupFacility: pickup?.name ?? load.pickupFacilityId,
      pickupAddress: pickup?.address,
      deliveryFacility: delivery?.name ?? load.deliveryFacilityId,
      deliveryAddress: delivery?.address,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch current trip" });
  }
});

/** GET /api/trips — returns all loads for the current user */
router.get("/trips", requireAuth, async (req, res) => {
  try {
    const loads = await db
      .select()
      .from(loadsTable)
      .where(eq(loadsTable.driverUserId, res.locals.userId))
      .orderBy(desc(loadsTable.createdAt));
    res.json(loads);
  } catch {
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

/** POST /api/trips — create a new load/trip */
router.post("/trips", requireAuth, async (req, res) => {
  const {
    carrier, loadNumber, referenceNumber, poNumber,
    truckNumber, trailerNumber, driverPhone,
    pickupFacilityId, deliveryFacilityId,
    appointmentTime, eta, distance,
  } = req.body;

  if (!carrier || !loadNumber) {
    res.status(400).json({ error: "carrier and loadNumber are required" });
    return;
  }

  try {
    const [load] = await db.insert(loadsTable).values({
      carrier, loadNumber, referenceNumber, poNumber,
      truckNumber, trailerNumber, driverPhone,
      driverUserId: res.locals.userId,
      driverName: res.locals.name,
      pickupFacilityId, deliveryFacilityId,
      appointmentTime: appointmentTime ? new Date(appointmentTime) : undefined,
      eta, distance, status: "en_route",
    }).returning();
    res.status(201).json(load);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Load number already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create trip" });
  }
});

export default router;
