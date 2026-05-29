"""
协方差矩阵修复器 - 主程序入口
整合所有模块，提供完整的批处理功能
"""

import os
import glob
import argparse
import pandas as pd
from typing import List, Optional

from config import *
from data_reader import DataReader, MergedData
from missing_handler import MissingHandler, MissingMethod, MissingAnalysisResult
from covariance_fixer import CovarianceFixer, FixMethod, CovarianceResult
from error_tracker import ErrorTracker
from report_generator import ReportGenerator


class CovarianceMatrixFixer:
    def __init__(self,
                 missing_threshold: float = MISSING_THRESHOLD,
                 min_non_missing_obs: int = MIN_NON_MISSING_OBS,
                 epsilon: float = EPSILON,
                 output_dir: str = 'output'):
        
        self.data_reader = DataReader()
        self.missing_handler = MissingHandler(missing_threshold, min_non_missing_obs)
        self.cov_fixer = CovarianceFixer(epsilon)
        self.error_tracker = ErrorTracker()
        self.report_generator = ReportGenerator(output_dir)
        
        self.merged_data: Optional[MergedData] = None
        self.missing_analysis: Optional[MissingAnalysisResult] = None
        self.cov_result: Optional[CovarianceResult] = None
        self.output_dir = output_dir

    def process_files(self,
                     file_paths: List[str],
                     missing_method: MissingMethod = MissingMethod.DROP,
                     fix_method: FixMethod = FixMethod.NEAR_PD,
                     annualize: bool = False,
                     generate_reports: bool = True,
                     generate_plots: bool = True) -> dict:
        
        if not file_paths:
            self.error_tracker.add_error(
                '输入错误', '主程序', '未提供任何输入文件'
            )
            return {'success': False, 'message': '未提供任何输入文件'}
        
        for file_path in file_paths:
            self.error_tracker.add_source_file(file_path)
        
        print("=" * 60)
        print("协方差矩阵修复器 - 开始处理")
        print("=" * 60)
        
        print("\n[1/4] 读取并合并数据...")
        self.merged_data = self.data_reader.merge_multiple_sources(file_paths)
        
        for source in self.merged_data.sources:
            if not source.read_success:
                self.error_tracker.add_error(
                    '文件读取错误', source.file_name, source.error_message
                )
        
        if self.merged_data.returns.empty:
            self.error_tracker.add_error(
                '数据错误', '主程序', '所有文件读取失败或无有效数据'
            )
            return {'success': False, 'message': '无有效数据'}
        
        for source_name, order_list in self.merged_data.original_source_orders.items():
            for idx, asset in enumerate(order_list, 1):
                self.error_tracker.register_asset(asset, source_name, idx)
        
        self.error_tracker.update_current_order(self.merged_data.asset_universe)
        
        print(f"  成功读取 {sum(1 for s in self.merged_data.sources if s.read_success)} 个文件")
        print(f"  合并后资产数: {len(self.merged_data.asset_universe)}")
        print(f"  合并后时间点数: {len(self.merged_data.returns)}")
        
        print("\n[2/4] 检查并处理缺失值...")
        cleaned_returns, self.missing_analysis = self.missing_handler.handle_missing(
            self.merged_data.returns,
            method=missing_method,
            drop_blocked=True
        )
        
        for asset_info in self.missing_analysis.assets:
            if asset_info.blocked:
                self.error_tracker.add_error(
                    '缺失值拦截', '缺失处理', asset_info.block_reason,
                    asset_name=asset_info.asset_name,
                    missing_ratio=f"{asset_info.missing_ratio:.2%}",
                    non_missing_count=asset_info.total_count - asset_info.missing_count
                )
        
        print(f"  总体缺失率: {self.missing_analysis.overall_missing_ratio:.2%}")
        print(f"  通过检查: {len(self.missing_analysis.valid_assets)}")
        print(f"  被拦截: {len(self.missing_analysis.blocked_assets)}")
        
        if self.missing_analysis.blocked_assets:
            print(f"  被拦截资产: {', '.join(self.missing_analysis.blocked_assets)}")
        
        if cleaned_returns.empty:
            self.error_tracker.add_error(
                '数据错误', '缺失处理', '缺失值处理后无有效数据'
            )
            return {'success': False, 'message': '缺失值处理后无有效数据'}
        
        print("\n[3/4] 计算并修复协方差矩阵...")
        cov_matrix = self.cov_fixer.compute_covariance(cleaned_returns, annualize=annualize)
        self.cov_result = self.cov_fixer.fix_covariance(cov_matrix, method=fix_method)
        
        print(f"  原始矩阵是否正定: {'是' if self.cov_result.is_positive_definite else '否'}")
        if not self.cov_result.is_positive_definite:
            print(f"  使用修复方法: {fix_method.value}")
            print(f"  修复后是否正定: {'是' if self.cov_result.fix_success else '否'}")
        
        if not self.cov_result.fix_success:
            self.error_tracker.add_error(
                '正定修复失败', '协方差修复',
                f'使用{fix_method.value}方法修复后矩阵仍非正定',
                min_eigenvalue=self.cov_result.min_eigenvalue
            )
        
        print("\n[4/4] 保存输出...")
        os.makedirs(self.output_dir, exist_ok=True)
        
        if self.cov_result.fixed_matrix is not None:
            cov_output_path = os.path.join(self.output_dir, 'covariance_matrix_fixed.csv')
            self.cov_result.fixed_matrix.to_csv(cov_output_path)
            print(f"  协方差矩阵已保存: {cov_output_path}")
        
        if generate_reports:
            self._generate_reports()
        
        if generate_plots:
            self._generate_plots()
        
        errors_csv_path = os.path.join(self.output_dir, 'error_records.csv')
        self.error_tracker.save_errors_to_csv(errors_csv_path)
        print(f"  错误记录已保存: {errors_csv_path}")
        
        asset_tags_path = os.path.join(self.output_dir, 'asset_tags.csv')
        self.error_tracker.save_asset_tags_to_csv(asset_tags_path)
        print(f"  资产标签已保存: {asset_tags_path}")
        
        print("\n" + "=" * 60)
        print("处理完成!")
        print("=" * 60)
        
        return {
            'success': True,
            'output_dir': self.output_dir,
            'valid_assets': len(self.missing_analysis.valid_assets),
            'blocked_assets': len(self.missing_analysis.blocked_assets),
            'is_positive_definite': self.cov_result.fix_success,
            'error_count': len(self.error_tracker.errors)
        }

    def _generate_reports(self):
        if self.merged_data and self.missing_analysis and self.cov_result:
            txt_report_path = self.report_generator.generate_text_report(
                self.merged_data,
                self.missing_analysis,
                self.cov_result,
                self.error_tracker
            )
            print(f"  文本报告已保存: {txt_report_path}")
            
            excel_report_path = self.report_generator.export_to_excel(
                self.merged_data,
                self.missing_analysis,
                self.cov_result,
                self.error_tracker,
                self.missing_handler
            )
            print(f"  Excel报告已保存: {excel_report_path}")

    def _generate_plots(self):
        if self.merged_data and self.missing_analysis and self.cov_result:
            plots = self.report_generator.generate_all_plots(
                self.merged_data,
                self.missing_analysis,
                self.cov_result,
                self.missing_handler
            )
            print(f"  已生成 {len(plots)} 张诊断图")

    def print_summary(self):
        if self.missing_analysis and self.cov_result:
            print("\n" + self.missing_handler.get_blocked_report(self.missing_analysis))
            print("\n" + self.cov_fixer.get_fix_report(self.cov_result))
            print("\n" + self.error_tracker.get_readable_error_report())
            print("\n" + self.error_tracker.get_asset_tracking_report())


