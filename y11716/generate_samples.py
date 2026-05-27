#!/usr/bin/env python3
import csv
import json
import os
import random
from typing import List, Dict, Any


def generate_normal_samples() -> List[Dict[str, Any]]:
    samples = []

    samples.append({
        "sample_id": "S001",
        "mass": "10",
        "mass_unit": "g",
        "volume": "20",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "正常样例-木块浮水",
    })

    samples.append({
        "sample_id": "S002",
        "mass": "27",
        "mass_unit": "g",
        "volume": "10",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "下沉",
        "source": "正常样例-铝块沉水",
    })

    samples.append({
        "sample_id": "S003",
        "mass": "10",
        "mass_unit": "g",
        "volume": "10",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "悬浮",
        "source": "正常样例-密度等于水",
    })

    samples.append({
        "sample_id": "S004",
        "mass": "0.05",
        "mass_unit": "kg",
        "volume": "100",
        "volume_unit": "cm³",
        "liquid_density": "0.8",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "正常样例-酒精中漂浮",
    })

    samples.append({
        "sample_id": "S005",
        "mass": "100",
        "mass_unit": "g",
        "volume": "50",
        "volume_unit": "mL",
        "liquid_density": "13.6",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "正常样例-铅块浮水银",
    })

    return samples


def generate_critical_samples() -> List[Dict[str, Any]]:
    samples = []

    samples.append({
        "sample_id": "C001",
        "mass": "9.9",
        "mass_unit": "g",
        "volume": "10",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "临界样例-接近悬浮（略轻）",
    })

    samples.append({
        "sample_id": "C002",
        "mass": "10.1",
        "mass_unit": "g",
        "volume": "10",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "下沉",
        "source": "临界样例-接近悬浮（略重）",
    })

    samples.append({
        "sample_id": "C003",
        "mass": "995",
        "mass_unit": "kg",
        "volume": "1",
        "volume_unit": "m³",
        "liquid_density": "1000",
        "liquid_density_unit": "kg/m³",
        "observed_state": "漂浮/悬浮",
        "source": "临界样例-大单位接近悬浮",
    })

    return samples


def generate_unit_error_samples() -> List[Dict[str, Any]]:
    samples = []

    samples.append({
        "sample_id": "U001",
        "mass": "10",
        "mass_unit": "克",
        "volume": "20",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "错误样例-中文单位",
    })

    samples.append({
        "sample_id": "U002",
        "mass": "10",
        "mass_unit": "g",
        "volume": "20",
        "volume_unit": "立方厘米",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "错误样例-中文体积单位",
    })

    samples.append({
        "sample_id": "U003",
        "mass": "10",
        "mass_unit": "g",
        "volume": "20",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm^3",
        "observed_state": "漂浮",
        "source": "错误样例-密度单位格式",
    })

    return samples


def generate_missing_volume_samples() -> List[Dict[str, Any]]:
    samples = []

    samples.append({
        "sample_id": "M001",
        "mass": "10",
        "mass_unit": "g",
        "volume": "",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "错误样例-体积值缺失",
    })

    samples.append({
        "sample_id": "M002",
        "mass": "10",
        "mass_unit": "g",
        "volume": "20",
        "volume_unit": "",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "错误样例-体积单位缺失",
    })

    samples.append({
        "sample_id": "M003",
        "mass": "10",
        "mass_unit": "g",
        "volume": "",
        "volume_unit": "",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "错误样例-体积完全缺失",
    })

    return samples


def generate_inconsistent_samples() -> List[Dict[str, Any]]:
    samples = []

    samples.append({
        "sample_id": "I001",
        "mass": "50",
        "mass_unit": "g",
        "volume": "20",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "错误样例-密度2.5应下沉却记漂浮",
    })

    samples.append({
        "sample_id": "I002",
        "mass": "5",
        "mass_unit": "g",
        "volume": "20",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "下沉",
        "source": "错误样例-密度0.25应漂浮却记下沉",
    })

    samples.append({
        "sample_id": "I003",
        "mass": "10",
        "mass_unit": "g",
        "volume": "10",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "上浮",
        "source": "特殊样例-悬浮却记上浮",
    })

    return samples


def generate_format_error_samples() -> List[Dict[str, Any]]:
    samples = []

    samples.append({
        "sample_id": "F001",
        "mass": "abc",
        "mass_unit": "g",
        "volume": "20",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "错误样例-质量非数字",
    })

    samples.append({
        "sample_id": "F002",
        "mass": "10",
        "mass_unit": "g",
        "volume": "-5",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "漂浮",
        "source": "错误样例-体积为负",
    })

    samples.append({
        "sample_id": "F003",
        "mass": "10",
        "mass_unit": "g",
        "volume": "20",
        "volume_unit": "cm³",
        "liquid_density": "1.0",
        "liquid_density_unit": "g/cm³",
        "observed_state": "浮起来了",
        "source": "错误样例-状态描述无效",
    })

    return samples


def generate_all_samples() -> List[Dict[str, Any]]:
    all_samples = []
    all_samples.extend(generate_normal_samples())
    all_samples.extend(generate_critical_samples())
    all_samples.extend(generate_unit_error_samples())
    all_samples.extend(generate_missing_volume_samples())
    all_samples.extend(generate_inconsistent_samples())
    all_samples.extend(generate_format_error_samples())
    return all_samples


def save_csv(samples: List[Dict[str, Any]], output_path: str):
    fieldnames = [
        "sample_id", "mass", "mass_unit", "volume", "volume_unit",
        "liquid_density", "liquid_density_unit", "observed_state", "source"
    ]

    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(samples)


def save_json(samples: List[Dict[str, Any]], output_path: str):
    data = {
        "description": "浮力密度判定测试样例数据",
        "generated_at": "2026-05-27",
        "total_samples": len(samples),
        "categories": {
            "normal": len(generate_normal_samples()),
            "critical": len(generate_critical_samples()),
            "unit_error": len(generate_unit_error_samples()),
            "missing_volume": len(generate_missing_volume_samples()),
            "inconsistent": len(generate_inconsistent_samples()),
            "format_error": len(generate_format_error_samples()),
        },
        "records": samples,
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    output_dir = os.path.join(os.path.dirname(__file__), "sample_data")
    os.makedirs(output_dir, exist_ok=True)

    all_samples = generate_all_samples()
    normal_samples = generate_normal_samples()

    save_csv(all_samples, os.path.join(output_dir, "sample_all.csv"))
    save_json(all_samples, os.path.join(output_dir, "sample_all.json"))

    save_csv(normal_samples, os.path.join(output_dir, "sample_normal.csv"))
    save_json(normal_samples, os.path.join(output_dir, "sample_normal.json"))

    print(f"生成完成！共生成 {len(all_samples)} 条测试样例")
    print(f"  正常样例: {len(generate_normal_samples())} 条")
    print(f"  临界样例: {len(generate_critical_samples())} 条")
    print(f"  单位错误: {len(generate_unit_error_samples())} 条")
    print(f"  体积缺失: {len(generate_missing_volume_samples())} 条")
    print(f"  记录不符: {len(generate_inconsistent_samples())} 条")
    print(f"  格式错误: {len(generate_format_error_samples())} 条")
    print(f"\n文件已保存到: {output_dir}/")


if __name__ == "__main__":
    main()
