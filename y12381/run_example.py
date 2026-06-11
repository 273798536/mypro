#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src import (
    create_new_project,
    ScoreImporter,
    ScoreChecker,
    CorrectionManager,
    ReportGenerator,
    save_project,
    IssueStatus,
)


def main():
    print("\n" + "=" * 70)
    print("  乐谱拍照转写校对工具 - 示例演示")
    print("=" * 70 + "\n")

    project = create_new_project("示例乐谱校对项目")
    print(f"[1/7] 创建新项目: {project.name}")
    print(f"    项目ID: {project.id}")
    print(f"    当前版本: v{project.current_version}")

    importer = ScoreImporter(project)
    ocr_file = os.path.join("data", "sample_ocr_data.json")
    importer.import_from_json_file(ocr_file)
    print(f"\n[2/7] 导入OCR结果: {ocr_file}")
    print(f"    小节数: {len(project.measures)}")
    print(f"    导入源数: {len(project.import_sources)}")
    print(f"    当前版本: v{project.current_version}")

    checker = ScoreChecker(project)
    issues = checker.run_all_checks()
    print(f"\n[3/7] 执行自动检查")
    print(f"    发现问题: {len(issues)} 个")

    reporter = ReportGenerator(project)
    reporter.print_console_summary()

    print("\n[4/7] 待确认问题详情 (升降号漏识重点展示):")
    print("-" * 70)

    accidental_issues = [
        i for i in issues
        if i.category.value in ["accidental_missing", "accidental_misread"]
    ]

    for issue in accidental_issues[:2]:
        reporter.print_issue_details(issue.id)
        print()

    print("[5/7] 人工修正操作")
    correction_mgr = CorrectionManager(project)

    pending_issues = [i for i in issues if i.status == IssueStatus.PENDING]

    if pending_issues:
        first_issue = pending_issues[0]
        print(f"    确认问题: {first_issue.id}")
        correction_mgr.confirm_issue(first_issue.id, "校对员A")

        print(f"    修正问题: {first_issue.id}")
        correction_mgr.apply_correction(
            issue_id=first_issue.id,
            corrected_by="校对员A",
            original_value="无升降号",
            corrected_value="升号(#)",
            description="根据调号3#，F音需要升半音",
            affects_other_issues=[],
        )

    if len(pending_issues) > 1:
        second_issue = pending_issues[1]
        print(f"    驳回问题: {second_issue.id}")
        correction_mgr.dismiss_issue(
            second_issue.id,
            "校对员A",
            "该位置实际为还原记号，非拍摄遗漏",
        )

    print(f"    当前版本: v{project.current_version}")

    print("\n[6/8] 模拟补材料后重新检查（验证去重逻辑）")
    print("-" * 70)
    issue_count_before = len(project.issues)
    print(f"    重新检查前问题数: {issue_count_before}")
    print(f"    待确认问题数: {len([i for i in project.issues if i.status == IssueStatus.PENDING])}")
    print(f"    已确认问题数: {len([i for i in project.issues if i.status == IssueStatus.CONFIRMED])}")
    print(f"    已解决问题数: {len([i for i in project.issues if i.status == IssueStatus.RESOLVED])}")
    print(f"    已驳回问题数: {len([i for i in project.issues if i.status == IssueStatus.DISMISSED])}")

    print("\n    模拟补充新的OCR材料并重新检查...")
    importer2 = ScoreImporter(project)
    extra_symbols = [
        {
            "id": "extra_note_001",
            "symbol_type": "note",
            "measure_number": 1,
            "pitch": "G",
            "octave": 4,
            "duration": 0.5,
            "position": {"x": 500, "y": 150, "width": 30, "height": 50, "confidence": 0.95},
            "confidence": 0.95,
        }
    ]
    importer2.import_symbol_list(extra_symbols, "补充材料")
    print(f"    已导入补充材料，新增 {len(extra_symbols)} 个符号")

    checker2 = ScoreChecker(project)
    print(f"    新检查器实例初始化时从 project.issues 加载了 {len(checker2._existing_issue_keys)} 个已有问题键")
    issues_after = checker2.run_all_checks()
    issue_count_after = len(issues_after)
    print(f"    重新检查后问题数: {issue_count_after}")

    if issue_count_after == issue_count_before:
        print("    ✅ 去重验证通过：问题数未增加，已有问题未重复生成")
    elif issue_count_after > issue_count_before:
        new_count = issue_count_after - issue_count_before
        print(f"    ✅ 去重验证通过：新增 {new_count} 个问题（来自补充材料的新发现）")
    else:
        print(f"    ⚠️  问题数减少了，请检查逻辑")

    print("\n[7/8] 生成校对报告")

    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)

    md_report = reporter.generate_full_report(output_dir, format="markdown")
    print(f"    Markdown报告: {md_report}")

    json_report = reporter.generate_full_report(output_dir, format="json")
    print(f"    JSON报告: {json_report}")

    pending_report = reporter.generate_pending_issues_report(output_dir)
    print(f"    待确认问题清单: {pending_report}")

    project_file = save_project(project, output_dir)
    print(f"    项目文件: {project_file}")

    print("\n[8/8] 修正后汇总")
    print("-" * 70)
    reporter.print_console_summary()

    print("\n" + "=" * 70)
    print("  演示完成！检查 output/ 目录查看生成的报告文件")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
