from typing import List, Optional, Tuple
from datetime import datetime

from .models import (
    QuotationItem,
    DiscountTier,
    CustomerLevel,
    ReverseResult,
    ReverseStep,
    ExceptionType,
    ApprovalValidationResult,
    AuditTrail,
    DataSource
)
from .config_loader import ConfigLoader


class ReverseEngine:
    def __init__(self, config_loader: ConfigLoader):
        self.config_loader = config_loader
        self.step_counter = 0

    def _next_step_order(self) -> int:
        self.step_counter += 1
        return self.step_counter

    def _create_step(
        self,
        step_name: str,
        description: str,
        value_before=None,
        value_after=None,
        formula: Optional[str] = None,
        is_exception: bool = False,
        exception_type: Optional[ExceptionType] = None,
        exception_message: Optional[str] = None
    ) -> ReverseStep:
        return ReverseStep(
            step_order=self._next_step_order(),
            step_name=step_name,
            description=description,
            value_before=value_before,
            value_after=value_after,
            formula=formula,
            is_exception=is_exception,
            exception_type=exception_type,
            exception_message=exception_message
        )

    def reverse_quote(self, item: QuotationItem) -> ReverseResult:
        self.step_counter = 0
        result = ReverseResult(
            quotation_item=item,
            rounding_tolerance=self.config_loader.get_rounding_tolerance()
        )

        result.data_sources = [ds for ds in self.config_loader.data_sources
                               if ds.record_id.startswith(item.quotation_id)
                               or ds.record_id == item.product_id
                               or ds.record_id == item.customer_level_id]

        self._step_validate_input(item, result)

        if not result.is_valid:
            self._finalize_result(result)
            return result

        self._step_calculate_actual_discount(item, result)
        self._step_get_customer_discount(item, result)
        matching_tiers, overlap_step = self._step_find_matching_tiers(item, result)

        if overlap_step and overlap_step.is_exception:
            result.exceptions.append(overlap_step)

        self._step_select_applicable_tier(item, matching_tiers, result)
        self._step_calculate_expected_price(item, result)
        self._step_analyze_price_difference(item, result)
        self._step_validate_approval(item, result)

        self._finalize_result(result)

        return result

    def _step_validate_input(self, item: QuotationItem, result: ReverseResult):
        step = self._create_step(
            step_name="输入数据校验",
            description="校验报价单输入数据的完整性和有效性",
            value_before={"quantity": item.quantity, "standard_price": item.standard_price,
                          "final_price": item.final_unit_price},
            value_after=None
        )

        errors = []
        if item.quantity <= 0:
            errors.append(f"数量必须大于0，当前值: {item.quantity}")
        if item.standard_price <= 0:
            errors.append(f"原价必须大于0，当前值: {item.standard_price}")
        if item.final_unit_price <= 0:
            errors.append(f"最终报价必须大于0，当前值: {item.final_unit_price}")
        if item.final_unit_price > item.standard_price:
            errors.append(f"最终报价({item.final_unit_price})不能高于原价({item.standard_price})")

        if errors:
            step.is_exception = True
            step.exception_type = ExceptionType.INVALID_DATA
            step.exception_message = "; ".join(errors)
            step.value_after = "无效"
            result.is_valid = False
        else:
            step.value_after = "有效"

        result.steps.append(step)
        if step.is_exception:
            result.exceptions.append(step)

    def _step_calculate_actual_discount(self, item: QuotationItem, result: ReverseResult):
        actual_discount = item.actual_discount_rate
        step = self._create_step(
            step_name="计算实际折扣率",
            description="根据最终报价和原价反推实际享受的折扣率",
            value_before={"standard_price": item.standard_price, "final_price": item.final_unit_price},
            value_after=f"{actual_discount * 100:.4f}%",
            formula="实际折扣率 = 1 - (最终单价 / 原价)"
        )
        result.steps.append(step)

    def _step_get_customer_discount(self, item: QuotationItem, result: ReverseResult):
        cust_level = self.config_loader.get_customer_level(item.customer_level_id)

        if cust_level:
            result.applied_customer_discount = cust_level.base_discount_rate
            step = self._create_step(
                step_name="获取客户等级折扣",
                description=f"根据客户等级[{cust_level.level_name}]获取基础折扣",
                value_before={"customer_level_id": item.customer_level_id},
                value_after=f"{cust_level.base_discount_rate * 100:.2f}%",
                formula=f"客户[{cust_level.level_name}]基础折扣 = {cust_level.base_discount_rate * 100:.2f}%"
            )
        else:
            result.applied_customer_discount = 0.0
            step = self._create_step(
                step_name="获取客户等级折扣",
                description=f"客户等级[{item.customer_level_id}]不存在，使用0%基础折扣",
                value_before={"customer_level_id": item.customer_level_id},
                value_after="0%",
                formula="未找到客户等级，默认基础折扣 = 0%"
            )

        result.steps.append(step)

    def _step_find_matching_tiers(
        self,
        item: QuotationItem,
        result: ReverseResult
    ) -> Tuple[List[DiscountTier], Optional[ReverseStep]]:
        all_tiers = self.config_loader.get_tier_list()
        matching_tiers: List[DiscountTier] = []

        for tier in all_tiers:
            if tier.covers_quantity(item.quantity):
                matching_tiers.append(tier)

        overlap_step = None
        if len(matching_tiers) > 1:
            tier_infos = [f"{t.tier_id}({t.min_quantity}-{t.max_quantity if t.max_quantity else '∞'}, {t.discount_rate * 100:.0f}%)"
                          for t in matching_tiers]
            overlap_step = self._create_step(
                step_name="检测折扣阶梯匹配",
                description=f"数量{item.quantity}匹配到{len(matching_tiers)}个折扣阶梯，存在阶梯重叠",
                value_before={"quantity": item.quantity},
                value_after=",".join(tier_infos),
                is_exception=True,
                exception_type=ExceptionType.TIER_OVERLAP,
                exception_message=f"数量{item.quantity}同时匹配阶梯: {', '.join(tier_infos)}。请检查阶梯配置是否正确。"
            )
        elif len(matching_tiers) == 1:
            t = matching_tiers[0]
            step = self._create_step(
                step_name="检测折扣阶梯匹配",
                description=f"根据采购数量匹配对应折扣阶梯",
                value_before={"quantity": item.quantity},
                value_after=f"{t.tier_id}({t.min_quantity}-{t.max_quantity if t.max_quantity else '∞'}, {t.discount_rate * 100:.0f}%)"
            )
            result.steps.append(step)
        else:
            step = self._create_step(
                step_name="检测折扣阶梯匹配",
                description=f"数量{item.quantity}未匹配到任何折扣阶梯",
                value_before={"quantity": item.quantity},
                value_after="无匹配",
                is_exception=True,
                exception_type=ExceptionType.NO_MATCHING_TIER,
                exception_message=f"数量{item.quantity}不在任何折扣阶梯范围内。请检查阶梯配置或数量是否正确。"
            )
            result.steps.append(step)
            result.exceptions.append(step)

        if overlap_step:
            result.steps.append(overlap_step)

        return matching_tiers, overlap_step

    def _step_select_applicable_tier(
        self,
        item: QuotationItem,
        matching_tiers: List[DiscountTier],
        result: ReverseResult
    ):
        if not matching_tiers:
            step = self._create_step(
                step_name="选择适用折扣阶梯",
                description="由于无匹配阶梯，无法应用阶梯折扣",
                value_before=None,
                value_after="0%",
                formula="无匹配阶梯，阶梯折扣 = 0%"
            )
            result.steps.append(step)
            return

        if len(matching_tiers) == 1:
            selected_tier = matching_tiers[0]
        else:
            selected_tier = max(matching_tiers, key=lambda t: t.discount_rate)
            result.audit_trails.append(AuditTrail(
                timestamp=datetime.now(),
                action="选择最优折扣阶梯",
                before_value=[t.tier_id for t in matching_tiers],
                after_value=selected_tier.tier_id,
                operator="system",
                reason="存在阶梯重叠，系统自动选择折扣率最高的阶梯"
            ))

        result.matched_tier = selected_tier
        result.applied_tier_discount = selected_tier.discount_rate

        step = self._create_step(
            step_name="选择适用折扣阶梯",
            description=f"确定适用的阶梯折扣{'（自动选择最优）' if len(matching_tiers) > 1 else ''}",
            value_before=[t.tier_id for t in matching_tiers],
            value_after=f"{selected_tier.tier_id} - {selected_tier.discount_rate * 100:.2f}%",
            formula=f"阶梯折扣 = {selected_tier.discount_rate * 100:.2f}%"
        )
        result.steps.append(step)

    def _step_calculate_expected_price(self, item: QuotationItem, result: ReverseResult):
        method = self.config_loader.get_discount_combine_method()

        if method == "additive":
            total_discount = result.applied_customer_discount + result.applied_tier_discount
            formula = f"总折扣 = 客户折扣({result.applied_customer_discount * 100:.2f}%) + 阶梯折扣({result.applied_tier_discount * 100:.2f}%) = {total_discount * 100:.2f}%"
        else:
            total_discount = 1 - (1 - result.applied_customer_discount) * (1 - result.applied_tier_discount)
            formula = f"总折扣 = 1 - (1 - 客户折扣) × (1 - 阶梯折扣) = {total_discount * 100:.2f}%"

        max_discount = self.config_loader.get_max_discount_rate()
        if total_discount > max_discount:
            step = self._create_step(
                step_name="计算总折扣率",
                description=f"计算总折扣，{method}模式",
                value_before=f"{total_discount * 100:.2f}%",
                value_after=f"{max_discount * 100:.2f}%",
                formula=formula,
                is_exception=True,
                exception_type=ExceptionType.DISCOUNT_EXCEEDS_LIMIT,
                exception_message=f"计算折扣{total_discount * 100:.2f}%超过系统最大允许折扣{max_discount * 100:.2f}%，已自动限制"
            )
            result.steps.append(step)
            result.exceptions.append(step)
            total_discount = max_discount
        else:
            step = self._create_step(
                step_name="计算总折扣率",
                description=f"计算总折扣，{method}模式",
                value_before=None,
                value_after=f"{total_discount * 100:.2f}%",
                formula=formula
            )
            result.steps.append(step)

        result.total_calculated_discount = total_discount

        precision = self.config_loader.get_rounding_precision()
        calculated_price = item.standard_price * (1 - total_discount)
        calculated_price_rounded = round(calculated_price, precision)

        step = self._create_step(
            step_name="计算理论单价",
            description=f"根据总折扣率计算理论上的最终单价（保留{precision}位小数）",
            value_before=f"原价: {item.standard_price}, 折扣: {total_discount * 100:.2f}%",
            value_after=f"{calculated_price_rounded}",
            formula=f"理论单价 = 原价 × (1 - 总折扣) = {item.standard_price} × (1 - {total_discount}) = {calculated_price_rounded}"
        )
        result.steps.append(step)

        result.calculated_unit_price = calculated_price_rounded

    def _step_analyze_price_difference(self, item: QuotationItem, result: ReverseResult):
        diff = item.final_unit_price - result.calculated_unit_price
        result.price_difference = diff

        abs_diff = abs(diff)
        tolerance = result.rounding_tolerance

        if abs_diff <= tolerance:
            step = self._create_step(
                step_name="分析价格差异",
                description="比较实际报价与理论计算价的差异",
                value_before={"actual": item.final_unit_price, "calculated": result.calculated_unit_price},
                value_after=f"差异: {diff:.4f} (在容忍范围内)",
                formula=f"差异 = 实际报价 - 理论价 = {item.final_unit_price} - {result.calculated_unit_price} = {diff:.4f}",
                is_exception=(abs_diff > 0),
                exception_type=ExceptionType.ROUNDING_ERROR if abs_diff > 0 else None,
                exception_message=(f"存在{abs_diff:.4f}的四舍五入差异，在容忍范围({tolerance})内，属于正常现象"
                                   if abs_diff > 0 else None)
            )
        else:
            step = self._create_step(
                step_name="分析价格差异",
                description="比较实际报价与理论计算价的差异",
                value_before={"actual": item.final_unit_price, "calculated": result.calculated_unit_price},
                value_after=f"差异: {diff:.4f} (超出容忍范围!)",
                formula=f"差异 = 实际报价 - 理论价 = {item.final_unit_price} - {result.calculated_unit_price} = {diff:.4f}",
                is_exception=True,
                exception_type=ExceptionType.ROUNDING_ERROR,
                exception_message=f"价格差异{abs_diff:.4f}超出容忍范围({tolerance})！"
                                 f"实际报价{'偏高' if diff > 0 else '偏低'}，请检查报价是否有误或是否有其他特殊折扣。"
            )

        result.steps.append(step)
        if step.is_exception:
            result.exceptions.append(step)

    def _step_validate_approval(self, item: QuotationItem, result: ReverseResult):
        if item.approval_level is None:
            step = self._create_step(
                step_name="校验审批级别",
                description="报价单未填写审批级别，跳过审批校验",
                value_before=None,
                value_after="未校验"
            )
            result.steps.append(step)
            return

        if result.matched_tier:
            required_level = result.matched_tier.approval_level_required
        else:
            required_level = 1

        required_level_info = self.config_loader.get_approval_level(required_level)
        actual_level_info = self.config_loader.get_approval_level(item.approval_level)

        issues: List[str] = []
        is_valid = True

        if actual_level_info:
            max_discount_actual = actual_level_info.max_discount_allowed
            if result.total_calculated_discount > max_discount_actual + 0.0001:
                is_valid = False
                issues.append(
                    f"审批越权：{actual_level_info.name}(级别{item.approval_level})最大只能审批"
                    f"{max_discount_actual * 100:.2f}%折扣，但实际折扣为{result.total_calculated_discount * 100:.2f}%"
                )

        if item.approval_level < required_level:
            is_valid = False
            req_name = required_level_info.name if required_level_info else f"级别{required_level}"
            act_name = actual_level_info.name if actual_level_info else f"级别{item.approval_level}"
            issues.append(
                f"级别不足：该折扣需要{req_name}(级别{required_level})审批，"
                f"但实际由{act_name}(级别{item.approval_level})审批"
            )

        if actual_level_info and item.approver:
            if item.approver not in actual_level_info.approvers:
                is_valid = False
                issues.append(
                    f"审批人异常：{item.approver}不在{actual_level_info.name}的审批人列表中"
                )

        validation = ApprovalValidationResult(
            is_valid=is_valid,
            required_level=required_level,
            required_level_name=required_level_info.name if required_level_info else f"级别{required_level}",
            actual_level=item.approval_level,
            actual_level_name=actual_level_info.name if actual_level_info else f"级别{item.approval_level}",
            max_discount_at_actual_level=actual_level_info.max_discount_allowed if actual_level_info else None,
            requested_discount=result.total_calculated_discount,
            issues=issues
        )

        result.approval_validation = validation

        if is_valid:
            step = self._create_step(
                step_name="校验审批级别",
                description="校验审批级别和审批人是否符合规则",
                value_before={"actual_level": item.approval_level, "required_level": required_level},
                value_after="审批合规",
                formula=f"实际级别({item.approval_level}) ≥ 要求级别({required_level}), "
                        f"折扣({result.total_calculated_discount * 100:.2f}%) ≤ 最大允许({validation.max_discount_at_actual_level * 100:.2f}% if validation.max_discount_at_actual_level else 'N/A')"
            )
        else:
            step = self._create_step(
                step_name="校验审批级别",
                description="校验审批级别和审批人是否符合规则",
                value_before={"actual_level": item.approval_level, "required_level": required_level},
                value_after="审批不合规!",
                is_exception=True,
                exception_type=ExceptionType.APPROVAL_OVERREACH,
                exception_message="; ".join(issues)
            )
            result.exceptions.append(step)

        result.steps.append(step)

    def _finalize_result(self, result: ReverseResult):
        if not result.is_valid:
            result.conclusion = "数据无效，无法完成反推"
            result.suggestions.append("请先修正输入数据中的错误后再进行反推")
        elif not result.exceptions:
            result.conclusion = "反推完成，所有规则校验通过"
            if result.matched_tier:
                result.suggestions.append(
                    f"该报价适用[{result.matched_tier.tier_name}]折扣阶梯，"
                    f"总折扣{result.total_calculated_discount * 100:.2f}%，审批流程合规"
                )
        else:
            exception_types = set(e.exception_type.value for e in result.exceptions if e.exception_type)
            result.conclusion = f"反推完成，发现{len(result.exceptions)}个异常: {', '.join(exception_types)}"

            for exc in result.exceptions:
                if exc.exception_type == ExceptionType.TIER_OVERLAP:
                    result.suggestions.append(
                        f"【阶梯重叠】{exc.exception_message}。建议修正折扣阶梯配置，消除区间重叠。"
                    )
                elif exc.exception_type == ExceptionType.APPROVAL_OVERREACH:
                    result.suggestions.append(
                        f"【审批越权】{exc.exception_message}。建议升级审批或调整报价至对应级别权限内。"
                    )
                elif exc.exception_type == ExceptionType.ROUNDING_ERROR:
                    if result.price_difference_percent <= 0.1:
                        result.suggestions.append(
                            f"【四舍五入】{exc.exception_message}。差异比例{result.price_difference_percent:.4f}%，可接受。"
                        )
                    else:
                        result.suggestions.append(
                            f"【四舍五入】{exc.exception_message}。差异比例{result.price_difference_percent:.4f}%，"
                            f"建议核查是否存在其他未记录的折扣或报价错误。"
                        )
                elif exc.exception_type == ExceptionType.NO_MATCHING_TIER:
                    result.suggestions.append(
                        f"【无匹配阶梯】{exc.exception_message}。建议补充阶梯配置或按特殊报价流程处理。"
                    )
                elif exc.exception_type == ExceptionType.DISCOUNT_EXCEEDS_LIMIT:
                    result.suggestions.append(
                        f"【折扣超限】{exc.exception_message}。请确认是否需要特批流程。"
                    )
                elif exc.exception_type == ExceptionType.INVALID_DATA:
                    result.suggestions.append(
                        f"【数据无效】{exc.exception_message}。请修正数据后重试。"
                    )