def get_files_from_input(input_paths: List[str]) -> List[str]:
    all_files = []
    
    for path in input_paths:
        if os.path.isfile(path):
            all_files.append(path)
        elif os.path.isdir(path):
            for ext in ['*.csv', '*.xlsx', '*.xls']:
                all_files.extend(glob.glob(os.path.join(path, ext)))
        else:
            for ext in ['', '.csv', '.xlsx', '.xls']:
                matched = glob.glob(path + ext)
                if matched:
                    all_files.extend(matched)
                    break
    
    return sorted(list(set(all_files)))


def main():
    parser = argparse.ArgumentParser(
        description='协方差矩阵修复器 - 处理多源收益率数据，修复非正定协方差矩阵',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  1. 处理单个文件:
     python covariance_matrix_fixer.py returns.csv
     
  2. 处理多个文件:
     python covariance_matrix_fixer.py returns1.csv returns2.csv
     
  3. 处理目录下所有文件:
     python covariance_matrix_fixer.py ./data/
     
  4. 使用线性插值填充缺失值，收缩法修复矩阵:
     python covariance_matrix_fixer.py ./data/ --missing-method interpolate --fix-method shrinkage
     
  5. 年化协方差并设置缺失率阈值:
     python covariance_matrix_fixer.py ./data/ --annualize --missing-threshold 0.2
        """
    )
    
    parser.add_argument('inputs', nargs='+', 
                       help='输入文件或目录路径，支持CSV和Excel格式')
    
    parser.add_argument('--missing-method', type=str, default='drop',
                       choices=['drop', 'fill_zero', 'fill_mean', 'fill_median', 'interpolate'],
                       help='缺失值处理方法 (默认: drop)')
    
    parser.add_argument('--fix-method', type=str, default='near_pd',
                       choices=['near_pd', 'eigenvalue_clipping', 'diagonal_shift', 'shrinkage'],
                       help='正定修复方法 (默认: near_pd)')
    
    parser.add_argument('--missing-threshold', type=float, default=MISSING_THRESHOLD,
                       help=f'缺失率拦截阈值 (默认: {MISSING_THRESHOLD})')
    
    parser.add_argument('--min-obs', type=int, default=MIN_NON_MISSING_OBS,
                       help=f'最小有效观测数 (默认: {MIN_NON_MISSING_OBS})')
    
    parser.add_argument('--annualize', action='store_true',
                       help='是否年化协方差矩阵')
    
    parser.add_argument('--output-dir', type=str, default='output',
                       help='输出目录 (默认: output)')
    
    parser.add_argument('--no-reports', action='store_true',
                       help='不生成报告文件')
    
    parser.add_argument('--no-plots', action='store_true',
                       help='不生成诊断图表')
    
    parser.add_argument('--verbose', action='store_true',
                       help='打印详细摘要信息')
    
    args = parser.parse_args()
    
    file_paths = get_files_from_input(args.inputs)
    
    if not file_paths:
        print("错误: 未找到任何匹配的文件")
        return
    
    print(f"找到 {len(file_paths)} 个文件:")
    for f in file_paths:
        print(f"  - {os.path.basename(f)}")
    print()
    
    missing_method_map = {
        'drop': MissingMethod.DROP,
        'fill_zero': MissingMethod.FILL_ZERO,
        'fill_mean': MissingMethod.FILL_MEAN,
        'fill_median': MissingMethod.FILL_MEDIAN,
        'interpolate': MissingMethod.INTERPOLATE
    }
    
    fix_method_map = {
        'near_pd': FixMethod.NEAR_PD,
        'eigenvalue_clipping': FixMethod.EIGENVALUE_CLIPPING,
        'diagonal_shift': FixMethod.DIAGONAL_SHIFT,
        'shrinkage': FixMethod.SHRINKAGE
    }
    
    fixer = CovarianceMatrixFixer(
        missing_threshold=args.missing_threshold,
        min_non_missing_obs=args.min_obs,
        output_dir=args.output_dir
    )
    
    result = fixer.process_files(
        file_paths=file_paths,
        missing_method=missing_method_map[args.missing_method],
        fix_method=fix_method_map[args.fix_method],
        annualize=args.annualize,
        generate_reports=not args.no_reports,
        generate_plots=not args.no_plots
    )
    
    if args.verbose and result['success']:
        fixer.print_summary()
    
    if result['success']:
        print(f"\n✓ 所有输出已保存至: {result['output_dir']}/")
    else:
        print(f"\n✗ 处理失败: {result.get('message', '未知错误')}")


if __name__ == '__main__':
    main()
