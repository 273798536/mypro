from typing import Dict, List
from .checker import CheckResult, ConnectivityIssue


class ResultReporter:
    def __init__(self):
        pass

    def format_issue(self, issue: ConnectivityIssue) -> str:
        severity_colors = {
            "error": "\033[91m",
            "warning": "\033[93m",
            "info": "\033[94m"
        }
        reset = "\033[0m"
        color = severity_colors.get(issue.severity, "")
        
        return f"{color}[{issue.severity.upper()}]{reset} {issue.issue_type}: {issue.description}"

    def print_results(self, results: Dict[str, CheckResult]) -> None:
        print("\n" + "="*60)
        print("拓扑路径连通检查报告")
        print("="*60)
        
        for check_name, result in results.items():
            status = "✓ 通过" if result.passed else "✗ 失败"
            print(f"\n【{check_name}】: {status}")
            
            if result.issues:
                for issue in result.issues:
                    print(f"  {self.format_issue(issue)}")
                    if issue.affected_items:
                        print(f"    影响项: {', '.join(issue.affected_items)}")
            
            if result.summary:
                print(f"    摘要: {result.summary}")
        
        print("\n" + "="*60)

    def print_change_report(self, changes: Dict) -> None:
        print("\n" + "="*60)
        print("变更对比报告")
        print("="*60)
        
        for check_name, diff in changes.items():
            if diff["changed"]:
                print(f"\n【{check_name}】: 状态变更")
                print(f"  之前: {'通过' if diff['previous_passed'] else '失败'}")
                print(f"  当前: {'通过' if diff['current_passed'] else '失败'}")
                
                if diff["new_issues"]:
                    print(f"  新增问题:")
                    for issue in diff["new_issues"]:
                        print(f"    - {issue.description}")
                
                if diff["resolved_issues"]:
                    print(f"  已解决问题:")
                    for issue in diff["resolved_issues"]:
                        print(f"    - {issue.description}")
        
        print("\n" + "="*60)

    def generate_json_report(self, results: Dict[str, CheckResult], changes: Dict = None) -> Dict:
        report = {
            "checks": {}
        }
        
        for check_name, result in results.items():
            report["checks"][check_name] = {
                "passed": result.passed,
                "issues": sorted([
                    {
                        "type": i.issue_type,
                        "severity": i.severity,
                        "description": i.description,
                        "affected_items": sorted(i.affected_items),
                        "details": dict(i.details) if isinstance(i.details, tuple) else i.details
                    } for i in result.issues
                ], key=lambda x: x["description"]),
                "summary": result.summary
            }
        
        if changes:
            report["changes"] = changes
        
        return report
