import os
import numpy as np
import pandas as pd


def gauss(logm, center, sigma, amp=1.0):
    return amp * np.exp(-((logm - center) / sigma) ** 2)


def make_sample_normal():
    logms = np.arange(2.5, 6.01, 0.05)
    w = (gauss(logms, 3.0, 0.25, 0.05)
         + gauss(logms, 3.5, 0.25, 0.20)
         + gauss(logms, 4.0, 0.25, 0.35)
         + gauss(logms, 4.5, 0.25, 0.25)
         + gauss(logms, 5.0, 0.25, 0.10)
         + gauss(logms, 5.5, 0.25, 0.05))
    return pd.DataFrame({'分子量': 10 ** logms, '重量分数': w})


def make_sample_wide(seed=0):
    rng = np.random.RandomState(seed)
    logms = np.arange(2.0, 6.51, 0.05)
    shift1 = rng.normal(0, 0.05)
    shift2 = rng.normal(0, 0.05)
    sigma1 = 0.55 + rng.normal(0, 0.03)
    sigma2 = 0.55 + rng.normal(0, 0.03)
    amp2 = 0.78 + rng.normal(0, 0.03)
    w = gauss(logms, 3.3 + shift1, sigma1) + amp2 * gauss(logms, 5.2 + shift2, sigma2)
    return pd.DataFrame({'分子量': 10 ** logms, '重量分数': w})


def make_sample_low_mn():
    logms = np.arange(2.0, 4.01, 0.05)
    w = gauss(logms, 2.7, 0.2) + 0.5 * gauss(logms, 3.2, 0.25)
    return pd.DataFrame({'分子量': 10 ** logms, '重量分数': w})


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sample_data')
    os.makedirs(out_dir, exist_ok=True)

    make_sample_normal().to_excel(os.path.join(out_dir, 'PS-SAMPLE-001_常规分布.xlsx'), index=False)
    make_sample_wide(0).to_excel(os.path.join(out_dir, 'PS-SAMPLE-002_宽分布_第一次.xlsx'), index=False)
    make_sample_wide(7).to_excel(os.path.join(out_dir, 'PS-SAMPLE-002_宽分布_第二次复测.xlsx'), index=False)
    make_sample_low_mn().to_excel(os.path.join(out_dir, 'PS-SAMPLE-003_低分子量.xlsx'), index=False)

    readme = os.path.join(out_dir, 'README.txt')
    with open(readme, 'w', encoding='utf-8') as f:
        f.write('可复现样例数据\n')
        f.write('================\n\n')
        f.write('PS-SAMPLE-001_常规分布.xlsx\n')
        f.write('  - 正常聚苯乙烯样品，PDI 约在 1.8~2.2，无异常警告。\n\n')
        f.write('PS-SAMPLE-002_宽分布_第一次.xlsx\n')
        f.write('  - 模拟聚合温度波动导致的宽分布/双峰样品，PDI > 3，会触发"PDI偏高"异常。\n\n')
        f.write('PS-SAMPLE-002_宽分布_第二次复测.xlsx\n')
        f.write('  - 同一批号 PS-SAMPLE-002 的第二次导入文件，数据与第一次有轻微差异，\n')
        f.write('    用于演示批号重复时的合并策略、历史记录对比、复测建议。\n\n')
        f.write('PS-SAMPLE-003_低分子量.xlsx\n')
        f.write('  - Mn 低于 500 警戒值，会触发"数均分子量超出常规范围"异常，\n')
        f.write('    并提示可能存在残留单体/寡聚物的安全备注。\n\n')
        f.write('使用方式：在系统界面"导入数据"处依次选择上述文件，\n')
        f.write('  前两个文件分别填 PS-SAMPLE-001 / PS-SAMPLE-002，\n')
        f.write('  第三个文件仍然填 PS-SAMPLE-002（体验批号重复），\n')
        f.write('  第四个文件填 PS-SAMPLE-003。\n')
    print(f'样例数据已生成到: {out_dir}')


if __name__ == '__main__':
    main()
