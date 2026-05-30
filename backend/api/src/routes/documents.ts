import { eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  auditTrailsTable, documentsTable, loadsTable,
  signaturesTable, signatureFieldsTable, db,
} from "@workspace/db";
import { uploadFile, getLocalFilePath } from "../lib/azure-blob.js";
import { broadcast } from "../lib/signalr.js";
import { teamsDocumentUploaded } from "../lib/teams.js";
import { requireAuth } from "../middleware/auth.js";
import fs from "fs";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/** GET /api/documents/:loadId */
router.get("/documents/:loadId", requireAuth, async (req, res) => {
  try {
    const docs = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.loadId, req.params.loadId));

    // Attach signatures for each doc
    const enriched = await Promise.all(docs.map(async (doc) => {
      const sigs = await db.select().from(signaturesTable).where(eq(signaturesTable.documentId, doc.id));
      const fields = await db.select().from(signatureFieldsTable).where(eq(signatureFieldsTable.documentId, doc.id));
      return { ...doc, signatures: sigs, signatureFields: fields };
    }));

    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/** POST /api/documents/upload */
router.post("/documents/upload", requireAuth, upload.single("file"), async (req, res) => {
  const { loadId, type = "custom", name, requiresDriverSig, requiresClerkSig } = req.body as {
    loadId: string; type?: string; name?: string;
    requiresDriverSig?: string; requiresClerkSig?: string;
  };

  if (!loadId) {
    res.status(400).json({ error: "loadId is required" });
    return;
  }

  try {
    let blobUrl: string | undefined;
    let fileName: string | undefined;

    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const result = await uploadFile(req.file.buffer, `${loadId}-${Date.now()}${ext}`, "AZURE_STORAGE_CONTAINER_DOCUMENTS", req.file.mimetype);
      blobUrl = result.url;
      fileName = req.file.originalname;
    }

    const needsDriver = requiresDriverSig === "true";
    const needsClerk = requiresClerkSig === "true";
    const docName = name ?? fileName ?? "Document";
    const status = needsDriver ? "needs_driver_sig" : needsClerk ? "needs_clerk_sig" : "uploaded";

    const [doc] = await db.insert(documentsTable).values({
      loadId,
      type: type as any,
      name: docName,
      status: status as any,
      blobUrl,
      fileName,
      uploadedBy: res.locals.userId,
      uploadedByName: res.locals.name,
      requiresDriverSig: needsDriver,
      requiresClerkSig: needsClerk,
    }).returning();

    await db.insert(auditTrailsTable).values({
      loadId,
      documentId: doc.id,
      action: "DOCUMENT_UPLOADED",
      actorId: res.locals.userId,
      actorName: res.locals.name,
      actorRole: res.locals.role,
      metadata: JSON.stringify({ fileName, type }),
    });

    broadcast("document_uploaded", { loadId, documentId: doc.id, name: docName }).catch(() => {});
    teamsDocumentUploaded(loadId, docName, needsClerk).catch(() => {});

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: "Document upload failed" });
  }
});

/** GET /api/documents/file/:documentId — serve or redirect to the file */
router.get("/documents/file/:documentId", requireAuth, async (req, res) => {
  try {
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, req.params.documentId)).limit(1);
    if (!doc || !doc.blobUrl) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Local file — stream it
    const localPath = getLocalFilePath(doc.blobUrl);
    if (localPath && fs.existsSync(localPath)) {
      res.setHeader("Content-Disposition", `inline; filename="${doc.fileName ?? "document"}"`);
      fs.createReadStream(localPath).pipe(res);
      return;
    }

    // Azure Blob — redirect
    res.redirect(doc.blobUrl);
  } catch {
    res.status(500).json({ error: "Failed to retrieve file" });
  }
});

export default router;
