import argparse
import json
import os
import sys
from datetime import datetime

from .models import (
    Agent,
    Customer,
    CustomerTier,
    DispatchStrategy,
    StrategyName,
)
from .compare import compare_strategies, rank_strategies
from .anomaly import explain_anomaly, explain_report
from .report import build_report, export_anomalies_csv, export_calls_csv, export_metrics_csv, export_report_json
from .seed import STRATEGY_PRESETS, generate_all, load_seed_data, save_seed_data
from .simulator import Simulator
from .fairness import compute_metrics, detect_anomalies


def cmd_seed(args):
    customers, agents, arrival_times = generate_all(
        customer_count=args.customers,
        agent_count=args.agents,
        duration_seconds=args.duration,
        seed=args.seed,
    )
    out_path = args.output or f"seed_data_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
    save_seed_data(customers, agents, arrival_times, out_path)
    print(f"造数完成：{args.customers}个客户，{args.agents}个坐席")
    print(f"数据已保存到：{out_path}")

    tier_counts = {"vip": 0, "normal": 0, "low": 0}
    for c in customers:
        tier_counts[c.tier.value] += 1
    print(f"等级分布：VIP={tier_counts['vip']}, 普通={tier_counts['normal']}, 低={tier_counts['low']}")
    skill_needed = sum(1 for c in customers if c.required_skill)
    print(f"需要技能匹配：{skill_needed}个 ({skill_needed/len(customers):.0%})")


def cmd_simulate(args):
    if not os.path.exists(args.data):
        print(f"错误：数据文件不存在：{args.data}", file=sys.stderr)
        sys.exit(1)

    customers, agents, arrival_times = load_seed_data(args.data)
    strategy_name = args.strategy
    if strategy_name not in STRATEGY_PRESETS:
        print(f"错误：未知策略 '{strategy_name}'，可选：{', '.join(STRATEGY_PRESETS.keys())}", file=sys.stderr)
        sys.exit(1)

    strategy = STRATEGY_PRESETS[strategy_name]
    sim = Simulator(strategy, agents)
    calls = sim.run(customers, arrival_times, (args.min_service, args.max_service))
    metrics = compute_metrics(calls, long_tail_threshold=args.long_tail, source=f"cli_simulate_{strategy_name}")
    anomalies = detect_anomalies(calls, metrics, long_tail_threshold=args.long_tail)

    print(f"\n策略：{strategy.name.value} - {strategy.description}")
    print(f"总呼叫：{metrics.total_calls}")
    print(f"Jain公平指数：{metrics.jain_index:.4f}")
    print(f"基尼系数：{metrics.gini_coefficient:.4f}")
    if metrics.vip_avg_wait is not None:
        print(f"VIP平均等待：{metrics.vip_avg_wait:.1f}秒")
    if metrics.normal_avg_wait is not None:
        print(f"普通用户平均等待：{metrics.normal_avg_wait:.1f}秒")
    if metrics.low_avg_wait is not None:
        print(f"低优先级平均等待：{metrics.low_avg_wait:.1f}秒")
    if metrics.vip_squeeze_ratio is not None:
        flag = " ⚠ VIP挤占" if metrics.vip_squeeze_ratio < 0.7 else ""
        print(f"VIP/普通等待比：{metrics.vip_squeeze_ratio:.4f}{flag}")
    print(f"P90等待：{metrics.p90_wait:.1f}秒")
    print(f"P99等待：{metrics.p99_wait:.1f}秒")
    print(f"长尾等待(>{args.long_tail:.0f}s)：{metrics.long_tail_count}个")
    print(f"技能错配：{metrics.skill_mismatch_count}个")
    print(f"放弃：{metrics.abandon_count}个")

    if anomalies:
        print(f"\n检测到 {len(anomalies)} 个异常：")
        for a in anomalies:
            print(f"  [{a.severity}] {a.anomaly_type.value}: {a.description}")
            if args.verbose:
                print(f"    {a.explanation}")
    else:
        print("\n未检测到异常")

    if args.output:
        out_dir = args.output
        os.makedirs(out_dir, exist_ok=True)
        export_calls_csv(calls, os.path.join(out_dir, f"calls_{strategy_name}.csv"))
        print(f"\n呼叫详情已导出到：{out_dir}/calls_{strategy_name}.csv")


