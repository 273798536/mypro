#!/usr/bin/env python3
import sys
import argparse
import numpy as np
from typing import Optional
import inspect

from physics_core import SimulationParams, FaradayLawCalculator
from parameter_validator import ParameterValidator, ValidationResult
from visualization import SimulationVisualizer
from report_exporter import ReportExporter


def print_banner():
    print("=" * 70)
    print("  电磁感应线圈模拟器 v1.0")
    print("  Electromagnetic Induction Simulator")
    print("=" * 70)
    print()
    print("功能: 模拟磁铁穿过线圈时的感应电流变化")
    print("原理: 法拉第电磁感应定律 ε = -N·dΦ/dt")
    print()


def run_simulation(params: SimulationParams, show_plot: bool = False, 
                   save_plot: bool = False, save_animation: bool = False,
                   export_report: bool = False, verbose: bool = False):
    source_func = inspect.currentframe().f_code.co_name
    source_line = inspect.currentframe().f_lineno + 1
    
    print(f"[INFO] {source_func} (L{source_line}): 开始参数验证...")
    
    validator = ParameterValidator()
    validation_result = validator.validate_all(params)
    
    if validation_result.errors:
        print(f"\n[ERROR] {source_func} (L{source_line}): 参数验证发现错误:")
        for error in validation_result.errors:
            print(f"  {error}")
        print()
    
    if validation_result.warnings and verbose:
        print(f"[WARNING] {source_func} (L{source_line}): 参数验证警告:")
        for warning in validation_result.warnings:
            print(f"  {warning}")
        print()
    
    if validation_result.corrections:
        print(f"[INFO] {source_func} (L{source_line}): 已自动修正以下参数:")
        for corr in validation_result.corrections:
            print(f"  {corr.variable_name}: {corr.value_before} → {corr.value_after}")
            if verbose:
                print(f"    位置: {corr.source_file}:{corr.line_number}")
                print(f"    原因: {corr.reason}")
        print()
        params = validation_result.corrected_params
    
    if not validation_result.is_valid:
        proceed = input("参数存在错误但已自动修正，是否继续模拟？(y/n): ").strip().lower()
        if proceed != 'y':
            print("模拟已取消。")
            return None
    
    print(f"[INFO] {source_func} (L{source_line}): 使用参数:")
    print(f"  速度 v = {params.magnet_speed} m/s")
    print(f"  匝数 N = {params.coil_turns} 匝")
    print(f"  磁场 B = {params.magnet_field_strength} T")
    print(f"  时间步 Δt = {params.time_step} s")
    print(f"  总时间 T = {params.total_time} s")
    print()
    
    print(f"[INFO] {source_func} (L{source_line}): 开始模拟计算...")
    calculator = FaradayLawCalculator(params)
    times, fluxes, emfs, currents = calculator.run_simulation()
    print(f"[INFO] {source_func} (L{source_line}): 模拟完成，共 {len(times)} 步")
    print()
    
    max_current = np.max(np.abs(currents))
    max_emf = np.max(np.abs(emfs))
    max_flux = np.max(np.abs(fluxes))
    print(f"[RESULT] 最大磁通量: {max_flux:.6f} Wb")
    print(f"[RESULT] 最大感应电动势: {max_emf:.6f} V")
    print(f"[RESULT] 最大感应电流: {max_current:.6f} A")
    print()
    
    visualizer = SimulationVisualizer(params, calculator)
    
    if save_plot:
        plot_path = f"simulation_plot_v{params.magnet_speed}_N{params.coil_turns}.png"
        visualizer.plot_curves(times, fluxes, emfs, currents, save_path=plot_path)
    
    if show_plot:
        visualizer.show_interactive(times, fluxes, emfs, currents)
    
    if save_animation:
        anim_path = f"simulation_anim_v{params.magnet_speed}_N{params.coil_turns}.mp4"
        visualizer.create_animation(times, fluxes, emfs, currents, save_path=anim_path)
    
    if export_report:
        exporter = ReportExporter(params, calculator)
        base_name = f"simulation_v{params.magnet_speed}_N{params.coil_turns}"
        exporter.export_text_report(times, fluxes, emfs, currents, validation_result, 
                                   save_path=f"{base_name}_report.txt")
        exporter.export_csv_data(times, fluxes, emfs, currents, 
                                save_path=f"{base_name}_data.csv")
        exporter.export_markdown_report(times, fluxes, emfs, currents, validation_result,
                                       save_path=f"{base_name}_report.md")
    
    return {
        'params': params,
        'times': times,
        'fluxes': fluxes,
        'emfs': emfs,
        'currents': currents,
        'calculator': calculator,
        'validation_result': validation_result
    }


