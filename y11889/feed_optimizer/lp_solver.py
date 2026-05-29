import pulp
import pandas as pd
from typing import Dict, List, Tuple, Optional
import numpy as np


class LPSolver:
    def __init__(self):
        self.problem = None
        self.variables = {}
        self.solution = None
        self.status = "未求解"
        self.objective_value = 0
        self.constraints_violated = []

    def solve(self, ingredients_df: pd.DataFrame, constraints: Dict) -> Dict:
        self.constraints_violated = []
        
        if ingredients_df.empty:
            self.status = "无有效原料"
            return self._build_result()

        self.problem = pulp.LpProblem("饲料配方优化", pulp.LpMinimize)
        
        ingredient_names = ingredients_df['原料名称'].tolist()
        self.variables = {
            name: pulp.LpVariable(f"用量_{name}", lowBound=0, cat='Continuous')
            for name in ingredient_names
        }

        total_production = constraints.get('目标产量', 1000)
        
        costs = ingredients_df.set_index('原料名称')['价格(元/吨)'].to_dict()
        self.problem += pulp.lpSum([
            self.variables[name] * costs[name] / 1000 * total_production
            for name in ingredient_names
        ]), "总成本"

        self.problem += pulp.lpSum([
            self.variables[name] for name in ingredient_names
        ]) == 100, "比例合计100%"

        protein = ingredients_df.set_index('原料名称')['粗蛋白(%)'].to_dict()
        if '粗蛋白最低' in constraints:
            self.problem += pulp.lpSum([
                self.variables[name] * protein[name] / 100
                for name in ingredient_names
            ]) >= constraints['粗蛋白最低'], "粗蛋白最低"
        if '粗蛋白最高' in constraints:
            self.problem += pulp.lpSum([
                self.variables[name] * protein[name] / 100
                for name in ingredient_names
            ]) <= constraints['粗蛋白最高'], "粗蛋白最高"

        energy = ingredients_df.set_index('原料名称')['消化能(兆卡/公斤)'].to_dict()
        if '消化能最低' in constraints:
            self.problem += pulp.lpSum([
                self.variables[name] * energy[name] / 100
                for name in ingredient_names
            ]) >= constraints['消化能最低'], "消化能最低"
        if '消化能最高' in constraints:
            self.problem += pulp.lpSum([
                self.variables[name] * energy[name] / 100
                for name in ingredient_names
            ]) <= constraints['消化能最高'], "消化能最高"

        stock = ingredients_df.set_index('原料名称')['库存(吨)'].to_dict()
        for name in ingredient_names:
            max_usage = (stock[name] / total_production) * 100 if total_production > 0 else 0
            self.problem += self.variables[name] <= max_usage, f"库存限制_{name}"

        if '最低比例(%)' in ingredients_df.columns:
            min_ratios = ingredients_df.set_index('原料名称')['最低比例(%)'].fillna(0).to_dict()
            for name in ingredient_names:
                if min_ratios[name] > 0:
                    self.problem += self.variables[name] >= min_ratios[name], f"最低比例_{name}"

        if '最高比例(%)' in ingredients_df.columns:
            max_ratios = ingredients_df.set_index('原料名称')['最高比例(%)'].fillna(100).to_dict()
            for name in ingredient_names:
                if max_ratios[name] < 100:
                    self.problem += self.variables[name] <= max_ratios[name], f"最高比例_{name}"

        self.problem.solve(pulp.PULP_CBC_CMD(msg=False))
        
        self.status = pulp.LpStatus[self.problem.status]
        
        if self.problem.status == pulp.LpStatusOptimal:
            self._extract_solution(ingredients_df, constraints)
            self._verify_constraints(ingredients_df, constraints)
        elif self.problem.status == pulp.LpStatusInfeasible:
            self._diagnose_infeasibility(ingredients_df, constraints)

        return self._build_result()

    def _extract_solution(self, ingredients_df: pd.DataFrame, constraints: Dict):
        total_production = constraints.get('目标产量', 1000)
        self.solution = []
        self.objective_value = pulp.value(self.problem.objective)

        ingredient_info = ingredients_df.set_index('原料名称').to_dict('index')
        
        for name, var in self.variables.items():
            ratio = pulp.value(var)
            if ratio is None or ratio < 0.001:
                continue
                
            info = ingredient_info[name]
            usage = (ratio / 100) * total_production
            cost = usage * info['价格(元/吨)'] / 1000
            
            self.solution.append({
                '原料名称': name,
                '配比(%)': round(ratio, 4),
                '用量(吨)': round(usage, 4),
                '单价(元/吨)': info['价格(元/吨)'],
                '成本(元)': round(cost, 2),
                '粗蛋白贡献(%)': round(ratio * info['粗蛋白(%)'] / 100, 4),
                '消化能贡献(兆卡/公斤)': round(ratio * info['消化能(兆卡/公斤)'] / 100, 4)
            })

        self.solution.sort(key=lambda x: x['配比(%)'], reverse=True)

    def _verify_constraints(self, ingredients_df: pd.DataFrame, constraints: Dict):
        total_production = constraints.get('目标产量', 1000)
        ingredient_info = ingredients_df.set_index('原料名称').to_dict('index')
        
        actual_protein = sum(
            item['配比(%)'] * ingredient_info[item['原料名称']]['粗蛋白(%)'] / 100
            for item in self.solution
        )
        actual_energy = sum(
            item['配比(%)'] * ingredient_info[item['原料名称']]['消化能(兆卡/公斤)'] / 100
            for item in self.solution
        )

        if '粗蛋白最低' in constraints and actual_protein < constraints['粗蛋白最低'] - 0.01:
            self.constraints_violated.append(f"粗蛋白未达标: 实际{actual_protein:.2f}% < 要求{constraints['粗蛋白最低']}%")
        if '粗蛋白最高' in constraints and actual_protein > constraints['粗蛋白最高'] + 0.01:
            self.constraints_violated.append(f"粗蛋白超标: 实际{actual_protein:.2f}% > 限制{constraints['粗蛋白最高']}%")

        if '消化能最低' in constraints and actual_energy < constraints['消化能最低'] - 0.01:
            self.constraints_violated.append(f"消化能未达标: 实际{actual_energy:.2f} < 要求{constraints['消化能最低']}")
        if '消化能最高' in constraints and actual_energy > constraints['消化能最高'] + 0.01:
            self.constraints_violated.append(f"消化能超标: 实际{actual_energy:.2f} > 限制{constraints['消化能最高']}")

        for item in self.solution:
            name = item['原料名称']
            stock = ingredient_info[name]['库存(吨)']
            if item['用量(吨)'] > stock + 0.001:
                self.constraints_violated.append(f"{name}库存不足: 使用{item['用量(吨)']:.2f}吨 > 库存{stock}吨")

    def _diagnose_infeasibility(self, ingredients_df: pd.DataFrame, constraints: Dict):
        total_production = constraints.get('目标产量', 1000)
        total_stock = ingredients_df['库存(吨)'].sum()
        
        if total_stock < total_production:
            self.constraints_violated.append(
                f"总库存不足: 库存{total_stock:.2f}吨 < 需求{total_production}吨"
            )

        max_protein = (ingredients_df['粗蛋白(%)'] * ingredients_df['库存(吨)']).sum() / total_stock if total_stock > 0 else 0
        min_protein = ingredients_df['粗蛋白(%)'].min()
        
        if '粗蛋白最低' in constraints and max_protein < constraints['粗蛋白最低']:
            self.constraints_violated.append(
                f"蛋白无法达标: 现有原料最高能达到{max_protein:.2f}% < 要求{constraints['粗蛋白最低']}%"
            )
        if '粗蛋白最高' in constraints and min_protein > constraints['粗蛋白最高']:
            self.constraints_violated.append(
                f"蛋白限制过严: 现有原料最低{min_protein:.2f}% > 限制{constraints['粗蛋白最高']}%"
            )

        min_ratio_sum = ingredients_df['最低比例(%)'].sum() if '最低比例(%)' in ingredients_df.columns else 0
        if min_ratio_sum > 100:
            self.constraints_violated.append(
                f"最低比例总和{min_ratio_sum:.2f}% > 100%, 无法满足"
            )

    def _build_result(self) -> Dict:
        return {
            '状态': self.status,
            '总成本(元)': round(self.objective_value, 2) if self.objective_value else 0,
            '配方明细': self.solution if self.solution else [],
            '约束冲突': self.constraints_violated,
            '可行': self.status == 'Optimal' and not self.constraints_violated
        }
