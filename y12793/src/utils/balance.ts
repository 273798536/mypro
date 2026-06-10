export interface BalanceStep {
  description: string
  atomCounts: Record<string, { left: number; right: number }>
  isBalanced: boolean
}

export interface BalanceResult {
  equation: string
  balancedEquation: string
  coefficients: Record<string, number>
  steps: BalanceStep[]
}

interface KnownEquation {
  equation: string
  balancedEquation: string
  coefficients: Record<string, number>
  steps: BalanceStep[]
}

const knownEquations: KnownEquation[] = [
  {
    equation: 'Fe + O2 -> Fe3O4',
    balancedEquation: '3Fe + 2O2 -> Fe3O4',
    coefficients: { Fe: 3, O2: 2, Fe3O4: 1 },
    steps: [
      {
        description: '统计未配平方程中各原子数量',
        atomCounts: { Fe: { left: 1, right: 3 }, O: { left: 2, right: 4 } },
        isBalanced: false,
      },
      {
        description: '观察Fe右侧为3，左侧为1，将Fe系数设为3',
        atomCounts: { Fe: { left: 3, right: 3 }, O: { left: 2, right: 4 } },
        isBalanced: false,
      },
      {
        description: 'O右侧为4，左侧为2，将O2系数设为2，使得左侧O为4',
        atomCounts: { Fe: { left: 3, right: 3 }, O: { left: 4, right: 4 } },
        isBalanced: true,
      },
    ],
  },
  {
    equation: 'H2 + O2 -> H2O',
    balancedEquation: '2H2 + O2 -> 2H2O',
    coefficients: { H2: 2, O2: 1, H2O: 2 },
    steps: [
      {
        description: '统计未配平方程中各原子数量',
        atomCounts: { H: { left: 2, right: 2 }, O: { left: 2, right: 1 } },
        isBalanced: false,
      },
      {
        description: 'O右侧为1，左侧为2，将H2O系数设为2使右侧O为2',
        atomCounts: { H: { left: 2, right: 4 }, O: { left: 2, right: 2 } },
        isBalanced: false,
      },
      {
        description: 'H右侧为4，左侧为2，将H2系数设为2使左侧H为4',
        atomCounts: { H: { left: 4, right: 4 }, O: { left: 2, right: 2 } },
        isBalanced: true,
      },
    ],
  },
  {
    equation: 'Na + Cl2 -> NaCl',
    balancedEquation: '2Na + Cl2 -> 2NaCl',
    coefficients: { Na: 2, Cl2: 1, NaCl: 2 },
    steps: [
      {
        description: '统计未配平方程中各原子数量',
        atomCounts: { Na: { left: 1, right: 1 }, Cl: { left: 2, right: 1 } },
        isBalanced: false,
      },
      {
        description: 'Cl左侧为2，右侧为1，将NaCl系数设为2使右侧Cl为2',
        atomCounts: { Na: { left: 1, right: 2 }, Cl: { left: 2, right: 2 } },
        isBalanced: false,
      },
      {
        description: 'Na右侧为2，左侧为1，将Na系数设为2使左侧Na为2',
        atomCounts: { Na: { left: 2, right: 2 }, Cl: { left: 2, right: 2 } },
        isBalanced: true,
      },
    ],
  },
  {
    equation: 'CH4 + O2 -> CO2 + H2O',
    balancedEquation: 'CH4 + 2O2 -> CO2 + 2H2O',
    coefficients: { CH4: 1, O2: 2, CO2: 1, H2O: 2 },
    steps: [
      {
        description: '统计未配平方程中各原子数量',
        atomCounts: { C: { left: 1, right: 1 }, H: { left: 4, right: 2 }, O: { left: 2, right: 3 } },
        isBalanced: false,
      },
      {
        description: 'H左侧为4，右侧为2，将H2O系数设为2使右侧H为4，此时右侧O变为4',
        atomCounts: { C: { left: 1, right: 1 }, H: { left: 4, right: 4 }, O: { left: 2, right: 4 } },
        isBalanced: false,
      },
      {
        description: 'O左侧为2，右侧为4，将O2系数设为2使左侧O为4',
        atomCounts: { C: { left: 1, right: 1 }, H: { left: 4, right: 4 }, O: { left: 4, right: 4 } },
        isBalanced: true,
      },
    ],
  },
  {
    equation: 'Al + HCl -> AlCl3 + H2',
    balancedEquation: '2Al + 6HCl -> 2AlCl3 + 3H2',
    coefficients: { Al: 2, HCl: 6, AlCl3: 2, H2: 3 },
    steps: [
      {
        description: '统计未配平方程中各原子数量',
        atomCounts: { Al: { left: 1, right: 1 }, H: { left: 1, right: 2 }, Cl: { left: 1, right: 3 } },
        isBalanced: false,
      },
      {
        description: 'Cl右侧为3，左侧为1，将HCl系数设为6、AlCl3系数设为2，使Cl两侧均为6',
        atomCounts: { Al: { left: 1, right: 2 }, H: { left: 6, right: 2 }, Cl: { left: 6, right: 6 } },
        isBalanced: false,
      },
      {
        description: 'Al右侧为2，左侧为1，将Al系数设为2；H左侧为6，将H2系数设为3使右侧H为6',
        atomCounts: { Al: { left: 2, right: 2 }, H: { left: 6, right: 6 }, Cl: { left: 6, right: 6 } },
        isBalanced: true,
      },
    ],
  },
  {
    equation: 'CaCO3 + HCl -> CaCl2 + H2O + CO2',
    balancedEquation: 'CaCO3 + 2HCl -> CaCl2 + H2O + CO2',
    coefficients: { CaCO3: 1, HCl: 2, CaCl2: 1, H2O: 1, CO2: 1 },
    steps: [
      {
        description: '统计未配平方程中各原子数量',
        atomCounts: {
          Ca: { left: 1, right: 1 },
          C: { left: 1, right: 1 },
          O: { left: 3, right: 3 },
          H: { left: 1, right: 2 },
          Cl: { left: 1, right: 2 },
        },
        isBalanced: false,
      },
      {
        description: 'Cl右侧为2，左侧为1，将HCl系数设为2使左侧Cl为2，同时左侧H变为2',
        atomCounts: {
          Ca: { left: 1, right: 1 },
          C: { left: 1, right: 1 },
          O: { left: 3, right: 3 },
          H: { left: 2, right: 2 },
          Cl: { left: 2, right: 2 },
        },
        isBalanced: true,
      },
    ],
  },
]

function normalizeEquation(eq: string): string {
  return eq.replace(/\s+/g, ' ').trim()
}

export function balanceEquation(equation: string): BalanceResult {
  const normalized = normalizeEquation(equation)

  const found = knownEquations.find(
    (k) => normalizeEquation(k.equation) === normalized
  )

  if (found) {
    return {
      equation: found.equation,
      balancedEquation: found.balancedEquation,
      coefficients: found.coefficients,
      steps: found.steps,
    }
  }

  return {
    equation,
    balancedEquation: equation,
    coefficients: {},
    steps: [
      {
        description: '未能识别该方程式，暂无法自动配平',
        atomCounts: {},
        isBalanced: false,
      },
    ],
  }
}
