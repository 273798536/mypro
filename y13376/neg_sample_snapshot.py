#!/usr/bin/env python3
"""负采样版本快照工具 - MLOps值班交接用"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


class SnapshotStats:
    def __init__(self):
        self.total_rows = 0
        self.processed_rows = 0
        self.bad_rows = 0
        self.skipped_rows = 0
        self.bad_samples = []
        self.skipped_samples = []
        self.feature_delay_samples = []
        self.manual_override_samples = []
        self.supplementary_notes = []

    def print_summary(self):
        print("=" * 60)
        print("  负采样版本快照 - 处理统计")
        print("=" * 60)
        print(f"  总读取行数:    {self.total_rows}")
        print(f"  已处理行:      {self.processed_rows}")
        print(f"  坏行:          {self.bad_rows}")
        print(f"  跳过行:        {self.skipped_rows}")
        print("-" * 60)
        print(f"  特征迟到样本:  {len(self.feature_delay_samples)} 条")
        print(f"  人工改判样本:  {len(self.manual_override_samples)} 条")
        print(f"  后补说明条数:  {len(self.supplementary_notes)} 条")
        print("=" * 60)

        if self.bad_samples:
            print("\n[坏行明细]")
            for s in self.bad_samples:
                print(f"  - 行号{s['line_no']}: {s['reason']}")

        if self.skipped_samples:
            print("\n[跳过行明细]")
            for s in self.skipped_samples:
                print(f"  - 行号{s['line_no']}: {s['reason']}")

        if self.feature_delay_samples:
            print("\n[特征迟到样本]")
            for s in self.feature_delay_samples:
                print(f"  - sample_id={s['sample_id']}: 缺失特征 {s['missing_features']}")

        if self.manual_override_samples:
            print("\n[人工改判样本]")
            for s in self.manual_override_samples:
                print(f"  - sample_id={s['sample_id']}: {s['original_label']} → {s['new_label']} ({s['reason']})")


def load_csv_samples(filepath, stats):
    samples = []
    if not os.path.exists(filepath):
        eprint(f"[警告] 样本文件不存在: {filepath}")
        return samples

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for line_no, row in enumerate(reader, start=2):
            stats.total_rows += 1
            sample_id = row.get("sample_id", "").strip()

            if not sample_id:
                stats.bad_rows += 1
                stats.bad_samples.append({"line_no": line_no, "reason": "sample_id为空"})
                continue

            label = row.get("label", "").strip()
            if label not in ("0", "1"):
                stats.bad_rows += 1
                stats.bad_samples.append({"line_no": line_no, "reason": f"label非法: {label}"})
                continue

            feature_str = row.get("features", "").strip()
            if not feature_str:
                stats.skipped_rows += 1
                stats.skipped_samples.append({"line_no": line_no, "reason": "features字段为空"})
                continue

            features = {}
            try:
                for pair in feature_str.split(";"):
                    if "=" in pair:
                        k, v = pair.split("=", 1)
                        features[k.strip()] = v.strip()
            except Exception as e:
                stats.bad_rows += 1
                stats.bad_samples.append({"line_no": line_no, "reason": f"features解析失败: {e}"})
                continue

            sample = {
                "sample_id": sample_id,
                "label": int(label),
                "features": features,
                "source_file": os.path.basename(filepath),
                "line_no": line_no,
            }
            samples.append(sample)
            stats.processed_rows += 1

    return samples


def load_failed_queue(filepath, stats):
    """加载失败队列样本"""
    samples = []
    if not os.path.exists(filepath):
        eprint(f"[提示] 无失败队列文件: {filepath}")
        return samples

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                item = json.loads(line)
                stats.total_rows += 1
                sample_id = item.get("sample_id", "")
                if not sample_id:
                    stats.bad_rows += 1
                    stats.bad_samples.append({"line_no": "failed_queue", "reason": "sample_id缺失"})
                    continue
                item["source_file"] = os.path.basename(filepath)
                samples.append(item)
                stats.processed_rows += 1
            except json.JSONDecodeError as e:
                stats.bad_rows += 1
                stats.bad_samples.append({"line_no": "failed_queue", "reason": f"JSON解析失败: {e}"})

    return samples


def load_manual_override(filepath, stats):
    """加载人工改判记录"""
    overrides = []
    if not os.path.exists(filepath):
        eprint(f"[提示] 无人工改判文件: {filepath}")
        return overrides

    with open(filepath, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                item = json.loads(line)
                overrides.append(item)
                stats.manual_override_samples.append(item)
            except json.JSONDecodeError as e:
                stats.skipped_rows += 1
                stats.skipped_samples.append({"line_no": f"manual_override#L{line_no}", "reason": f"JSON解析失败: {e}"})

    return overrides


def load_supplementary(filepath, stats):
    """加载后补说明"""
    notes = []
    if not os.path.exists(filepath):
        eprint(f"[提示] 无后补说明文件: {filepath}")
        return notes

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if content:
            notes = [n.strip() for n in content.split("---") if n.strip()]
            stats.supplementary_notes = notes

    return notes


def check_feature_delay(samples, required_features, stats):
    """检测特征迟到"""
    for sample in samples:
        features = sample.get("features", {})
        missing = [f for f in required_features if f not in features or not features[f]]
        if missing:
            sample["_feature_delay"] = True
            sample["_missing_features"] = missing
            stats.feature_delay_samples.append({
                "sample_id": sample["sample_id"],
                "missing_features": ", ".join(missing),
            })
    return samples


def apply_manual_overrides(samples, overrides, stats):
    """应用人工改判"""
    override_map = {o["sample_id"]: o for o in overrides}
    for sample in samples:
        sid = sample.get("sample_id")
        if sid in override_map:
            o = override_map[sid]
            sample["_original_label"] = sample.get("label")
            sample["_override_label"] = o.get("new_label")
            sample["_override_reason"] = o.get("reason", "")
            sample["label"] = o.get("new_label", sample.get("label"))
    return samples


def needs_manual_confirmation(samples, stats):
    """判断是否需要人工确认"""
    reasons = []
    if stats.feature_delay_samples:
        reasons.append(f"存在 {len(stats.feature_delay_samples)} 条特征迟到样本，特征不完整可能影响指标口径")
    if stats.manual_override_samples:
        reasons.append(f"存在 {len(stats.manual_override_samples)} 条人工改判样本，需确认改判合理性")
    if stats.bad_rows > 0:
        reasons.append(f"存在 {stats.bad_rows} 条坏行，数据质量可能影响统计结果")
    return reasons


def generate_markdown_report(stats, samples, output_path, version_tag, snapshot_time, confirm_reasons):
    """生成Markdown报告"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    total_pos = sum(1 for s in samples if s.get("label") == 1)
    total_neg = sum(1 for s in samples if s.get("label") == 0)
    pos_ratio = total_pos / len(samples) * 100 if samples else 0

    content = f"""# 负采样版本快照报告

**版本标签**: {version_tag}
**快照时间**: {snapshot_time}
**生成工具**: neg_sample_snapshot

---

## 一、处理统计

| 指标 | 数量 | 说明 |
|------|------|------|
| 总读取行数 | {stats.total_rows} | 原始文件所有行 |
| 已处理行 | {stats.processed_rows} | 成功解析并入统的行 |
| 坏行 | {stats.bad_rows} | 格式错误、字段缺失等 |
| 跳过行 | {stats.skipped_rows} | 特征为空等可跳过情形 |
| 特征迟到样本 | {len(stats.feature_delay_samples)} | 缺失关键特征 |
| 人工改判样本 | {len(stats.manual_override_samples)} | 人工介入改标 |
| 后补说明 | {len(stats.supplementary_notes)} 条 | 补充备注信息 |

> 口径说明：已处理行 = 总读取行数 - 坏行 - 跳过行。
> 线上指标以「已处理行」为分母，避免坏行稀释负采样比例。

---

## 二、样本分布

| 类别 | 数量 | 占比 |
|------|------|------|
| 正样本 (label=1) | {total_pos} | {pos_ratio:.2f}% |
| 负样本 (label=0) | {total_neg} | {100 - pos_ratio:.2f}% |
| **合计** | **{len(samples)}** | **100%** |

---

## 三、坏行明细
"""

    if stats.bad_samples:
        content += "\n"
        for i, s in enumerate(stats.bad_samples, 1):
            content += f"{i}. 行号 `{s['line_no']}`: {s['reason']}\n"
    else:
        content += "\n无坏行，数据质量良好。\n"

    content += "\n---\n\n## 四、跳过行明细\n"

    if stats.skipped_samples:
        content += "\n"
        for i, s in enumerate(stats.skipped_samples, 1):
            content += f"{i}. 行号 `{s['line_no']}`: {s['reason']}\n"
    else:
        content += "\n无跳过行。\n"

    content += "\n---\n\n## 五、特征迟到样本\n"

    if stats.feature_delay_samples:
        content += "\n| sample_id | 缺失特征 |\n|-----------|----------|\n"
        for s in stats.feature_delay_samples:
            content += f"| {s['sample_id']} | {s['missing_features']} |\n"
        content += "\n> ⚠️ 特征迟到样本不参与线上实时打分，但会保留在快照中供离线回朔。\n"
    else:
        content += "\n无特征迟到样本。\n"

    content += "\n---\n\n## 六、人工改判记录\n"

    if stats.manual_override_samples:
        content += "\n| sample_id | 原标签 | 新标签 | 改判原因 |\n|-----------|--------|--------|----------|\n"
        for s in stats.manual_override_samples:
            content += f"| {s['sample_id']} | {s['original_label']} | {s['new_label']} | {s['reason']} |\n"
    else:
        content += "\n无人工改判。\n"

    content += "\n---\n\n## 七、后补说明\n"

    if stats.supplementary_notes:
        content += "\n"
        for i, note in enumerate(stats.supplementary_notes, 1):
            lines = note.strip().split("\n")
            title = lines[0].strip() if lines else f"说明 {i}"
            body = "\n".join(lines[1:]).strip() if len(lines) > 1 else note.strip()
            content += f"### {i}. {title}\n\n{body}\n\n"
    else:
        content += "\n无后补说明。\n"

    content += "\n---\n\n## 八、人工确认提示\n"

    if confirm_reasons:
        content += "\n**以下事项需人工确认：**\n\n"
        for i, r in enumerate(confirm_reasons, 1):
            content += f"{i}. {r}\n"
        content += "\n**下一步操作：**\n"
        content += "- 特征迟到：联系特征团队确认补数据时间，或标记为跳过\n"
        content += "- 人工改判：review改判理由是否充分，必要时拉群对齐\n"
        content += "- 坏行较多：检查上游数据管道是否有变更\n"
    else:
        content += "\n✅ 无需人工确认，快照可直接用于版本对比。\n"

    content += "\n---\n\n*本报告由负采样版本快照工具自动生成，数据与CLI输出一致。*\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="负采样版本快照工具 - 生成可追溯的负采样版本快照",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python neg_sample_snapshot.py --samples data/samples.csv --output reports/
  python neg_sample_snapshot.py --samples data/samples.csv --failed-queue data/failed.jsonl \
      --manual-override data/manual.jsonl --supplementary data/notes.md --output reports/
        """,
    )
    parser.add_argument("--samples", required=True, help="负采样样本CSV文件")
    parser.add_argument("--failed-queue", default="", help="失败队列JSONL文件")
    parser.add_argument("--manual-override", default="", help="人工改判JSONL文件")
    parser.add_argument("--supplementary", default="", help="后补说明Markdown文件")
    parser.add_argument("--output", default="reports/", help="报告输出目录")
    parser.add_argument("--version-tag", default="", help="版本标签，默认自动生成")
    parser.add_argument("--required-features", default="user_profile,item_embedding,ctr_7d",
                        help="必填特征列表(逗号分隔)，用于特征迟到检测")
    parser.add_argument("--no-report", action="store_true", help="不生成Markdown报告")
    parser.add_argument("--quiet", action="store_true", help="静默模式，只输出统计数字")

    args = parser.parse_args()

    stats = SnapshotStats()

    required_features = [f.strip() for f in args.required_features.split(",") if f.strip()]

    version_tag = args.version_tag or f"snapshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    snapshot_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not args.quiet:
        print(f"[信息] 开始生成负采样版本快照: {version_tag}")
        print(f"[信息] 样本文件: {args.samples}")

    samples = load_csv_samples(args.samples, stats)

    if args.failed_queue:
        failed = load_failed_queue(args.failed_queue, stats)
        samples.extend(failed)
        if not args.quiet:
            print(f"[信息] 从失败队列追加 {len(failed)} 条样本")

    if args.manual_override:
        overrides = load_manual_override(args.manual_override, stats)
        samples = apply_manual_overrides(samples, overrides, stats)
        if not args.quiet:
            print(f"[信息] 应用 {len(overrides)} 条人工改判")

    if args.supplementary:
        load_supplementary(args.supplementary, stats)

    samples = check_feature_delay(samples, required_features, stats)

    confirm_reasons = needs_manual_confirmation(samples, stats)

    if not args.quiet:
        stats.print_summary()

        if confirm_reasons:
            print("\n" + "!" * 60)
            print("  ⚠️  需要人工确认")
            print("!" * 60)
            for i, r in enumerate(confirm_reasons, 1):
                print(f"  {i}. {r}")
            print("\n  下一步:")
            print("    - 查看详细报告确认影响范围")
            print("    - 特征迟到联系特征组")
            print("    - 人工改判走review流程")
            print("!" * 60)
    else:
        print(f"total={stats.total_rows} processed={stats.processed_rows} "
              f"bad={stats.bad_rows} skipped={stats.skipped_rows}")

    if not args.no_report:
        report_path = os.path.join(args.output, f"{version_tag}_report.md")
        generate_markdown_report(stats, samples, report_path, version_tag, snapshot_time, confirm_reasons)
        if not args.quiet:
            print(f"\n[完成] 报告已生成: {report_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
