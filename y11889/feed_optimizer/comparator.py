from typing import Dict, List
import pandas as pd


class SolutionComparator:
    def compare(self, run1: Dict, run2: Dict) -> Dict:
        result = {
            '基本信息': {
                '方案1': {'ID': run1.get('run_id'), '名称': run1.get('run_name'), '时间': run1.get('timestamp')},
                '方案2': {'ID': run2.get('run_id'), '名称': run2.get('run_name'), '时间': run2.get('timestamp')}
            },
            '成本变化': self._compare_cost(run1, run2),
            '配方变化': self._compare_formula(run1, run2),
            '营养指标变化': self._compare_nutrition(run1, run2),
            '原料价格变化': self._compare_ingredient_prices(run1, run2),
            '状态变化': self._compare_status(run1, run2),
            '约束冲突变化': self._compare_constraints(run1, run2)
        }
        return result

    def _compare_cost(self, run1: Dict, run2: Dict) -> Dict:
        cost1 = run1.get('总成本(元)', 0)
        cost2 = run2.get('总成本(元)', 0)
        diff = cost2 - cost1
        diff_pct = (diff / cost1 * 100) if cost1 > 0 else 0
        
        return {
            '方案1成本': round(cost1, 2),
            '方案2成本': round(cost2, 2),
            '差额': round(diff, 2),
            '变化率': round(diff_pct, 2),
            '变化方向': '上升' if diff > 0 else '下降' if diff < 0 else '持平'
        }

    def _compare_formula(self, run1: Dict, run2: Dict) -> Dict:
        formula1 = {item['原料名称']: item for item in run1.get('配方明细', [])}
        formula2 = {item['原料名称']: item for item in run2.get('配方明细', [])}
        
        all_ingredients = set(formula1.keys()) | set(formula2.keys())
        
        changes = []
        added = []
        removed = []
        
        for name in all_ingredients:
            in1 = name in formula1
            in2 = name in formula2
            
            if in1 and in2:
                ratio1 = formula1[name]['配比(%)']
                ratio2 = formula2[name]['配比(%)']
                diff = ratio2 - ratio1
                if abs(diff) > 0.001:
                    changes.append({
                        '原料名称': name,
                        '方案1配比(%)': round(ratio1, 4),
                        '方案2配比(%)': round(ratio2, 4),
                        '变化量': round(diff, 4),
                        '变化率': round(diff / ratio1 * 100, 2) if ratio1 > 0 else 999
                    })
            elif in2 and not in1:
                added.append({
                    '原料名称': name,
                    '方案2配比(%)': round(formula2[name]['配比(%)'], 4)
                })
            elif in1 and not in2:
                removed.append({
                    '原料名称': name,
                    '方案1配比(%)': round(formula1[name]['配比(%)'], 4)
                })

        return {
            '配比变化': sorted(changes, key=lambda x: abs(x['变化量']), reverse=True),
            '新增原料': added,
            '移除原料': removed
        }

    def _compare_nutrition(self, run1: Dict, run2: Dict) -> Dict:
        def get_nutrition(run: Dict) -> Dict:
            formula = run.get('配方明细', [])
            protein = sum(item.get('粗蛋白贡献(%)', 0) for item in formula)
            energy = sum(item.get('消化能贡献(兆卡/公斤)', 0) for item in formula)
            return {'粗蛋白(%)': round(protein, 4), '消化能(兆卡/公斤)': round(energy, 4)}
        
        nut1 = get_nutrition(run1)
        nut2 = get_nutrition(run2)
        
        return {
            '方案1': nut1,
            '方案2': nut2,
            '变化': {
                '粗蛋白变化': round(nut2['粗蛋白(%)'] - nut1['粗蛋白(%)'], 4),
                '消化能变化': round(nut2['消化能(兆卡/公斤)'] - nut1['消化能(兆卡/公斤)'], 4)
            }
        }

    def _compare_ingredient_prices(self, run1: Dict, run2: Dict) -> List[Dict]:
        ingredients1 = {item['原料名称']: item for item in run1.get('原料数据', [])}
        ingredients2 = {item['原料名称']: item for item in run2.get('原料数据', [])}
        
        all_names = set(ingredients1.keys()) | set(ingredients2.keys())
        
        changes = []
        for name in all_names:
            if name in ingredients1 and name in ingredients2:
                price1 = ingredients1[name].get('价格(元/吨)', 0)
                price2 = ingredients2[name].get('价格(元/吨)', 0)
                stock1 = ingredients1[name].get('库存(吨)', 0)
                stock2 = ingredients2[name].get('库存(吨)', 0)
                
                price_diff = price2 - price1
                stock_diff = stock2 - stock1
                
                if abs(price_diff) > 0.01 or abs(stock_diff) > 0.001:
                    changes.append({
                        '原料名称': name,
                        '价格变化': round(price_diff, 2),
                        '库存变化': round(stock_diff, 4),
                        '方案1价格': price1,
                        '方案2价格': price2,
                        '方案1库存': stock1,
                        '方案2库存': stock2
                    })
        
        return sorted(changes, key=lambda x: abs(x['价格变化']), reverse=True)

    def _compare_status(self, run1: Dict, run2: Dict) -> Dict:
        return {
            '方案1状态': run1.get('状态', '未知'),
            '方案1可行': run1.get('可行', False),
            '方案2状态': run2.get('状态', '未知'),
            '方案2可行': run2.get('可行', False),
            '状态变化': self._get_status_change(run1, run2)
        }

    def _get_status_change(self, run1: Dict, run2: Dict) -> str:
        s1 = run1.get('可行', False)
        s2 = run2.get('可行', False)
        
        if s1 and s2:
            return '均可行'
        elif s1 and not s2:
            return '方案1可行,方案2不可行'
        elif not s1 and s2:
            return '方案1不可行,方案2可行'
        else:
            return '均不可行'

    def _compare_constraints(self, run1: Dict, run2: Dict) -> Dict:
        const1 = run1.get('约束冲突', [])
        const2 = run2.get('约束冲突', [])
        
        return {
            '方案1冲突': const1,
            '方案2冲突': const2,
            '新增冲突': [c for c in const2 if c not in const1],
            '已解决冲突': [c for c in const1 if c not in const2]
        }
