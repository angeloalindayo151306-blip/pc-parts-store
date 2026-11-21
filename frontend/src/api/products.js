const BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function get(path, signal) {
  let res;
  try {
    res = await fetch(BASE + path, { signal });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    const err = new Error('Cannot reach the server. Please try again.');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  const json = await res.json().catch(() => null);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!res.ok || !json || json.success === false) {
    const err = new Error(json?.error?.message || 'Request failed');
    err.code = json?.error?.code || 'ERROR';
    err.status = res.status;
    throw err;
  }
  return json; // { success, data, meta }
}

export async function fetchProducts(params, signal) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined && v !== false) qs.set(k, String(v));
  });
  const json = await get('/products?' + qs.toString(), signal);
  const items = Array.isArray(json.data) ? json.data : json.data.items;
  return { items, meta: json.meta };
}

export async function fetchProduct(id, signal) {
  const json = await get('/products/' + encodeURIComponent(id), signal);
  return json.data;
}

export async function fetchCategories(signal) {
  const json = await get('/categories', signal);
  return json.data;
}