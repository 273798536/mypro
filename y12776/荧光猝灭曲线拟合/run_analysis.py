import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data_loader import DataLoader
from src.fitter import SternVolmerFitter
from src.safety import SafetyAnalyzer
from src.plotter import Plotter
from src.reporter import Reporter


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, 'data')
    output_dir = os.path.join(base_dir, 'output')
    os.makedirs(output_dir, exist_ok=True)

    data_files = [f for f in os.listdir(data_dir)
                  if f.endswith(('.xlsx', '.xls')) and not f.startswith('~')]

    if not data_files:
        print('❌ data 目录下没有找到 Excel 数据文件')
        print('   请将荧光猝灭测试数据 Excel 放入 data/ 目录后重新运行')
        return

    data_file = os.path.join(data_dir, data_files[0])
    print(f'📂 正在处理数据文件: {data_files[0]}')
    print('=' * 70)

    print('\n[1/6] 加载并清洗数据...')
    loader = DataLoader(data_file)
    clean_df, issues = loader.clean()
    print(loader.get_issue_summary())

    print('\n[2/6] 配平前拟合（原始数据）...')
    fitter = SternVolmerFitter(exclude_abnormal=True, exclude_time_missing=False)
    try:
        fit_before = fitter.fit_linear(
            clean_df,
            balance_for_time=False,
            time_issues=issues.get('inconsistent_time'),
            duplicate_batches=issues.get('duplicate_batches')
        )
        print(SternVolmerFitter.format_fit_report(fit_before))
    except Exception as e:
        print(f'❌ 配平前拟合失败: {e}')
        return

    print('\n[3/6] 配平后拟合（校正异常+时间）...')
    try:
        fit_after = fitter.fit_linear(
            clean_df,
            balance_for_time=True,
            time_issues=issues.get('inconsistent_time'),
            duplicate_batches=issues.get('duplicate_batches')
        )
        print(SternVolmerFitter.format_fit_report(fit_after))
    except Exception as e:
        print(f'❌ 配平后拟合失败: {e}')
        fit_after = fit_before

    print('\n[4/6] 安全风险分析...')
    analyzer = SafetyAnalyzer(issues)
    safety_report = analyzer.analyze(fit_before, fit_after)
    print(safety_report.summary_text)

    print('\n[5/6] 生成可视化图表...')
    plotter = Plotter(output_dir)
    plot_files = {}

    plot_files['stern_volmer'] = plotter.plot_stern_volmer(
        fit_before, fit_after, clean_df, issues
    )
    plot_files['residuals'] = plotter.plot_residuals(fit_before, fit_after)
    plot_files['issue_summary'] = plotter.plot_issue_summary(issues)
    plot_files['raw_intensity'] = plotter.plot_intensity_raw(clean_df, issues)
    plot_files['comparison_radar'] = plotter.plot_comparison_radar(fit_before, fit_after)

    print('\n[6/6] 生成综合报告...')
    reporter = Reporter(output_dir)
    html_path = reporter.generate_html_report(
        loader, fit_before, fit_after, analyzer, plot_files
    )
    txt_path = reporter.generate_text_report(
        loader, fit_before, fit_after, analyzer
    )

    print('\n' + '=' * 70)
    print('✅ 分析完成！输出文件清单：')
    print('=' * 70)
    print(f'📊 图表文件（共 {len(plot_files)} 张）:')
    for name, path in plot_files.items():
        print(f'   - {name}: {os.path.basename(path)}')
    print(f'\n📝 报告文件:')
    print(f'   - HTML报告（推荐）: {os.path.relpath(html_path, base_dir)}')
    print(f'   - 文本报告:         {os.path.relpath(txt_path, base_dir)}')
    print('\n📌 使用提示:')
    print('   - 用浏览器打开 HTML 报告查看完整图文分析')
    print('   - "质检主管快速定位清单"直接标出反应时间漏记、批号重复的具体材料和数据行')
    print('   - "安全风险分析"按风险等级列出所有数据问题')
    print('   - "拟合参数对比"可直接看到配平前后是否改变质量判定')
    print('=' * 70)


if __name__ == '__main__':
    main()
