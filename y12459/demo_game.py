#!/usr/bin/env python3

from core import GameController, CommandType, BoundaryTestSuite


def run_demo_game():
    print("=" * 60)
    print("      机器人合奏指挥战 - 演示游戏")
    print("=" * 60)
    print()

    game = GameController(seed=42)
    game.setup_default_ensemble()

    print("【第1阶段：设置音量 - 故意设置音量不平衡】")
    game.player_action("drum_1", CommandType.SET_VOLUME, {"volume": 95})
    game.player_action("violin_1", CommandType.SET_VOLUME, {"volume": 25})
    game.player_action("piano_1", CommandType.SET_VOLUME, {"volume": 70})
    print("   鼓手音量: 95, 小提琴音量: 25, 钢琴音量: 70")
    print()

    print("【第2阶段：模拟演奏 3 秒】")
    for i in range(30):
        if i == 5:
            game.player_action("drum_1", CommandType.PLAY_NOTE,
                             {"pitch": "C2", "duration": 1.0})
            game.player_action("piano_1", CommandType.PLAY_NOTE,
                             {"pitch": "C4", "duration": 1.0})
            game.player_action("violin_1", CommandType.PLAY_NOTE,
                             {"pitch": "A4", "duration": 1.0})
        if i == 15:
            game.player_action("bass_1", CommandType.PLAY_NOTE,
                             {"pitch": "E2", "duration": 1.0})
        game.run_game_step(0.1)

    status = game.get_current_status()
    print(f"   当前时间: {status['current_time']:.1f}s")
    print(f"   当前分数: {status['current_score']:.1f}")
    print(f"   音量遮盖事件: {status['volume_mask_events']}")
    print()

    print("【第3阶段：制造队列堵塞】")
    print("   为钢琴手一次性发送 8 条指令...")
    for i in range(8):
        game.player_action("piano_1", CommandType.PLAY_NOTE,
                         {"pitch": f"C{4 + i}", "duration": 0.5})
    print()

    print("【第4阶段：继续运行 2 秒观察堵塞】")
    for i in range(20):
        game.run_game_step(0.1)

    status = game.get_current_status()
    print(f"   当前时间: {status['current_time']:.1f}s")
    print(f"   当前分数: {status['current_score']:.1f}")
    print(f"   队列堵塞事件: {status['queue_block_events']}")
    print()

    print("【第5阶段：测试延迟进入】")
    game.player_action("trumpet_1", CommandType.DELAY_ENTRY, {"delay": 1.5})
    print("   小号手延迟 1.5 秒进入...")
    for i in range(20):
        game.run_game_step(0.1)
    print()

    print("【第6阶段：撤回节拍器】")
    game.withdraw_metronome()
    print("   节拍器已撤回，后续结果将被标记...")
    for i in range(10):
        game.run_game_step(0.1)
    print()

    print("【游戏结束，生成报告】")
    result = game.end_game()
    print(f"   最终分数: {result['final_score']:.1f}")
    print(f"   记录回放步数: {result['replay_steps_count']}")
    print()

    game.export_report("demo_report.txt", format="text")
    game.export_replay("demo_replay.json")
    print("   报告已保存到: demo_report.txt")
    print("   回放数据已保存到: demo_replay.json")
    print()

    analysis = game.get_trigger_analysis()
    print("【指令触发分析】")
    print(f"   总步数: {analysis['total_steps']}")
    print(f"   音量遮盖事件: {analysis['volume_mask_events']}")
    print(f"   队列堵塞事件: {analysis['queue_block_events']}")
    print()

    return result


def run_boundary_tests():
    print("=" * 60)
    print("      边界样例测试 (运行两次验证一致性)")
    print("=" * 60)
    print()

    test_suite = BoundaryTestSuite(seed=42)
    results = test_suite.run_all_tests()

    for result in results:
        print(f"【{result['test_name']}】")
        print(f"   结果一致: {'✓' if result['is_consistent'] else '✗'}")
        print(f"   分数 Run1: {result['final_score_run1']:.1f}, Run2: {result['final_score_run2']:.1f}")
        print(f"   音量遮盖: {result['volume_mask_count']} 次")
        print(f"   队列堵塞: {result['queue_block_count']} 次")
        print(f"   执行指令: {result['commands_executed']} 条")
        print(f"   回放步数: {result['replay_steps']} 步")
        if result['differences']:
            print(f"   差异: {result['differences'][:2]}")
        print()

    summary = test_suite.get_summary()
    print("=" * 60)
    print("【测试总结】")
    print(f"   总测试数: {summary['total_tests']}")
    print(f"   一致性通过率: {summary['consistent_results']}/{summary['total_tests']} ({summary['success_rate']*100:.0f}%)")
    print(f"   全部通过: {'✓ 是' if summary['all_consistent'] else '✗ 否'}")
    print("=" * 60)
    print()

    return summary


if __name__ == "__main__":
    run_demo_game()
    run_boundary_tests()

    print()
    print("演示完成！查看 demo_report.txt 了解详细排练报告。")
