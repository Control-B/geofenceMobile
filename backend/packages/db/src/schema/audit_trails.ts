import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { documentsTable } from "./documents";
import { loadsTable } from "./loads";
import { usersTable } from "./users";

export const auditTrailsTable = pgTable("audit_trails", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loadsTable.id),
  documentId: uuid("document_id").references(() => documentsTable.id),
  action: text("action").notNull(),
  actorId: uuid("actor_id").references(() => usersTable.id),
  actorName: text("actor_name"),
  actorRole: text("actor_role"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditTrailSchema = createInsertSchema(auditTrailsTable).omit({ id: true, createdAt: true });
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;
export type AuditTrail = typeof auditTrailsTable.$inferSelect;
