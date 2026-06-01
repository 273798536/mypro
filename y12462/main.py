#!/usr/bin/env python3
"""三角函数灯塔赛 - 主入口"""

import os
from trig_lighthouse.game import TrigLighthouseGame
from trig_lighthouse.levels import get_all_levels
from trig_lighthouse.parser import DataParser
from trig_lighthouse.report import ReportGenerator
from trig_lighthouse.models import Angle, AngleUnit


def show_menu():
    """显示菜单"""
    print("\n" + "=" * 50)
    print("    三角函数灯塔赛")
    print("=" * 50)
    print("1. 开始游戏")
    print("2. 查看复盘")
    print("3. 解析光束日志")
    print("4. 单位圆对比")
    print("5. 退出")
    print("=" * 50)


def play_game():
    """开始游戏"""
    game = TrigLighthouseGame()
    levels = get_all_levels()

    print("\n选择关卡:")
    for i, level in enumerate(levels, 1):
        print(f"  {i}. {level.name} (难度: {level.difficulty})")

    try:
        choice = int(input("\n请输入关卡编号: ")) - 1
        if choice < 0 or choice >= len(levels):
            print("无效的关卡编号")
            return

        level = levels[choice]
        game.start_level(level)
        print(f"\n开始: {level.name}")
        print(f"描述: {level.description}")
        print(f"目标数: {len(level.targets)}")

        while True:
            print(f"\n当前尝试: {game.state.attempts}")
            angle_input = input("输入光束角度 (输入 'q' 结束): ")

            if angle_input.lower() == 'q':
                break

            try:
                parser = DataParser()
                angle = parser.parse_angle(angle_input)
                hits = game.shoot_beam(angle)
                print(f"发射: {angle.value} {angle.unit.value}")
                if hits:
                    print(f"✓ 命中目标: {hits}")
                else:
                    print("✗ 未命中")

                remaining = [t for t in level.targets if not t.hit]
                if not remaining:
                    print("\n🎉 所有目标已命中！")
                    break

            except ValueError as e:
                print(f"输入错误: {e}")

        result = game.end_game()
        reporter = ReportGenerator()
        print("\n" + reporter.generate_text_report(result))

        os.makedirs("output", exist_ok=True)
        reporter.export_json(result, f"output/{level.id}_result.json")
        print(f"报告已保存到 output/{level.id}_result.json")

    except ValueError:
        print("请输入有效的数字")


def show_review():
    """显示复盘"""
    game = TrigLighthouseGame()
    levels = get_all_levels()

    print("\n运行模拟游戏生成数据...")
    for level in levels:
        game.start_level(level)
        for target in level.targets:
            game.shoot_beam(target.expected_angle)
        game.end_game()

    reporter = ReportGenerator()
    print("\n" + reporter.generate_review_report(game.history))


def parse_log():
    """解析光束日志"""
    parser = DataParser()
    log_file = "data/beam_angles.txt"

    if not os.path.exists(log_file):
        print(f"日志文件不存在: {log_file}")
        return

    angles, errors = parser.parse_beam_angle_log(log_file)

    print(f"\n有效角度 ({len(angles)} 个):")
    for i, angle in enumerate(angles, 1):
        print(f"  {i}. {angle.value:.4f} {angle.unit.value}")

    print(f"\n坏行 ({len(errors)} 个):")
    for err in errors:
        print(f"  [{err.error_type.value}] 行{err.row_number}: {err.message}")
        if err.raw_data:
            print(f"    原始数据: '{err.raw_data}'")


def compare_unit_circle():
    """单位圆对比"""
    game = TrigLighthouseGame()

    print("\n单位圆对比工具")
    try:
        old_input = input("输入原始角度: ")
        new_input = input("输入修改后角度: ")

        parser = DataParser()
        old_angle = parser.parse_angle(old_input)
        new_angle = parser.parse_angle(new_input)

        old_point = game.calculate_unit_circle(old_angle, version="original")
        new_point = game.calculate_unit_circle(new_angle, version="modified")

        print(f"\n原始角度: {old_point.angle.value} {old_point.angle.unit.value}")
        print(f"  象限: {old_point.quadrant.value}")
        print(f"  sin = {old_point.sin:.4f}")
        print(f"  cos = {old_point.cos:.4f}")

        print(f"\n修改后: {new_point.angle.value} {new_point.angle.unit.value}")
        print(f"  象限: {new_point.quadrant.value}")
        print(f"  sin = {new_point.sin:.4f}")
        print(f"  cos = {new_point.cos:.4f}")

        comparison = game.get_comparison_report(old_point, new_point)
        print(f"\n差异: {comparison['explanation']}")

    except ValueError as e:
        print(f"错误: {e}")


def main():
    """主函数"""
    while True:
        show_menu()
        choice = input("\n请选择操作: ")

        if choice == "1":
            play_game()
        elif choice == "2":
            show_review()
        elif choice == "3":
            parse_log()
        elif choice == "4":
            compare_unit_circle()
        elif choice == "5":
            print("再见！")
            break
        else:
            print("无效的选择")


if __name__ == "__main__":
    main()
