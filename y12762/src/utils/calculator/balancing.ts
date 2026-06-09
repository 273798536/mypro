import type { BalancingEquation } from '../../types';

export interface BalancingResult {
  equation: BalancingEquation;
  explanation: string;
  detailedExplanation: string;
}

export function parseFormula(formula: string): Record<string, number> {
  const elements: Record<string, number> = {};
  const regex = /([A-Z][a-z]?)(\d*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(formula)) !== null) {
    const element = match[1];
    const count = match[2] ? parseInt(match[2], 10) : 1;
    elements[element] = (elements[element] || 0) + count;
  }

  return elements;
}

export function combineElements(
  formulas: string[],
  coefficients: number[]
): Record<string, number> {
  const total: Record<string, number> = {};

  formulas.forEach((formula, idx) => {
    const elements = parseFormula(formula);
    const coeff = coefficients[idx] || 1;
    for (const [element, count] of Object.entries(elements)) {
      total[element] = (total[element] || 0) + count * coeff;
    }
  });

  return total;
}

export function isBalanced(
  reactants: string[],
  products: string[],
  coefficients: number[]
): boolean {
  const reactantElements = combineElements(
    reactants,
    coefficients.slice(0, reactants.length)
  );
  const productElements = combineElements(
    products,
    coefficients.slice(reactants.length)
  );

  const allElements = new Set([
    ...Object.keys(reactantElements),
    ...Object.keys(productElements),
  ]);

  for (const element of allElements) {
    if ((reactantElements[element] || 0) !== (productElements[element] || 0)) {
      return false;
    }
  }

  return true;
}

export function balanceEquation(
  reactants: string[],
  products: string[]
): BalancingResult {
  const totalCompounds = reactants.length + products.length;
  let coefficients = new Array(totalCompounds).fill(1);

  for (let attempt = 0; attempt < 10000; attempt++) {
    if (isBalanced(reactants, products, coefficients)) {
      break;
    }

    const reactantElements = combineElements(
      reactants,
      coefficients.slice(0, reactants.length)
    );
    const productElements = combineElements(
      products,
      coefficients.slice(reactants.length)
    );

    const allElements = new Set([
      ...Object.keys(reactantElements),
      ...Object.keys(productElements),
    ]);

    let maxDiff = 0;
    let maxIdx = 0;

    allElements.forEach((element) => {
      const rCount = reactantElements[element] || 0;
      const pCount = productElements[element] || 0;
      const diff = Math.abs(rCount - pCount);
      if (diff > maxDiff) {
        maxDiff = diff;
        if (rCount < pCount) {
          for (let i = 0; i < reactants.length; i++) {
            if (parseFormula(reactants[i])[element]) {
              maxIdx = i;
              break;
            }
          }
        } else {
          for (let i = 0; i < products.length; i++) {
            if (parseFormula(products[i])[element]) {
              maxIdx = reactants.length + i;
              break;
            }
          }
        }
      }
    });

    coefficients[maxIdx]++;

    if (coefficients.some((c) => c > 20)) {
      coefficients = coefficients.map(() => Math.floor(Math.random() * 5) + 1);
    }
  }

  const balanced = isBalanced(reactants, products, coefficients);
  const equation: BalancingEquation = {
    reactants,
    products,
    coefficients,
    balanced,
  };

  const reactantStr = reactants
    .map((r, i) => (coefficients[i] > 1 ? `${coefficients[i]}${r}` : r))
    .join(' + ');
  const productStr = products
    .map((p, i) => (coefficients[reactants.length + i] > 1
      ? `${coefficients[reactants.length + i]}${p}`
      : p))
    .join(' + ');

  const explanation = balanced
    ? `化学方程式已配平：${reactantStr} → ${productStr}`
    : `化学方程式暂未完全配平，当前配平系数：${coefficients.join(', ')}`;

  const reactantElements = combineElements(
    reactants,
    coefficients.slice(0, reactants.length)
  );
  const productElements = combineElements(
    products,
    coefficients.slice(reactants.length)
  );

  let elementCheck = '';
  const allElements = new Set([
    ...Object.keys(reactantElements),
    ...Object.keys(productElements),
  ]);
  allElements.forEach((element) => {
    const r = reactantElements[element] || 0;
    const p = productElements[element] || 0;
    elementCheck += `  ${element}：反应物${r}个原子，生成物${p}个原子${r === p ? ' ✓' : ' ✗'}\n`;
  });

  const detailedExplanation = `
【化学方程式配平分析】
配平方程式：${reactantStr} → ${productStr}

配平系数说明：
反应物系数：[${coefficients.slice(0, reactants.length).join(', ')}]
生成物系数：[${coefficients.slice(reactants.length).join(', ')}]

原子守恒验证：
${elementCheck}
配平结果：${balanced ? '✓ 配平成功，所有元素原子数守恒' : '✗ 配平未完成，请检查化学式是否正确'}

教学提示：
化学方程式配平的核心依据是"质量守恒定律"——反应前后各元素的原子总数不变。
配平步骤：
1. 写出反应物和生成物的化学式
2. 统计各元素原子数
3. 通过调整系数使两边原子数相等
4. 验证所有元素是否守恒
`.trim();

  return { equation, explanation, detailedExplanation };
}

export const DEMO_REACTIONS = [
  {
    name: '氢气燃烧',
    reactants: ['H2', 'O2'],
    products: ['H2O'],
  },
  {
    name: '碳酸钙分解',
    reactants: ['CaCO3'],
    products: ['CaO', 'CO2'],
  },
  {
    name: '铁与硫酸铜反应',
    reactants: ['Fe', 'CuSO4'],
    products: ['FeSO4', 'Cu'],
  },
  {
    name: '甲烷燃烧',
    reactants: ['CH4', 'O2'],
    products: ['CO2', 'H2O'],
  },
];