def cmd_compare(args):
    if not os.path.exists(args.data):
        print(f"错误：数据文件不存在：{args.data}", file=sys.stderr)
        sys.exit(1)

    customers, agents, arrival_times = load_seed_data(args.data)

    strategy_names = args.strategies.split(",") if args.strategies else list(STRATEGY_PRESETS.keys())
    strategies = []
    for sn in strategy_names:
        sn = sn.strip()
        if sn not in STRATEGY_PRESETS:
            print(f"警告：跳过未知策略 '{sn}'，可选：{', '.join(STRATEGY_PRESETS.keys())}", file=sys.stderr)
            continue
        strategies.append(STRATEGY_PRESETS[sn])

    if not strategies:
        print("错误：没有有效的策略可比较", file=sys.stderr)
        sys.exit(1)

    comparisons = compare_strategies(
        strategies, agents, customers, arrival_times,
        service_time_range=(args.min_service, args.max_service),
        long_tail_threshold=args.long_tail,
    )

    ranked = rank_strategies(comparisons)

    print("\n策略对比排名：")
    print("-" * 80)
    for i, (name, score, reason) in enumerate(ranked, 1):
        comp = next(c for c in comparisons if c.strategy.name.value == name)
        m = comp.metrics
        print(f"#{i} {name} (综合评分: {score:.2f})")
        print(f"   Jain={m.jain_index:.4f}  基尼={m.gini_coefficient:.4f}  "
              f"VIP均等={m.vip_avg_wait or 'N/A'}  普通均等={m.normal_avg_wait or 'N/A'}  "
              f"长尾={m.long_tail_count}  错配={m.skill_mismatch_count}  放弃={m.abandon_count}")
        if comp.anomalies:
            for a in comp.anomalies:
                print(f"   ⚠ [{a.severity}] {a.anomaly_type.value}")
        print(f"   评分分解：{reason}")
        print()

    report = build_report(comparisons)

    if args.verbose:
        print(explain_report(report))

    if args.output:
        out_dir = args.output
        os.makedirs(out_dir, exist_ok=True)
        export_report_json(report, os.path.join(out_dir, "report.json"))
        export_metrics_csv(comparisons, os.path.join(out_dir, "metrics.csv"))
        for comp in comparisons:
            name = comp.strategy.name.value
            export_calls_csv(comp.calls, os.path.join(out_dir, f"calls_{name}.csv"))
            if comp.anomalies:
                export_anomalies_csv(comp.anomalies, os.path.join(out_dir, f"anomalies_{name}.csv"))
        print(f"报告已导出到：{out_dir}/")
        print(f"  report.json  - 完整报告(含修正痕迹)")
        print(f"  metrics.csv  - 指标对比表")
        print(f"  calls_*.csv  - 各策略呼叫详情")
        print(f"  anomalies_*.csv - 异常详情")