def interactive_mode():
    print("\n=== 交互式参数设置 ===")
    print("请输入模拟参数（直接回车使用默认值）:")
    
    try:
        speed_input = input("磁铁速度 (m/s) [1.0]: ").strip()
        speed = float(speed_input) if speed_input else 1.0
        
        turns_input = input("线圈匝数 (匝) [100]: ").strip()
        turns = int(turns_input) if turns_input else 100
        
        field_input = input("磁场强度 (T) [0.5]: ").strip()
        field = float(field_input) if field_input else 0.5
        
        dt_input = input("时间步长 (s) [0.01]: ").strip()
        dt = float(dt_input) if dt_input else 0.01
        
        total_time_input = input("总时间 (s) [2.0]: ").strip()
        total_time = float(total_time_input) if total_time_input else 2.0
        
        params = SimulationParams(
            magnet_speed=speed,
            coil_turns=turns,
            magnet_field_strength=field,
            time_step=dt,
            total_time=total_time
        )
        
        show_plot = input("是否显示曲线图？(y/n) [n]: ").strip().lower() == 'y'
        save_plot = input("是否保存曲线图？(y/n) [y]: ").strip().lower() != 'n'
        save_anim = input("是否保存动画？(需要ffmpeg) (y/n) [n]: ").strip().lower() == 'y'
        export_report = input("是否导出实验报告？(y/n) [y]: ").strip().lower() != 'n'
        
        print()
        run_simulation(params, show_plot=show_plot, save_plot=save_plot, 
                      save_animation=save_anim, export_report=export_report, verbose=True)
        
    except ValueError as e:
        print(f"[ERROR] interactive_mode: 输入错误: {e}")
        return


def demo_mode():
    print("\n=== 演示模式 ===")
    print("将运行3组不同参数的模拟进行对比...\n")
    
    demo_params = [
        SimulationParams(magnet_speed=0.5, coil_turns=100, time_step=0.01, total_time=3.0),
        SimulationParams(magnet_speed=1.0, coil_turns=100, time_step=0.01, total_time=2.0),
        SimulationParams(magnet_speed=2.0, coil_turns=100, time_step=0.005, total_time=1.5),
    ]
    
    results = []
    for i, params in enumerate(demo_params, 1):
        print(f"\n--- 演示 #{i} ---")
        result = run_simulation(params, save_plot=True, export_report=True, verbose=False)
        if result:
            results.append(result)
    
    if len(results) >= 2:
        print("\n=== 对比分析 ===")
        for i, result in enumerate(results, 1):
            max_I = np.max(np.abs(result['currents']))
            print(f"演示 #{i}: v={result['params'].magnet_speed} m/s, I_max={max_I:.4f} A")
        
        print("\n结论: 感应电流峰值与磁铁速度成正比（法拉第定律验证）")


def main():
    parser = argparse.ArgumentParser(
        description='电磁感应线圈模拟器 - 基于法拉第定律',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s -v 1.0 -n 100              # 基本模拟
  %(prog)s -v 0.5 -n 200 --plot       # 显示曲线图
  %(prog)s -v 2.0 -n 500 --report     # 导出完整报告
  %(prog)s --interactive              # 交互式模式
  %(prog)s --demo                     # 演示模式（多组参数对比）
  %(prog)s -v 0 --verbose             # 测试零速度错误处理
        """
    )
    
    parser.add_argument('-v', '--velocity', type=float, default=1.0,
                        help='磁铁速度 (m/s), 默认=1.0')
    parser.add_argument('-n', '--turns', type=int, default=100,
                        help='线圈匝数, 默认=100')
    parser.add_argument('-b', '--field', type=float, default=0.5,
                        help='磁场强度 (T), 默认=0.5')
    parser.add_argument('-t', '--time-step', type=float, default=0.01,
                        help='时间步长 (s), 默认=0.01')
    parser.add_argument('-T', '--total-time', type=float, default=2.0,
                        help='总模拟时间 (s), 默认=2.0')
    parser.add_argument('--plot', action='store_true',
                        help='显示曲线图')
    parser.add_argument('--save-plot', action='store_true', default=True,
                        help='保存曲线图 (默认开启)')
    parser.add_argument('--no-save-plot', action='store_true',
                        help='不保存曲线图')
    parser.add_argument('--animation', action='store_true',
                        help='保存动画 (需要ffmpeg)')
    parser.add_argument('--report', action='store_true',
                        help='导出实验报告')
    parser.add_argument('--interactive', action='store_true',
                        help='交互式参数设置')
    parser.add_argument('--demo', action='store_true',
                        help='演示模式')
    parser.add_argument('--verbose', action='store_true',
                        help='显示详细信息')
    
    args = parser.parse_args()
    
    print_banner()
    
    if args.demo:
        demo_mode()
        return
    
    if args.interactive:
        interactive_mode()
        return
    
    params = SimulationParams(
        magnet_speed=args.velocity,
        coil_turns=args.turns,
        magnet_field_strength=args.field,
        time_step=args.time_step,
        total_time=args.total_time
    )
    
    save_plot = args.save_plot and not args.no_save_plot
    
    run_simulation(
        params,
        show_plot=args.plot,
        save_plot=save_plot,
        save_animation=args.animation,
        export_report=args.report,
        verbose=args.verbose
    )
    
    print("\n" + "=" * 70)
    print("模拟完成！感谢使用电磁感应线圈模拟器。")
    print("=" * 70)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[INFO] 用户中断，程序退出。")
        sys.exit(0)
    except Exception as e:
        print(f"\n[FATAL] {__file__}: 未处理的异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
