import { eq } from "drizzle-orm";
import { Router } from "express";
import {
  auditTrailsTable, documentsTable,
  signatureFieldsTable, signaturesTable, db,
} from "@workspace/db";
import { uploadFile } from "../lib/azure-blob.js";
import { broadcast } from "../lib/signalr.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** POST /api/documents/:documentId/signature-fields */
router.post("/documents/:documentId/signature-fields", requireAuth, async (req, res) => {
  const { fieldType = "signature", assignedRole, x = 0, y = 0, width = 200, height = 60, page = 1 } = req.body;
  try {
    const [field] = await db.insert(signatureFieldsTable).values({
      documentId: req.params.documentId,
      fieldType, assignedRole, x, y, width, height, page,
    }).returning();
    res.status(201).json(field);
  } catch {
    res.status(500).json({ error: "Failed to create signature field" });
  }
});

/** POST /api/documents/:documentId/sign */
router.post("/documents/:documentId/sign", requireAuth, async (req, res) => {
  const {
    signatureData, signatureType = "drawn", fieldType = "signature",
    fieldId, loadNumber, facility,
  } = req.body as {
    signatureData: string; signatureType?: "drawn" | "typed";
    fieldType?: string; fieldId?: string; loadNumber?: string; facility?: string;
  };

  if (!signatureData) {
    res.status(400).json({ error: "signatureData is required" });
    return;
  }

  const documentId = req.params.documentId;

  try {
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, documentId)).limit(1);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    if (doc.status === "fully_signed" || doc.status === "completed") {
      res.status(409).json({ error: "Document is already fully signed" });
      return;
    }

    // Optionally save signature image to blob storage
    let blobUrl: string | undefined;
    if (signatureData.startsWith("data:image/")) {
      const base64 = signatureData.split(",")[1];
      const buffer = Buffer.from(base64, "base64");
      const result = await uploadFile(buffer, `sig-${documentId}-${Date.now()}.png`, "AZURE_STORAGE_CONTAINER_DOCUMENTS", "image/png");
      blobUrl = result.url;
    }

    const [sig] = await db.insert(signaturesTable).values({
      documentId,
      fieldId: fieldId ?? null,
      signerId: res.locals.userId,
      signerName: res.locals.name,
      signerRole: res.locals.role,
      signatureData,
      signatureType,
      fieldType,
      loadNumber: loadNumber ?? null,
      facility: facility ?? null,
      blobUrl: blobUrl ?? null,
      deviceInfo: req.headers["user-agent"] ?? null,
    }).returning();

    // Determine new document status
    const role = res.locals.role;
    let newStatus: typeof doc.status = doc.status;
    if (doc.requiresDriverSig && (role === "driver") && doc.status === "needs_driver_sig") {
      newStatus = doc.requiresClerkSig ? "needs_clerk_sig" : "fully_signed";
    } else if (doc.requiresClerkSig && (role === "warehouse_clerk") && doc.status === "needs_clerk_sig") {
      newStatus = "fully_signed";
    }

    await db.update(documentsTable)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(documentsTable.id, documentId));

    await db.insert(auditTrailsTable).values({
      documentId,
      loadId: doc.loadId,
      action: "DOCUMENT_SIGNED",
      actorId: res.locals.userId,
      actorName: res.locals.name,
      actorRole: res.locals.role,
      metadata: JSON.stringify({ signatureType, fieldType, newStatus }),
    });

    const eventName = role === "driver" ? "driver_signed" : "clerk_signed";
    broadcast(eventName, { documentId, loadId: doc.loadId, status: newStatus }).catch(() => {});

    res.status(201).json({ signature: sig, documentStatus: newStatus });
  } catch {
    res.status(500).json({ error: "Signing failed" });
  }
});

/** GET /api/documents/:documentId/audit-trail */
router.get("/documents/:documentId/audit-trail", requireAuth, async (req, res) => {
  try {
    const trail = await db
      .select()
      .from(auditTrailsTable)
      .where(eq(auditTrailsTable.documentId, req.params.documentId));
    res.json(trail);
  } catch {
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
});

export default router;
