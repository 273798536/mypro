#!/usr/bin/env python3
import sys
import json
from typing import List, Dict, Any, Optional

from models import HistoryRecord, ProcessingResult
from cli import BayesianReviewCLI


class BayesianReview:
    def __init__(self):
        self.cli = BayesianReviewCLI()

    def run_review(
        self,
        input_file: Optional[str] = None,
        output_file: Optional[str] = None,
        failures_file: Optional[str] = None,
        use_demo: bool = False,
        record_id: Optional[str] = None,
        manual_params: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        result = self.cli.run(
            input_file=input_file,
            output_file=output_file,
            failures_file=failures_file,
            use_demo=use_demo,
            record_id=record_id,
            manual_params=manual_params,
        )
        return result

    def run_review_with_records(
        self,
        records: List[HistoryRecord],
        output_file: Optional[str] = None,
        failures_file: Optional[str] = None,
    ) -> Dict[str, Any]:
        import tempfile
        import os

        temp_input = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8")
        try:
            json_data = []
            for record in records:
                item = {
                    "record_id": record.record_id,
                    "question_id": record.question_id,
                    "question_text": record.question_text,
                    "is_empty_set": record.is_empty_set,
                    "empty_set_reason": record.empty_set_reason,
                    "tags": record.tags,
                    "metadata": record.metadata,
                    "answer_versions": [],
                }
                for v in record.answer_versions:
                    item["answer_versions"].append({
                        "version_id": v.version_id,
                        "answer_text": v.answer_text,
                        "timestamp": v.timestamp.isoformat(),
                        "author": v.author,
                        "remark": v.remark,
                        "screenshot_ref": v.screenshot_ref,
                        "is_latest": v.is_latest,
                        "source_note": v.source_note,
                    })
                json_data.append(item)

            json.dump(json_data, temp_input, ensure_ascii=False, indent=2)
            temp_input.close()

            return self.cli.run(
                input_file=temp_input.name,
                output_file=output_file,
                failures_file=failures_file,
                use_demo=False,
                record_id=None,
                manual_params=None,
            )
        finally:
            if os.path.exists(temp_input.name):
                os.unlink(temp_input.name)

    def get_processing_results(self, result: Dict[str, Any]) -> List[ProcessingResult]:
        return result.get("results", [])


def run_script_mode() -> Dict[str, Any]:
    cli = BayesianReviewCLI()
    return cli.run(use_demo=True)


if __name__ == "__main__":
    from cli import main as cli_main
    cli_main()
