#!/usr/bin/env python3
import sys
from pathlib import Path

def test_imports():
    print("测试模块导入...", end=" ")
    try:
        from config import config
        from data_loader import load_data
        from quality_check import run_quality_checks
        from energy_calculator import calculate_regenerative_braking_energy
        from data_exporter import export_all_results
        from traceability import create_trace_report
        print("✅ 通过")
        return True
    except Exception as e:
        print(f"❌ 失败: {e}")
        return False

def test_data_loading():
    print("测试数据加载...", end=" ")
    try:
        from data_loader import load_data
        example_file = Path(__file__).parent / "examples" / "sample_train_data.csv"
        if not example_file.exists():
            print("⚠️  跳过 (示例文件不存在)")
            return True
        
        loaded = load_data(str(example_file))
        assert len(loaded.valid_data) > 0, "有效数据为空"
        assert len(loaded.bad_rows) > 0, "坏行检测失败"
        print(f"✅ 通过 (有效{len(loaded.valid_data)}行, 坏行{len(loaded.bad_rows)}行)")
        return True
    except Exception as e:
        print(f"❌ 失败: {e}")
        return False

def test_quality_check():
    print("测试质量检查...", end=" ")
    try:
        from data_loader import load_data
        from quality_check import run_quality_checks
        
        example_file = Path(__file__).parent / "examples" / "sample_train_data.csv"
        if not example_file.exists():
            print("⚠️  跳过 (示例文件不存在)")
            return True
        
        loaded = load_data(str(example_file))
        quality = run_quality_checks(loaded.valid_data)
        
        assert quality.current_missing_data is not None
        assert quality.duplicate_section_data is not None
        assert quality.wrong_slope_data is not None
        
        print(f"✅ 通过 (缺采{len(quality.current_missing_data)}组, 重复{len(quality.duplicate_section_data)}处, 坡度错{len(quality.wrong_slope_data)}处)")
        return True
    except Exception as e:
        print(f"❌ 失败: {e}")
        return False

def test_energy_calculation():
    print("测试能量计算...", end=" ")
    try:
        from data_loader import load_data
        from quality_check import run_quality_checks
        from energy_calculator import calculate_regenerative_braking_energy
        
        example_file = Path(__file__).parent / "examples" / "sample_train_data.csv"
        if not example_file.exists():
            print("⚠️  跳过 (示例文件不存在)")
            return True
        
        loaded = load_data(str(example_file))
        quality = run_quality_checks(loaded.valid_data)
        energy = calculate_regenerative_braking_energy(quality.valid_data)
        
        assert "总制动能量(kWh)" in energy.summary
        assert "总牵引能量(kWh)" in energy.summary
        assert not energy.raw_energy_data.empty
        assert "功率" in energy.raw_energy_data.columns
        assert "能量(kWh)" in energy.raw_energy_data.columns
        
        print(f"✅ 通过 (制动{energy.summary['总制动能量(kWh)']:.2f}kWh, 回收{energy.summary['平均能量回收率(%)']:.2f}%)")
        return True
    except Exception as e:
        print(f"❌ 失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_current_missing_detection():
    print("测试电流缺采检测...", end=" ")
    try:
        from data_loader import load_data
        from quality_check import detect_current_missing
        
        example_file = Path(__file__).parent / "examples" / "sample_train_data.csv"
        if not example_file.exists():
            print("⚠️  跳过 (示例文件不存在)")
            return True
        
        loaded = load_data(str(example_file))
        valid_df, missing_df, _ = detect_current_missing(loaded.valid_data)
        
        print(f"✅ 通过 (检测到{len(missing_df)}组电流缺采)")
        return True
    except Exception as e:
        print(f"❌ 失败: {e}")
        return False

def test_traceability():
    print("测试数据追溯...", end=" ")
    try:
        from data_loader import load_data
        from quality_check import run_quality_checks
        from energy_calculator import calculate_regenerative_braking_energy
        from traceability import trace_single_result
        
        example_file = Path(__file__).parent / "examples" / "sample_train_data.csv"
        if not example_file.exists():
            print("⚠️  跳过 (示例文件不存在)")
            return True
        
        loaded = load_data(str(example_file))
        quality = run_quality_checks(loaded.valid_data)
        energy = calculate_regenerative_braking_energy(quality.valid_data)
        
        if not energy.section_energy.empty:
            train = energy.section_energy.iloc[0]["列车号"]
            section = energy.section_energy.iloc[0]["区间"]
            trace = trace_single_result(energy, train, section)
            
            assert "energy_recovery_summary" in trace
            assert "section_aggregation_summary" in trace
            assert "loss_estimation_summary" in trace
            
            print(f"✅ 通过 (追溯链: {train} - {section})")
        else:
            print("⚠️  跳过 (无区间数据)")
        return True
    except Exception as e:
        print(f"❌ 失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("="*60)
    print("  🧪 列车再生制动能量分析系统 - 自动化测试")
    print("="*60)
    print()
    
    tests = [
        ("模块导入", test_imports),
        ("数据加载", test_data_loading),
        ("质量检查", test_quality_check),
        ("能量计算", test_energy_calculation),
        ("电流缺采检测", test_current_missing_detection),
        ("数据追溯", test_traceability),
    ]
    
    results = []
    for name, test_func in tests:
        results.append(test_func())
    
    print()
    print("="*60)
    passed = sum(results)
    total = len(results)
    print(f"  测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("  ✅ 所有测试通过! 系统可以正常使用。")
        print("="*60)
        print()
        print("快速开始:")
        print("  命令行: python cli.py --use-example --show-current-missing")
        print("  Web看板: streamlit run dashboard.py")
        return 0
    else:
        print(f"  ❌ 有 {total - passed} 个测试失败，请检查问题。")
        print("="*60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
