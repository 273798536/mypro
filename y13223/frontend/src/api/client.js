const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `请求失败 (${res.status})`)
  }
  if (res.headers.get('Content-Type')?.includes('json')) {
    return res.json()
  }
  return res
}

export const api = {
  list: (onlyAnomaly) => request(`/tracks${onlyAnomaly ? '?only_anomaly=true' : ''}`),
  get: (id) => request(`/tracks/${id}`),
  create: (data, { operator, source_ref } = {}) => {
    const qs = new URLSearchParams()
    if (operator) qs.set('operator', operator)
    if (source_ref) qs.set('source_ref', source_ref)
    return request(`/tracks${qs.toString() ? '?' + qs : ''}`, { method: 'POST', body: data })
  },
  update: (id, data) => request(`/tracks/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => request(`/tracks/${id}`, { method: 'DELETE' }),
  verify: (id, data) => request(`/tracks/${id}/verify`, { method: 'POST', body: data }),
  logs: (id) => request(`/tracks/${id}/logs`),
  exportUrl: (onlyAnomaly) =>
    BASE + `/export${onlyAnomaly ? '?only_anomaly=true' : ''}`,
}
