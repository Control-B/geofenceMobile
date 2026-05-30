import { apiFetch } from "./apiClient";
import type { ApiSignatureField, ApiSignature } from "./documentService";

export interface SignPayload {
  signatureData: string;
  signatureType: "drawn" | "typed";
  fieldType?: string;
  fieldId?: string;
  loadNumber?: string;
  facility?: string;
}

export interface SignResponse {
  signature: ApiSignature;
  documentStatus: string;
}

export async function signDocument(documentId: string, payload: SignPayload): Promise<SignResponse> {
  return apiFetch(`/api/documents/${documentId}/sign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addSignatureField(documentId: string, field: Partial<ApiSignatureField>): Promise<ApiSignatureField> {
  return apiFetch(`/api/documents/${documentId}/signature-fields`, {
    method: "POST",
    body: JSON.stringify(field),
  });
}

export interface AuditEntry {
  id: string;
  documentId?: string;
  loadId?: string;
  action: string;
  actorName?: string;
  actorRole?: string;
  metadata?: string;
  createdAt: string;
}

export async function getAuditTrail(documentId: string): Promise<AuditEntry[]> {
  return apiFetch(`/api/documents/${documentId}/audit-trail`);
}
