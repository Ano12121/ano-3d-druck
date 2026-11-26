const API_BASE = '/api';
const TOKEN_KEY = 'ano_admin_token';
const GEMINI_LOCAL_KEY = 'ano_gemini_api_key';

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('layerlab_admin_token') || '';
}

export function setAdminToken(token) {
  localStorage.removeItem('layerlab_admin_token');
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getSavedBrowserGeminiKey() {
  return localStorage.getItem(GEMINI_LOCAL_KEY) || '';
}

function authHeaders(extra = {}) {
  const token = getAdminToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      setAdminToken('');
    }
    throw new Error(data.error || `Request fehlgeschlagen (${res.status})`);
  }
  return data;
}

export async function fetchBootstrap() {
  const res = await fetch(`${API_BASE}/bootstrap?_t=${Date.now()}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return handleResponse(res);
}

export async function fetchAdminDashboard() {
  const res = await fetch(`${API_BASE}/admin/dashboard?_t=${Date.now()}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return handleResponse(res);
}

export async function adminLogin(pin) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await handleResponse(res);
  if (data.token) setAdminToken(data.token);
  return data;
}

export async function adminLogout() {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: authHeaders(),
  }).catch(() => {});
  setAdminToken('');
}

export async function changeAdminPin(currentPin, newPin) {
  const res = await fetch(`${API_BASE}/auth/change-pin`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ currentPin, newPin }),
  });
  const data = await handleResponse(res);
  if (data.token) setAdminToken(data.token);
  return data;
}

export async function createProduct(formData) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export async function updateProduct(id, formData) {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export async function deleteProduct(id) {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function likeProduct(id) {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}/like`, {
    method: 'POST',
  });
  return handleResponse(res);
}

export async function createOrder(payload) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function lookupOrder(orderId) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}?_t=${Date.now()}`, {
    cache: 'no-store',
  });
  return handleResponse(res);
}

export async function updateOrderStatus(orderId, payload) {
  const body = typeof payload === 'string' ? { status: payload } : payload;
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function deleteOrder(orderId) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function createInquiry(formData) {
  const res = await fetch(`${API_BASE}/inquiries`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

export async function updateInquiryStatus(id, status) {
  const res = await fetch(`${API_BASE}/inquiries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function deleteInquiry(id) {
  const res = await fetch(`${API_BASE}/inquiries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function updateStudioSettings(payload) {
  const res = await fetch(`${API_BASE}/studio`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function saveGeminiApiKey(apiKey) {
  const clean = String(apiKey || '').trim();
  if (clean) {
    localStorage.setItem(GEMINI_LOCAL_KEY, clean);
  } else {
    localStorage.removeItem(GEMINI_LOCAL_KEY);
  }
  const res = await fetch(`${API_BASE}/studio/photo-key`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ apiKey: clean }),
  });
  return handleResponse(res);
}

export async function transformStudioPhoto(formData) {
  const browserKey = getSavedBrowserGeminiKey();
  const extra = browserKey ? { 'X-Gemini-Key': browserKey } : {};
  const res = await fetch(`${API_BASE}/studio/photo-transform`, {
    method: 'POST',
    headers: authHeaders(extra),
    body: formData,
  });
  return handleResponse(res);
}

export async function saveLocalStudioPhoto(formData) {
  const res = await fetch(`${API_BASE}/studio/photo-save-local`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export async function deleteStudioPhoto(id) {
  const res = await fetch(`${API_BASE}/studio/photos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}
