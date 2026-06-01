#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
水波干涉乐园 - 课堂演示主程序

物理社团老师使用说明：
1. 直接运行本程序即可看到三种场景的演示
2. 每个场景都会展示：波源配置 -> 波动模拟 -> 边界反射检测 -> 结算报告
3. 重点关注：
   - 样例1: 正常记录，展示理想的双波源干涉
   - 样例2: 边界反射例外，需要人工确认的情况
   - 样例3: 波源重叠失败，结算会说明与波动模拟的关系

无需读代码，直接运行看输出即可确认各分支是否生效。
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from wave_interference import WaveInterferenceGame


def main():
    print("\n" + "#" * 70)
    print("#" + " " * 68 + "#")
    print("#" + " " * 20 + "🌊 水波干涉乐园 🌊" + " " * 27 + "#")
    print("#" + " " * 68 + "#")
    print("#" + " " * 15 + "课堂演示版 - 边界反射分支验证" + " " * 18 + "#")
    print("#" + " " * 68 + "#")
    print("#" * 70)

    game = WaveInterferenceGame(grid_size=(50, 50), target_amplitude=1.5)

    print("\n" + "📋" + " 即将展示三个样例，验证系统各分支逻辑：")
    print("   1️⃣  正常双波源干涉 → 验证胜利分支")
    print("   2️⃣  边界反射场景 → 验证例外需人工确认分支")
    print("   3️⃣  波源重叠场景 → 验证失败分支及波动模拟关系说明")
    print("\n" + "-" * 70)

    input("\n按 Enter 开始样例 1（正常记录）...")
    result1 = game.demo_normal_scenario()

    input("\n\n按 Enter 继续样例 2（边界反射例外）...")
    result2 = game.demo_boundary_reflection_scenario()

    input("\n\n按 Enter 继续样例 3（波源重叠失败）...")
    result3 = game.demo_overlapping_source_scenario()

    print("\n\n" + "=" * 70)
    print("📊 所有样例运行完成 - 分支验证汇总")
    print("=" * 70)
    game.print_summary()

    print("✅ 验证结论：")
    print(
        f"   正常分支: {'生效 ✓' if result1.result.value == 'win' else '未生效 ✗'}"
    )
    print(
        f"   边界反射分支: {'生效 ✓' if result2.result.value == 'needs_review' or result2.reflection_summary.get('needs_confirm', 0) > 0 else '未生效 ✗'}"
    )
    print(
        f"   失败分支: {'生效 ✓' if result3.result.value == 'lose' else '未生效 ✗'}"
    )
    print(
        f"   波动模拟关系说明: {'生效 ✓' if result3.wave_simulation_relation else '未生效 ✗'}"
    )
    print("\n物理社团老师可通过以上输出确认所有分支正常工作。")
    print("=" * 70)


if __name__ == "__main__":
    main()
