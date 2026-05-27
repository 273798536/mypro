"""
创建样例数据脚本
包含: 正常记录、边界记录、坏数据
"""
import sys
import os

from fractal_service import FractalService, FractalGenerationError
from validator import FractalValidator


def create_normal_samples(service: FractalService):
    """创建正常记录"""
    print("=" * 60)
    print("创建正常记录...")
    print("=" * 60)

    normal_cases = [
        {
            "name": "经典Mandelbrot",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": 100, "zoom": 1.0, "center_x": -0.5, "center_y": 0.0},
            "color_scheme": "rainbow",
            "note": "正常记录1: 经典的Mandelbrot集合，迭代次数适中，参数在合理范围内",
            "width": 800,
            "height": 600,
        },
        {
            "name": "Julia集合",
            "fractal_type": "julia",
            "params": {"max_iter": 150, "zoom": 1.0, "c_real": -0.7, "c_imag": 0.27015},
            "color_scheme": "ocean",
            "note": "正常记录2: Julia集合，使用经典的c=-0.7+0.27015i参数",
            "width": 600,
            "height": 600,
        },
        {
            "name": "Sierpinski三角形",
            "fractal_type": "sierpinski",
            "params": {"depth": 6},
            "color_scheme": "grayscale",
            "note": "正常记录3: Sierpinski三角形，递归深度6",
            "width": 512,
            "height": 512,
        },
    ]

    for i, case in enumerate(normal_cases, 1):
        try:
            print(f"\n[{i}/{len(normal_cases)}] {case['name']}")
            result = service.generate_fractal(
                fractal_type=case["fractal_type"],
                params=case["params"],
                color_scheme=case["color_scheme"],
                width=case["width"],
                height=case["height"],
                student_note=case["note"],
                save=True,
                source="sample_normal",
            )
            print(f"  ✓ 生成成功，记录ID: {result['record'].id}")
            print(f"  渲染时间: {result['render_time_ms']:.2f} ms")
            if result["validation_messages"]:
                print(f"  验证消息: {len(result['validation_messages'])}条")
        except Exception as e:
            print(f"  ✗ 失败: {e}")


def create_boundary_samples(service: FractalService):
    """创建边界记录（接近阈值但仍有效）"""
    print("\n" + "=" * 60)
    print("创建边界记录...")
    print("=" * 60)

    boundary_cases = [
        {
            "name": "高迭代次数Mandelbrot",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": 1000, "zoom": 1.0, "center_x": -0.5, "center_y": 0.0},
            "color_scheme": "inferno",
            "note": "边界记录1: 迭代次数1000，接近性能警告阈值(2000)，会触发性能警告但仍能正常生成",
            "width": 800,
            "height": 600,
        },
        {
            "name": "高缩放倍数Mandelbrot",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": 300, "zoom": 5000.0, "center_x": -0.743643887037151, "center_y": 0.131825904205330},
            "color_scheme": "plasma",
            "note": "边界记录2: 缩放倍数5000，接近警告阈值，需要高迭代次数才能看清细节",
            "width": 800,
            "height": 600,
        },
        {
            "name": "大尺寸图像",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": 50, "zoom": 1.0, "center_x": -0.5, "center_y": 0.0},
            "color_scheme": "sunset",
            "note": "边界记录3: 图像尺寸1920x1080，接近尺寸警告阈值，低迭代次数以保持性能",
            "width": 1920,
            "height": 1080,
        },
        {
            "name": "最大Sierpinski深度",
            "fractal_type": "sierpinski",
            "params": {"depth": 10},
            "color_scheme": "forest",
            "note": "边界记录4: Sierpinski最大递归深度10，生成1024x1024图像",
            "width": 512,
            "height": 512,
        },
    ]

    for i, case in enumerate(boundary_cases, 1):
        try:
            print(f"\n[{i}/{len(boundary_cases)}] {case['name']}")
            result = service.generate_fractal(
                fractal_type=case["fractal_type"],
                params=case["params"],
                color_scheme=case["color_scheme"],
                width=case["width"],
                height=case["height"],
                student_note=case["note"],
                save=True,
                source="sample_boundary",
                auto_safe=True,
            )
            print(f"  ✓ 生成成功，记录ID: {result['record'].id}")
            print(f"  渲染时间: {result['render_time_ms']:.2f} ms")
            print(f"  使用参数: {result['params_used']}")

            warnings = [m for m in result["validation_messages"] if m["severity"] == "warning"]
            infos = [m for m in result["validation_messages"] if m["severity"] == "info"]
            if warnings:
                print(f"  ⚠ 警告: {len(warnings)}条")
                for w in warnings:
                    print(f"    - {w['message']}")
            if infos:
                print(f"  ℹ 提示: {len(infos)}条")
        except Exception as e:
            print(f"  ✗ 失败: {e}")


