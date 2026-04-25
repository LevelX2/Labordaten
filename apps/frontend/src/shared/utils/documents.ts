export function getDocumentContentUrl(documentId: string, options?: { download?: boolean }): string {
  const params = new URLSearchParams();
  if (options?.download) {
    params.set("download", "true");
  }

  const query = params.toString();
  return `/api/dokumente/${encodeURIComponent(documentId)}/inhalt${query ? `?${query}` : ""}`;
}
