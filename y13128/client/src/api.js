const API = "/api";

async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const parts = [];
    if (body.error) parts.push(body.error);
    if (Array.isArray(body.details)) parts.push(...body.details);
    else if (body.details) parts.push(body.details);
    if (body.hint) parts.push(`提示：${body.hint}`);
    throw new Error(parts.length > 0 ? parts.join("\n") : (res.statusText || "请求失败"));
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
