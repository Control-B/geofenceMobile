import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { documentsTable } from "./documents";
import { signatureFieldsTable } from "./signature_fields";
import { usersTable } from "./users";

export const signaturesTable = pgTable("signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documentsTable.id),
  fieldId: uuid("field_id").references(() => signatureFieldsTable.id),
  signerId: uuid("signer_id").references(() => usersTable.id),
  signerName: text("signer_name").notNull(),
  signerRole: text("signer_role").notNull(),
  signatureData: text("signature_data").notNull(),
  signatureType: text("signature_type", { enum: ["drawn", "typed"] }).notNull(),
  fieldType: text("field_type").notNull().default("signature"),
  loadNumber: text("load_number"),
  facility: text("facility"),
  blobUrl: text("blob_url"),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSignatureSchema = createInsertSchema(signaturesTable).omit({ id: true, createdAt: true });
export type InsertSignature = z.infer<typeof insertSignatureSchema>;
export type Signature = typeof signaturesTable.$inferSelect;
