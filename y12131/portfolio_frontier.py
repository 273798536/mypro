#!/usr/bin/env python3
import argparse
import csv
import os
import sys
import json
import hashlib
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import yaml
from scipy.optimize import minimize


class DataLoader:
    def __init__(self, assets_path, cov_path, constraints_path=None):
        self.assets_path = assets_path
        self.cov_path = cov_path
        self.constraints_path = constraints_path
        self.warnings = []
        self.errors = []

    def load_assets(self):
        df = pd.read_csv(self.assets_path)
        required_cols = {'asset', 'return'}
        missing = required_cols - set(df.columns)
        if missing:
            self.errors.append(f"资产收益表缺少必要列: {missing}")
            return None

        df['asset'] = df['asset'].astype(str).str.strip()
        df['return'] = pd.to_numeric(df['return'], errors='coerce')

        missing_returns = df[df['return'].isna()]
        if not missing_returns.empty:
            for _, row in missing_returns.iterrows():
                self.warnings.append({
                    'type': 'missing_return',
                    'asset': row['asset'],
                    'note': row.get('note', ''),
                    'suggestion': f"资产[{row['asset']}]缺少历史收益率数据。建议：1) 补充最近3-5年的历史数据；2) 使用同类型资产收益率作为临时替代；3) 从组合中暂时移除该资产"
                })

        df = df.dropna(subset=['return'])
        assets = df['asset'].tolist()
        returns = df['return'].values
        notes = df.get('note', pd.Series([''] * len(df))).tolist()

        return {
            'assets': assets,
            'returns': returns,
            'notes': notes,
            'df': df
        }

    def load_covariance(self, valid_assets):
        df = pd.read_csv(self.cov_path, index_col=0)
        df.index = df.index.astype(str).str.strip()
        df.columns = df.columns.astype(str).str.strip()

        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        missing_cells = []
        for i in df.index:
            for j in df.columns:
                if pd.isna(df.loc[i, j]):
                    missing_cells.append((i, j))

        if missing_cells:
            for (i, j) in missing_cells:
                if i == j:
                    suggestion = f"协方差对角线[{i},{i}]缺失，建议使用该资产的历史波动率平方填充，或参考同类型资产方差"
                else:
                    suggestion = f"协方差[{i},{j}]缺失，建议使用两个资产的历史收益率计算协方差，或用同行业协方差替代"
                self.warnings.append({
                    'type': 'missing_covariance',
                    'cells': f"{i},{j}",
                    'suggestion': suggestion
                })

        available_assets = [a for a in valid_assets if a in df.index and a in df.columns]
        missing_from_cov = set(valid_assets) - set(available_assets)
        if missing_from_cov:
            for a in missing_from_cov:
                self.errors.append(f"资产[{a}]在协方差矩阵中完全缺失，无法进行优化。建议：1) 补充该资产与其他资产的协方差数据；2) 从资产池移除该资产")

        if len(available_assets) < 2:
            self.errors.append("有效资产不足2个，无法构建投资组合")
            return None

        cov_df = df.loc[available_assets, available_assets].copy()

        for i in available_assets:
            for j in available_assets:
                if pd.isna(cov_df.loc[i, j]):
                    if i == j:
                        cov_df.loc[i, j] = np.nanmean(np.diag(cov_df.values))
                    else:
                        cov_df.loc[i, j] = cov_df.loc[j, i] if not pd.isna(cov_df.loc[j, i]) else 0.0

        cov_df = (cov_df + cov_df.T) / 2
        min_eig = np.min(np.linalg.eigvals(cov_df.values))
        if min_eig < -1e-8:
            self.warnings.append({
                'type': 'non_positive_definite',
                'value': float(min_eig),
                'suggestion': f"协方差矩阵非正定（最小特征值{min_eig:.6f}），已添加正则化修正。建议检查数据质量，或使用收缩估计方法"
            })
            cov_df = cov_df + np.eye(len(cov_df)) * max(-min_eig + 1e-6, 1e-6)

        return {
            'assets': available_assets,
            'cov_matrix': cov_df.values,
            'df': cov_df
        }

    def load_constraints(self, assets):
        if not self.constraints_path or not os.path.exists(self.constraints_path):
            return [], False

        with open(self.constraints_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f) or {}

        constraints_config = config.get('constraints', [])
        allow_short = config.get('allow_short_selling', False)

        def _make_weight_sum(target):
            return lambda w: np.sum(w) - target

        def _make_min_weight(i, v):
            return lambda w: w[i] - v

        def _make_max_weight(i, v):
            return lambda w: v - w[i]

        def _make_sector_limit(indices, v):
            return lambda w: v - np.sum(w[indices])

        parsed = []
        for c in constraints_config:
            ctype = c.get('type')
            if ctype == 'weight_sum':
                target = c.get('value', 1.0)
                parsed.append({
                    'type': 'eq',
                    'fun': _make_weight_sum(target),
                    'description': c.get('description', f'权重和={target}')
                })
            elif ctype == 'min_weight':
                if c.get('global'):
                    min_val = c.get('value', 0.0)
                    for idx, a in enumerate(assets):
                        parsed.append({
                            'type': 'ineq',
                            'fun': _make_min_weight(idx, min_val),
                            'description': f'{a} >= {min_val}'
                        })
                else:
                    asset = c.get('asset')
                    if asset in assets:
                        idx = assets.index(asset)
                        min_val = c.get('value', 0.0)
                        parsed.append({
                            'type': 'ineq',
                            'fun': _make_min_weight(idx, min_val),
                            'description': f'{asset} >= {min_val} ({c.get("description", "")})'
                        })
            elif ctype == 'max_weight':
                asset = c.get('asset')
                if asset in assets:
                    idx = assets.index(asset)
                    max_val = c.get('value', 1.0)
                    parsed.append({
                        'type': 'ineq',
                        'fun': _make_max_weight(idx, max_val),
                        'description': f'{asset} <= {max_val} ({c.get("description", "")})'
                    })
            elif ctype == 'sector_limit':
                sector_assets = c.get('assets', [])
                indices = [assets.index(a) for a in sector_assets if a in assets]
                if indices:
                    max_total = c.get('max_total', 1.0)
                    parsed.append({
                        'type': 'ineq',
                        'fun': _make_sector_limit(indices, max_total),
                        'description': f"{c.get('sector','')}合计 <= {max_total} ({c.get('description', '')})"
                    })

        if not allow_short:
            for idx, a in enumerate(assets):
                has_global = any(
                    c.get('type') == 'min_weight' and c.get('global')
                    for c in constraints_config
                )
                has_specific = any(
                    c.get('type') == 'min_weight' and c.get('asset') == a
                    for c in constraints_config
                )
                if not has_global and not has_specific:
                    parsed.append({
                        'type': 'ineq',
                        'fun': _make_min_weight(idx, 0.0),
                        'description': f'{a} >= 0 (默认不允许做空)'
                    })

        return parsed, allow_short


