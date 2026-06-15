#!/usr/bin/env python3
"""
采样包素材清单归档 - 演示脚本
模拟完整的使用流程：导入两批数据，查看去重和版本冲突效果
"""
import os
import sys
import shutil

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from sampling_archive.archiver import SamplingArchive
from sampling_archive.models.material import MaterialStatus


def reset_data(data_dir, output_dir):
    if os.path.exists(data_dir):
        shutil.rmtree(data_dir)
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    print("已重置数据目录")


def main():
    data_dir = os.path.join(script_dir, "data")
    output_dir = os.path.join(script_dir, "output")
    sample_dir = os.path.join(script_dir, "sample_data")

    print("=" * 60)
    print("  采样包素材清单归档系统 - 功能演示")
    print("=" * 60)
    print()

    reset_data(data_dir, output_dir)
    archive = SamplingArchive(data_dir=data_dir, output_dir=output_dir)

    print("【第1步】导入第一批素材（4条）")
    print("-" * 40)
    import json
    with open(os.path.join(sample_dir, "batch1.json"), 'r', encoding='utf-8') as f:
        batch1 = json.load(f)
    archive.import_materials(batch1, source="第一批-林姐汇总")

    print("\n" + "=" * 60)
    print("【第2步】导入第二批素材（4条，含重复和版本冲突）")
    print("-" * 40)
    with open(os.path.join(sample_dir, "batch2.json"), 'r', encoding='utf-8') as f:
        batch2 = json.load(f)
    archive.import_materials(batch2, source="第二批-排练群收集")

    print("\n" + "=" * 60)
    print("【第3步】模拟人工批注 - 处理版本冲突")
    print("-" * 40)
    materials = archive.storage.load_materials()
    conflict_materials = [m for m in materials if m.status == MaterialStatus.CONFLICT]
    if conflict_materials:
        m = conflict_materials[0]
        print(f"处理冲突材料: {m.name}")
        archive.add_annotation(
            material_id=m.id,
            comment="经与王老师确认，v3.0为最新正式版，覆盖旧版",
            reviewer="运营主管",
            new_status="已处理",
            source_line="排练群2024-01-21 王老师发言第5条"
        )
        updated = archive.storage.get_material(m.id)
        updated.version = "3.0"
        updated.version_source = "王老师-微信确认"
        updated.file_size = 83886080
        archive.storage.update_material(updated)
        print("已更新为最新版本")

    print("\n" + "=" * 60)
    print("【第4步】生成最终报告")
    print("-" * 40)
    report_path = archive.run_full_report()

    print("\n" + "=" * 60)
    print("  演示完成！")
    print("=" * 60)
    print()
    print(f"数据目录: {os.path.abspath(data_dir)}")
    print(f"报告目录: {os.path.abspath(output_dir)}")
    print(f"最新报告: {os.path.abspath(os.path.join(output_dir, '最新报告.md'))}")
    print()
    print("主要功能演示:")
    print("  ✓ 智能去重 - 名称不一致的重复材料自动识别合并")
    print("  ✓ 原始数据保留 - 所有脏数据原样保存在 data/raw/")
    print("  ✓ 版本冲突检测 - 旧版文件不覆盖，列出版本来源和建议")
    print("  ✓ 人工批注历史 - 改判记录包含影响范围和来源行")
    print("  ✓ 分类Markdown报告 - 已处理/待补材料/人工改判清晰呈现")
    print("  ✓ 一键运行 - 直接运行 python run_archive.py 即可生成报告")
    print()


if __name__ == "__main__":
    main()
