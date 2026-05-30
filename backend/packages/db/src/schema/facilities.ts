import { doublePrecision, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";

export const facilitiesTable = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companiesTable.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  geofenceRadiusMeters: integer("geofence_radius_meters").notNull().default(300),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFacilitySchema = createInsertSchema(facilitiesTable).omit({ id: true, createdAt: true });
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type Facility = typeof facilitiesTable.$inferSelect;