class PortfolioOptimizer:
    def __init__(self, returns, cov_matrix, constraints, allow_short=False):
        self.returns = returns
        self.cov_matrix = cov_matrix
        self.n = len(returns)
        self.constraints = constraints
        self.allow_short = allow_short
        self.frontier_points = []

    def portfolio_return(self, weights):
        return np.sum(self.returns * weights)

    def portfolio_volatility(self, weights):
        return np.sqrt(np.maximum(weights @ self.cov_matrix @ weights, 0))

    def optimize_min_volatility(self, target_return=None):
        constraints = []
        for c in self.constraints:
            if c['type'] == 'eq':
                constraints.append({'type': 'eq', 'fun': c['fun']})
            else:
                constraints.append({'type': 'ineq', 'fun': c['fun']})

        if target_return is not None:
            constraints.append({
                'type': 'eq',
                'fun': lambda w: self.portfolio_return(w) - target_return
            })

        x0 = np.ones(self.n) / self.n
        bounds = [(-1.0, 2.0) if self.allow_short else (0.0, 1.0)] * self.n

        result = minimize(
            self.portfolio_volatility,
            x0,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints,
            options={'maxiter': 1000, 'ftol': 1e-10}
        )

        return result

    def calculate_efficient_frontier(self, n_points=30):
        min_vol_result = self.optimize_min_volatility()
        if not min_vol_result.success:
            return None, min_vol_result.message

        min_vol_weights = min_vol_result.x
        min_vol_ret = self.portfolio_return(min_vol_weights)
        min_vol_vol = self.portfolio_volatility(min_vol_weights)

        max_ret = np.max(self.returns)
        min_ret = np.min(self.returns)

        ret_range = np.linspace(min(min_vol_ret, min_ret), max_ret, n_points)

        frontier = []
        issues = []

        for target_ret in ret_range:
            result = self.optimize_min_volatility(target_ret)
            if result.success:
                weights = result.x
                vol = self.portfolio_volatility(weights)
                frontier.append({
                    'return': float(target_ret),
                    'volatility': float(vol),
                    'weights': weights.tolist(),
                    'sharpe': float(target_ret / vol) if vol > 0 else 0
                })

                neg_weights = [(i, w) for i, w in enumerate(weights) if w < -1e-6]
                if neg_weights and not self.allow_short:
                    issues.append({
                        'type': 'negative_weight',
                        'target_return': float(target_ret),
                        'assets': neg_weights,
                        'suggestion': '优化器在不允许做空约束下仍出现负权重，可能是约束冲突或数值问题。请检查约束条件，或启用allow_short_selling'
                    })
            else:
                issues.append({
                    'type': 'optimization_failed',
                    'target_return': float(target_ret),
                    'message': result.message,
                    'suggestion': '该目标收益率下无法找到可行解。建议：1) 放松约束条件；2) 检查资产收益和协方差数据；3) 缩小目标收益率范围'
                })

        self.frontier_points = frontier
        return frontier, issues

    def validate_weights(self, weights, assets):
        validation = {
            'valid': True,
            'issues': [],
            'summary': ''
        }

        neg_weights = [(assets[i], float(w)) for i, w in enumerate(weights) if w < -1e-6]
        if neg_weights:
            if self.allow_short:
                validation['issues'].append({
                    'type': 'short_position',
                    'details': neg_weights,
                    'total_short': float(sum(-w for _, w in neg_weights)),
                    'explanation': f"明确结论：当前配置允许做空，共{len(neg_weights)}项资产处于空头状态，合计做空比例{sum(-w for _, w in neg_weights)*100:.2f}%"
                })
            else:
                validation['valid'] = False
                validation['issues'].append({
                    'type': 'negative_weight_unauthorized',
                    'details': neg_weights,
                    'suggestion': f"出现未授权的负权重：{neg_weights}。建议：1) 检查约束条件是否正确设置了min_weight >= 0；2) 若确实需要做空，在约束配置中设置allow_short_selling: true；3) 检查协方差矩阵是否异常"
                })

        weight_sum = np.sum(weights)
        if abs(weight_sum - 1.0) > 1e-4:
            validation['issues'].append({
                'type': 'weight_sum_error',
                'value': float(weight_sum),
                'suggestion': f"权重和为{weight_sum:.6f}，偏离1.0。请检查权重和约束"
            })

        validation['allocation'] = [
            {'asset': assets[i], 'weight': float(w), 'type': 'short' if w < -1e-6 else 'long'}
            for i, w in enumerate(weights)
        ]

        return validation

    def risk_decomposition(self, weights, assets):
        total_vol = self.portfolio_volatility(weights)
        if total_vol < 1e-8:
            return {'total_volatility': 0.0, 'contributions': []}

        marginal_risk = self.cov_matrix @ weights
        component_risk = weights * marginal_risk
        risk_contribution = component_risk / total_vol

        return {
            'total_volatility': float(total_vol),
            'contributions': [
                {
                    'asset': assets[i],
                    'weight': float(weights[i]),
                    'marginal_risk': float(marginal_risk[i]),
                    'component_risk': float(component_risk[i]),
                    'contribution_pct': float(risk_contribution[i] / total_vol * 100) if total_vol > 0 else 0
                }
                for i in range(len(assets))
            ]
        }


