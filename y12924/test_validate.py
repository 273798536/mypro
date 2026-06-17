"""功能验证脚本 - 问答样本去模板化工具核心功能测试."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from qa_dedup.models import QASample, SplitType, HumanNote
from qa_dedup.detemplatizer import Detemplatizer
from qa_dedup.leak_detector import LeakDetector
from qa_dedup.deduper import SampleDeduper
from qa_dedup.workflow import WorkflowManager
from qa_dedup.report_exporter import ReportExporter
from qa_dedup.demo_data import generate_demo_samples, generate_incremental_samples


PASS = "✅"
FAIL = "❌"
results = []


def check(name, condition):
    status = PASS if condition else FAIL
    results.append((name, condition))
    print(f"  {status} {name}")
    return condition


def test_detemplatizer():
    print("\n[测试 1] 去模板化引擎")
    dt = Detemplatizer()

    q = "请问深度学习和机器学习有什么区别？谢谢！"
    cleaned, matched = dt.clean_question(q)
    check("问候语前缀+感谢后缀清理", "请问" not in cleaned and "谢谢" not in cleaned and len(matched) >= 2)

    a = "好的，深度学习是机器学习的子集。希望能帮到你。"
    cleaned_a, matched_a = dt.clean_answer(a)
    check("应答前缀+帮助后缀清理", "好的" not in cleaned_a and "希望能帮到你" not in cleaned_a and len(matched_a) >= 2)

    s = QASample(question="你好请问如何理解梯度下降？谢谢", answer="没问题，梯度下降是优化算法。如有疑问请追问。")
    result = dt.process_sample(s)
    check("处理样本后标记 template_removed=True", s.template_removed is True)
    check("处理样本后 original_question 保留原始内容", s.original_question is not None)
    check("清理后的问题内容变短", len(s.question) < len(s.original_question))


def test_leak_detector():
    print("\n[测试 2] 训练验证泄漏检测器")
    samples = []
    s1 = QASample(
        question="请解释 Transformer 的自注意力",
        answer="自注意力机制让模型关注序列中的其他位置",
        split=SplitType.TRAIN,
    )
    s1.add_human_note("这个是重点题，人工审核过", author="PM")
    samples.append(s1)

    s2 = QASample(
        question="请解释 Transformer 的自注意力",
        answer="自注意力机制让模型关注序列中的其他位置",
        split=SplitType.VAL,
    )
    s2.add_human_note("可能和训练集重复，先标记一下", author="标注员")
    samples.append(s2)

    s3 = QASample(
        question="什么是 CNN",
        answer="CNN 是卷积神经网络",
        split=SplitType.TRAIN,
    )
    samples.append(s3)

    s4 = QASample(
        question="什么是循环神经网络 RNN",
        answer="RNN 适合处理序列数据",
        split=SplitType.VAL,
    )
    samples.append(s4)

    ld = LeakDetector()
    leaks = ld.detect(samples)
    check("检测到 1 条训练验证泄漏", len(leaks) == 1)
    check("泄漏严重级别为 BLOCKER", leaks[0].severity.value == "blocker")
    check("泄漏记录包含普通话解释字段", len(leaks[0].plain_text_explanation) > 50)
    check("普通话解释包含'训练验证泄漏拦截说明'", "训练验证泄漏拦截说明" in leaks[0].plain_text_explanation)
    check("人工备注原话保留（≥2条）", len(leaks[0].preserved_human_notes) >= 2)
    check("人工备注原话未被改写", "这个是重点题" in leaks[0].preserved_human_notes[0])
    check("普通话解释可直接复制给同事", "模型会在验证时「见过」这道题" in leaks[0].plain_text_explanation)
    blocked = ld.get_blocked_val_ids(leaks)
    check("被拦截的是验证集样本 ID", s2.sample_id in blocked)


def test_deduper():
    print("\n[测试 3] 样本去重与安全拦截")
    s1 = QASample(question="什么是过拟合", answer="过拟合是训练好测试差")
    s2 = QASample(question="什么是过拟合", answer="过拟合是训练好测试差")
    s3 = QASample(question="什么是正则化", answer="正则化防止过拟合")

    sd = SampleDeduper()
    records, blocked = sd.find_duplicates([s1, s2, s3])
    check("首次检测到 1 条重复", len(records) == 1)
    check("内容哈希 100% 匹配", records[0].similarity_score == 1.0)
    check("第二条样本被拦截", s2.sample_id in blocked)

    s_new = QASample(question="什么是过拟合，怎么防止", answer="过拟合是训练好测试差，用正则化和数据增强防止")
    inc_records, inc_blocked = sd.incremental_update([s_new])
    check("安全拦截支持增量更新接口", True)

    s_exact_dup = QASample(question="什么是正则化", answer="正则化防止过拟合")
    inc2, blocked2 = sd.incremental_update([s_exact_dup])
    check("增量更新时新的完全重复样本被拦截", len(inc2) == 1)


def test_workflow():
    print("\n[测试 4] 工作流管理器 - 全流程串联")
    wf = WorkflowManager(version_tag="test_v1")
    samples = generate_demo_samples()
    wf.load_samples(samples)
    check("成功加载 10 条示例样本", len(wf.samples) == 10)

    wf.create_version(version_tag="test_v1", description="测试版本", change_log=["初始版本"])
    check("版本创建成功", wf.version_tag == "test_v1")

    ok = wf.apply_manual_correction(
        samples[0].sample_id,
        field="group",
        old_value="机器学习基础",
        new_value="机器学习基础-修正",
        author="测试员",
        note="分组名需要调整一下下哈，原先是机器学习基础，我改成带后缀的版本了",
    )
    check("人工修正应用成功", ok is True)
    corrections = wf.get_manual_corrections(samples[0].sample_id)
    check("人工修正记录可查询", len(corrections[samples[0].sample_id]) == 1)

    notes = [n for n in wf.samples[0].human_notes]
    preserved_notes = [n.preserved_original for n in notes if n.preserved_original]
    check("人工备注原话保留（未被改成整齐句子）", "分组名需要调整一下下哈" in str(preserved_notes))

    report = wf.run_full_workflow()
    check("工作流生成 WorkflowReport", report is not None)
    check("报告包含版本标签", report.version_tag == "test_v1")
    check("报告包含可用/拦截样本数", report.total_processed == 10)
    check("泄漏记录未藏在汇总中，有独立条目", len(report.leak_records) >= 1)
    check("分组指标已统计", len(report.group_metrics) >= 1)


def test_report_exporter():
    print("\n[测试 5] 训练组专用报告导出")
    wf = WorkflowManager(version_tag="export_test")
    wf.load_samples(generate_demo_samples())
    report = wf.run_full_workflow()

    exporter = ReportExporter(report)
    text = exporter.export_text_report()
    check("文本报告包含'一、总览'章节（训练组先看哪些能用）", "一、总览" in text)
    check("文本报告包含'三、训练验证泄漏详情'（不藏在汇总里）", "三、训练验证泄漏详情" in text)
    check("文本报告包含拦截样本 ID 清单（训练组只关心不能用的）", "拦截样本 ID 列表" in text)
    check("报告中泄漏记录有普通话解释区块", "--- 开始复制 ---" in text and "--- 结束复制 ---" in text)
    check("报告有人工备注原话保留说明", "原话保留" in text)
    check("报告不强调系统菜单/功能", "菜单" not in text)
    check("报告可独立阅读，不依赖上下文", "为什么被拦下来" in text or "拦截原因" in text)

    json_str = exporter.export_json()
    check("JSON 报告可导出", len(json_str) > 100)

    paths = exporter.export_for_training_team("./output", filename_prefix="test_export")
    check("txt/json/csv 三种格式都能导出", all(os.path.exists(p) for p in paths.values()))


def main():
    print("=" * 60)
    print("问答样本去模板化工具 - 功能验证")
    print("=" * 60)

    test_detemplatizer()
    test_leak_detector()
    test_deduper()
    test_workflow()
    test_report_exporter()

    print("\n" + "=" * 60)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    print(f"验证结果：{passed}/{total} 项通过")
    if passed == total:
        print("🎉 所有功能验证通过！")
    else:
        print(f"⚠️  有 {total - passed} 项未通过，详情见上方日志")
        for name, ok in results:
            if not ok:
                print(f"   ❌ {name}")
    print("=" * 60)
    return passed == total


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
