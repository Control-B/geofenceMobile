import { boolean, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { loadsTable } from "./loads";
import { usersTable } from "./users";

export const docTypeEnum = pgEnum("doc_type", [
  "BOL", "POD", "rate_confirmation", "appointment_confirmation", "lumper_receipt", "custom",
]);

export const docStatusEnum = pgEnum("doc_status", [
  "uploaded", "needs_driver_sig", "needs_clerk_sig", "fully_signed", "rejected", "completed",
]);

export const documentsTable = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").notNull().references(() => loadsTable.id),
  type: docTypeEnum("type").notNull(),
  name: text("name").notNull(),
  status: docStatusEnum("status").notNull().default("uploaded"),
  blobUrl: text("blob_url"),
  fileName: text("file_name"),
  uploadedBy: uuid("uploaded_by").references(() => usersTable.id),
  uploadedByName: text("uploaded_by_name"),
  requiresDriverSig: boolean("requires_driver_sig").notNull().default(false),
  requiresClerkSig: boolean("requires_clerk_sig").notNull().default(false),
  documentHash: text("document_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