class ResultManager:
    def __init__(self, output_dir='results'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def _get_data_hash(self, assets_path, cov_path, constraints_path):
        hash_md5 = hashlib.md5()
        for path in [assets_path, cov_path, constraints_path]:
            if path and os.path.exists(path):
                with open(path, 'rb') as f:
                    for chunk in iter(lambda: f.read(4096), b''):
                        hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def save_result(self, assets_path, cov_path, constraints_path, result_data):
        data_hash = self._get_data_hash(assets_path, cov_path, constraints_path)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        result_data['metadata'] = {
            'data_hash': data_hash,
            'timestamp': timestamp,
            'assets_file': os.path.basename(assets_path),
            'covariance_file': os.path.basename(cov_path),
            'constraints_file': os.path.basename(constraints_path) if constraints_path else None,
            'assets_path': assets_path,
            'cov_path': cov_path,
            'constraints_path': constraints_path
        }

        latest_file = self.output_dir / 'frontier_latest.json'
        with open(latest_file, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)

        history_file = self.output_dir / f'frontier_{timestamp}_{data_hash[:8]}.json'
        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)

        return latest_file, history_file

    def check_previous_result(self, assets_path, cov_path, constraints_path):
        data_hash = self._get_data_hash(assets_path, cov_path, constraints_path)
        latest_file = self.output_dir / 'frontier_latest.json'

        if latest_file.exists():
            with open(latest_file, 'r', encoding='utf-8') as f:
                prev = json.load(f)
            prev_hash = prev.get('metadata', {}).get('data_hash', '')
            if prev_hash == data_hash:
                return True, prev
        return False, None


