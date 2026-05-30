/**
 * Seed script — populates the database with a sample company, facility, and
 * one active load so you can test all features locally without manual data entry.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dockflow \
 *     pnpm --filter @workspace/scripts tsx src/seed.ts
 */

import { db } from "@workspace/db";
import {
  companiesTable,
  usersTable,
  facilitiesTable,
  loadsTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  // ── Company ────────────────────────────────────────────────────────────────
  const [company] = await db
    .insert(companiesTable)
    .values({ name: "DockFlow Demo Co." })
    .onConflictDoNothing()
    .returning();

  const companyId = company?.id ?? (
    await db.execute<{ id: string }>(sql`SELECT id FROM companies WHERE name = 'DockFlow Demo Co.' LIMIT 1`)
  ).rows[0].id;

  console.log("  ✓ company:", companyId);

  // ── Facility ───────────────────────────────────────────────────────────────
  const [facility] = await db
    .insert(facilitiesTable)
    .values({
      companyId,
      name: "Chicago Distribution Center",
      address: "1234 Warehouse Blvd, Chicago, IL 60601",
      lat: 41.8827,
      lng: -87.6233,
      geofenceRadiusMeters: 300,
    })
    .onConflictDoNothing()
    .returning();

  const facilityId = facility?.id ?? (
    await db.execute<{ id: string }>(sql`SELECT id FROM facilities WHERE name = 'Chicago Distribution Center' LIMIT 1`)
  ).rows[0].id;

  console.log("  ✓ facility:", facilityId);

  // ── Users ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 10);

  await db
    .insert(usersTable)
    .values([
      {
        name: "Admin User",
        email: "admin@dockflow.demo",
        passwordHash,
        role: "admin",
        companyId,
      },
      {
        name: "Warehouse Clerk",
        email: "clerk@dockflow.demo",
        passwordHash,
        role: "warehouse_clerk",
        companyId,
      },
      {
        name: "Sarah Chen",
        email: "driver@dockflow.demo",
        passwordHash,
        role: "driver",
        phone: "(312) 555-0192",
        companyId,
      },
    ])
    .onConflictDoNothing();

  console.log("  ✓ users seeded (admin / clerk / driver)");
  console.log("    credentials: <email> / password123");

  // ── Active Load ────────────────────────────────────────────────────────────
  const appointmentTime = new Date();
  appointmentTime.setHours(10, 0, 0, 0);

  await db
    .insert(loadsTable)
    .values({
      loadNumber: "LD-771204",
      referenceNumber: "REF-334512",
      carrier: "FastFreight LLC",
      truckNumber: "IL-2934",
      trailerNumber: "T-4521",
      driverName: "Sarah Chen",
      driverPhone: "(312) 555-0192",
      deliveryFacilityId: facilityId,
      appointmentTime,
      status: "en_route",
      instructions: "Refrigerated — Dock 14 only. Use north entrance.",
    })
    .onConflictDoNothing();

  console.log("  ✓ sample load: LD-771204");
  console.log("✅ Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
