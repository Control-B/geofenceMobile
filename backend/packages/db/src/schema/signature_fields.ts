import { integer, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { documentsTable } from "./documents";

export const sigFieldTypeEnum = pgEnum("sig_field_type", ["signature", "initials", "name"]);

export const signerRoleEnum = pgEnum("signer_role", ["Driver", "Warehouse Clerk", "Dispatcher", "Receiver"]);

export const signatureFieldsTable = pgTable("signature_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documentsTable.id),
  fieldType: sigFieldTypeEnum("field_type").notNull().default("signature"),
  assignedRole: signerRoleEnum("assigned_role"),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  width: real("width").notNull().default(200),
  height: real("height").notNull().default(60),
  page: integer("page").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSignatureFieldSchema = createInsertSchema(signatureFieldsTable).omit({ id: true, createdAt: true });
export type InsertSignatureField = z.infer<typeof insertSignatureFieldSchema>;
export type SignatureField = typeof signatureFieldsTable.$inferSelect;
