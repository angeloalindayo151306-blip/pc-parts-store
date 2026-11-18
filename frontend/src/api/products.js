const BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function get(path) {
  let res;
  try {
    res = await fetch(BASE + path);
  } catch {
    const err = new Error('Cannot reach the server. Please try again.');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success === false) {
    const err = new Error(json?.error?.message || 'Request failed');
    err.code = json?.error?.code || 'ERROR';
    err.status = res.status;
    throw err;
  }
  return json; // { success, data, meta }
}

export async function fetchProducts(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined && v !== false) qs.set(k, String(v));
  });
  const json = await get('/products?' + qs.toString());
  const items = Array.isArray(json.data) ? json.data : json.data.items;
  return { items, meta: json.meta };
}

export async function fetchProduct(id) {
  const json = await get('/products/' + encodeURIComponent(id));
  return json.data;
}

export async function fetchCategories() {
  const json = await get('/categories');
  return json.data;
}