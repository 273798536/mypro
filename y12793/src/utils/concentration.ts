export function molToGramPerLiter(molPerL: number, molarMass: number): number {
  return molPerL * molarMass
}

export function gramPerLiterToMol(gPerL: number, molarMass: number): number {
  if (molarMass === 0) return 0
  return gPerL / molarMass
}

export function gramPerLiterToPercent(gPerL: number): number {
  return gPerL / 10
}

export function percentToGramPerLiter(percent: number): number {
  return percent * 10
}

export function convertConcentration(
  value: number,
  fromUnit: 'mol/L' | 'g/L' | '%',
  toUnit: 'mol/L' | 'g/L' | '%',
  molarMass: number
): number {
  if (fromUnit === toUnit) return value

  let gPerL: number

  switch (fromUnit) {
    case 'mol/L':
      gPerL = molToGramPerLiter(value, molarMass)
      break
    case 'g/L':
      gPerL = value
      break
    case '%':
      gPerL = percentToGramPerLiter(value)
      break
  }

  switch (toUnit) {
    case 'mol/L':
      return gramPerLiterToMol(gPerL, molarMass)
    case 'g/L':
      return gPerL
    case '%':
      return gramPerLiterToPercent(gPerL)
  }
}