def cmd_explain(args):
    if not os.path.exists(args.report):
        print(f"错误：报告文件不存在：{args.report}", file=sys.stderr)
        sys.exit(1)

    with open(args.report, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("报告解读：")
    print(f"报告ID：{data.get('report_id', 'N/A')}")
    print(f"生成时间：{data.get('created_at', 'N/A')}")

    if data.get("best_strategy"):
        print(f"\n推荐策略：{data['best_strategy']}")
        print(f"推荐理由：{data.get('best_reason', 'N/A')}")

    for comp_data in data.get("strategies_compared", []):
        s = comp_data.get("strategy", {})
        m = comp_data.get("metrics", {})
        print(f"\n策略：{s.get('name', 'N/A')} - {s.get('description', '')}")
        print(f"  Jain公平指数：{m.get('jain_index', 'N/A')} (1=完全公平, <0.7=不公平)")
        print(f"  基尼系数：{m.get('gini_coefficient', 'N/A')} (0=完全公平, >0.3=差异明显)")

        if m.get("vip_avg_wait") and m.get("normal_avg_wait"):
            ratio = m.get("vip_squeeze_ratio")
            print(f"  VIP平均等待：{m['vip_avg_wait']}秒")
            print(f"  普通用户平均等待：{m['normal_avg_wait']}秒")
            if ratio and ratio < 0.7:
                print(f"  ⚠ VIP/普通比={ratio} < 0.7 → VIP挤占：VIP被过度优先，普通用户被严重延迟")

        if m.get("long_tail_count", 0) > 0:
            print(f"  ⚠ 长尾等待：{m['long_tail_count']}个呼叫等待超长")

        if m.get("skill_mismatch_count", 0) > 0:
            print(f"  ⚠ 技能错配：{m['skill_mismatch_count']}个呼叫被分配到不匹配坐席")

        for a in comp_data.get("anomalies", []):
            print(f"\n  异常详情 [{a.get('severity', '?')}]:")
            print(f"    类型：{a.get('anomaly_type', 'N/A')}")
            print(f"    结论：{a.get('description', 'N/A')}")
            print(f"    解释：{a.get('explanation', 'N/A')}")
            evidence = a.get("evidence", {})
            if evidence:
                print(f"    数据依据：")
                for k, v in evidence.items():
                    print(f"      {k}: {v}")

    if data.get("audit_trail"):
        print(f"\n修正痕迹：")
        for entry in data["audit_trail"]:
            print(f"  [{entry.get('timestamp', '')}] {entry.get('action', '')}: "
                  f"{entry.get('field', '')} {entry.get('old_value', '')}→{entry.get('new_value', '')} "
                  f"({entry.get('reason', '')})")


def main():
    parser = argparse.ArgumentParser(
        prog="queue-fairness",
        description="排队公平性评分API - 比较不同派单策略的公平性和效率",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    seed_parser = subparsers.add_parser("seed", help="生成模拟数据")
    seed_parser.add_argument("-c", "--customers", type=int, default=100, help="客户数量 (默认100)")
    seed_parser.add_argument("-a", "--agents", type=int, default=10, help="坐席数量 (默认10)")
    seed_parser.add_argument("-d", "--duration", type=float, default=3600, help="模拟时长/秒 (默认3600)")
    seed_parser.add_argument("-s", "--seed", type=int, default=42, help="随机种子 (默认42)")
    seed_parser.add_argument("-o", "--output", type=str, default="", help="输出文件路径")

    sim_parser = subparsers.add_parser("simulate", help="单策略仿真")
    sim_parser.add_argument("data", type=str, help="数据文件路径 (由seed命令生成)")
    sim_parser.add_argument("-s", "--strategy", type=str, default="fifo",
                            choices=list(STRATEGY_PRESETS.keys()), help="派单策略")
    sim_parser.add_argument("--min-service", type=float, default=60, help="最短服务时间/秒")
    sim_parser.add_argument("--max-service", type=float, default=300, help="最长服务时间/秒")
    sim_parser.add_argument("--long-tail", type=float, default=600, help="长尾等待阈值/秒")
    sim_parser.add_argument("-v", "--verbose", action="store_true", help="显示详细解释")
    sim_parser.add_argument("-o", "--output", type=str, default="", help="输出目录")

    cmp_parser = subparsers.add_parser("compare", help="多策略对比")
    cmp_parser.add_argument("data", type=str, help="数据文件路径")
    cmp_parser.add_argument("-s", "--strategies", type=str, default="",
                            help="策略列表(逗号分隔)，默认全部")
    cmp_parser.add_argument("--min-service", type=float, default=60, help="最短服务时间/秒")
    cmp_parser.add_argument("--max-service", type=float, default=300, help="最长服务时间/秒")
    cmp_parser.add_argument("--long-tail", type=float, default=600, help="长尾等待阈值/秒")
    cmp_parser.add_argument("-v", "--verbose", action="store_true", help="显示详细解释")
    cmp_parser.add_argument("-o", "--output", type=str, default="", help="输出目录")

    explain_parser = subparsers.add_parser("explain", help="解读报告")
    explain_parser.add_argument("report", type=str, help="报告JSON文件路径")

    args = parser.parse_args()

    if args.command == "seed":
        cmd_seed(args)
    elif args.command == "simulate":
        cmd_simulate(args)
    elif args.command == "compare":
        cmd_compare(args)
    elif args.command == "explain":
        cmd_explain(args)
    else:
        parser.print_help()
        print("\n快速开始：")
        print("  1. python -m queue_fairness seed -c 200 -a 15 -o data.json   # 造数据")
        print("  2. python -m queue_fairness simulate data.json -s vip_first   # 单策略仿真")
        print("  3. python -m queue_fairness compare data.json -o report/       # 全策略对比")
        print("  4. python -m queue_fairness explain report/report.json         # 解读报告")


if __name__ == "__main__":
    main()
