import os
import sys
import argparse
from typing import List, Dict, Any
from rich.console import Console
from .audio_analyzer import AudioAnalyzer, AnalysisResult
from .segment_identifier import (
    SegmentIdentifier, Segment, SegmentType,
    TimeMarker, TimeMarkerParser, format_time
)
from .history_tracker import HistoryTracker, CheckReport, FileSummary
from .report_generator import ReportGenerator


class PodcastLevelChecker:
    def __init__(self, input_dir: str, output_dir: str,
                 frame_ms: int = 100,
                 silence_threshold_db: float = -40.0,
                 music_loud_threshold_db: float = -15.0,
                 min_silence_ms: int = 500,
                 min_music_ms: int = 1000,
                 voice_reference_db: float = None):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.frame_ms = frame_ms
        self.silence_threshold_db = silence_threshold_db
        self.music_loud_threshold_db = music_loud_threshold_db
        self.min_silence_ms = min_silence_ms
        self.min_music_ms = min_music_ms
        self.voice_reference_db = voice_reference_db

        self.analyzer = AudioAnalyzer(
            frame_ms=frame_ms,
            silence_threshold_db=silence_threshold_db,
            music_loud_threshold_db=music_loud_threshold_db
        )
        self.segment_identifier = SegmentIdentifier(self.analyzer)
        self.history_tracker = HistoryTracker(output_dir)
        self.report_generator = ReportGenerator()
        self.console = Console()

    def _get_parameters(self) -> Dict[str, Any]:
        return {
            "frame_ms": self.frame_ms,
            "silence_threshold_db": self.silence_threshold_db,
            "music_loud_threshold_db": self.music_loud_threshold_db,
            "min_silence_ms": self.min_silence_ms,
            "min_music_ms": self.min_music_ms,
            "voice_reference_db": self.voice_reference_db
        }

    def _classify_segment_issue(self, segment: Segment) -> tuple:
        if segment.segment_type == SegmentType.SILENCE:
            if segment.duration_ms >= 2000:
                return ("long_silence", "high",
                        f"检测到 {segment.duration_str} 的长静音, 可能需要剪辑")
            elif segment.duration_ms >= self.min_silence_ms:
                return ("silence", "medium",
                        f"检测到 {segment.duration_str} 的静音段")

        if segment.segment_type == SegmentType.MUSIC:
            if segment.average_rms_db > self.music_loud_threshold_db:
                return ("loud_music", "high",
                        f"配度过响 ({segment.average_rms_db:.1f}dB), 可能盖过人声")
            return ("music_segment", "low",
                    f"检测到配乐段, 电平 {segment.average_rms_db:.1f}dB")

        if segment.segment_type == SegmentType.ADVERTISEMENT:
            return ("advertisement", "medium",
                    f"检测到广告段, 时长 {segment.duration_str}")

        if segment.segment_type == SegmentType.VOICE:
            if segment.average_rms_db < self.silence_threshold_db + 10:
                return ("low_voice", "medium",
                        f"人声音量偏低 ({segment.average_rms_db:.1f}dB)")

        return None

    def _check_ad_missing(self, segment: Segment, all_markers: List[TimeMarker]) -> tuple:
        for marker in all_markers:
            if not (marker.end_ms <= segment.start_ms or marker.start_ms >= segment.end_ms):
                label_lower = marker.label.lower()
                if any(kw in label_lower for kw in ['广告', 'advertisement', 'ad', 'sponsor', '赞助', '推广', '插播', 'break']):
                    if segment.segment_type != SegmentType.ADVERTISEMENT:
                        return ("ad_missing_label", "high",
                                f"检测到广告标记但未识别为广告段: '{marker.label}'")
        return None

    def run(self) -> CheckReport:
        self.console.print(f"[cyan]开始检查输入目录:[/cyan] {self.input_dir}")
        self.console.print(f"[cyan]输出目录:[/cyan] {self.output_dir}")

        parameters = self._get_parameters()
        report = self.history_tracker.create_report(self.input_dir, parameters)

        with self.console.status("[bold green]分析音频文件...") as status:
            audio_results = self.analyzer.analyze_directory(self.input_dir)
            status.update(f"[bold green]找到 {len(audio_results)} 个音频文件")

        if not audio_results:
            self.console.print("[yellow]未找到任何音频文件[/yellow]")
            return report

        for i, result in enumerate(audio_results, 1):
            file_name = os.path.basename(result.source_file)
            self.console.print(f"\n[bold]处理文件 {i}/{len(audio_results)}:[/bold] {file_name}")

            with self.console.status(f"  解析 {file_name} 的时间段标记...") as status:
                file_markers = TimeMarkerParser.parse_directory(self.input_dir, file_name)
                status.update(f"[bold green]解析到 {len(file_markers)} 个时间标记")

            with self.console.status(f"  分析 {file_name}...") as status:
                voice_ref = self.voice_reference_db or result.average_rms_db

                segments = self.segment_identifier.identify_segments(
                    result, file_markers, voice_reference_db=voice_ref
                )

                file_findings_by_type = {}

                for seg in segments:
                    issue = self._classify_segment_issue(seg)
                    if issue:
                        ftype, severity, message = issue
                        finding = self.history_tracker.create_finding(
                            seg, ftype, severity, message
                        )
                        report.findings.append(finding)
                        file_findings_by_type[ftype] = file_findings_by_type.get(ftype, 0) + 1

                    ad_issue = self._check_ad_missing(seg, file_markers)
                    if ad_issue:
                        ftype, severity, message = ad_issue
                        finding = self.history_tracker.create_finding(
                            seg, ftype, severity, message
                        )
                        report.findings.append(finding)
                        file_findings_by_type[ftype] = file_findings_by_type.get(ftype, 0) + 1

                segments_data = []
                for seg in segments:
                    markers_data = []
                    for m in seg.markers:
                        markers_data.append({
                            "label": m.label,
                            "source_file": m.source_file,
                            "line_number": m.line_number
                        })

                    segments_data.append({
                        "start_ms": seg.start_ms,
                        "end_ms": seg.end_ms,
                        "duration": seg.duration_str,
                        "segment_type": seg.segment_type.value,
                        "confidence": seg.confidence,
                        "average_rms_db": seg.average_rms_db,
                        "evidence": seg.evidence,
                        "markers": markers_data
                    })

                file_summary = FileSummary(
                    source_file=result.source_file,
                    duration_ms=result.duration_ms,
                    total_findings=sum(file_findings_by_type.values()),
                    findings_by_type=file_findings_by_type,
                    segments=segments_data
                )
                report.files.append(file_summary)

        comparison = self.history_tracker.compare_with_previous(report)

        with self.console.status("[bold green]生成报告...") as status:
            json_report_path = os.path.join(self.output_dir, "report.json")
            self.report_generator.generate_json_report(report, json_report_path)

            text_report_path = os.path.join(self.output_dir, "report.txt")
            self.report_generator.generate_text_report(report, text_report_path)

            self.history_tracker.save_history(report)

        self.console.print("\n[green]✓ 报告已生成:[/green]")
        self.console.print(f"  JSON: {json_report_path}")
        self.console.print(f"  文本: {text_report_path}")

        self.report_generator.print_terminal_summary(report, comparison)

        return report


