"""命令行工具 - 图论割点边界复核"""

import sys
from pathlib import Path
from typing import Optional

import click

from .data import SampleDataLoader, create_field_sample_data, SampleDataset
from .review import CutPointReviewer, ReviewStatus


@click.group()
@click.version_option(version="1.0.0", prog_name="graph-cut-review")
def cli():
    """图论割点边界复核系统

    用于复核图论割点检测结果，特别关注边界条件和数据完整性。
    """
    pass


@cli.command()
@click.option("--force", is_flag=True, help="强制覆盖已存在的数据文件")
def init(force: bool):
    """初始化项目，生成贴近现场的样例数据

    包含：普通样本、边界样本、重复样本、补录说明等真实场景数据。
    """
    data_file = Path("data/field_samples.json")
    if data_file.exists() and not force:
        click.echo(f"⚠️  数据文件已存在：{data_file}")
        click.echo("   使用 --force 参数可强制覆盖")
        sys.exit(1)

    click.echo("🔄 正在生成样例数据...")
    dataset = create_field_sample_data()
    loader = SampleDataLoader()
    loader.save_to_json(dataset, "field_samples.json")

    click.echo(f"✅ 已生成 {len(dataset.records)} 条样例数据")
    click.echo(f"📁 数据文件：{data_file.resolve()}")
    click.echo("")
    click.echo("📋 数据概览：")
    for record in dataset.records:
        flags = []
        if record.boundary_flag:
            flags.append("边界")
        if record.is_duplicate:
            flags.append("重复")
        if record.supplementary_note:
            flags.append("有补录")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        click.echo(f"  {record.sample_id}: {record.graph.metadata.get('description', '')}{flag_str}")

    click.echo("")
    click.echo("💡 下一步：运行 'graph-cut-review review' 开始复核")


@cli.command()
@click.option("--data", "-d", default="field_samples.json", help="数据文件名（默认: field_samples.json）")
@click.option("--sample", "-s", help="只复核指定样本ID")
@click.option("--status", "-t", type=click.Choice(["safe", "pending", "missing"]), help="只显示指定状态的样本")
@click.option("--quiet", "-q", is_flag=True, help="只显示摘要，不显示详细报告")
def review(data: str, sample: Optional[str], status: Optional[str], quiet: bool):
    """运行割点边界复核流程

    对数据集中的样本进行自动复核，输出安全/待确认/需补材料三类状态。
    """
    data_file = Path("data") / data
    if not data_file.exists():
        click.echo(f"❌ 找不到数据文件：{data_file}")
        click.echo("   请先运行 'graph-cut-review init' 生成样例数据")
        sys.exit(1)

    click.echo(f"📂 加载数据：{data_file}")
    loader = SampleDataLoader()
    try:
        dataset = loader.load_from_json(data)
    except Exception as e:
        click.echo(f"❌ 数据加载失败：{e}")
        sys.exit(1)

    click.echo(f"🔍 共 {len(dataset.records)} 条样本，开始复核...")
    click.echo("")

    reviewer = CutPointReviewer()

    if sample:
        record = dataset.get_record(sample)
        if not record:
            click.echo(f"❌ 找不到样本：{sample}")
            sys.exit(1)
        result = reviewer.review_record(record)

        if not quiet:
            click.echo(reviewer.format_result(result))
        else:
            click.echo(f"{result.record.sample_id}: {result.status.display_name}")
        return

    summary = reviewer.review_dataset(dataset)
    click.echo(reviewer.format_summary(summary))

    if quiet:
        return

    filtered_results = summary.results
    if status:
        status_enum = ReviewStatus(status)
        filtered_results = [r for r in filtered_results if r.status == status_enum]

    for result in filtered_results:
        click.echo(reviewer.format_result(result))

    if not summary.all_safe:
        click.echo("📋 复核总结：")
        if summary.pending_count > 0:
            pending_ids = [r.record.sample_id for r in summary.results if r.status == ReviewStatus.PENDING]
            click.echo(f"  ⚠️  待确认 {summary.pending_count} 条：{', '.join(pending_ids)}")
        if summary.missing_count > 0:
            missing_ids = [r.record.sample_id for r in summary.results if r.status == ReviewStatus.MISSING]
            click.echo(f"  ❌ 需补材料 {summary.missing_count} 条：{', '.join(missing_ids)}")
        click.echo("")
        click.echo("💡 提示：使用 'graph-cut-review show <样本ID>' 查看单个样本详情")


