import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from io import StringIO


class ReportService:
    def __init__(self):
        pass

    def generate_report(self, task_id: str, calculation_result: Dict[str, Any]) -> Dict[str, Any]:
        task = calculation_result.get('task', {})
        energy_model = calculation_result.get('energyModel', {})
        return_threshold = calculation_result.get('returnThreshold', {})
        risks = calculation_result.get('risks', [])
        risk_summary = calculation_result.get('riskSummary', {})
        corrections = calculation_result.get('corrections', [])
        source_traces = calculation_result.get('sourceTraces', [])
        raw_packages = calculation_result.get('rawPackages', [])

        report = {
            'reportVersion': '1.0',
            'generatedAt': datetime.now().isoformat(),
            'taskId': task_id,
            'taskName': task.get('name', 'Unknown'),
            'summary': self._generate_summary(energy_model, return_threshold, risk_summary),
            'energyModel': self._format_energy_model(energy_model),
            'returnThreshold': self._format_return_threshold(return_threshold),
            'riskAnalysis': {
                'summary': risk_summary,
                'details': self._format_risks(risks)
            },
            'dataSources': self._format_data_sources(raw_packages),
            'correctionHistory': self._format_corrections(corrections),
            'calculationTrace': self._format_source_traces(source_traces),
            'conclusions': self._generate_conclusions(energy_model, return_threshold, risk_summary),
            'recommendations': self._generate_recommendations(risks, return_threshold)
        }

        return report

    def _generate_summary(
        self,
        energy_model: Dict[str, Any],
        return_threshold: Dict[str, Any],
        risk_summary: Dict[str, Any]
    ) -> Dict[str, Any]:
        total_energy = energy_model.get('totalEnergyRequired', 0)
        min_battery = return_threshold.get('minBatteryLevel', 0)
        risk_level = risk_summary.get('overallRiskLevel', 'unknown')
        can_proceed = risk_summary.get('canProceed', False)

        return {
            'totalEnergyRequired': total_energy,
            'energyPerKm': energy_model.get('energyPerKm', 0),
            'effectiveDistance': energy_model.get('effectiveDistance', 0),
            'minBatteryForReturn': min_battery,
            'maxSafeDistance': return_threshold.get('maxDistance', 0),
            'overallRiskLevel': risk_level,
            'canProceedWithMission': can_proceed,
            'safetyScore': return_threshold.get('safetyMargins', {}).get('overallSafetyScore', 0)
        }

    def _format_energy_model(self, energy_model: Dict[str, Any]) -> Dict[str, Any]:
        curve = energy_model.get('curve', [])
        simplified_curve = []
        if len(curve) > 20:
            step = len(curve) // 20
            simplified_curve = [curve[i] for i in range(0, len(curve), step)]
        else:
            simplified_curve = curve

        return {
            'basePowerConsumption': energy_model.get('basePowerConsumption'),
            'factors': {
                'payloadFactor': energy_model.get('payloadFactor'),
                'windFactor': energy_model.get('windFactor'),
                'altitudeFactor': energy_model.get('altitudeFactor'),
                'speedFactor': energy_model.get('speedFactor')
            },
            'totalEnergyRequired': energy_model.get('totalEnergyRequired'),
            'energyPerKm': energy_model.get('energyPerKm'),
            'effectiveDistance': energy_model.get('effectiveDistance'),
            'energyCurve': simplified_curve
        }

    def _format_return_threshold(self, return_threshold: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'minBatteryLevel': return_threshold.get('minBatteryLevel'),
            'maxDistance': return_threshold.get('maxDistance'),
            'maxFlightTime': return_threshold.get('maxFlightTime'),
            'safeReturnMargin': return_threshold.get('safeReturnMargin'),
            'criticalBatteryLevel': return_threshold.get('criticalBatteryLevel'),
            'lowBatteryLevel': return_threshold.get('lowBatteryLevel'),
            'shouldReturnNow': return_threshold.get('shouldReturnNow'),
            'returnUrgency': return_threshold.get('returnUrgency'),
            'energyAnalysis': {
                'currentEnergyWh': return_threshold.get('currentEnergyWh'),
                'energyToReturn': return_threshold.get('energyToReturn'),
                'energyToContinue': return_threshold.get('energyToContinue'),
                'marginEnergy': return_threshold.get('marginEnergy')
            },
            'safetyMargins': return_threshold.get('safetyMargins', {}),
            'windAdjustment': {
                'applied': return_threshold.get('windAdjustmentFactor') is not None,
                'factor': return_threshold.get('windAdjustmentFactor'),
                'impactPoint': return_threshold.get('impactPoint')
            }
        }

    def _format_risks(self, risks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted = []
        for risk in risks:
            formatted.append({
                'id': risk.get('id'),
                'level': risk.get('level'),
                'type': risk.get('type'),
                'message': risk.get('message'),
                'details': risk.get('details', {}),
                'sourceTraceId': risk.get('sourceTraceId')
            })
        return formatted

    def _format_data_sources(self, raw_packages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted = []
        for pkg in raw_packages:
            try:
                content = json.loads(pkg.get('content', '{}'))
            except json.JSONDecodeError:
                content = {}

            formatted.append({
                'packageId': pkg.get('id'),
                'type': pkg.get('type'),
                'source': pkg.get('source'),
                'importedAt': pkg.get('imported_at'),
                'contentPreview': self._generate_content_preview(content, pkg.get('type'))
            })
        return formatted

    def _generate_content_preview(self, content: Dict[str, Any], pkg_type: str) -> Dict[str, Any]:
        preview = {}
        if pkg_type == 'mixed':
            if 'waypoint_plan' in content:
                preview['waypoints'] = len(content['waypoint_plan'].get('waypoints', []))
                preview['totalDistance'] = content['waypoint_plan'].get('totalDistance')
            if 'payload_weight' in content:
                preview['payload'] = content['payload_weight'].get('payload')
            if 'wind_field' in content:
                preview['baseWindSpeed'] = content['wind_field'].get('baseWindSpeed')
        elif pkg_type == 'waypoint_plan':
            preview['waypoints'] = len(content.get('waypoints', []))
            preview['totalDistance'] = content.get('totalDistance')
        elif pkg_type == 'payload_weight':
            if 'payload' in content:
                preview['payload'] = content.get('payload')
            if 'battery' in content:
                preview['batteryAgingFactor'] = content['battery'].get('agingFactor')
        return preview

    def _format_corrections(self, corrections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted = []
        for corr in corrections:
            if corr.get('action') and corr['action'] != 'correction':
                continue

            formatted.append({
                'correctionId': corr.get('id'),
                'field': corr.get('field'),
                'oldValue': corr.get('old_value', corr.get('oldValue')),
                'newValue': corr.get('new_value', corr.get('newValue')),
                'correctedBy': corr.get('corrected_by', corr.get('correctedBy')),
                'reason': corr.get('reason'),
                'correctedAt': corr.get('corrected_at', corr.get('correctedAt'))
            })
        return formatted

    def _format_source_traces(self, source_traces: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted = []
        for trace in source_traces:
            formatted.append({
                'traceId': trace.get('id'),
                'type': trace.get('type'),
                'description': trace.get('description'),
                'value': trace.get('value'),
                'timestamp': trace.get('timestamp'),
                'sourcePackageId': trace.get('source_package_id', trace.get('sourcePackageId')),
                'correctionId': trace.get('correction_id', trace.get('correctionId')),
                'previousNodeId': trace.get('previous_node_id', trace.get('previousNodeId')),
                'metadata': trace.get('metadata', {})
            })
        return formatted

    def _generate_conclusions(
        self,
        energy_model: Dict[str, Any],
        return_threshold: Dict[str, Any],
        risk_summary: Dict[str, Any]
    ) -> List[str]:
        conclusions = []

        total_energy = energy_model.get('totalEnergyRequired', 0)
        min_battery = return_threshold.get('minBatteryLevel', 0)
        risk_level = risk_summary.get('overallRiskLevel', 'unknown')
        can_proceed = risk_summary.get('canProceed', False)
        safety_score = return_threshold.get('safetyMargins', {}).get('overallSafetyScore', 0)

        conclusions.append(f'本次任务总能耗预计为 {total_energy} Wh，每公里能耗 {energy_model.get("energyPerKm", 0)} Wh/km')
        conclusions.append(f'安全返航所需最低电量为 {min_battery}%，建议保持 {return_threshold.get("safeReturnMargin", 0)}% 的安全余量')

        if can_proceed:
            conclusions.append(f'风险等级为 {risk_level}，可以执行任务，但需保持监控')
        else:
            conclusions.append(f'风险等级为 {risk_level}，不建议执行本次任务')

        if safety_score >= 80:
            conclusions.append(f'综合安全评分 {safety_score} 分，安全裕度充足')
        elif safety_score >= 60:
            conclusions.append(f'综合安全评分 {safety_score} 分，需关注关键风险点')
        else:
            conclusions.append(f'综合安全评分 {safety_score} 分，存在较大安全隐患')

        return conclusions

    def _generate_recommendations(
        self,
        risks: List[Dict[str, Any]],
        return_threshold: Dict[str, Any]
    ) -> List[str]:
        recommendations = []

        critical_risks = [r for r in risks if r.get('level') == 'critical']
        high_risks = [r for r in risks if r.get('level') == 'high']

        if critical_risks:
            recommendations.append('【紧急】存在严重风险，建议立即终止任务或采取紧急措施')
            for r in critical_risks:
                recommendations.append(f'  - {r.get("message")}')

        if high_risks:
            recommendations.append('【重要】存在高风险项，建议采取以下措施：')
            for r in high_risks:
                recommendations.append(f'  - {r.get("message")}')

        urgency = return_threshold.get('returnUrgency', 'low')
        if urgency in ['high', 'critical']:
            recommendations.append('【返航建议】电池余量紧张，建议提前规划返航路线')

        if return_threshold.get('detourDistance', 0) > 0:
            recommendations.append(f'【绕行提醒】需绕行禁飞区，增加航程 {return_threshold.get("detourDistance", 0)} km，已计入能耗计算')

        if not recommendations:
            recommendations.append('【状态良好】当前计算结果显示各项指标正常，可安全执行任务')

        return recommendations

    def export_report_json(self, report: Dict[str, Any]) -> str:
        return json.dumps(report, ensure_ascii=False, indent=2)

    def export_report_text(self, report: Dict[str, Any]) -> str:
        output = StringIO()

        output.write('=' * 80 + '\n')
        output.write('无人机风场返航计算报告\n')
        output.write('=' * 80 + '\n\n')
        output.write(f'报告版本: {report["reportVersion"]}\n')
        output.write(f'生成时间: {report["generatedAt"]}\n')
        output.write(f'任务ID: {report["taskId"]}\n')
        output.write(f'任务名称: {report["taskName"]}\n\n')

        output.write('-' * 40 + '\n')
        output.write('一、计算摘要\n')
        output.write('-' * 40 + '\n\n')
        summary = report['summary']
        output.write(f'总能耗: {summary["totalEnergyRequired"]} Wh\n')
        output.write(f'每公里能耗: {summary["energyPerKm"]} Wh/km\n')
        output.write(f'有效航程: {summary["effectiveDistance"]} km\n')
        output.write(f'返航最低电量: {summary["minBatteryForReturn"]}%\n')
        output.write(f'最大安全距离: {summary["maxSafeDistance"]} km\n')
        output.write(f'综合风险等级: {summary["overallRiskLevel"]}\n')
        output.write(f'安全评分: {summary["safetyScore"]} 分\n')
        output.write(f'能否执行任务: {"是" if summary["canProceedWithMission"] else "否"}\n\n')

        output.write('-' * 40 + '\n')
        output.write('二、风险分析\n')
        output.write('-' * 40 + '\n\n')
        for risk in report['riskAnalysis']['details']:
            output.write(f'[{risk["level"].upper()}] {risk["type"]}\n')
            output.write(f'  {risk["message"]}\n\n')

        output.write('-' * 40 + '\n')
        output.write('三、结论\n')
        output.write('-' * 40 + '\n\n')
        for i, conclusion in enumerate(report['conclusions'], 1):
            output.write(f'{i}. {conclusion}\n')

        output.write('\n' + '-' * 40 + '\n')
        output.write('四、建议\n')
        output.write('-' * 40 + '\n\n')
        for i, rec in enumerate(report['recommendations'], 1):
            output.write(f'{i}. {rec}\n')

        return output.getvalue()