def main():
    parser = argparse.ArgumentParser(
        description="播客配乐电平检查工具 - 自动检测人声静音、配乐过响和广告段漏标",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 检查当前目录下的音频文件, 输出到 ./output
  podcast-level-check --input ./raw --output ./output

  # 自定义静音阈值
  podcast-level-check --input ./raw --output ./output --silence-threshold -45

  # 检查配度过响(相对于人声+3dB)
  podcast-level-check --input ./raw --output ./output --music-threshold -18
        """
    )

    parser.add_argument("--input", "-i", required=True,
                        help="输入目录, 包含音频文件和时间段标记文件")
    parser.add_argument("--output", "-o", required=True,
                        help="输出目录, 用于保存检查报告")

    parser.add_argument("--frame-ms", type=int, default=100,
                        help="分析帧长(毫秒), 默认 100")
    parser.add_argument("--silence-threshold", type=float, default=-40.0,
                        help="静音阈值(dB), 默认 -40")
    parser.add_argument("--music-threshold", type=float, default=-15.0,
                        help="配乐过响阈值(dB), 默认 -15")
    parser.add_argument("--min-silence-ms", type=int, default=500,
                        help="最小静音段长度(毫秒), 默认 500")
    parser.add_argument("--min-music-ms", type=int, default=1000,
                        help="最小配乐段长度(毫秒), 默认 1000")
    parser.add_argument("--voice-reference", type=float, default=None,
                        help="人声参考电平(dB), 默认使用文件平均电平")

    parser.add_argument("--version", action="version",
                        version="%(prog)s 0.1.0")

    args = parser.parse_args()

    if not os.path.isdir(args.input):
        print(f"错误: 输入目录不存在: {args.input}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.output, exist_ok=True)

    checker = PodcastLevelChecker(
        input_dir=args.input,
        output_dir=args.output,
        frame_ms=args.frame_ms,
        silence_threshold_db=args.silence_threshold,
        music_loud_threshold_db=args.music_threshold,
        min_silence_ms=args.min_silence_ms,
        min_music_ms=args.min_music_ms,
        voice_reference_db=args.voice_reference
    )

    try:
        checker.run()
    except KeyboardInterrupt:
        print("\n已取消", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"\n错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
