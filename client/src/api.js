// small wrapper around fetch so every call adds the login token
export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token) {
      // token expired or invalid: send the user back to login
      localStorage.removeItem('token');
      localStorage.removeItem('shopName');
      window.location.reload();
    }
    throw new Error(data.message || 'Request failed');
  }
  return data;
}
