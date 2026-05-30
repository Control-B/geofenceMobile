import { apiFetch } from "./apiClient";

export interface ApiDocument {
  id: string;
  loadId: string;
  type: string;
  name: string;
  status: string;
  blobUrl?: string;
  fileName?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  requiresDriverSig: boolean;
  requiresClerkSig: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** Fetch all documents for a load */
export async function getDocuments(loadId: string): Promise<ApiDocument[]> {
  return apiFetch<ApiDocument[]>(`/documents/${loadId}`);
}

/** Clerk countersigns a document */
export async function clerkSign(
  documentId: string,
  payload: {
    signatureData: string;
    signatureType: "drawn" | "typed";
    fieldType: "signature" | "initials" | "name";
    loadNumber?: string;
    facility?: string;
  },
): Promise<void> {
  await apiFetch(`/documents/${documentId}/sign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Request a document from driver (creates a placeholder) */
export async function requestDocument(
  loadId: string,
  docType: string,
): Promise<ApiDocument> {
  return apiFetch<ApiDocument>("/documents/request", {
    method: "POST",
    body: JSON.stringify({ loadId, type: docType }),
  });
}
