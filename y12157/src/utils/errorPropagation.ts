import { parse, derivative, evaluate } from 'mathjs'
import type { Variable, Formula, ErrorPropagation, PropagationStep } from '@/store/useStore'

export function computeErrorPropagation(
  formula: Formula,
  variables: Variable[]
): ErrorPropagation {
  let ast
  try {
    ast = parse(formula.expression)
  } catch {
    return { formulaId: formula.id, combinedUncertainty: 0, steps: [] }
  }

  const relevantVariables = variables.filter(v =>
    formula.expression.includes(v.symbol)
  )

  const steps: PropagationStep[] = []
  const scope: Record<string, number> = {}
  for (const v of variables) {
    scope[v.symbol] = v.currentValue
  }

  for (const variable of relevantVariables) {
    let partialDerivative: string
    let derivativeNode: ReturnType<typeof derivative> | null = null

    try {
      derivativeNode = derivative(ast, variable.symbol)
      partialDerivative = derivativeNode.toString()
    } catch {
      partialDerivative = 'N/A'
    }

    let partialValue = 0
    if (derivativeNode) {
      try {
        partialValue = derivativeNode.evaluate(scope)
      } catch {
        partialValue = 0
      }
    }

    const contribution = Math.abs(partialValue) * variable.uncertainty

    steps.push({
      variableId: variable.id,
      variableSymbol: variable.symbol,
      partialDerivative,
      partialValue,
      contribution,
      percentage: 0,
    })
  }

  const sumOfSquares = steps.reduce((sum, s) => sum + s.contribution ** 2, 0)
  const combinedUncertainty = Math.sqrt(sumOfSquares)

  for (const step of steps) {
    if (sumOfSquares === 0) {
      step.percentage = 0
    } else {
      step.percentage = (step.contribution ** 2 / sumOfSquares) * 100
    }
  }

  return { formulaId: formula.id, combinedUncertainty, steps }
}

export function evaluateFormula(formula: Formula, variables: Variable[]): number {
  const scope: Record<string, number> = {}
  for (const v of variables) {
    scope[v.symbol] = v.currentValue
  }
  try {
    return evaluate(formula.expression, scope)
  } catch {
    return 0
  }
}
