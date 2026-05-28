from typing import List, Optional
import json
import os
from datetime import datetime

from .models import ReverseResult, ExceptionType
from .audit import AuditManager
from .validator import ConfigValidationResult


class Reporter:
    def __init__(self, output_dir: str = "output/reports"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def print_console_report(
        self,
        result: ReverseResult,
        show_steps: bool = True,
        show_exceptions_only: bool = False,
        audit_manager: Optional[AuditManager] = None
    ):
        item = result.quotation_item

        print("\n" + "=" * 80)
        print("📊 报价阶梯反推分析报告")
        print("=" * 80)

        status_icon = "✅" if not result.has_exceptions and result.is_valid else "⚠️ " if result.has_exceptions else "❌"
        print(f"\n{status_icon} 结论: {result.conclusion}")

        print(f"\n📋 报价基本信息:")
        print(f"  报价单号: {item.quotation_id}")
        print(f"  产品: {item.product_name} ({item.product_id})")
        print(f"  客户: {item.customer_id} (等级: {item.customer_level_id})")
        print(f"  采购数量: {item.quantity}")
        print(f"  原价: {item.standard_price:.2f} 元")
        print(f"  最终报价: {item.final_unit_price:.2f} 元")
        print(f"  原价总额: {item.standard_total_amount:.2f} 元")
        print(f"  报价总额: {item.final_total_amount:.2f} 元")
        print(f"  实际折扣率: {item.actual_discount_rate * 100:.4f}%")
        print(f"  折扣总额: {item.total_discount_amount:.2f} 元")

        if result.matched_tier:
            print(f"\n🎯 匹配折扣阶梯:")
            print(f"  阶梯ID: {result.matched_tier.tier_id}")
            print(f"  阶梯名称: {result.matched_tier.tier_name}")
            print(f"  数量范围: {result.matched_tier.min_quantity} - {result.matched_tier.max_quantity if result.matched_tier.max_quantity else '∞'}")
            print(f"  阶梯折扣: {result.matched_tier.discount_rate * 100:.2f}%")
            print(f"  需要审批级别: {result.matched_tier.approval_level_required}")

        print(f"\n💰 折扣计算:")
        print(f"  客户等级折扣: {result.applied_customer_discount * 100:.2f}%")
        print(f"  阶梯折扣: {result.applied_tier_discount * 100:.2f}%")
        print(f"  总计算折扣: {result.total_calculated_discount * 100:.2f}%")
        print(f"  理论单价: {result.calculated_unit_price:.4f} 元")
        print(f"  实际单价: {item.final_unit_price:.2f} 元")
        print(f"  价格差异: {result.price_difference:+.4f} 元 ({result.price_difference_percent:+.4f}%)")
        print(f"  容忍范围: ±{result.rounding_tolerance} 元")

        if result.approval_validation:
            av = result.approval_validation
            approval_icon = "✅" if av.is_valid else "❌"
            print(f"\n🔐 审批校验 {approval_icon}:")
            print(f"  要求审批级别: {av.required_level} ({av.required_level_name})")
            print(f"  实际审批级别: {av.actual_level} ({av.actual_level_name})")
            print(f"  实际折扣: {av.requested_discount * 100:.2f}%")
            if av.max_discount_at_actual_level is not None:
                print(f"  该级别最大允许: {av.max_discount_at_actual_level * 100:.2f}%")
            if av.issues:
                print(f"  问题:")
                for issue in av.issues:
                    print(f"    ❌ {issue}")

        if result.exceptions:
            print(f"\n⚠️  检测到 {len(result.exceptions)} 个异常:")
            for i, exc in enumerate(result.exceptions, 1):
                exc_type = exc.exception_type.value if exc.exception_type else "未知"
                print(f"  {i}. [{exc_type}] {exc.step_name}")
                print(f"     {exc.exception_message}")

        if show_steps:
            print(f"\n🔍 反推处理链 ({'仅异常' if show_exceptions_only else '全部'}):")
            for step in result.steps:
                if show_exceptions_only and not step.is_exception:
                    continue

                icon = "❌" if step.is_exception else "  "
                print(f"\n  {icon} 步骤 {step.step_order}: {step.step_name}")
                print(f"     描述: {step.description}")
                if step.value_before is not None:
                    print(f"     输入: {step.value_before}")
                if step.value_after is not None:
                    print(f"     输出: {step.value_after}")
                if step.formula:
                    print(f"     公式: {step.formula}")
                if step.is_exception:
                    print(f"     ⚠️  异常: {step.exception_type.value if step.exception_type else '未知'}")
                    print(f"        {step.exception_message}")

        if result.suggestions:
            print(f"\n💡 处理建议:")
            for i, suggestion in enumerate(result.suggestions, 1):
                print(f"  {i}. {suggestion}")

        if audit_manager:
            print(f"\n📜 审计追踪:")
            all_trails = audit_manager.audit_trails + result.audit_trails
            if all_trails:
                for trail in all_trails:
                    print(f"  [{trail.timestamp.strftime('%H:%M:%S')}] {trail.action}")
                    if trail.reason:
                        print(f"     原因: {trail.reason}")
            else:
                print("  无审计记录")

        if result.data_sources:
            print(f"\n📂 数据来源:")
            for ds in result.data_sources:
                print(f"  • [{ds.source.value}] {ds.file_name} - {ds.record_id}")

        print("\n" + "=" * 80)

    def print_batch_summary(self, results: List[ReverseResult]):
        print("\n" + "=" * 80)
        print("📊 批量反推汇总报告")
        print("=" * 80)

        total = len(results)
        normal = sum(1 for r in results if not r.has_exceptions and r.is_valid)
        has_exceptions = sum(1 for r in results if r.has_exceptions)
        invalid = sum(1 for r in results if not r.is_valid)

        print(f"\n总计: {total} 条")
        print(f"  ✅ 正常: {normal} 条 ({normal/total*100:.1f}%)")
        print(f"  ⚠️  有异常: {has_exceptions} 条 ({has_exceptions/total*100:.1f}%)")
        print(f"  ❌ 无效: {invalid} 条 ({invalid/total*100:.1f}%)")

        exception_summary = {}
        for r in results:
            for exc in r.exceptions:
                exc_type = exc.exception_type.value if exc.exception_type else "未知"
                exception_summary[exc_type] = exception_summary.get(exc_type, 0) + 1

        if exception_summary:
            print(f"\n异常类型统计:")
            for exc_type, count in sorted(exception_summary.items(), key=lambda x: -x[1]):
                print(f"  {exc_type}: {count} 次")

        print("\n" + "=" * 80)

    def export_json(self, result: ReverseResult, filename: Optional[str] = None) -> str:
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"reverse_report_{result.quotation_item.quotation_id}_{timestamp}.json"

        filepath = os.path.join(self.output_dir, filename)

        full_data = {
            "report_generated_at": datetime.now().isoformat(),
            "result": result.to_dict()
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(full_data, f, ensure_ascii=False, indent=2)

        return filepath

    def export_json_batch(self, results: List[ReverseResult], filename: Optional[str] = None) -> str:
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"reverse_report_batch_{timestamp}.json"

        filepath = os.path.join(self.output_dir, filename)

        full_data = {
            "report_generated_at": datetime.now().isoformat(),
            "total_count": len(results),
            "normal_count": sum(1 for r in results if not r.has_exceptions and r.is_valid),
            "exception_count": sum(1 for r in results if r.has_exceptions),
            "invalid_count": sum(1 for r in results if not r.is_valid),
            "results": [r.to_dict() for r in results]
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(full_data, f, ensure_ascii=False, indent=2)

        return filepath

    def export_text(self, result: ReverseResult, filename: Optional[str] = None,
                    audit_manager: Optional[AuditManager] = None) -> str:
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"reverse_report_{result.quotation_item.quotation_id}_{timestamp}.txt"

        filepath = os.path.join(self.output_dir, filename)

        lines = []
        lines.append("=" * 80)
        lines.append("报价阶梯反推分析报告")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 80)

        item = result.quotation_item
        lines.append(f"\n一、报价基本信息")
        lines.append(f"  报价单号: {item.quotation_id}")
        lines.append(f"  产品: {item.product_name} ({item.product_id})")
        lines.append(f"  客户: {item.customer_id} (等级: {item.customer_level_id})")
        lines.append(f"  采购数量: {item.quantity}")
        lines.append(f"  原价: {item.standard_price:.2f} 元")
        lines.append(f"  最终报价: {item.final_unit_price:.2f} 元")
        lines.append(f"  实际折扣率: {item.actual_discount_rate * 100:.4f}%")

        lines.append(f"\n二、折扣分析")
        lines.append(f"  客户等级折扣: {result.applied_customer_discount * 100:.2f}%")
        lines.append(f"  阶梯折扣: {result.applied_tier_discount * 100:.2f}%")
        lines.append(f"  总计算折扣: {result.total_calculated_discount * 100:.2f}%")
        lines.append(f"  理论单价: {result.calculated_unit_price:.4f} 元")
        lines.append(f"  价格差异: {result.price_difference:+.4f} 元 ({result.price_difference_percent:+.4f}%)")

        if result.matched_tier:
            lines.append(f"\n三、匹配阶梯")
            lines.append(f"  {result.matched_tier.tier_id}: {result.matched_tier.tier_name}")
            lines.append(f"  数量范围: {result.matched_tier.min_quantity} - {result.matched_tier.max_quantity if result.matched_tier.max_quantity else '∞'}")

        if result.approval_validation:
            av = result.approval_validation
            lines.append(f"\n四、审批校验")
            lines.append(f"  有效性: {'通过' if av.is_valid else '不通过'}")
            lines.append(f"  要求级别: {av.required_level} ({av.required_level_name})")
            lines.append(f"  实际级别: {av.actual_level} ({av.actual_level_name})")
            if av.issues:
                lines.append(f"  问题:")
                for issue in av.issues:
                    lines.append(f"    - {issue}")

        if result.exceptions:
            lines.append(f"\n五、异常列表 ({len(result.exceptions)} 个)")
            for i, exc in enumerate(result.exceptions, 1):
                exc_type = exc.exception_type.value if exc.exception_type else "未知"
                lines.append(f"  {i}. [{exc_type}] {exc.step_name}")
                lines.append(f"     {exc.exception_message}")

        lines.append(f"\n六、处理链")
        for step in result.steps:
            icon = "[异常]" if step.is_exception else "[正常]"
            lines.append(f"  {step.step_order}. {icon} {step.step_name}")
            lines.append(f"     {step.description}")
            if step.formula:
                lines.append(f"     公式: {step.formula}")
            if step.is_exception:
                lines.append(f"     异常信息: {step.exception_message}")

        if result.suggestions:
            lines.append(f"\n七、处理建议")
            for i, suggestion in enumerate(result.suggestions, 1):
                lines.append(f"  {i}. {suggestion}")

        lines.append(f"\n八、结论")
        lines.append(f"  {result.conclusion}")

        if audit_manager:
            lines.append(f"\n九、审计追踪")
            all_trails = audit_manager.audit_trails + result.audit_trails
            if all_trails:
                for trail in all_trails:
                    lines.append(f"  [{trail.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {trail.action}")
                    if trail.reason:
                        lines.append(f"     原因: {trail.reason}")
            else:
                lines.append("  无审计记录")

        lines.append(f"\n十、数据来源")
        for ds in result.data_sources:
            lines.append(f"  • [{ds.source.value}] {ds.file_name} - {ds.record_id}")

        lines.append("\n" + "=" * 80)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        return filepath

    def print_config_validation(self, validation_result: ConfigValidationResult):
        print("\n" + "=" * 60)
        print("⚙️  配置校验结果")
        print("=" * 60)

        if validation_result.is_valid and not validation_result.has_warnings:
            print("✅ 配置完全正确，无任何问题")
        else:
            print(f"配置有效性: {'✅ 通过' if validation_result.is_valid else '❌ 失败'}")
            print(f"警告数量: {len(validation_result.overlap_issues) + len(validation_result.gap_issues)}")

            if validation_result.overlap_issues:
                print(f"\n⚠️  阶梯重叠问题 ({len(validation_result.overlap_issues)} 处):")
                for issue in validation_result.overlap_issues:
                    severity = "🔴" if issue.severity == "error" else "🟡"
                    print(f"  {severity} {issue.to_dict()['description']}")

            if validation_result.gap_issues:
                print(f"\nℹ️  阶梯间隙问题 ({len(validation_result.gap_issues)} 处):")
                for issue in validation_result.gap_issues:
                    print(f"  🔵 {issue.to_dict()['description']}")

            if validation_result.other_issues:
                print(f"\n❌ 其他问题 ({len(validation_result.other_issues)} 处):")
                for issue in validation_result.other_issues:
                    print(f"  - {issue}")

        print("\n" + "=" * 60)
