function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function extractErrorMessage(response: Response): Promise<string> {
  let message = `Anfrage fehlgeschlagen: ${response.status}`;

  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      message = payload.detail;
    }
  } catch {
    // no-op
  }

  return message;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: buildHeaders(init)
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function apiFetchBlob(
  path: string,
  init?: RequestInit
): Promise<{ blob: Blob; filename?: string | null }> {
  const response = await fetch(path, {
    ...init,
    headers: buildHeaders(init)
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);

  return {
    blob: await response.blob(),
    filename: filenameMatch?.[1] ?? null
  };
}
