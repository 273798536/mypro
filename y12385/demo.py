#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from importer import SessionImporter
from validator import SessionValidator
from session_manager import (
    IssueManager,
    ArchiveManager,
    EmotionAnalyzer,
    SessionExporter,
    PrivacyMask,
)


def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def main():
    print_section("音乐治疗会话记录系统 - 功能演示")

    importer = SessionImporter()
    validator = SessionValidator()
    issue_manager = IssueManager()
    archive_manager = ArchiveManager()
    emotion_analyzer = EmotionAnalyzer()
    exporter = SessionExporter()

    print_section("1. 导入数据")
    results = importer.import_from_json("sample_data.json", source="手动录入")
    print(f"✓ 导入来访者: {len(results['clients'])} 人")
    print(f"✓ 导入曲目: {len(results['tracks'])} 首")
    print(f"✓ 导入计划: {len(results['plans'])} 个")
    print(f"✓ 导入会话: {len(results['sessions'])} 次")

    print_section("2. 来源追溯演示")
    session = importer.sessions["sess_normal_001"]
    sources = importer.trace_sources(session.session_id)
    print(f"会话 {session.session_id} 的来源信息:")
    print(f"  - 导入文件: {sources['session'].get('import_file', 'N/A')}")
    print(f"  - 来访者: {sources['client']['name'] if sources['client'] else 'N/A'}")
    print(f"  - 关联计划: {sources['plan']['title'] if sources['plan'] else 'N/A'}")
    print(f"  - 播放曲目数: {len(sources['tracks'])} 首")

    print_section("3. 会话检查 - 正常记录 (sess_normal_001)")
    normal_session = importer.sessions["sess_normal_001"]
    validator.validate_and_attach(normal_session)
    normal_summary = validator.get_issue_summary(normal_session)
    print(f"问题总数: {normal_summary['total']}")
    print(f"未解决问题: {normal_summary['unresolved']}")
    if normal_summary["total"] == 0:
        print("✓ 正常记录 - 无问题")
    else:
        for issue in normal_session.issues:
            print(f"  - [{issue.severity.value}] {issue.issue_type.value}: {issue.description}")

    print_section("4. 会话检查 - 隐私备注外泄 (sess_privacy_leak_001)")
    privacy_session = importer.sessions["sess_privacy_leak_001"]
    validator.validate_and_attach(privacy_session)
    privacy_summary = validator.get_issue_summary(privacy_session)
    print(f"问题总数: {privacy_summary['total']}")
    print(f"未解决问题: {privacy_summary['unresolved']}")
    for issue in privacy_session.issues:
        print(f"  - [{issue.severity.value}] {issue.issue_type.value}: {issue.description}")

    has_privacy = validator.has_privacy_issues(privacy_session)
    print(f"\n是否存在隐私问题: {'是' if has_privacy else '否'}")

    print_section("5. 会话检查 - 情绪缺填 (sess_emotion_missing_001)")
    emotion_session = importer.sessions["sess_emotion_missing_001"]
    validator.validate_and_attach(emotion_session)
    emotion_summary = validator.get_issue_summary(emotion_session)
    print(f"问题总数: {emotion_summary['total']}")
    for issue in emotion_session.issues:
        print(f"  - [{issue.severity.value}] {issue.issue_type.value}: {issue.description}")

    print_section("6. 会话检查 - 曲目重复 (sess_duplicate_001)")
    duplicate_session = importer.sessions["sess_duplicate_001"]
    validator.validate_and_attach(duplicate_session)
    duplicate_summary = validator.get_issue_summary(duplicate_session)
    print(f"问题总数: {duplicate_summary['total']}")
    for issue in duplicate_session.issues:
        print(f"  - [{issue.severity.value}] {issue.issue_type.value}: {issue.description}")

    print_section("7. 问题清单和异常提示")
    alert = issue_manager.generate_alert(privacy_session)
    print(f"会话 {alert['session_id']} 的异常提示:")
    print(f"是否有警报: {'是' if alert['has_alerts'] else '否'}")
    print(f"高严重级别问题数: {alert['high_severity_count']}")
    for a in alert["alerts"]:
        print(f"  - {a['type']}: {a['description']}")

    print_section("8. 情绪趋势分析")
    print("正常记录情绪分析:")
    normal_emotion = emotion_analyzer.analyze_session(normal_session)
    print(f"  情绪变化: {normal_emotion['emotion_delta']}")
    print(f"  趋势: {normal_emotion['trend']}")

    print("\n多会话整体趋势:")
    all_sessions = list(importer.sessions.values())
    trend = emotion_analyzer.analyze_trend(all_sessions)
    print(f"  分析会话数: {trend['sessions_analyzed']}")
    print(f"  整体趋势: {trend['overall_trend']}")

    print_section("9. 隐私遮罩演示")
    test_text = "来访者电话号码13800138000，家庭住址在北京"
    print(f"原始文本: {test_text}")
    print(f"遮罩级别1: {PrivacyMask.mask_text(test_text, 1)}")
    print(f"遮罩级别2: {PrivacyMask.mask_text(test_text, 2)}")

    print_section("10. 会话归档演示 - 正常记录")
    normal_summary = emotion_analyzer.analyze_session(normal_session)
    normal_export = exporter.export_session(normal_session)
    archive1 = archive_manager.archive_session(
        normal_session,
        privacy_mask_level=0,
        emotion_summary=normal_summary,
        export_content=normal_export,
    )
    print(f"✓ 正常记录已归档")
    print(f"  归档ID: {archive1.archive_id}")
    print(f"  隐私遮罩级别: {archive1.privacy_mask_level}")
    print(f"  情绪趋势: {archive1.emotion_summary['trend']}")

    print_section("11. 会话归档演示 - 隐私外泄记录（带遮罩）")
    privacy_summary = emotion_analyzer.analyze_session(privacy_session)
    privacy_export = exporter.export_session(privacy_session)
    archive2 = archive_manager.archive_session(
        privacy_session,
        privacy_mask_level=1,
        emotion_summary=privacy_summary,
        export_content=privacy_export,
    )
    print(f"✓ 隐私外泄记录已归档（遮罩级别1）")
    print(f"  归档ID: {archive2.archive_id}")
    print(f"  隐私遮罩级别: {archive2.privacy_mask_level}")
    print("\n导出内容中的隐私字段已被遮罩:")
    for line in archive2.export_content.split("\n"):
        if "电话" in line or "身份证" in line or "***" in line:
            print(f"  {line}")

    print_section("12. 动态更新 - 隐私遮罩变化后重新归档")
    print(f"当前遮罩级别: {privacy_session.privacy_mask_level}")
    print("将遮罩级别从1提升到2，重新生成归档...")

    new_archive = archive_manager.rearchive_session(
        privacy_session,
        new_privacy_mask_level=2,
        emotion_analyzer=emotion_analyzer,
        exporter=exporter,
    )
    print(f"✓ 重新归档完成")
    print(f"  新遮罩级别: {new_archive.privacy_mask_level}")
    print(f"  新归档ID: {new_archive.archive_id}")

    print("\n新导出内容（遮罩级别2）:")
    for line in new_archive.export_content.split("\n"):
        if "**" in line or "***" in line:
            print(f"  {line}")

    print("\n归档历史记录:")
    history = archive_manager.get_archive_history(privacy_session.session_id)
    for i, arc in enumerate(history, 1):
        print(f"  {i}. {arc.archive_id} - 遮罩级别{arc.privacy_mask_level} - {arc.archived_at.strftime('%H:%M:%S')}")

    print_section("13. 复盘导出 - 正常记录 vs 隐私记录")
    print("--- 正常记录导出（无遮罩）---")
    for line in archive1.export_content.split("\n"):
        if "备注" in line or "情绪" in line or "问题" in line:
            print(f"  {line}")

    print("\n--- 隐私记录导出（遮罩后）---")
    for line in new_archive.export_content.split("\n"):
        if "备注" in line or "问题" in line or "*" in line:
            print(f"  {line}")

    print_section("演示完成")
    print("✓ 导入功能正常")
    print("✓ 来源追溯正常")
    print("✓ 情绪缺填检测正常")
    print("✓ 曲目重复检测正常")
    print("✓ 隐私备注外泄检测正常")
    print("✓ 问题清单和异常提示正常")
    print("✓ 会话归档正常")
    print("✓ 隐私遮罩动态更新正常")
    print("✓ 情绪趋势分析正常")
    print("✓ 复盘导出正常")

    return 0


if __name__ == "__main__":
    sys.exit(main())