@cli.command()
@click.option("--data", "-d", default="field_samples.json", help="数据文件名")
def list(data: str):
    """列出所有样本及其状态"""
    loader = SampleDataLoader()
    try:
        dataset = loader.load_from_json(data)
    except Exception as e:
        click.echo(f"❌ 数据加载失败：{e}")
        sys.exit(1)

    reviewer = CutPointReviewer()
    summary = reviewer.review_dataset(dataset)

    click.echo(f"📋 样本列表（共 {len(summary.results)} 条）：")
    click.echo("-" * 70)
    click.echo(f"{'ID':<12} {'状态':<8} {'来源':<30} {'备注'}")
    click.echo("-" * 70)

    status_icons = {
        "safe": "✅",
        "pending": "⚠️ ",
        "missing": "❌",
    }

    for result in summary.results:
        record = result.record
        icon = status_icons[result.status.value]
        tags = []
        if record.boundary_flag:
            tags.append("边界")
        if record.is_duplicate:
            tags.append("重复")
        if record.supplementary_note:
            tags.append("有补录")
        tag_str = f" [{', '.join(tags)}]" if tags else ""
        source = record.source[:28] + "..." if len(record.source) > 28 else record.source
        click.echo(f"{icon} {record.sample_id:<10} {result.status.display_name:<6} {source:<30} {tag_str}")

    click.echo("-" * 70)


@cli.command()
@click.argument("sample_id")
@click.option("--data", "-d", default="field_samples.json", help="数据文件名")
def show(sample_id: str, data: str):
    """显示单个样本的详细信息和复核结果"""
    loader = SampleDataLoader()
    try:
        dataset = loader.load_from_json(data)
    except Exception as e:
        click.echo(f"❌ 数据加载失败：{e}")
        sys.exit(1)

    record = dataset.get_record(sample_id)
    if not record:
        click.echo(f"❌ 找不到样本：{sample_id}")
        sys.exit(1)

    reviewer = CutPointReviewer()
    result = reviewer.review_record(record)
    click.echo(reviewer.format_result(result))

    click.echo("📝 样本原始数据：")
    click.echo(f"  顶点：{sorted(record.graph.vertices)}")
    edges = []
    seen = set()
    for u in record.graph.vertices:
        for v in record.graph.get_neighbors(u):
            key = (min(u, v), max(u, v))
            if key not in seen:
                seen.add(key)
                edges.append(key)
    click.echo(f"  边：{edges}")
    click.echo(f"  校验和：{record.checksum}")
    click.echo(f"  版本：{record.version}")
    click.echo(f"  创建时间：{record.created_at}")
    click.echo(f"  更新时间：{record.updated_at}")


@cli.command()
@click.option("--data", "-d", default="field_samples.json", help="数据文件名")
def check(data: str):
    """检查数据完整性和版本一致性"""
    loader = SampleDataLoader()
    try:
        dataset = loader.load_from_json(data)
    except Exception as e:
        click.echo(f"❌ 数据加载失败：{e}")
        sys.exit(1)

    click.echo("🔍 数据完整性检查：")
    click.echo("-" * 50)

    issues = []
    for record in dataset.records:
        if not record.source or record.source == "unknown":
            issues.append(f"  ❌ {record.sample_id}: 来源信息缺失")
        if not record.version:
            issues.append(f"  ❌ {record.sample_id}: 版本号缺失")

        current_checksum = record.compute_checksum()
        if record.checksum and record.checksum != current_checksum:
            issues.append(f"  ❌ {record.sample_id}: 校验和不匹配（可能被篡改）")

    duplicates = dataset.find_duplicates()
    if duplicates:
        click.echo(f"⚠️  检测到 {len(duplicates)} 组重复样本：")
        for r1, r2 in duplicates:
            click.echo(f"   {r1.sample_id} <-> {r2.sample_id}")

    if issues:
        click.echo("")
        click.echo("❌ 发现以下问题：")
        for issue in issues:
            click.echo(issue)
        sys.exit(1)
    else:
        click.echo("✅ 所有样本数据完整，校验通过")


