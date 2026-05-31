import uuid
from datetime import datetime
from typing import Dict, List, Any, Tuple

from .models import (
    SponsorshipContract,
    LivestreamRecord,
    ExposureProof,
    TournamentResult,
    IssueRecord,
    IssueType,
    IssueStatus,
    SettlementContext,
)


class RightsVerifier:
    def __init__(self, context: SettlementContext):
        self.context = context

    def verify_contract(self, contract_id: str) -> List[IssueRecord]:
        issues = []
        
        contract = self.context.contracts.get(contract_id)
        if not contract:
            return issues
        
        result_key = f"{contract.tournament_id}_{contract.team_id}"
        result = self.context.results.get(result_key)
        livestreams = self.context.livestreams.get(contract_id, [])
        exposures = self.context.exposures.get(contract_id, [])
        
        existing_issue_types = set()
        for issue in self.context.issues.values():
            if issue.contract_id == contract_id:
                existing_issue_types.add(issue.issue_type)
        
        rematch_issues = self._check_rematch(contract, result)
        for issue in rematch_issues:
            if issue.issue_type not in existing_issue_types:
                issues.append(issue)
                existing_issue_types.add(issue.issue_type)
        
        exposure_issues = self._check_exposure_proofs(contract, exposures)
        for issue in exposure_issues:
            issue_key = (issue.issue_type, issue.source_data.get("exposure_type"))
            existing_keys = set(
                (i.issue_type, i.source_data.get("exposure_type"))
                for i in self.context.issues.values()
                if i.contract_id == contract_id
            )
            if issue_key not in existing_keys:
                issues.append(issue)
        
        tie_issues = self._check_tie_ranking(contract, result)
        for issue in tie_issues:
            if issue.issue_type not in existing_issue_types:
                issues.append(issue)
                existing_issue_types.add(issue.issue_type)
        
        livestream_issues = self._check_livestream_duration(contract, livestreams)
        for issue in livestream_issues:
            if issue.issue_type not in existing_issue_types:
                issues.append(issue)
                existing_issue_types.add(issue.issue_type)
        
        for issue in issues:
            self.context.issues[issue.issue_id] = issue
        
        return issues

    def _check_rematch(self, contract: SponsorshipContract, result: TournamentResult) -> List[IssueRecord]:
        issues = []
        
        if result and result.is_rematch_result:
            issue_id = f"REMATCH_{contract.contract_id}_{uuid.uuid4().hex[:8]}"
            
            bonus_change = None
            if result.original_rank and result.original_rank != result.rank:
                original_bonus = contract.ranking_bonus.get(str(result.original_rank), 0)
                new_bonus = contract.ranking_bonus.get(str(result.rank), 0)
                bonus_change = new_bonus - original_bonus
            
            issue = IssueRecord(
                issue_id=issue_id,
                contract_id=contract.contract_id,
                issue_type=IssueType.REMATCH_RECALCULATION,
                issue_status=IssueStatus.PENDING_CONFIRMATION,
                title=f"补赛追溯: {contract.sponsor_name} - 名次变更",
                description=f"赛事 {contract.tournament_id} 发生补赛，战队 {contract.team_id} 名次发生变更",
                root_cause=(
                    f"补赛原因: {result.rematch_reason or '赛事组委会裁定'}\n"
                    f"原名次: 第{result.original_rank}名 -> 新名次: 第{result.rank}名\n"
                    f"结果记录: {result.result_id}"
                ),
                handling_suggestion=self._get_rematch_suggestion(
                    result.original_rank, 
                    result.rank, 
                    bonus_change,
                    contract.sponsor_name
                ),
                source_data={
                    "tournament_id": contract.tournament_id,
                    "team_id": contract.team_id,
                    "original_rank": result.original_rank,
                    "new_rank": result.rank,
                    "rematch_reason": result.rematch_reason,
                    "bonus_change": bonus_change,
                    "result_id": result.result_id
                }
            )
            issues.append(issue)
        
        return issues

    def _get_rematch_suggestion(self, original_rank: int, new_rank: int, bonus_change: float, sponsor: str) -> str:
        suggestion_parts = [
            "=== 处理建议 ===",
            "1. 立即通知赞助商:",
            f"   - 向 {sponsor} 发送名次变更说明函",
            f"   - 说明从第{original_rank}名变更为第{new_rank}名的原因",
            "",
            "2. 费用调整说明:"
        ]
        
        if bonus_change is not None:
            if bonus_change > 0:
                suggestion_parts.append(f"   - 名次奖金增加: +{bonus_change:.2f} 元")
                suggestion_parts.append("   - 准备补发差额款项")
            elif bonus_change < 0:
                suggestion_parts.append(f"   - 名次奖金减少: {bonus_change:.2f} 元")
                suggestion_parts.append("   - 需与赞助商协商扣款或后续抵扣")
            else:
                suggestion_parts.append("   - 名次奖金无变化")
        
        suggestion_parts.extend([
            "",
            "3. 审核流程:",
            "   - 运营确认补赛结果的正式文件",
            "   - 财务确认费用调整方案",
            "   - 双方确认后更新结算状态",
            "",
            "4. 文档留存:",
            "   - 保存补赛官方公告",
            "   - 保存与赞助商的沟通记录"
        ])
        
        return "\n".join(suggestion_parts)

    def _check_exposure_proofs(self, contract: SponsorshipContract, exposures: List[ExposureProof]) -> List[IssueRecord]:
        issues = []
        requirements = contract.exposure_requirements
        
        for exp_type, required_count in requirements.items():
            matching = [e for e in exposures if e.exposure_type == exp_type and e.verified]
            
            if len(matching) < required_count:
                issue_id = f"EXP_{contract.contract_id}_{exp_type}_{uuid.uuid4().hex[:8]}"
                missing = required_count - len(matching)
                
                issue = IssueRecord(
                    issue_id=issue_id,
                    contract_id=contract.contract_id,
                    issue_type=IssueType.MISSING_EXPOSURE_PROOF,
                    issue_status=IssueStatus.PENDING_CONFIRMATION,
                    title=f"露出缺证: {contract.sponsor_name} - {exp_type}",
                    description=f"{exp_type} 露出证明不足，缺少 {missing} 份",
                    root_cause=(
                        f"合同要求: {required_count} 次 {exp_type} 露出\n"
                        f"已提供验证: {len(matching)} 次\n"
                        f"缺少数量: {missing} 次\n"
                        f"未验证待审核: {len([e for e in exposures if e.exposure_type == exp_type and not e.verified])} 次"
                    ),
                    handling_suggestion=self._get_exposure_suggestion(exp_type, missing),
                    source_data={
                        "exposure_type": exp_type,
                        "required": required_count,
                        "provided": len(matching),
                        "missing": missing,
                        "pending_verification": len([e for e in exposures if e.exposure_type == exp_type and not e.verified])
                    }
                )
                issues.append(issue)
        
        return issues

    def _get_exposure_suggestion(self, exp_type: str, missing: int) -> str:
        suggestions = [
            "=== 处理建议 ===",
            f"1. 缺失类型: {exp_type}",
            f"   - 需要补充: {missing} 份证明材料",
            "",
            "2. 收集渠道:",
            "   - 联系赛事运营索取官方露出截图",
            "   - 检查直播回放获取镜头证据",
            "   - 收集社交媒体露出记录",
            "",
            "3. 验证要求:",
            "   - 截图需包含清晰的品牌标识",
            "   - 需注明露出时间和位置",
            "   - 官方渠道露出优先认可",
            "",
            "4. 时限提示:",
            "   - 建议在 3 个工作日内补充完毕",
            "   - 逾期未补将按合同条款扣减费用"
        ]
        return "\n".join(suggestions)

    def _check_tie_ranking(self, contract: SponsorshipContract, result: TournamentResult) -> List[IssueRecord]:
        issues = []
        
        if not result:
            return issues
        
        same_rank_teams = []
        for key, r in self.context.results.items():
            if r.tournament_id == contract.tournament_id and r.rank == result.rank:
                team_id = key.split('_')[1] if '_' in key else r.team_id
                same_rank_teams.append(team_id)
        
        if len(same_rank_teams) > 1:
            issue_id = f"TIE_{contract.contract_id}_{uuid.uuid4().hex[:8]}"
            
            issue = IssueRecord(
                issue_id=issue_id,
                contract_id=contract.contract_id,
                issue_type=IssueType.TIE_RANKING,
                issue_status=IssueStatus.PENDING_CONFIRMATION,
                title=f"名次并列: {contract.sponsor_name} - 第{result.rank}名",
                description=f"第{result.rank}名有 {len(same_rank_teams)} 支战队并列，需确认奖金分配规则",
                root_cause=(
                    f"当前名次: 第{result.rank}名\n"
                    f"并列战队: {', '.join(same_rank_teams)}\n"
                    f"并列数量: {len(same_rank_teams)} 支\n"
                    f"合同约定: 按名次发放固定奖金"
                ),
                handling_suggestion=self._get_tie_suggestion(result.rank, len(same_rank_teams)),
                source_data={
                    "rank": result.rank,
                    "tied_teams": same_rank_teams,
                    "tie_count": len(same_rank_teams),
                    "tournament_id": contract.tournament_id
                }
            )
            issues.append(issue)
        
        return issues

    def _get_tie_suggestion(self, rank: int, tie_count: int) -> str:
        suggestions = [
            "=== 处理建议 ===",
            f"1. 并列情况: 第{rank}名共 {tie_count} 支战队并列",
            "",
            "2. 可选方案:",
            "   方案A: 按原名次奖金全额发放（需赞助商确认）",
            f"   方案B: 名次奖金平均分配（每队 1/{tie_count}）",
            "   方案C: 取下一名次奖金标准发放",
            "",
            "3. 操作步骤:",
            "   - 查询赛事规则中关于并列名次的说明",
            "   - 与赞助商沟通确认处理方式",
            "   - 形成书面确认文件",
            "   - 更新结算计算规则",
            "",
            "4. 注意事项:",
            "   - 必须获得赞助商书面确认",
            "   - 所有并列战队处理方式保持一致"
        ]
        return "\n".join(suggestions)

    def _check_livestream_duration(self, contract: SponsorshipContract, livestreams: List[LivestreamRecord]) -> List[IssueRecord]:
        issues = []
        
        requirements = contract.livestream_requirements
        required_duration = requirements.get("minimum_duration_minutes", 0)
        required_mentions = requirements.get("minimum_mentions", 0)
        
        total_duration = sum(l.duration_minutes for l in livestreams)
        total_mentions = sum(l.sponsor_mentions for l in livestreams)
        
        if required_duration > 0 and total_duration < required_duration:
            issue_id = f"LIVE_DUR_{contract.contract_id}_{uuid.uuid4().hex[:8]}"
            missing = required_duration - total_duration
            
            issue = IssueRecord(
                issue_id=issue_id,
                contract_id=contract.contract_id,
                issue_type=IssueType.INSUFFICIENT_LIVESTREAM_DURATION,
                issue_status=IssueStatus.PENDING_CONFIRMATION,
                title=f"直播时长不足: {contract.sponsor_name}",
                description=f"直播总时长不足，缺少 {missing} 分钟",
                root_cause=(
                    f"合同要求: {required_duration} 分钟\n"
                    f"实际累计: {total_duration} 分钟\n"
                    f"差额: {missing} 分钟 ({missing/60:.1f} 小时)\n"
                    f"直播场次: {len(livestreams)} 场"
                ),
                handling_suggestion=self._get_livestream_suggestion(missing),
                source_data={
                    "required_duration": required_duration,
                    "actual_duration": total_duration,
                    "missing_minutes": missing,
                    "stream_count": len(livestreams)
                }
            )
            issues.append(issue)
        
        return issues

    def _get_livestream_suggestion(self, missing_minutes: int) -> str:
        suggestions = [
            "=== 处理建议 ===",
            f"1. 缺口分析: 缺少 {missing_minutes} 分钟直播时长",
            "",
            "2. 补充方案:",
            "   - 安排额外的赞助商专访直播",
            "   - 在后续赛事中增加露出时间",
            "   - 制作专题回放视频",
            "",
            "3. 替代方案（如无法补时）:",
            f"   - 按比例扣减直播权益费用: 扣减比例 {missing_minutes/60:.1f}%",
            "   - 或增加其他露出形式补偿",
            "",
            "4. 沟通要点:",
            "   - 提前与赞助商沟通",
            "   - 提供替代方案供选择",
            "   - 书面确认处理结果"
        ]
        return "\n".join(suggestions)

    def verify_all(self) -> Dict[str, List[IssueRecord]]:
        all_issues = {}
        for contract_id in self.context.contracts:
            issues = self.verify_contract(contract_id)
            if issues:
                all_issues[contract_id] = issues
        return all_issues
