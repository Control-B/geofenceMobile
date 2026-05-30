import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

const LOCAL_UPLOAD_DIR = path.resolve("./uploads");

// ─── Azure Blob Storage ──────────────────────────────────────────────────────

function getBlobClient(): BlobServiceClient | null {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) return null;
  try {
    return BlobServiceClient.fromConnectionString(connStr);
  } catch {
    return null;
  }
}

// ─── Local file fallback ─────────────────────────────────────────────────────

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  containerEnvKey: string = "AZURE_STORAGE_CONTAINER_DOCUMENTS",
  mimeType: string = "application/octet-stream",
): Promise<{ url: string; isLocal: boolean }> {
  const client = getBlobClient();
  const container = process.env[containerEnvKey] ?? "documents";

  if (client) {
    try {
      const containerClient = client.getContainerClient(container);
      await containerClient.createIfNotExists({ access: "blob" });
      const blobName = `${Date.now()}-${fileName}`;
      const blockClient = containerClient.getBlockBlobClient(blobName);
      await blockClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: mimeType },
      });
      return { url: blockClient.url, isLocal: false };
    } catch (err) {
      logger.warn({ err }, "Azure Blob upload failed, falling back to local");
    }
  }

  // Local fallback
  ensureLocalDir();
  const localName = `${Date.now()}-${fileName}`;
  const localPath = path.join(LOCAL_UPLOAD_DIR, localName);
  fs.writeFileSync(localPath, buffer);
  logger.info({ localPath }, "File saved locally (Azure Blob not configured)");
  return { url: `/uploads/${localName}`, isLocal: true };
}

export async function deleteFile(blobUrl: string): Promise<void> {
  if (blobUrl.startsWith("/uploads/")) {
    const localPath = path.join(LOCAL_UPLOAD_DIR, path.basename(blobUrl));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    return;
  }

  const client = getBlobClient();
  if (!client) return;

  try {
    const container = process.env.AZURE_STORAGE_CONTAINER_DOCUMENTS ?? "documents";
    const blobName = blobUrl.split("/").pop()!;
    const containerClient = client.getContainerClient(container);
    await containerClient.getBlockBlobClient(blobName).deleteIfExists();
  } catch (err) {
    logger.warn({ err }, "Failed to delete blob");
  }
}

export function getLocalFilePath(url: string): string | null {
  if (url.startsWith("/uploads/")) {
    return path.join(LOCAL_UPLOAD_DIR, path.basename(url));
  }
  return null;
}
