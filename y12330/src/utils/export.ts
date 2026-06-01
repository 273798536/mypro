import type { ClusterResult, TraceChain } from '@/types'

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const val = row[header]
        const str = String(val ?? '')
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ),
  ]
  const csvString = csvRows.join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToJSON(data: any, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function formatCommunityResults(clusterResult: ClusterResult): any[] {
  const rows: any[] = []
  for (const community of clusterResult.communities) {
    for (const nodeId of community.nodes) {
      const anomalyInfo = community.anomalies
        .filter(a => a.nodeId === nodeId)
        .map(a => `${a.type}: ${a.description}`)
        .join('; ')
      rows.push({
        communityId: community.id,
        nodeId,
        modularity: community.modularity,
        density: community.density,
        score: community.score,
        anomalies: anomalyInfo || '',
      })
    }
  }
  return rows
}

export function formatTraceResults(traceChains: TraceChain[]): any[] {
  return traceChains.map(chain => ({
    resultId: chain.resultId,
    communityId: chain.communityId,
    params: `k=${chain.clusterParams.k}, threshold=${chain.clusterParams.similarityThreshold}, decay=${chain.clusterParams.weightDecay}`,
    dataSources: chain.dataSourceMetas.map(m => m.fileName).join('; '),
    qualityIssues: chain.qualityRecords.map(r => `${r.type}(${r.nodeId})`).join('; '),
  }))
}