def check_constraint_conflicts(assets, constraints_config):
    conflicts = []

    min_weights = {}
    max_weights = {}
    sector_limits = []

    for c in constraints_config:
        if c.get('type') == 'min_weight' and c.get('asset'):
            min_weights[c['asset']] = c.get('value', 0)
        elif c.get('type') == 'max_weight' and c.get('asset'):
            max_weights[c['asset']] = c.get('value', 1)
        elif c.get('type') == 'sector_limit':
            sector_limits.append(c)

    for asset in assets:
        if asset in min_weights and asset in max_weights:
            if min_weights[asset] > max_weights[asset]:
                conflicts.append({
                    'type': 'individual_conflict',
                    'asset': asset,
                    'details': f"min({min_weights[asset]}) > max({max_weights[asset]})",
                    'suggestion': f"资产[{asset}]的最小权重{min_weights[asset]}大于最大权重{max_weights[asset]}，请调整其中一个约束"
                })

    for sector in sector_limits:
        sector_assets = [a for a in sector.get('assets', []) if a in assets]
        min_sum = sum(min_weights.get(a, 0) for a in sector_assets)
        max_total = sector.get('max_total', 1.0)
        if min_sum > max_total + 1e-8:
            conflicts.append({
                'type': 'sector_conflict',
                'sector': sector.get('sector', ''),
                'details': f"板块最低权重和({min_sum:.4f}) > 板块上限({max_total})",
                'suggestion': f"板块[{sector.get('sector','')}]内资产最低要求合计{min_sum*100:.2f}%，超过板块上限{max_total*100:.2f}%。建议：1) 降低板块内单资产最低要求；2) 提高板块上限；3) 移除部分资产的最低权重约束"
            })

    return conflicts


