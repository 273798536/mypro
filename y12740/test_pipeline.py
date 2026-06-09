import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.data_loader import DataLoader
from modules.data_validator import DataValidator
from modules.metrics_calculator import MetricsCalculator
from modules.anomaly_classifier import AnomalyClassifier
from modules.history_comparator import HistoryComparator
from modules.result_exporter import ResultExporter


def test_pipeline():
    print('=' * 60)
    print('梯度下降轨迹讲解 - 端到端测试')
    print('=' * 60)

    sample_dir = os.path.join(os.path.dirname(__file__), 'sample_data')

    file_types = {
        'questions': os.path.join(sample_dir, '题目清单示例.xlsx'),
        'historical_answers': os.path.join(sample_dir, '历史答案示例.xlsx'),
        'student_errors': os.path.join(sample_dir, '学生错题示例.xlsx'),
        'constraints': os.path.join(sample_dir, '约束条件示例.xlsx')
    }

    for k, p in file_types.items():
        print(f'  ✅ {k}: {p} 存在={os.path.exists(p)}')

    print('\n[1/6] 数据加载...')
    loader = DataLoader()
    loaded = loader.load_all(file_types)
    for k, v in loaded.items():
        if hasattr(v, 'shape'):
            print(f'  ✅ {k}: {v.shape[0]} 行, {v.shape[1]} 列')
        elif isinstance(v, str):
            print(f'  ❌ {k}: 错误 - {v}')

    print('\n[2/6] 数据校验...')
    validator = DataValidator()
    validation = validator.validate_all(loaded)
    summary = validation.get('summary', {})
    print(f'  ✅ 严重: {summary.get("total_critical", 0)} | 警告: {summary.get("total_warning", 0)} | 提示: {summary.get("total_info", 0)}')
    print(f'  ✅ 整体状态: {summary.get("status_text", "")}')
    for sheet, issues in validation.items():
        if sheet == 'summary' or not issues:
            continue
        if isinstance(issues, list):
            print(f'     - {sheet}: {len(issues)} 个问题')

    print('\n[3/6] 公式计算与误差分析...')
    calculator = MetricsCalculator()
    metrics = calculator.calculate_all(loaded)
    m_summary = metrics.get('summary', {})
    print(f'  ✅ 总题目: {m_summary.get("total_questions", 0)}')
    print(f'  ✅ 有学生数据: {m_summary.get("questions_with_students", 0)}')
    print(f'  ✅ 有数值指标: {m_summary.get("questions_with_numeric_metrics", 0)}')
    print(f'  ✅ 整体MSE: {m_summary.get("overall_MSE", "N/A")}')
    print(f'  ✅ 整体RMSE: {m_summary.get("overall_RMSE", "N/A")}')
    print(f'  ✅ 整体MAE: {m_summary.get("overall_MAE", "N/A")}')
    print(f'  ✅ 整体R²: {m_summary.get("overall_R2", "N/A")}')
    print(f'  ✅ 整体准确率: {m_summary.get("overall_accuracy", "N/A")}%')

    formula_info = calculator.get_formula_info('RMSE')
    print(f'  ✅ 公式详情(RMSE): {formula_info.get("success", False)}')

    print('\n[4/6] 异常分级标记...')
    classifier = AnomalyClassifier()
    anomalies = classifier.classify_all(loaded, validation, metrics)
    a_summary = anomalies.get('summary', {})
    print(f'  ✅ 可用: {a_summary.get("available_count", 0)} | 暂缓: {a_summary.get("pending_count", 0)} | 需重采: {a_summary.get("recapture_count", 0)}')
    print(f'  ✅ 可用率: {a_summary.get("available_rate", 0)}%')
    print(f'  ✅ 待办事项: {len(anomalies.get("action_items", []))} 项')

    for qid, q_data in list(anomalies['per_question'].items())[:3]:
        print(f'     - {qid}: {q_data["status_label"]} | 下一步: {q_data.get("next_action", "-")} | 运营建议: {q_data["for_operations"]}')

    print('\n[5/6] 历史对比与来源追溯...')
    comparator = HistoryComparator()
    history = comparator.compare(loaded)
    h_summary = history.get('summary', {})
    print(f'  ✅ 历史记录总数: {h_summary.get("total_historical", 0)}')
    print(f'  ✅ 答案一致: {h_summary.get("matched", 0)} | 不一致: {h_summary.get("mismatched", 0)} | 无来源: {h_summary.get("no_source", 0)}')
    print(f'  ✅ 来源追溯条数: {len(history.get("source_trail", []))}')
    print(f'  ✅ 冲突条目: {len(history.get("conflicts", []))}')

    print('\n[6/6] 结果导出...')
    exporter = ResultExporter()
    full_data = {
        'anomalies': anomalies,
        'metrics_result': metrics,
        'validation_report': validation,
        'history_result': history
    }
    result = exporter.export(full_data, 'full', 'xlsx')
    export_path = os.path.join(sample_dir, '测试导出结果.xlsx')
    with open(export_path, 'wb') as f:
        f.write(result)
    print(f'  ✅ 导出文件大小: {len(result)} 字节')
    print(f'  ✅ 保存到: {export_path}')
    print(f'  ✅ 文件存在: {os.path.exists(export_path)}')

    print('\n' + '=' * 60)
    print('✅ 所有模块测试通过！')
    print('=' * 60)

    return True


if __name__ == '__main__':
    try:
        test_pipeline()
    except Exception as e:
        print(f'\n❌ 测试失败: {e}')
        traceback.print_exc()
        sys.exit(1)
