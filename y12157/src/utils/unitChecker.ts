import { parse } from 'mathjs'
import type { Variable, Formula, UnitCheckResult, ConflictEntry } from '@/store/useStore'
import { presetUnits } from './templates'

const unitDimensionMap: Record<string, string> = {}
for (const u of presetUnits) {
  unitDimensionMap[u.id] = u.dimension
}

function parseDim(dim: string): Map<string, number> {
  const map = new Map<string, number>()
  if (!dim || dim === 'dimensionless') return map
  const parts = dim.split('*')
  for (const part of parts) {
    const match = part.match(/^([A-Za-z]+)\^(-?\d+)$/)
    if (match) {
      map.set(match[1], (map.get(match[1]) ?? 0) + parseInt(match[2], 10))
    } else {
      map.set(part, (map.get(part) ?? 0) + 1)
    }
  }
  for (const [key, val] of map) {
    if (val === 0) map.delete(key)
  }
  return map
}

function dimToString(map: Map<string, number>): string {
  if (map.size === 0) return 'dimensionless'
  const parts: string[] = []
  for (const [base, exp] of map) {
    if (exp === 1) parts.push(base)
    else parts.push(`${base}^${exp}`)
  }
  return parts.join('*')
}

function multiplyDimensions(left: string, right: string): string {
  if (left === 'dimensionless') return right
  if (right === 'dimensionless') return left
  const leftMap = parseDim(left)
  const rightMap = parseDim(right)
  for (const [key, val] of rightMap) {
    leftMap.set(key, (leftMap.get(key) ?? 0) + val)
  }
  return dimToString(leftMap)
}

function divideDimensions(left: string, right: string): string {
  if (right === 'dimensionless') return left
  if (left === 'dimensionless') {
    const rightMap = parseDim(right)
    const inverted = new Map<string, number>()
    for (const [key, val] of rightMap) {
      inverted.set(key, -val)
    }
    return dimToString(inverted)
  }
  const leftMap = parseDim(left)
  const rightMap = parseDim(right)
  for (const [key, val] of rightMap) {
    leftMap.set(key, (leftMap.get(key) ?? 0) - val)
  }
  return dimToString(leftMap)
}

function powerDimension(dim: string, n: number): string {
  if (dim === 'dimensionless') return 'dimensionless'
  if (n === 0) return 'dimensionless'
  if (n === 1) return dim
  const map = parseDim(dim)
  for (const [key, val] of map) {
    map.set(key, val * n)
  }
  return dimToString(map)
}

function sqrtDimension(dim: string): string {
  if (dim === 'dimensionless') return 'dimensionless'
  const map = parseDim(dim)
  for (const [key, val] of map) {
    if (val % 2 !== 0) return 'dimensionless'
    map.set(key, val / 2)
  }
  return dimToString(map)
}

function collectSymbols(node: any): string[] {
  const symbols: string[] = []
  function walk(n: any) {
    if (!n) return
    if (n.type === 'SymbolNode') symbols.push(n.name)
    if (n.args) n.args.forEach(walk)
    if (n.content) walk(n.content)
  }
  walk(node)
  return symbols
}

export function simplifyDimension(dim: string): string {
  try {
    const map = parseDim(dim)
    return dimToString(map)
  } catch {
    return dim
  }
}

export function checkUnits(
  formula: Formula,
  variables: Variable[]
): UnitCheckResult {
  const conflicts: ConflictEntry[] = []

  const unitMap: Record<string, string> = {}
  for (const v of variables) {
    unitMap[v.symbol] = unitDimensionMap[v.unitId] ?? 'unknown'
  }

  let ast: any
  try {
    ast = parse(formula.expression)
  } catch {
    return { formulaId: formula.id, passed: false, conflicts }
  }

  function computeDimension(node: any): string {
    try {
      if (!node) return 'dimensionless'

      if (node.type === 'SymbolNode') {
        return unitMap[node.name] ?? 'unknown'
      }

      if (node.type === 'ConstantNode') {
        return 'dimensionless'
      }

      if (node.type === 'ParenthesisNode') {
        return computeDimension(node.content)
      }

      if (node.type === 'OperatorNode') {
        if (node.args.length === 1) {
          return computeDimension(node.args[0])
        }

        const leftDim = computeDimension(node.args[0])
        const rightDim = computeDimension(node.args[1])

        if (node.op === '+' || node.op === '-') {
          if (
            leftDim !== rightDim &&
            leftDim !== 'unknown' &&
            rightDim !== 'unknown'
          ) {
            const symbols = collectSymbols(node)
            const sourceVar = variables.find(v =>
              symbols.includes(v.symbol)
            )
            conflicts.push({
              id: Math.random().toString(36).slice(2, 10),
              nodeType: node.op === '+' ? 'add' : 'subtract',
              leftUnit: leftDim,
              rightUnit: rightDim,
              sourceVariableId: sourceVar?.id ?? '',
              sourceRow: -1,
              suggestion: `左操作数量纲为 ${leftDim}，右操作数量纲为 ${rightDim}，请检查变量单位是否一致`,
            })
          }
          return leftDim
        }

        if (node.op === '*') {
          return multiplyDimensions(leftDim, rightDim)
        }

        if (node.op === '/') {
          return divideDimensions(leftDim, rightDim)
        }

        if (node.op === '^') {
          const exponentNode = node.args[1]
          if (
            exponentNode.type === 'ConstantNode' &&
            Number.isInteger(exponentNode.value)
          ) {
            return powerDimension(leftDim, exponentNode.value)
          }
          if (
            exponentNode.type === 'ParenthesisNode' &&
            exponentNode.content?.type === 'ConstantNode' &&
            Number.isInteger(exponentNode.content.value)
          ) {
            return powerDimension(leftDim, exponentNode.content.value)
          }
          return 'dimensionless'
        }

        return 'dimensionless'
      }

      if (node.type === 'FunctionNode') {
        const fnName =
          typeof node.fn === 'string' ? node.fn : node.fn?.name
        if (fnName === 'sqrt' && node.args.length > 0) {
          const innerDim = computeDimension(node.args[0])
          return sqrtDimension(innerDim)
        }
        return 'dimensionless'
      }

      return 'dimensionless'
    } catch {
      return 'dimensionless'
    }
  }

  try {
    computeDimension(ast)
  } catch {
    // swallow
  }

  return {
    formulaId: formula.id,
    passed: conflicts.length === 0,
    conflicts,
  }
}