def main():
    parser = argparse.ArgumentParser(description='投资组合前沿试算工具')
    parser.add_argument('--assets', required=True, help='资产收益率CSV文件路径')
    parser.add_argument('--cov', required=True, help='协方差矩阵CSV文件路径')
    parser.add_argument('--constraints', help='约束条件YAML文件路径')
    parser.add_argument('--target-return', type=float, help='指定目标收益率，输出该点的详细分析')
    parser.add_argument('--output-dir', default='results', help='结果输出目录')
    parser.add_argument('--force', action='store_true', help='即使输入未变化也强制重新计算')
    parser.add_argument('--skip-cache', action='store_true', help='忽略缓存，直接计算')
    args = parser.parse_args()

    loader = DataLoader(args.assets, args.cov, args.constraints)

    assets_data = loader.load_assets()
    if not assets_data or loader.errors:
        print("=" * 60)
        print("【数据加载错误】")
        for e in loader.errors:
            print(f"  ❌ {e}")
        print("\n请修正后再运行。")
        sys.exit(1)

    valid_assets = assets_data['assets']
    returns = assets_data['returns']
    notes = assets_data['notes']

    cov_data = loader.load_covariance(valid_assets)
    if not cov_data or loader.errors:
        print("=" * 60)
        print("【协方差矩阵加载错误】")
        for e in loader.errors:
            print(f"  ❌ {e}")
        print("\n请修正后再运行。")
        sys.exit(1)

    common_assets = cov_data['assets']
    asset_indices = [valid_assets.index(a) for a in common_assets]
    returns_filtered = returns[asset_indices]
    notes_filtered = [notes[i] for i in asset_indices]
    cov_matrix = cov_data['cov_matrix']

    constraints, allow_short = [], False
    constraint_conflicts = []
    if args.constraints:
        with open(args.constraints, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f) or {}
        constraint_conflicts = check_constraint_conflicts(common_assets, config.get('constraints', []))
        constraints, allow_short = loader.load_constraints(common_assets)
    else:
        default_constraints = []
        default_constraints.append({
            'type': 'eq',
            'fun': lambda w: np.sum(w) - 1.0,
            'description': '权重和=1.0 (默认)'
        })
        for idx, a in enumerate(common_assets):
            def make_constraint(i):
                return lambda w: w[i]
            default_constraints.append({
                'type': 'ineq',
                'fun': make_constraint(idx),
                'description': f'{a} >= 0 (默认不允许做空)'
            })
        constraints = default_constraints

    result_manager = ResultManager(args.output_dir)

    if not args.force and not args.skip_cache:
        is_cached, prev_result = result_manager.check_previous_result(args.assets, args.cov, args.constraints)
        if is_cached:
            print("=" * 60)
            print("ℹ️  检测到输入数据未变化，使用上次计算结果")
            print(f"   上次计算时间: {prev_result['metadata']['timestamp']}")
            print("   使用 --force 参数可强制重新计算")
            print("=" * 60)
            print_report(prev_result, args.target_return, common_assets, notes_filtered, loader.warnings, constraint_conflicts, allow_short)
            sys.exit(0)

    optimizer = PortfolioOptimizer(returns_filtered, cov_matrix, constraints, allow_short)

    print("=" * 60)
    print("📊 投资组合前沿试算")
    print("=" * 60)
    print(f"资产数量: {len(common_assets)}")
    print(f"资产列表: {common_assets}")
    print(f"允许做空: {'是' if allow_short else '否'}")
    print(f"约束数量: {len(constraints)}")
    print()

    if loader.warnings:
        print("⚠️  数据警告:")
        for w in loader.warnings:
            print(f"  [{w['type']}] {w.get('suggestion', str(w))}")
        print()

    if constraint_conflicts:
        print("❌ 约束冲突检测:")
        for c in constraint_conflicts:
            print(f"  [{c['type']}] {c['details']}")
            print(f"     建议: {c['suggestion']}")
        print()

    print("🔄 正在计算有效前沿...")
    frontier, issues = optimizer.calculate_efficient_frontier(n_points=30)

    if frontier is None:
        print(f"❌ 有效前沿计算失败: {issues}")
        sys.exit(1)

    if issues:
        print(f"⚠️  计算过程中发现 {len(issues)} 个问题:")
        for issue in issues[:5]:
            print(f"  [{issue['type']}] {issue.get('target_return', '')}: {issue.get('suggestion', issue.get('message', ''))}")
        if len(issues) > 5:
            print(f"  ... 其余 {len(issues)-5} 个问题详见结果文件")
        print()

    result_data = {
        'assets': common_assets,
        'asset_notes': notes_filtered,
        'expected_returns': returns_filtered.tolist(),
        'covariance_matrix': cov_matrix.tolist(),
        'allow_short_selling': allow_short,
        'efficient_frontier': frontier,
        'data_warnings': loader.warnings,
        'constraint_conflicts': constraint_conflicts,
        'optimization_issues': issues,
    }

    if args.target_return is not None:
        result = optimizer.optimize_min_volatility(args.target_return)
        if result.success:
            weights = result.x
            validation = optimizer.validate_weights(weights, common_assets)
            risk_decomp = optimizer.risk_decomposition(weights, common_assets)
            result_data['target_analysis'] = {
                'target_return': args.target_return,
                'weights': weights.tolist(),
                'expected_return': float(optimizer.portfolio_return(weights)),
                'volatility': float(optimizer.portfolio_volatility(weights)),
                'validation': validation,
                'risk_decomposition': risk_decomp
            }
        else:
            result_data['target_analysis'] = {
                'target_return': args.target_return,
                'success': False,
                'message': result.message
            }

    latest_file, history_file = result_manager.save_result(
        args.assets, args.cov, args.constraints, result_data
    )

    print_report(result_data, args.target_return, common_assets, notes_filtered, loader.warnings, constraint_conflicts, allow_short)

    print(f"\n📁 结果已保存至:")
    print(f"   最新结果: {latest_file}")
    print(f"   历史版本: {history_file}")


