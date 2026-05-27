import type { GuaranteeContract, CircularGuarantee } from '../types'

export function detectCircularGuarantees(contracts: GuaranteeContract[]): CircularGuarantee[] {
  const adjacency = new Map<string, Map<string, GuaranteeContract>>()
  for (const c of contracts) {
    if (!adjacency.has(c.guarantorId)) {
      adjacency.set(c.guarantorId, new Map())
    }
    adjacency.get(c.guarantorId)!.set(c.guaranteedId, c)
  }

  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const cycles: CircularGuarantee[] = []
  const seenCycleKeys = new Set<string>()

  function dfs(node: string, path: string[]): void {
    visited.add(node)
    recursionStack.add(node)
    path.push(node)

    const neighbors = adjacency.get(node)
    if (neighbors) {
      for (const [neighbor, contract] of neighbors) {
        if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor)
          if (cycleStart !== -1) {
            const cyclePath = [...path.slice(cycleStart), neighbor]
            const key = [...cyclePath].sort().join('-')
            if (!seenCycleKeys.has(key)) {
              seenCycleKeys.add(key)
              let totalAmount = 0
              for (let i = 0; i < cyclePath.length - 1; i++) {
                const edge = adjacency.get(cyclePath[i])?.get(cyclePath[i + 1])
                if (edge) totalAmount += edge.guaranteeAmount
              }
              cycles.push({
                id: `cg-${cycles.length + 1}`,
                path: cyclePath,
                totalAmount,
                enterprises: cyclePath.slice(0, -1),
              })
            }
          }
        } else if (!visited.has(neighbor)) {
          dfs(neighbor, path)
        }
      }
    }

    path.pop()
    recursionStack.delete(node)
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      dfs(node, [])
    }
  }

  return cycles
}
