const BASE_URL = '/api'

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  if (!res.ok) throw new Error(`请求失败: ${res.status}`)
  return res.json()
}

export const api = {
  getStages: () => request('/stages'),
  
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/records${query ? `?${query}` : ''}`)
  },

  getRecord: (id) => request(`/records/${id}`),
  
  updateRecord: (id, data) => request(`/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  reviewRecord: (id, data) => request(`/records/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  batchReview: (data) => request('/records/batch-review', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getStatistics: () => request('/statistics'),

  getTrace: (id) => request(`/records/${id}/trace`),

  getBatches: () => request('/import/batches'),

  checkDuplicates: (records) => request('/import/check-duplicates', {
    method: 'POST',
    body: JSON.stringify({ records })
  }),

  executeImport: (data) => request('/import/execute', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  resetData: () => request('/test/reset-data', {
    method: 'POST'
  })
}
