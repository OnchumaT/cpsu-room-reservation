// ApiClient — the only place in the frontend that knows how to reach the
// backend (base URL, JWT header, JSON (de)serialization, error shape).
// Every Api*Repository is built on top of this.

const BASE_URL = 'http://localhost:4000/api';
const TOKEN_KEY = 'cpsu_token';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class ApiClient {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  async request(method, path, { body, query } = {}) {
    const url = new URL(`${BASE_URL}${path}`);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      });
    }

    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await res.json() : null;

    if (!res.ok) {
      const message = payload?.error?.message || `Request failed: ${res.status}`;
      throw new ApiError(res.status, message, payload?.error?.details);
    }
    return payload;
  }

  get(path, query) { return this.request('GET', path, { query }); }
  post(path, body) { return this.request('POST', path, { body }); }
  patch(path, body) { return this.request('PATCH', path, { body }); }
  delete(path) { return this.request('DELETE', path); }
}

export const apiClient = new ApiClient();
