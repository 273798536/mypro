import { v4 as uuidv4 } from 'uuid'
import type {
  MaterialFormula,
  MaterialTraceItem,
  RecordStatus,
  WeighingRow,
  Material,
} from '../types/index.js'
import { db } from '../db/database.js'

export interface BalanceCalculationResult {
  calcId: string
  balancedEquation: string
  enthalpyChange: number
  materialTrace: MaterialTraceItem[]
  status: RecordStatus
}

function parseFormula(formula: string): Record<string, number> {
  const elements: Record<string, number> = {}
  const regex = /([A-Z][a-z]?)(\d*)/g
  let match
  while ((match = regex.exec(formula)) !== null) {
    const element = match[1]
    const count = match[2] ? parseInt(match[2], 10) : 1
    elements[element] = (elements[element] || 0) + count
  }
  return elements
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function gcdArray(arr: number[]): number {
  return arr.reduce((acc, val) => gcd(acc, val))
}

export function balanceEquation(
  reactants: MaterialFormula[],
  products: MaterialFormula[],
): string {
  const allElements = new Set<string>()
  const reactantElements = reactants.map((r) => {
    const parsed = parseFormula(r.formula)
    Object.keys(parsed).forEach((e) => allElements.add(e))
    return parsed
  })
  const productElements = products.map((p) => {
    const parsed = parseFormula(p.formula)
    Object.keys(parsed).forEach((e) => allElements.add(e))
    return parsed
  })

  const elementList = Array.from(allElements)
  const numReactants = reactants.length
  const numProducts = products.length
  const numVars = numReactants + numProducts

  const matrix: number[][] = elementList.map((element) => {
    const row: number[] = []
    reactantElements.forEach((re, i) => {
      row.push(re[element] || 0)
    })
    productElements.forEach((pe, i) => {
      row.push(-(pe[element] || 0))
    })
    return row
  })

  const coefficients: number[] = Array(numVars).fill(1)
  for (let i = 0; i < Math.min(elementList.length, numVars - 1); i++) {
    let pivotRow = i
    for (let r = i + 1; r < matrix.length; r++) {
      if (Math.abs(matrix[r][i]) > Math.abs(matrix[pivotRow][i])) {
        pivotRow = r
      }
    }
    if (pivotRow !== i) {
      [matrix[i], matrix[pivotRow]] = [matrix[pivotRow], matrix[i]]
    }
    const pivot = matrix[i][i]
    if (pivot !== 0) {
      for (let j = i + 1; j < numVars; j++) {
        if (matrix[i][j] !== 0) {
          coefficients[i] = Math.abs(matrix[i][j])
          coefficients[j] = Math.abs(pivot)
          break
        }
      }
    }
  }

  const g = gcdArray(coefficients.map((c) => Math.abs(c) || 1))
  const normalizedCoeffs = coefficients.map((c) => Math.abs(Math.round(c / g)))

  const reactantParts = reactants.map(
    (r, i) =>
      (normalizedCoeffs[i] > 1 ? normalizedCoeffs[i].toString() : '') + r.formula,
  )
  const productParts = products.map(
    (p, i) =>
      (normalizedCoeffs[numReactants + i] > 1
        ? normalizedCoeffs[numReactants + i].toString()
        : '') + p.formula,
  )

  return `${reactantParts.join(' + ')} → ${productParts.join(' + ')}`
}

export function estimateEnthalpyChange(equation: string): number {
  const baseEnthalpy: Record<string, number> = {
    H2: 0,
    O2: 0,
    N2: 0,
    Cl2: 0,
    H2O: -285.8,
    CO2: -393.5,
    NaCl: -411.2,
    HCl: -92.3,
    NaOH: -425.6,
    H2SO4: -814.0,
    CaCO3: -1206.9,
    CaO: -635.1,
    CH4: -74.8,
    C2H5OH: -277.7,
  }

  let total = 0
  const parts = equation.split(' → ')
  const left = parts[0].split(' + ')
  const right = parts[1] ? parts[1].split(' + ') : []

  left.forEach((item) => {
    const match = item.match(/^(\d*)([A-Za-z0-9]+)$/)
    if (match) {
      const coef = match[1] ? parseInt(match[1], 10) : 1
      const formula = match[2]
      total -= coef * (baseEnthalpy[formula] || 0)
    }
  })

  right.forEach((item) => {
    const match = item.match(/^(\d*)([A-Za-z0-9]+)$/)
    if (match) {
      const coef = match[1] ? parseInt(match[1], 10) : 1
      const formula = match[2]
      total += coef * (baseEnthalpy[formula] || -50)
    }
  })

  return Number(total.toFixed(2))
}

export function traceMaterials(
  recordId: string,
  rows: WeighingRow[],
): MaterialTraceItem[] {
  const stmt = db.prepare('SELECT * FROM materials WHERE batch_no = ?')

  return rows.map((row) => {
    const material = stmt.get(row.batchNo) as Material | undefined
    let delta = '正常'

    if (material) {
      const concDiff = Math.abs(row.concentration - material.standardConc)
      const purityDiff = Math.abs(row.purity - material.standardPurity)

      if (concDiff > material.standardConc * 0.1) {
        delta = `浓度偏差 ${(concDiff / material.standardConc * 100).toFixed(1)}%，标准值 ${material.standardConc} mol/L`
      } else if (purityDiff > 2) {
        delta = `纯度偏差 ${purityDiff.toFixed(1)}%，标准值 ${material.standardPurity}%`
      }
    } else {
      delta = '未找到标准批次数据，请在试剂库中补充'
    }

    return {
      reagentName: row.reagentName,
      sourceRow: row.rowIndex + 1,
      batchNo: row.batchNo,
      concentration: row.concentration,
      purity: row.purity,
      delta,
    }
  })
}

export function calculateBalance(
  recordId: string,
  reactants: MaterialFormula[],
  products: MaterialFormula[],
  rows: WeighingRow[],
): BalanceCalculationResult {
  let balancedEquation = ''
  let status: RecordStatus = 'success'

  try {
    balancedEquation = balanceEquation(reactants, products)
  } catch {
    balancedEquation = `${reactants.map((r) => r.formula).join(' + ')} → ${products
      .map((p) => p.formula)
      .join(' + ')}`
    status = 'pending'
  }

  const enthalpyChange = estimateEnthalpyChange(balancedEquation)
  const materialTrace = traceMaterials(recordId, rows)

  const hasConcentrationError = materialTrace.some((t) => t.delta.includes('浓度偏差'))
  if (hasConcentrationError) {
    status = 'bad'
  }

  return {
    calcId: uuidv4(),
    balancedEquation,
    enthalpyChange,
    materialTrace,
    status,
  }
}
