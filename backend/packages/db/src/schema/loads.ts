import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { facilitiesTable } from "./facilities";
import { usersTable } from "./users";

export const driverStatusEnum = pgEnum("driver_status", [
  "en_route", "arrived", "checked_in", "waiting",
  "dock_assigned", "at_dock", "loading", "unloading", "completed", "departed",
]);

export const loadsTable = pgTable("loads", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadNumber: text("load_number").notNull().unique(),
  referenceNumber: text("reference_number"),
  poNumber: text("po_number"),
  carrier: text("carrier").notNull(),
  truckNumber: text("truck_number"),
  trailerNumber: text("trailer_number"),
  driverPhone: text("driver_phone"),
  driverName: text("driver_name"),
  driverUserId: uuid("driver_user_id").references(() => usersTable.id),
  pickupFacilityId: uuid("pickup_facility_id").references(() => facilitiesTable.id),
  deliveryFacilityId: uuid("delivery_facility_id").references(() => facilitiesTable.id),
  appointmentTime: timestamp("appointment_time"),
  status: driverStatusEnum("status").notNull().default("en_route"),
  dockAssignment: text("dock_assignment"),
  queuePosition: integer("queue_position"),
  instructions: text("instructions"),
  eta: text("eta"),
  distance: text("distance"),
  arrivedTime: timestamp("arrived_time"),
  checkInTime: timestamp("checkin_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLoadSchema = createInsertSchema(loadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLoad = z.infer<typeof insertLoadSchema>;
export type Load = typeof loadsTable.$inferSelect;
