import { apiFetch, apiUpload } from "./apiClient";

export interface ApiDocument {
  id: string;
  loadId: string;
  type: string;
  name: string;
  status: string;
  blobUrl?: string;
  fileName?: string;
  uploadedByName?: string;
  requiresDriverSig: boolean;
  requiresClerkSig: boolean;
  signatures: ApiSignature[];
  signatureFields: ApiSignatureField[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiSignature {
  id: string;
  documentId: string;
  signerName: string;
  signerRole: string;
  signatureData: string;
  signatureType: string;
  fieldType: string;
  createdAt: string;
}

export interface ApiSignatureField {
  id: string;
  documentId: string;
  fieldType: string;
  assignedRole?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export async function getDocuments(loadId: string): Promise<ApiDocument[]> {
  return apiFetch(`/api/documents/${loadId}`);
}

export interface UploadDocumentOptions {
  loadId: string;
  type?: string;
  name?: string;
  requiresDriverSig?: boolean;
  requiresClerkSig?: boolean;
  fileUri?: string;
  fileName?: string;
  mimeType?: string;
  base64Data?: string;
}

export async function uploadDocument(opts: UploadDocumentOptions): Promise<ApiDocument> {
  const form = new FormData();
  form.append("loadId", opts.loadId);
  if (opts.type) form.append("type", opts.type);
  if (opts.name) form.append("name", opts.name);
  if (opts.requiresDriverSig) form.append("requiresDriverSig", "true");
  if (opts.requiresClerkSig) form.append("requiresClerkSig", "true");

  if (opts.base64Data && opts.fileName && opts.mimeType) {
    // React Native: attach as a blob-like object
    form.append("file", {
      uri: opts.fileUri ?? `data:${opts.mimeType};base64,${opts.base64Data}`,
      name: opts.fileName,
      type: opts.mimeType,
    } as any);
  }

  return apiUpload(`/api/documents/upload`, form);
}

export function getFileUrl(documentId: string, baseUrl: string): string {
  return `${baseUrl}/api/documents/file/${documentId}`;
}
