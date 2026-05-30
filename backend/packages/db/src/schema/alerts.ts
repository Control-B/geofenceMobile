import { boolean, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";
import { loadsTable } from "./loads";

export const alertTypeEnum = pgEnum("alert_type", [
  "dock_assigned", "loading_ready", "delay", "gate",
  "appointment", "departure", "arrival", "document",
]);

export const alertsTable = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loadsTable.id),
  companyId: uuid("company_id").references(() => companiesTable.id),
  type: alertTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
