import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { loadsTable } from "./loads";
import { usersTable } from "./users";

export const dockAssignmentsTable = pgTable("dock_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").notNull().references(() => loadsTable.id),
  dockName: text("dock_name").notNull(),
  assignedBy: uuid("assigned_by").references(() => usersTable.id),
  assignedByName: text("assigned_by_name"),
  notes: text("notes"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const insertDockAssignmentSchema = createInsertSchema(dockAssignmentsTable).omit({ id: true, assignedAt: true });
export type InsertDockAssignment = z.infer<typeof insertDockAssignmentSchema>;
export type DockAssignment = typeof dockAssignmentsTable.$inferSelect;
