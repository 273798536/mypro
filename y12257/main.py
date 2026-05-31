import random
import sys

from models import DrawType
from gacha_engine import GachaEngine, GameSession
from report_generator import ReportGenerator
from sample_data import create_sample_pool, create_normal_player, create_overdraft_player


def run_normal_scenario():
    print("\n" + "=" * 80)
    print("场景一：正常抽卡记录（资源充足，策略型玩家）")
    print("=" * 80)

    random.seed(42)

    pool = create_sample_pool()
    player = create_normal_player()
    engine = GachaEngine()
    reporter = ReportGenerator()

    session = GameSession(
        session_id="SESSION_NORMAL_001",
        player=player,
        pool=pool,
    )

    print(f"\n初始资源: 钻石={player.resources['钻石'].current}")
    print("开始抽卡...\n")

    for i in range(5):
        result = engine.perform_draw(session, DrawType.SINGLE)
        if result:
            dupe_note = " (重复)" if result.is_duplicate else ""
            pity_note = " [保底触发]" if result.pity_triggered else ""
            print(
                f"第{i+1}抽: {result.card_name} [{result.rarity.value}]{dupe_note}{pity_note}"
            )

    result = engine.perform_draw(session, DrawType.TEN_PULL)
    if result:
        dupe_note = " (重复)" if result.is_duplicate else ""
        pity_note = " [保底触发]" if result.pity_triggered else ""
        print(
            f"第6抽(十连): {result.card_name} [{result.rarity.value}]{dupe_note}{pity_note}"
        )

    print(f"\n剩余资源: 钻石={player.resources['钻石'].current}")

    report = reporter.generate_full_report(session)
    with open("normal_report.txt", "w", encoding="utf-8") as f:
        f.write(report)
    print("\n详细报告已保存至: normal_report.txt")

    return session


def run_overdraft_scenario():
    print("\n" + "=" * 80)
    print("场景二：资源透支记录（资源不足，冲动型玩家）")
    print("=" * 80)

    random.seed(12345)

    pool = create_sample_pool()
    player = create_overdraft_player()
    engine = GachaEngine()
    reporter = ReportGenerator()

    session = GameSession(
        session_id="SESSION_OVERDRAFT_001",
        player=player,
        pool=pool,
    )

    print(f"\n初始资源: 钻石={player.resources['钻石'].current}")
    print("开始抽卡（将触发资源风险）...\n")

    for i in range(15):
        result = engine.perform_draw(session, DrawType.SINGLE)
        if result:
            dupe_note = " (重复)" if result.is_duplicate else ""
            pity_note = " [保底触发]" if result.pity_triggered else ""
            risk_note = ""
            if result.risk_alerts:
                risk_note = f" <风险: {result.risk_alerts[0].risk_level.value}>"
            print(
                f"第{i+1}抽: {result.card_name} [{result.rarity.value}]{dupe_note}{pity_note}{risk_note}"
            )
        else:
            print(f"第{i+1}抽: 失败 - 资源不足，无法继续抽卡")
            break

    print(f"\n剩余资源: 钻石={player.resources['钻石'].current}")
    print(f"风险扣分: {session.risk_penalty}")

    report = reporter.generate_full_report(session)
    with open("overdraft_report.txt", "w", encoding="utf-8") as f:
        f.write(report)
    print("\n详细报告已保存至: overdraft_report.txt")

    return session


def show_usage():
    print("""
概率抽卡保底局 - 使用说明

命令:
  python main.py normal    - 运行正常场景（资源充足）
  python main.py overdraft - 运行资源透支场景
  python main.py both      - 运行两个场景
  python main.py           - 显示此帮助

系统特点:
  1. 抽卡池管理：支持自定义卡牌、概率、保底配置
  2. 概率结算：实时计算有效概率，支持软保底机制
  3. 保底重置：获得对应稀有度后自动重置保底计数
  4. 重复角色：自动转换为碎片和金币
  5. 资源透支检测：具体到材料级别的风险提示
  6. 决策回放：数值策划可查看每一步概率结算详情
  7. 风险影响分析：明确显示风险提示对成绩的影响

输出文件:
  normal_report.txt    - 正常场景完整报告
  overdraft_report.txt - 资源透支场景完整报告
    """)


def main():
    if len(sys.argv) < 2:
        show_usage()
        return

    mode = sys.argv[1].lower()

    if mode == "normal":
        run_normal_scenario()
    elif mode == "overdraft":
        run_overdraft_scenario()
    elif mode == "both":
        run_normal_scenario()
        run_overdraft_scenario()
    else:
        show_usage()

    print("\n" + "=" * 80)
    print("演示完成！请查看生成的报告文件了解详细分析。")
    print("=" * 80)


if __name__ == "__main__":
    main()
