// In production, VITE_API_URL points to Render. In development, the Vite proxy is used.
const BASE = import.meta.env.VITE_API_URL || '/api/v1';

function abortError() {
  return new DOMException('Aborted', 'AbortError');
}

export async function api(path, { method = 'GET', body, token, headers = {}, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    // A cancelled request is not a network error: let the caller ignore it.
    if (e?.name === 'AbortError') throw e;
    const err = new Error('Cannot reach the server');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  const json = await res.json().catch(() => null);
  if (signal?.aborted) throw abortError();
  if (!res.ok || !json?.success) {
    const err = new Error(json?.error?.message || 'Request failed');
    err.code = json?.error?.code || 'UNKNOWN';
    err.status = res.status;
    err.details = json?.error?.details;
    throw err;
  }
  return json.data;
}