from typing import List, Dict, Any
from collections import defaultdict
import json
from datetime import datetime

from .models import GameState, VolumeMaskLevel
from .replay_system import ReplaySystem


class ReportGenerator:
    def __init__(self, game_state: GameState, replay_system: ReplaySystem):
        self.game_state = game_state
        self.replay_system = replay_system

    def generate_full_report(self) -> Dict[str, Any]:
        return {
            "report_metadata": self._generate_metadata(),
            "executive_summary": self._generate_executive_summary(),
            "musician_performance": self._generate_musician_performance(),
            "volume_mask_analysis": self._generate_volume_mask_analysis(),
            "queue_block_analysis": self._generate_queue_block_analysis(),
            "command_schedule_alignment": self._generate_alignment_analysis(),
            "score_breakdown": self._generate_score_breakdown(),
            "metronome_impact": self._generate_metronome_impact(),
            "replay_key_moments": self._generate_key_moments(),
            "recommendations": self._generate_recommendations()
        }

    def _generate_metadata(self) -> Dict[str, Any]:
        return {
            "game_id": self.game_state.game_id,
            "generated_at": datetime.now().isoformat(),
            "total_duration": self.game_state.current_time,
            "seed": self.game_state.seed,
            "metronome_withdrawn": self.game_state.metronome.withdrawn,
            "metronome_withdrawn_time": self.game_state.metronome.withdrawn_time
        }

    def _generate_executive_summary(self) -> Dict[str, Any]:
        state = self.game_state
        total_masks = len(state.volume_mask_events)
        total_blocks = len(state.queue_block_events)
        final_score = state.total_score

        grade = "A"
        if final_score < 60:
            grade = "F"
        elif final_score < 70:
            grade = "D"
        elif final_score < 80:
            grade = "C"
        elif final_score < 90:
            grade = "B"

        return {
            "final_score": final_score,
            "grade": grade,
            "total_volume_mask_events": total_masks,
            "total_queue_block_events": total_blocks,
            "active_musicians": len([m for m in state.musicians.values() if m.is_active]),
            "commands_executed": len([c for c in state.commands if c.executed]),
            "overall_assessment": self._get_overall_assessment(final_score, total_masks, total_blocks)
        }

    def _get_overall_assessment(self, score: float, masks: int, blocks: int) -> str:
        if score >= 90 and masks == 0 and blocks == 0:
            return "优秀！合奏表现完美，无音量遮盖和队列堵塞问题。"
        elif score >= 80:
            return "良好。存在少量可改进的问题。"
        elif score >= 70:
            return "一般。需要注意音量平衡和指令调度。"
        else:
            return "需要改进。存在较多音量遮盖和队列管理问题。"

    def _generate_musician_performance(self) -> List[Dict[str, Any]]:
        performances = []
        for m_id, musician in self.game_state.musicians.items():
            mask_events = [
                e for e in self.game_state.volume_mask_events
                if e.masked_musician_id == m_id
            ]
            block_events = [
                e for e in self.game_state.queue_block_events
                if e.musician_id == m_id
            ]

            performances.append({
                "musician_id": m_id,
                "name": musician.name,
                "instrument": musician.instrument.value,
                "final_volume": musician.current_volume,
                "is_active": musician.is_active,
                "times_masked": len(mask_events),
                "times_blocked": len(block_events),
                "total_score_impact": sum(e.score_impact for e in mask_events + block_events)
            })
        return performances

    def _generate_volume_mask_analysis(self) -> Dict[str, Any]:
        events = self.game_state.volume_mask_events

        if not events:
            return {
                "has_masks": False,
                "message": "本次合奏未检测到音量遮盖事件。"
            }

        mask_by_level = defaultdict(int)
        mask_by_masker = defaultdict(int)
        mask_by_masked = defaultdict(int)
        total_score_loss = 0

        for event in events:
            mask_by_level[event.mask_level.value] += 1
            mask_by_masker[event.masker_musician_id] += 1
            mask_by_masked[event.masked_musician_id] += 1
            total_score_loss += abs(event.score_impact)

        return {
            "has_masks": True,
            "total_mask_events": len(events),
            "total_score_loss": total_score_loss,
            "mask_distribution_by_level": dict(mask_by_level),
            "top_maskers": sorted(
                mask_by_masker.items(), key=lambda x: x[1], reverse=True
            )[:3],
            "most_masked": sorted(
                mask_by_masked.items(), key=lambda x: x[1], reverse=True
            )[:3],
            "severe_masks": [
                {
                    "time": e.time,
                    "masker": self.game_state.musicians[e.masker_musician_id].name,
                    "masked": self.game_state.musicians[e.masked_musician_id].name,
                    "level": e.mask_level.value,
                    "masker_volume": e.masker_volume,
                    "masked_volume": e.masked_volume,
                    "score_impact": e.score_impact
                }
                for e in events
                if e.mask_level in [VolumeMaskLevel.HEAVY, VolumeMaskLevel.COMPLETE]
            ]
        }

    def _generate_queue_block_analysis(self) -> Dict[str, Any]:
        events = self.game_state.queue_block_events

        if not events:
            return {
                "has_blocks": False,
                "message": "本次合奏未检测到队列堵塞事件。"
            }

        block_by_musician = defaultdict(int)
        total_score_loss = 0

        for event in events:
            block_by_musician[event.musician_id] += 1
            total_score_loss += abs(event.score_impact)

        return {
            "has_blocks": True,
            "total_block_events": len(events),
            "total_score_loss": total_score_loss,
            "blocks_by_musician": dict(block_by_musician),
            "block_details": [
                {
                    "time": e.time,
                    "musician": self.game_state.musicians[e.musician_id].name,
                    "reason": e.reason,
                    "block_duration": e.block_duration,
                    "blocked_commands_count": len(e.blocked_commands),
                    "score_impact": e.score_impact
                }
                for e in events
            ]
        }

    def _generate_alignment_analysis(self) -> Dict[str, Any]:
        alignments = []

        for m_id, musician in self.game_state.musicians.items():
            track = self.game_state.tracks.get(musician.current_track_id)

            track_notes = track.notes if track else []
            executed_commands = [
                c for c in self.game_state.commands
                if c.triggered_by == m_id and c.executed
            ]

            alignments.append({
                "musician_id": m_id,
                "musician_name": musician.name,
                "track_id": musician.current_track_id,
                "track_note_count": len(track_notes),
                "queue_size_current": len(musician.command_queue),
                "commands_executed": len(executed_commands),
                "entry_delay_applied": musician.entry_delay > 0
            })

        return {
            "musician_track_alignments": alignments,
            "alignment_score": self._calculate_alignment_score()
        }

    def _calculate_alignment_score(self) -> float:
        total_musicians = len(self.game_state.musicians)
        if total_musicians == 0:
            return 100.0

        well_aligned = 0
        for musician in self.game_state.musicians.values():
            if len(musician.command_queue) < 3 and musician.entry_delay == 0:
                well_aligned += 1

        return (well_aligned / total_musicians) * 100

    def _generate_score_breakdown(self) -> Dict[str, Any]:
        state = self.game_state

        mask_score_loss = sum(e.score_impact for e in state.volume_mask_events)
        block_score_loss = sum(e.score_impact for e in state.queue_block_events)

        command_scores = [c.score_impact for c in state.commands if c.executed]
        positive_command_score = sum(s for s in command_scores if s > 0)
        negative_command_score = sum(s for s in command_scores if s < 0)

        return {
            "base_score": 100.0,
            "volume_mask_penalty": mask_score_loss,
            "queue_block_penalty": block_score_loss,
            "command_positive_bonus": positive_command_score,
            "command_negative_penalty": negative_command_score,
            "final_score": state.total_score
        }

    def _generate_metronome_impact(self) -> Dict[str, Any]:
        metronome = self.game_state.metronome

        if not metronome.withdrawn:
            return {
                "metronome_active": True,
                "withdrawn": False,
                "message": "节拍器处于活跃状态，所有结果有效。"
            }

        withdrawn_time = metronome.withdrawn_time or 0
        affected_steps = [
            s for s in self.replay_system.replay_steps
            if s.time >= withdrawn_time
        ]

        return {
            "metronome_active": False,
            "withdrawn": True,
            "withdrawn_time": withdrawn_time,
            "affected_steps_count": len(affected_steps),
            "affected_score_impact": sum(s.score_delta for s in affected_steps),
            "warning": "节拍器已撤回，此时间点之后的结果标记为可能受影响，请谨慎参考。",
            "flagged_results": [
                {
                    "step_number": s.step_number,
                    "time": s.time,
                    "action_type": s.action_type,
                    "score_delta": s.score_delta,
                    "reason": s.reason,
                    "flagged": s.time >= withdrawn_time
                }
                for s in affected_steps[:10]
            ]
        }

    def _generate_key_moments(self) -> List[Dict[str, Any]]:
        significant_steps = [
            s for s in self.replay_system.replay_steps
            if abs(s.score_delta) >= 3.0
        ]

        return [
            {
                "step_number": s.step_number,
                "time": round(s.time, 2),
                "action_type": s.action_type,
                "score_delta": s.score_delta,
                "reason": s.reason,
                "musician_name": (
                    self.game_state.musicians[s.musician_id].name
                    if s.musician_id in self.game_state.musicians
                    else None
                )
            }
            for s in significant_steps
        ]

    def _generate_recommendations(self) -> List[str]:
        recommendations = []
        state = self.game_state

        mask_analysis = self._generate_volume_mask_analysis()
        if mask_analysis.get("has_masks"):
            recommendations.append(
                f"检测到 {mask_analysis['total_mask_events']} 次音量遮盖事件。"
                "建议调整各声部音量平衡，保持声部间音量差在15以内。"
            )

        block_analysis = self._generate_queue_block_analysis()
        if block_analysis.get("has_blocks"):
            recommendations.append(
                f"检测到 {block_analysis['total_block_events']} 次队列堵塞。"
                "建议优化指令调度节奏，避免一次性发送过多指令。"
            )

        for musician in state.musicians.values():
            if musician.entry_delay > 0:
                recommendations.append(
                    f"乐手 {musician.name} 有 {musician.entry_delay} 秒的进入延迟。"
                    "建议检查延迟设置是否符合编排要求。"
                )

        if state.metronome.withdrawn:
            recommendations.append(
                "⚠️ 节拍器已撤回，部分结果可能受影响。"
                "建议使用节拍器活跃时的数据进行主要分析。"
            )

        if not recommendations:
            recommendations.append("合奏表现良好，继续保持！")

        return recommendations

    def export_report_json(self, filepath: str) -> None:
        report = self.generate_full_report()
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

    def export_report_text(self, filepath: str) -> None:
        report = self.generate_full_report()

        lines = []
        lines.append("=" * 60)
        lines.append("        机器人合奏指挥战 - 排练报告")
        lines.append("=" * 60)
        lines.append("")

        meta = report["report_metadata"]
        lines.append(f"游戏ID: {meta['game_id']}")
        lines.append(f"生成时间: {meta['generated_at']}")
        lines.append(f"总时长: {meta['total_duration']:.2f} 秒")
        lines.append("")

        summary = report["executive_summary"]
        lines.append("-" * 60)
        lines.append("【总体评价】")
        lines.append("-" * 60)
        lines.append(f"最终得分: {summary['final_score']:.1f} / 100")
        lines.append(f"等级: {summary['grade']}")
        lines.append(f"音量遮盖事件: {summary['total_volume_mask_events']} 次")
        lines.append(f"队列堵塞事件: {summary['total_queue_block_events']} 次")
        lines.append(f"评价: {summary['overall_assessment']}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("【音量遮盖分析】")
        lines.append("-" * 60)
        mask_analysis = report["volume_mask_analysis"]
        if mask_analysis["has_masks"]:
            lines.append(f"总计 {mask_analysis['total_mask_events']} 次遮盖")
            lines.append(f"分数损失: {mask_analysis['total_score_loss']:.1f}")
            for mask in mask_analysis["severe_masks"]:
                lines.append(
                    f"  [{mask['time']:.2f}s] {mask['masker']}({mask['masker_volume']}) "
                    f"→ {mask['masked']}({mask['masked_volume']}) "
                    f"[{mask['level']}] ({mask['score_impact']:+.1f})"
                )
        else:
            lines.append(mask_analysis["message"])
        lines.append("")

        lines.append("-" * 60)
        lines.append("【关键时刻回放】")
        lines.append("-" * 60)
        for moment in report["replay_key_moments"][:5]:
            lines.append(
                f"步骤 {moment['step_number']} [{moment['time']}s] "
                f"{moment['action_type']}: {moment['score_delta']:+.1f}分"
            )
            lines.append(f"  原因: {moment['reason']}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("【改进建议】")
        lines.append("-" * 60)
        for i, rec in enumerate(report["recommendations"], 1):
            lines.append(f"{i}. {rec}")
        lines.append("")

        metronome = report["metronome_impact"]
        if metronome["withdrawn"]:
            lines.append("!" * 60)
            lines.append("⚠️  重要提示：节拍器已撤回")
            lines.append(f"   撤回时间: {metronome['withdrawn_time']}s")
            lines.append(f"   受影响步数: {metronome['affected_steps_count']}")
            lines.append("   此时间点之后的结果已标记，请谨慎参考")
            lines.append("!" * 60)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))
