"""
分形生成器 CLI 接口
"""
import argparse
import sys
import json
import os
from typing import Dict, Any

from fractal_service import FractalService, FractalGenerationError


class FractalCLI:
    """分形生成器命令行接口"""

    def __init__(self):
        self.service = FractalService()
        self.parser = self._create_parser()

    def _create_parser(self) -> argparse.ArgumentParser:
        parser = argparse.ArgumentParser(
            description="分形图案生成器 - 数学社课堂工具",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
示例:
  # 使用预设生成分形
  python cli.py preset --name "入门: 经典Mandelbrot"

  # 手动生成分形
  python cli.py generate --type mandelbrot --iter 100 --zoom 2.0 --color ocean

  # 列出所有预设
  python cli.py presets

  # 查看记录列表
  python cli.py records

  # 查看记录详情
  python cli.py show <record_id>

  # 导出现有记录
  python cli.py export <record_id> --output my_fractal.png
            """
        )

        subparsers = parser.add_subparsers(dest="command", help="可用命令")

        preset_parser = subparsers.add_parser("preset", help="使用预设生成分形")
        preset_parser.add_argument("--name", required=True, help="预设名称")
        preset_parser.add_argument("--no-save", action="store_true", help="不保存记录")
        preset_parser.add_argument("--output", help="输出图像路径")

        generate_parser = subparsers.add_parser("generate", help="手动生成分形")
        generate_parser.add_argument("--type", required=True,
                                      choices=["mandelbrot", "julia", "sierpinski", "burning_ship"],
                                      help="分形类型")
        generate_parser.add_argument("--iter", type=int, help="迭代次数")
        generate_parser.add_argument("--depth", type=int, help="递归深度 (sierpinski)")
        generate_parser.add_argument("--zoom", type=float, help="缩放倍数")
        generate_parser.add_argument("--center-x", type=float, help="中心点X坐标")
        generate_parser.add_argument("--center-y", type=float, help="中心点Y坐标")
        generate_parser.add_argument("--c-real", type=float, help="Julia参数实部")
        generate_parser.add_argument("--c-imag", type=float, help="Julia参数虚部")
        generate_parser.add_argument("--color", default="rainbow", help="颜色方案")
        generate_parser.add_argument("--width", type=int, default=800, help="图像宽度")
        generate_parser.add_argument("--height", type=int, default=600, help="图像高度")
        generate_parser.add_argument("--note", default="", help="学生备注")
        generate_parser.add_argument("--no-save", action="store_true", help="不保存记录")
        generate_parser.add_argument("--output", help="输出图像路径")
        generate_parser.add_argument("--estimate", action="store_true", help="只显示预估信息")

        subparsers.add_parser("presets", help="列出所有预设")
        subparsers.add_parser("records", help="列出最近的记录")
        subparsers.add_parser("info", help="显示系统信息")

        show_parser = subparsers.add_parser("show", help="显示记录详情")
        show_parser.add_argument("record_id", help="记录ID")
        show_parser.add_argument("--history", action="store_true", help="显示迭代历史")

        export_parser = subparsers.add_parser("export", help="导出记录图像")
        export_parser.add_argument("record_id", help="记录ID")
        export_parser.add_argument("--output", required=True, help="输出文件路径")
        export_parser.add_argument("--scale", type=float, default=1.0, help="缩放比例")
        export_parser.add_argument("--format", default="PNG", help="输出格式")

        revise_parser = subparsers.add_parser("revise", help="基于现有记录创建新版本")
        revise_parser.add_argument("record_id", help="原记录ID")
        revise_parser.add_argument("--iter", type=int, help="新的迭代次数")
        revise_parser.add_argument("--zoom", type=float, help="新的缩放倍数")
        revise_parser.add_argument("--color", help="新的颜色方案")
        revise_parser.add_argument("--note", default="", help="备注")

        return parser

    def run(self, args=None):
        if args is None:
            args = sys.argv[1:]

        parsed = self.parser.parse_args(args)

        if not parsed.command:
            self.parser.print_help()
            return

        try:
            handler = getattr(self, f"_handle_{parsed.command}", None)
            if handler:
                handler(parsed)
            else:
                print(f"未知命令: {parsed.command}")
                self.parser.print_help()
        except FractalGenerationError as e:
            self._print_error(e)
            sys.exit(1)
        except Exception as e:
            print(f"错误: {e}", file=sys.stderr)
            sys.exit(1)

    def _handle_preset(self, args):
        print(f"使用预设: {args.name}")
        print("正在生成...")

        result = self.service.generate_from_preset(args.name, save=not args.no_save)
        self._print_generation_result(result)

        if args.output:
            result["image"].save(args.output)
            print(f"图像已保存到: {args.output}")
        elif not args.no_save:
            print(f"记录ID: {result['record'].id}")

    def _handle_generate(self, args):
        params = {}
        if args.iter is not None:
            params["max_iter"] = args.iter
        if args.depth is not None:
            params["depth"] = args.depth
        if args.zoom is not None:
            params["zoom"] = args.zoom
        if args.center_x is not None:
            params["center_x"] = args.center_x
        if args.center_y is not None:
            params["center_y"] = args.center_y
        if args.c_real is not None:
            params["c_real"] = args.c_real
        if args.c_imag is not None:
            params["c_imag"] = args.c_imag

        if args.estimate:
            estimate = self.service.get_estimate(args.type, params, args.width, args.height)
            self._print_estimate(estimate)
            return

        print(f"生成分形: {args.type}")
        print(f"参数: {params}")
        print("正在生成...")

        result = self.service.generate_fractal(
            fractal_type=args.type,
            params=params,
            color_scheme=args.color,
            width=args.width,
            height=args.height,
            student_note=args.note,
            save=not args.no_save,
        )

        self._print_generation_result(result)

        if args.output:
            result["image"].save(args.output)
            print(f"图像已保存到: {args.output}")
        elif not args.no_save:
            print(f"记录ID: {result['record'].id}")

    def _handle_presets(self, args):
        presets = self.service.list_presets()
        print(f"可用预设 ({len(presets)}个):")
        print("-" * 60)
        for preset in presets:
            difficulty_color = {
                "beginner": "入门",
                "intermediate": "进阶",
                "advanced": "挑战",
            }
            difficulty = difficulty_color.get(preset["difficulty"], preset["difficulty"])
            print(f"[{difficulty}] {preset['name']}")
            print(f"    类型: {preset['fractal_type']} | 配色: {preset['color_scheme']}")
            print(f"    {preset['description']}")
            print()

    def _handle_records(self, args):
        records = self.service.storage.list_records(limit=20)
        print(f"最近记录 ({len(records)}条):")
        print("-" * 80)
        for record in records:
            status = "✓" if record.image_path else "○"
            source_icon = {
                "manual": "手",
                "preset": "预",
                "revision": "修",
            }.get(record.source, "?")
            print(f"{status} [{source_icon}] {record.id}  {record.fractal_type:<12} "
                  f"{record.color_scheme:<10} {record.created_at[:19]}")
            if record.student_note:
                note = record.student_note[:50] + "..." if len(record.student_note) > 50 else record.student_note
                print(f"    备注: {note}")

    def _handle_info(self, args):
        info = self.service.get_fractal_info()
        stats = self.service.get_statistics()

        print("=" * 50)
        print("分形图案生成器 - 系统信息")
        print("=" * 50)
        print()
        print("支持的分形类型:")
        for ft in info["fractal_types"]:
            print(f"  - {ft}")
        print()
        print("可用颜色方案:")
        for cs, name in info["color_scheme_names"].items():
            print(f"  - {cs}: {name}")
        print()
        print("存储统计:")
        print(f"  总记录数: {stats['total_records']}")
        print(f"  图像数: {stats['total_images']}")
        print(f"  作品集数: {stats['total_portfolios']}")
        print(f"  总大小: {stats['total_size_mb']} MB")

    def _handle_show(self, args):
        record = self.service.storage.get_record(args.record_id)
        if not record:
            print(f"记录不存在: {args.record_id}")
            return

        print("=" * 50)
        print(f"记录详情: {record.id}")
        print("=" * 50)
        print(f"分形类型: {record.fractal_type}")
        print(f"颜色方案: {record.color_scheme}")
        print(f"图像尺寸: {record.width}x{record.height}")
        print(f"创建时间: {record.created_at}")
        print(f"渲染时间: {record.render_time_ms:.2f} ms")
        print(f"来源: {record.source}")
        if record.parent_id:
            print(f"父记录: {record.parent_id} (修订版本 v{record.revision})")
        print()
        print("参数:")
        for k, v in record.params.items():
            print(f"  {k}: {v}")
        print()
        if record.student_note:
            print(f"学生备注: {record.student_note}")
            print()
        if record.validation_messages:
            print(f"验证消息 ({len(record.validation_messages)}条):")
            for msg in record.validation_messages:
                icon = {"info": "ℹ", "warning": "⚠", "error": "✗"}.get(msg["severity"], "?")
                print(f"  {icon} [{msg['field']}] {msg['message']}")
                if msg.get("suggestion"):
                    print(f"     建议: {msg['suggestion']}")

        if args.history:
            history = self.service.storage.get_record_history(args.record_id)
            print()
            print("迭代历史:")
            for i, h in enumerate(history, 1):
                print(f"  {i}. {h.id} ({h.created_at[:19]})")
                if h.student_note:
                    note = h.student_note[:40] + "..." if len(h.student_note) > 40 else h.student_note
                    print(f"     {note}")

    def _handle_export(self, args):
        success = self.service.export_image(
            record_id=args.record_id,
            output_path=args.output,
            format=args.format,
            scale=args.scale,
        )
        if success:
            print(f"导出成功: {args.output}")
        else:
            print("导出失败: 记录不存在或没有图像")

    def _handle_revise(self, args):
        new_params = {}
        if args.iter is not None:
            new_params["max_iter"] = args.iter
        if args.zoom is not None:
            new_params["zoom"] = args.zoom

        print(f"正在创建修订版本...")
        result = self.service.revise_record(
            record_id=args.record_id,
            new_params=new_params,
            new_color_scheme=args.color,
            new_note=args.note,
        )

        print(f"修订成功！新记录ID: {result['record'].id}")
        print(f"基于记录: {args.record_id}")
        print(f"新版本: v{result['record'].revision}")

    def _print_generation_result(self, result: Dict[str, Any]):
        print(f"✓ 生成完成！")
        print(f"  渲染时间: {result['render_time_ms']:.2f} ms")

        if result["validation_messages"]:
            warnings = [m for m in result["validation_messages"] if m["severity"] == "warning"]
            infos = [m for m in result["validation_messages"] if m["severity"] == "info"]
            if warnings:
                print(f"  ⚠ 警告: {len(warnings)}条")
                for w in warnings[:3]:
                    print(f"     - {w['message']}")
            if infos:
                print(f"  ℹ 提示: {len(infos)}条")

        print(f"  使用参数: {result['params_used']}")

    def _print_estimate(self, estimate: Dict[str, Any]):
        est = estimate["estimate"]
        print(f"预估渲染时间: {est['estimated_ms']:.2f} ms")
        if est["warning"]:
            print(f"⚠ 警告: {est['warning']}")
        print(f"计算复杂度: {est['complexity']}")
        print(f"安全参数: {estimate['safe_params']}")

        if not estimate["validation"]["valid"]:
            print("验证错误:")
            for msg in estimate["validation"]["messages"]:
                if msg["severity"] == "error":
                    print(f"  ✗ {msg['message']}")

    def _print_error(self, error: FractalGenerationError):
        print(f"✗ 错误: {error}", file=sys.stderr)
        print(f"  错误代码: {error.code}", file=sys.stderr)

        if error.details.get("validation_messages"):
            print("  详细信息:", file=sys.stderr)
            for msg in error.details["validation_messages"]:
                icon = {"info": "ℹ", "warning": "⚠", "error": "✗"}.get(msg["severity"], "?")
                print(f"    {icon} [{msg['field']}] {msg['message']}", file=sys.stderr)
                if msg.get("suggestion"):
                    print(f"       建议: {msg['suggestion']}", file=sys.stderr)


def main():
    cli = FractalCLI()
    cli.run()


if __name__ == "__main__":
    main()
