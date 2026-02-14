const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('branch');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export const authApi = {
  login: (code) => request('/auth/login', { method: 'POST', body: JSON.stringify({ code }) }),
  getBranches: () => request('/auth/branches'),
};

// Processes
export const processApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/processes?${qs}`);
  },
  getById: (id) => request(`/processes/${id}`, {}),
  getCategories: () => request('/processes/categories'),
  triggerSync: () => request('/sync', { method: 'POST' }),
};

// Chat - returns EventSource-like interface
export function sendChatMessage(message, sessionId) {
  return fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ message, sessionId }),
  });
}

export const chatApi = {
  getSessions: () => request('/chat/sessions'),
  getMessages: (sessionId) => request(`/chat/sessions/${sessionId}/messages`),
};
