import { boolean, doublePrecision, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { loadsTable } from "./loads";
import { usersTable } from "./users";

export const checkinSessionsTable = pgTable("checkin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").notNull().references(() => loadsTable.id),
  driverId: uuid("driver_id").references(() => usersTable.id),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  distanceMeters: doublePrecision("distance_meters"),
  isInsideGeofence: boolean("is_inside_geofence"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  notes: text("notes"),
  arrivedAt: timestamp("arrived_at").defaultNow(),
  checkedInAt: timestamp("checked_in_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCheckinSessionSchema = createInsertSchema(checkinSessionsTable).omit({ id: true, createdAt: true });
export type InsertCheckinSession = z.infer<typeof insertCheckinSessionSchema>;
export type CheckinSession = typeof checkinSessionsTable.$inferSelect;
