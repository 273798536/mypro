const API = "/api";

async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "请求失败");
  }
  return res.json();
}

export function getSessions() {
  return request("/sessions");
}

export function getSession(id) {
  return request(`/sessions/${id}`);
}

export function createSession(title) {
  return request("/sessions", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function deleteSession(id) {
  return request(`/sessions/${id}`, { method: "DELETE" });
}

export function importMaterial(sessionId, data) {
  return request(`/sessions/${sessionId}/materials`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function confirmJudgment(sessionId, operator, note) {
  return request(`/sessions/${sessionId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ operator, note }),
  });
}

export function getHistory(sessionId) {
  return request(`/sessions/${sessionId}/history`);
}

export function getReports(sessionId) {
  return request(`/sessions/${sessionId}/reports`);
}

export function getSummary(sessionId) {
  return request(`/sessions/${sessionId}/summary`);
}