@cli.command()
def fail_scenarios():
    """展示常见失败场景和处理方法"""
    scenarios = [
        {
            "name": "场景1：数据被篡改（校验和不匹配）",
            "description": "同学修改了图的边但没更新版本号和校验和",
            "error": "数据校验和不匹配（记录：xxx，当前计算：yyy）",
            "solution": """
  处理步骤：
  1. 与提交同学确认修改是否经过授权
  2. 如属正常修改，请更新版本号（如 1.0 → 1.1）
  3. 重新计算校验和并更新记录
  4. 在 supplementary_note 中记录修改原因
            """.strip()
        },
        {
            "name": "场景2：重复样本（不同提交人，数据相同）",
            "description": "两位同学合作完成后分别提交，数据完全一致",
            "error": "检测到此样本与 SAMPLE-001 数据完全一致（校验和相同）",
            "solution": """
  处理步骤：
  1. 与两位同学确认是否为合作完成
  2. 如属合作，保留两条记录并标记 is_duplicate=true
  3. 在 supplementary_note 中说明情况
  4. 复核状态设为"待确认"，人工确认后签字
            """.strip()
        },
        {
            "name": "场景3：边界样本判定存疑",
            "description": "桥的端点是否应算作割点存在争议",
            "error": "此条为边界样本：顶点2是桥的端点，移除后图分裂为2个分量",
            "solution": """
  处理步骤：
  1. 参考补录说明中的历史讨论
  2. 按教材定义：割点 = 移除后连通分量增加
  3. 桥的端点满足定义，应判定为割点
  4. 在备注栏写明判定依据
            """.strip()
        },
        {
            "name": "场景4：缺少必要字段",
            "description": "样本缺少来源或版本号信息",
            "error": "来源信息缺失或为默认值'unknown'",
            "solution": """
  处理步骤：
  1. 退回提交人补充完整信息
  2. 必填字段：sample_id, source, version, 图数据
  3. 补充完整后重新提交复核
            """.strip()
        },
        {
            "name": "场景5：算法结果与预期不一致",
            "description": "Tarjan算法结果与历史答案有出入",
            "error": "算法结果与预期不一致。预期有但没检测到：[2]",
            "solution": """
  处理步骤：
  1. 先检查图数据是否录入错误
  2. 再用手工演算验证预期答案
  3. 如预期有误，更新 expected_cut_points
  4. 如算法有误，检查Tarjan实现逻辑
  5. 差异≥3个点时状态为"需补材料"，否则为"待确认"
            """.strip()
        },
    ]

    for i, s in enumerate(scenarios, 1):
        click.echo(f"{'='*60}")
        click.echo(f"❌ {s['name']}")
        click.echo(f"{'='*60}")
        click.echo(f"📝 描述：{s['description']}")
        click.echo(f"⚠️  报错：{s['error']}")
        click.echo(f"✅ 解决方案：")
        click.echo(s['solution'])
        click.echo("")


@cli.command()
def boundary_notes():
    """边界条件和单位问题说明（人话版）"""
    notes = """
╔══════════════════════════════════════════════════════════════╗
║              📐 图论割点边界条件说明（人话版）                 ║
╚══════════════════════════════════════════════════════════════╝

【什么是割点？】
  人话解释：一个图里，如果去掉某个点之后，原来连通的图裂成了好几个
  互不连通的部分，那这个点就是割点。就像一座桥的桥墩，拆了桥就断了。

  数学定义：G是连通图，v∈V(G)，若G-v不连通，则v是G的割点。

【常见边界情况对照表】

  ┌─────────────────────────┬────────────────────────────────────┐
  │ 边界类型                │ 判定说明                           │
  ├─────────────────────────┼────────────────────────────────────┤
  │ 1. 桥的端点             │ ✅ 是割点。桥=去掉后图分裂的边，    │
  │                         │    它的两个端点自然也是割点。       │
  ├─────────────────────────┼────────────────────────────────────┤
  │ 2. 星型图中心           │ ✅ 是割点。去掉中心后所有叶子都孤立。│
  ├─────────────────────────┼────────────────────────────────────┤
  │ 3. 孤立点（度=0）       │ ❌ 不是割点。本来就不连通，去掉后   │
  │                         │    连通分量数没增加。               │
  ├─────────────────────────┼────────────────────────────────────┤
  │ 4. 单点图（只有1个点）  │ ❌ 不是割点。去掉后分量从1变0，     │
  │                         │    不满足"增加"。                   │
  ├─────────────────────────┼────────────────────────────────────┤
  │ 5. 仅连接两个分量的点   │ ⚠️  边界割点。虽然是割点，但只连接   │
  │                         │    两个分量，属于边界情况需特别注意。│
  ├─────────────────────────┼────────────────────────────────────┤
  │ 6. 双连通分量中的点     │ ❌ 不是割点。双连通=任意两点间有    │
  │                         │    至少两条不相交路径，没有单点故障。│
  └─────────────────────────┴────────────────────────────────────┘

【单位问题】
  ⚠️  图论里的"割点"没有物理单位，就是顶点的编号（整数）。
  ⚠️  注意区分"顶点编号"和"顶点数量"，别搞混了。
  ⚠️  边是无序对：(u,v) 和 (v,u) 是同一条边，录入时别重复。

【复核时的关注点】
  1. 结果对不对？算法找的割点和预期一致吗？
  2. 是不是边界情况？有没有桥端点、孤立点这些特殊情况？
  3. 数据改没改？校验和匹配吗？版本号更新了吗？
  4. 重复了吗？有没有其他样本和这条数据一模一样？
  5. 有补录说明吗？之前的同学有没有留下什么注意事项？

【三个状态怎么判？】
  ✅ 安全：结果对 + 数据齐 + 没异常 → 签字通过
  ⚠️  待确认：边界样本 / 重复样本 / 有补录说明 / 结果差1-2个点 → 找人问清楚
  ❌ 需补材料：缺字段 / 校验失败 / 结果差≥3个点 / 版本不对 → 退回去补

╔══════════════════════════════════════════════════════════════╗
║  💡 记住：边界情况多走一步人工确认，比事后翻代码强得多。      ║
╚══════════════════════════════════════════════════════════════╝
    """
    click.echo(notes)


def main():
    cli()


if __name__ == "__main__":
    main()