def create_bad_data_samples(service: FractalService):
    """创建坏数据示例（展示错误处理）"""
    print("\n" + "=" * 60)
    print("创建坏数据示例（展示错误处理）...")
    print("=" * 60)

    bad_cases = [
        {
            "name": "无效分形类型",
            "fractal_type": "invalid_fractal",
            "params": {"max_iter": 100},
            "color_scheme": "rainbow",
            "note": "坏数据1: 使用不存在的分形类型",
            "width": 800,
            "height": 600,
        },
        {
            "name": "负迭代次数",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": -50, "zoom": 1.0},
            "color_scheme": "rainbow",
            "note": "坏数据2: 迭代次数为负数，应该被自动修正",
            "width": 800,
            "height": 600,
        },
        {
            "name": "迭代次数超限",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": 50000, "zoom": 1.0},
            "color_scheme": "rainbow",
            "note": "坏数据3: 迭代次数超过最大值(50000>10000)，应该被自动限制",
            "width": 800,
            "height": 600,
        },
        {
            "name": "无效颜色方案",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": 100, "zoom": 1.0},
            "color_scheme": "invalid_color",
            "note": "坏数据4: 使用不存在的颜色方案",
            "width": 800,
            "height": 600,
        },
        {
            "name": "负缩放倍数",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": 100, "zoom": -2.0},
            "color_scheme": "rainbow",
            "note": "坏数据5: 缩放倍数为负数，应该被自动修正",
            "width": 800,
            "height": 600,
        },
        {
            "name": "超大尺寸",
            "fractal_type": "mandelbrot",
            "params": {"max_iter": 100, "zoom": 1.0},
            "color_scheme": "rainbow",
            "note": "坏数据6: 图像尺寸超过最大值(5000x5000>4096x4096)",
            "width": 5000,
            "height": 5000,
        },
    ]

    for i, case in enumerate(bad_cases, 1):
        print(f"\n[{i}/{len(bad_cases)}] {case['name']}")
        print(f"  参数: {case['fractal_type']} - {case['params']}")

        try:
            result = service.generate_fractal(
                fractal_type=case["fractal_type"],
                params=case["params"],
                color_scheme=case["color_scheme"],
                width=case["width"],
                height=case["height"],
                student_note=case["note"],
                save=True,
                source="sample_bad",
                auto_safe=True,
            )
            print(f"  ✓ 自动修复后生成成功，记录ID: {result['record'].id}")
            print(f"  修正后参数: {result['params_used']}")

            warnings = [m for m in result["validation_messages"] if m["severity"] == "warning"]
            errors = [m for m in result["validation_messages"] if m["severity"] == "error"]
            if warnings:
                print(f"  ⚠ 警告: {len(warnings)}条")
                for w in warnings:
                    print(f"    - {w['message']}")
            if errors:
                print(f"  ✗ 错误: {len(errors)}条")
        except FractalGenerationError as e:
            print(f"  ✗ 预期的错误: {e}")
            print(f"    错误代码: {e.code}")
            if e.details.get("validation_messages"):
                for msg in e.details["validation_messages"]:
                    print(f"    [{msg['severity']}] {msg['message']}")
                    if msg.get("suggestion"):
                        print(f"      建议: {msg['suggestion']}")
        except Exception as e:
            print(f"  ✗ 意外错误: {e}")


def create_revision_samples(service: FractalService):
    """创建迭代修订示例"""
    print("\n" + "=" * 60)
    print("创建迭代修订示例...")
    print("=" * 60)

    try:
        print("创建原始记录...")
        result1 = service.generate_fractal(
            fractal_type="mandelbrot",
            params={"max_iter": 50, "zoom": 1.0, "center_x": -0.5, "center_y": 0.0},
            color_scheme="rainbow",
            width=600,
            height= 450,
            student_note="修订示例v1: 初始版本，低迭代次数",
            save=True,
            source="sample_revision",
        )
        parent_id = result1["record"].id
        print(f"  ✓ 原始记录ID: {parent_id}")

        print("创建修订版本v2（增加迭代次数）...")
        result2 = service.revise_record(
            record_id=parent_id,
            new_params={"max_iter": 100},
            new_note="修订示例v2: 增加迭代次数到100，细节更丰富",
        )
        print(f"  ✓ 修订v2记录ID: {result2['record'].id}")

        print("创建修订版本v3（调整缩放）...")
        result3 = service.revise_record(
            record_id=result2["record"].id,
            new_params={"zoom": 2.0, "center_x": -0.7, "center_y": 0.2},
            new_color_scheme="inferno",
            new_note="修订示例v3: 放大到有趣区域，更换颜色方案",
        )
        print(f"  ✓ 修订v3记录ID: {result3['record'].id}")

        print(f"\n查看迭代历史: python cli.py show {result3['record'].id} --history")

    except Exception as e:
        print(f"  ✗ 失败: {e}")


def main():
    print("分形图案生成器 - 样例数据创建脚本")
    print("本脚本将创建三类样例数据:")
    print("  1. 正常记录 - 参数合理，无警告")
    print("  2. 边界记录 - 接近阈值，触发性能警告")
    print("  3. 坏数据示例 - 展示错误处理和自动修复")
    print("  4. 迭代修订示例 - 展示版本追踪功能")

    service = FractalService(data_dir="data")

    try:
        create_normal_samples(service)
        create_boundary_samples(service)
        create_bad_data_samples(service)
        create_revision_samples(service)

        print("\n" + "=" * 60)
        print("样例数据创建完成！")
        print("=" * 60)
        stats = service.get_statistics()
        print(f"总记录数: {stats['total_records']}")
        print(f"图像数: {stats['total_images']}")
        print(f"总大小: {stats['total_size_mb']} MB")
        print("\n查看记录: python cli.py records")
        print("查看详情: python cli.py show <record_id>")

    except KeyboardInterrupt:
        print("\n操作被用户中断")
        sys.exit(1)


if __name__ == "__main__":
    main()