def print_report(result_data, target_return, assets, notes, warnings, conflicts, allow_short):
    frontier = result_data['efficient_frontier']
    if not frontier:
        return

    print("\n" + "=" * 60)
    print("📈 有效前沿摘要")
    print("=" * 60)

    min_vol_point = min(frontier, key=lambda p: p['volatility'])
    max_sharpe_point = max(frontier, key=lambda p: p['sharpe'])

    print(f"最小波动率组合: 波动率={min_vol_point['volatility']*100:.2f}%, 收益率={min_vol_point['return']*100:.2f}%")
    print(f"最大夏普比组合: 夏普比={max_sharpe_point['sharpe']:.4f}, 波动率={max_sharpe_point['volatility']*100:.2f}%, 收益率={max_sharpe_point['return']*100:.2f}%")

    print(f"\n前沿范围: 收益率 {frontier[0]['return']*100:.2f}% ~ {frontier[-1]['return']*100:.2f}%")
    print(f"           波动率 {frontier[0]['volatility']*100:.2f}% ~ {frontier[-1]['volatility']*100:.2f}%")

    if 'target_analysis' in result_data:
        ta = result_data['target_analysis']
        print("\n" + "=" * 60)
        print(f"🎯 目标收益率分析 ({ta['target_return']*100:.2f}%)")
        print("=" * 60)

        if ta.get('success', True):
            print(f"预期收益率: {ta['expected_return']*100:.2f}%")
            print(f"组合波动率: {ta['volatility']*100:.2f}%")
            print(f"夏普比率: {ta['expected_return']/ta['volatility']:.4f}")

            print("\n📋 资产权重:")
            for item in ta['validation']['allocation']:
                w_pct = item['weight'] * 100
                marker = "🔴" if item['type'] == 'short' else "🟢"
                print(f"  {marker} {item['asset']:>5}: {w_pct:8.2f}%  ({'做空' if item['type']=='short' else '做多'})")

            if ta['validation']['issues']:
                print("\n⚠️  权重校验问题:")
                for issue in ta['validation']['issues']:
                    if issue['type'] == 'short_position':
                        print(f"  ✅ 做空验证通过（配置允许）")
                        print(f"     {issue['explanation']}")
                        for asset, weight in issue['details']:
                            print(f"       - {asset}: {weight*100:.2f}%")
                    elif issue['type'] == 'negative_weight_unauthorized':
                        print(f"  ❌ 未授权负权重")
                        print(f"     {issue['suggestion']}")
                    elif issue['type'] == 'weight_sum_error':
                        print(f"  ⚠️  权重和异常: {issue['suggestion']}")

            print("\n📊 风险分解:")
            rd = ta['risk_decomposition']
            for item in rd['contributions']:
                print(f"  {item['asset']:>5}: 权重={item['weight']*100:6.2f}%, 边际风险={item['marginal_risk']:.4f}, 风险贡献={item['contribution_pct']:6.2f}%")
        else:
            print(f"❌ 无法达到目标收益率: {ta['message']}")

    print("\n" + "=" * 60)
    print("🔍 前沿动态性说明")
    print("=" * 60)
    print("有效前沿并非固定不变，以下变化会导致前沿移动:")
    print("  1. 资产预期收益率调整 → 前沿整体上下移动")
    print("  2. 协方差矩阵变化 → 前沿形状改变（左凸/右凸）")
    print("  3. 约束条件更新 → 可行域变化，前沿截断或平移")
    print()
    print("当前前沿已启用动态权重校验和风险解释，前沿变化时自动重新计算。")

    if allow_short:
        print("\n" + "=" * 60)
        print("🔴 做空检测已启用")
        print("=" * 60)
        print("当前配置允许做空，负权重为正常结果。")
        print("权重校验会明确标注每一项空头资产及其比例。")


if __name__ == '__main__':
    main()
