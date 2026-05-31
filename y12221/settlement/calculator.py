import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional

from .models import (
    SponsorshipContract,
    LivestreamRecord,
    ExposureProof,
    TournamentResult,
    SettlementRecord,
    SettlementStatus,
    SettlementContext,
)


class FeeCalculator:
    def __init__(self, context: SettlementContext):
        self.context = context

    def calculate_settlement(self, contract_id: str, use_pending_issues: bool = False) -> SettlementRecord:
        contract = self.context.contracts.get(contract_id)
        if not contract:
            raise ValueError(f"Contract not found: {contract_id}")
        
        result_key = f"{contract.tournament_id}_{contract.team_id}"
        result = self.context.results.get(result_key)
        livestreams = self.context.livestreams.get(contract_id, [])
        exposures = self.context.exposures.get(contract_id, [])
        
        existing = self.context.settlements.get(contract_id)
        
        base_fee = contract.base_fee
        exposure_fee, exposure_details = self._calculate_exposure_fee(contract, exposures)
        livestream_fee, livestream_details = self._calculate_livestream_fee(contract, livestreams)
        ranking_bonus, ranking_details = self._calculate_ranking_bonus(contract, result)
        
        total_amount = base_fee + exposure_fee + livestream_fee + ranking_bonus
        
        deduction_amount = self._calculate_deductions(contract, exposures, livestreams, result)
        final_amount = total_amount - deduction_amount
        
        issues = [
            issue for issue in self.context.issues.values()
            if issue.contract_id == contract_id
        ]
        issue_ids = [issue.issue_id for issue in issues]
        
        has_pending_issues = any(
            issue.issue_status.value in ["pending_confirmation", "exception"]
            for issue in issues
        )
        
        if has_pending_issues and not use_pending_issues:
            status = SettlementStatus.ISSUES_FOUND
        elif issues:
            status = SettlementStatus.ISSUES_FOUND
        else:
            status = SettlementStatus.READY_FOR_SETTLEMENT
        
        calculation_details = {
            "base_breakdown": {
                "base_fee": base_fee,
                "exposure_fee": exposure_fee,
                "livestream_fee": livestream_fee,
                "ranking_bonus": ranking_bonus,
            },
            "exposure_details": exposure_details,
            "livestream_details": livestream_details,
            "ranking_details": ranking_details,
            "deduction_details": self._get_deduction_details(contract, exposures, livestreams, result),
        }
        
        if existing:
            version_history = existing.version_history.copy()
            version_history.append({
                "version": existing.version,
                "final_amount": existing.final_amount,
                "updated_at": existing.updated_at,
                "changes": self._compare_changes(existing.calculation_details, calculation_details),
            })
            settlement = SettlementRecord(
                settlement_id=existing.settlement_id,
                contract_id=contract_id,
                status=status,
                base_fee=base_fee,
                exposure_fee=exposure_fee,
                livestream_fee=livestream_fee,
                ranking_bonus=ranking_bonus,
                total_amount=total_amount,
                deduction_amount=deduction_amount,
                final_amount=final_amount,
                calculation_details=calculation_details,
                issue_ids=issue_ids,
                created_at=existing.created_at,
                updated_at=datetime.now().isoformat(),
                version=existing.version + 1,
                version_history=version_history,
            )
        else:
            settlement = SettlementRecord(
                settlement_id=f"SETTLE_{contract_id}_{uuid.uuid4().hex[:8]}",
                contract_id=contract_id,
                status=status,
                base_fee=base_fee,
                exposure_fee=exposure_fee,
                livestream_fee=livestream_fee,
                ranking_bonus=ranking_bonus,
                total_amount=total_amount,
                deduction_amount=deduction_amount,
                final_amount=final_amount,
                calculation_details=calculation_details,
                issue_ids=issue_ids,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                version=1,
                version_history=[],
            )
        
        self.context.settlements[contract_id] = settlement
        
        return settlement

    def _calculate_exposure_fee(self, contract: SponsorshipContract, exposures: List[ExposureProof]) -> tuple[float, Dict[str, Any]]:
        tier_rates = contract.tier_rates
        requirements = contract.exposure_requirements
        
        details = {}
        total_fee = 0.0
        
        for exp_type, required_count in requirements.items():
            verified_exposures = [e for e in exposures if e.exposure_type == exp_type and e.verified]
            actual_count = len(verified_exposures)
            
            rate_key = f"exposure_{exp_type.lower()}"
            rate = tier_rates.get(rate_key, 0)
            
            fee = actual_count * rate
            total_fee += fee
            
            details[exp_type] = {
                "required": required_count,
                "actual": actual_count,
                "rate_per_unit": rate,
                "fee": fee,
                "meets_requirement": actual_count >= required_count,
            }
        
        return total_fee, details

    def _calculate_livestream_fee(self, contract: SponsorshipContract, livestreams: List[LivestreamRecord]) -> tuple[float, Dict[str, Any]]:
        tier_rates = contract.tier_rates
        requirements = contract.livestream_requirements
        
        total_duration = sum(l.duration_minutes for l in livestreams)
        total_mentions = sum(l.sponsor_mentions for l in livestreams)
        
        duration_rate = tier_rates.get("livestream_per_minute", 0)
        mention_rate = tier_rates.get("mention_per_time", 0)
        
        duration_fee = total_duration * duration_rate
        mention_fee = total_mentions * mention_rate
        total_fee = duration_fee + mention_fee
        
        required_duration = requirements.get("minimum_duration_minutes", 0)
        required_mentions = requirements.get("minimum_mentions", 0)
        
        details = {
            "duration": {
                "required_minutes": total_duration,
                "required": required_duration,
                "meets_requirement": total_duration >= required_duration,
                "rate_per_minute": duration_rate,
                "fee": duration_fee,
            },
            "mentions": {
                "actual": total_mentions,
                "required": required_mentions,
                "meets_requirement": total_mentions >= required_mentions,
                "rate_per_mention": mention_rate,
                "fee": mention_fee,
            },
            "stream_count": len(livestreams),
        }
        
        return total_fee, details

    def _calculate_ranking_bonus(self, contract: SponsorshipContract, result: Optional[TournamentResult]) -> tuple[float, Dict[str, Any]]:
        if not result:
            return 0.0, {"status": "no_result_available"}
        
        rank = result.rank
        bonus = contract.ranking_bonus.get(str(rank), 0)
        
        details = {
            "rank": rank,
            "bonus_amount": bonus,
            "is_rematch": result.is_rematch_result,
        }
        
        if result.is_rematch_result:
            details["original_rank"] = result.original_rank
            if result.original_rank:
                details["original_bonus"] = contract.ranking_bonus.get(str(result.original_rank), 0)
                details["bonus_difference"] = bonus - details["original_bonus"]
        
        return bonus, details

    def _calculate_deductions(self, contract: SponsorshipContract, exposures: List[ExposureProof], livestreams: List[LivestreamRecord], result: Optional[TournamentResult]) -> float:
        deductions = 0.0
        
        requirements = contract.exposure_requirements
        tier_rates = contract.tier_rates
        
        for exp_type, required_count in requirements.items():
            verified = [e for e in exposures if e.exposure_type == exp_type and e.verified]
            if len(verified) < required_count:
                missing = required_count - len(verified)
                rate_key = f"exposure_{exp_type.lower()}"
                rate = tier_rates.get(rate_key, 0)
                deductions += missing * rate * 0.5
        
        livestream_requirements = contract.livestream_requirements
        required_duration = livestream_requirements.get("minimum_duration_minutes", 0)
        total_duration = sum(l.duration_minutes for l in livestreams)
        
        if total_duration < required_duration:
            missing = required_duration - total_duration
            rate = tier_rates.get("livestream_per_minute", 0)
            deductions += missing * rate * 0.3
        
        return deductions

    def _get_deduction_details(self, contract: SponsorshipContract, exposures: List[ExposureProof], livestreams: List[LivestreamRecord], result: Optional[TournamentResult]) -> Dict[str, Any]:
        details = {
            "exposure_deductions": {},
            "livestream_deductions": {},
        }
        
        requirements = contract.exposure_requirements
        tier_rates = contract.tier_rates
        
        for exp_type, required_count in requirements.items():
            verified = [e for e in exposures if e.exposure_type == exp_type and e.verified]
            if len(verified) < required_count:
                missing = required_count - len(verified)
                rate_key = f"exposure_{exp_type.lower()}"
                rate = tier_rates.get(rate_key, 0)
                deduction = missing * rate * 0.5
                details["exposure_deductions"][exp_type] = {
                    "missing": missing,
                    "deduction_amount": deduction,
                    "rate": rate,
                }
        
        livestream_requirements = contract.livestream_requirements
        required_duration = livestream_requirements.get("minimum_duration_minutes", 0)
        total_duration = sum(l.duration_minutes for l in livestreams)
        
        if total_duration < required_duration:
            missing = required_duration - total_duration
            rate = tier_rates.get("livestream_per_minute", 0)
            deduction = missing * rate * 0.3
            details["livestream_deductions"]["duration"] = {
                "missing_minutes": missing,
                "deduction_amount": deduction,
                "rate_per_minute": rate,
            }
        
        return details

    def _compare_changes(self, old_details: Dict[str, Any], new_details: Dict[str, Any]) -> Dict[str, Any]:
        changes = {}
        
        old_base = old_details.get("base_breakdown", {})
        new_base = new_details.get("base_breakdown", {})
        
        for key in ["base_fee", "exposure_fee", "livestream_fee", "ranking_bonus"]:
            old_val = old_base.get(key, 0)
            new_val = new_base.get(key, 0)
            if old_val != new_val:
                changes[key] = {
                    "old": old_val,
                    "new": new_val,
                    "difference": new_val - old_val,
                }
        
        return changes

    def calculate_all(self) -> Dict[str, SettlementRecord]:
        results = {}
        for contract_id in self.context.contracts:
            results[contract_id] = self.calculate_settlement(contract_id)
        return results
