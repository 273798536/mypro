from datetime import datetime
from typing import Dict, List
from models import Database, IssueRecord, ProjectContract
from jinja2 import Template


class LetterExporter:
    def __init__(self, db: Database):
        self.db = db

    def generate_payment_reminder(self, project_code: str) -> str:
        contract = self.db.get_contract(project_code)
        if not contract:
            return "错误: 未找到项目合同"

        issues = self.db.get_issues_by_project(project_code, status='未解决')
        payment_info = self._get_payment_info(project_code)

        template = Template(self._payment_reminder_template())
        return template.render(
            project=contract,
            issues=issues,
            payment_info=payment_info,
            today=datetime.now().strftime('%Y年%m月%d日')
        )

    def generate_issue_notification(self, project_code: str, issue_types: List[str] = None) -> str:
        contract = self.db.get_contract(project_code)
        if not contract:
            return "错误: 未找到项目合同"

        all_issues = self.db.get_issues_by_project(project_code, status='未解决')
        
        if issue_types:
            issues = [i for i in all_issues if i.issue_type in issue_types]
        else:
            issues = all_issues

        template = Template(self._issue_notification_template())
        return template.render(
            project=contract,
            issues=issues,
            issue_count=len(issues),
            today=datetime.now().strftime('%Y年%m月%d日')
        )

    def generate_final_report(self, project_code: str) -> str:
        contract = self.db.get_contract(project_code)
        if not contract:
            return "错误: 未找到项目合同"

        issues = self.db.get_issues_by_project(project_code)
        nodes = self.db.get_nodes_by_project(project_code)
        audit_logs = self.db.get_audit_logs(project_code)

        template = Template(self._final_report_template())
        return template.render(
            project=contract,
            nodes=nodes,
            issues=issues,
            audit_logs=audit_logs[:20],
            today=datetime.now().strftime('%Y年%m月%d日')
        )

    def export_to_file(self, content: str, file_path: str) -> bool:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"导出失败: {e}")
            return False

    def _get_payment_info(self, project_code: str) -> Dict:
        nodes = self.db.get_nodes_by_project(project_code)
        contract = self.db.get_contract(project_code)
        
        if not contract:
            return {}

        pending_nodes = [n for n in nodes if n.payment_status == '待支付']
        total_pending = sum(n.payment_amount for n in pending_nodes)

        return {
            'contract_amount': contract.contract_amount,
            'pending_amount': total_pending,
            'pending_nodes': pending_nodes,
            'pending_count': len(pending_nodes)
        }

    def _payment_reminder_template(self) -> str:
        return '''
╔══════════════════════════════════════════════════════════════╗
║                    会展搭建尾款付款催告函                    ║
╚══════════════════════════════════════════════════════════════╝

致：{{ project.client_name }}

事由：关于"{{ project.project_name }}"项目尾款支付事宜

日期：{{ today }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

一、项目基本信息

  项目编号：{{ project.project_code }}
  项目名称：{{ project.project_name }}
  承建单位：{{ project.contractor }}
  合同金额：￥{{ "{:,.2f}".format(project.contract_amount) }}
  合同签订：{{ project.sign_date }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

二、待付款项明细

  待支付节点数量：{{ payment_info.pending_count }} 个
  待支付总金额：￥{{ "{:,.2f}".format(payment_info.pending_amount) }}

  {% for node in payment_info.pending_nodes %}
  ▶ 节点 {{ node.node_code }} - {{ node.node_name }}
    付款比例：{{ node.payment_ratio }}%
    应付金额：￥{{ "{:,.2f}".format(node.payment_amount) }}
    当前状态：{{ node.payment_status }}
  {% endfor %}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

三、待解决问题清单（共 {{ issues|length }} 项）

  {% for issue in issues %}
  [{{ issue.severity }}] {{ issue.issue_type }}
      节点：{{ issue.node_code }}
      说明：{{ issue.description }}
      发现时间：{{ issue.detected_at[:10] }}

  {% endfor %}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

四、请贵方协助

  1. 请尽快完成上述待解决问题的整改工作
  2. 请在收到本函后3个工作日内安排付款事宜
  3. 如有疑问，请及时与我方项目负责人联系

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  特此函告

  （签章处）

  日期：{{ today }}

══════════════════════════════════════════════════════════════
'''

    def _issue_notification_template(self) -> str:
        return '''
╔══════════════════════════════════════════════════════════════╗
║                  会展搭建节点问题整改通知书                  ║
╚══════════════════════════════════════════════════════════════╝

致：{{ project.contractor }}

事由：关于"{{ project.project_name }}"项目节点问题整改

日期：{{ today }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

一、项目基本信息

  项目编号：{{ project.project_code }}
  项目名称：{{ project.project_name }}
  客户单位：{{ project.client_name }}
  合同金额：￥{{ "{:,.2f}".format(project.contract_amount) }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

二、发现问题汇总

  本次检查共发现问题：{{ issue_count }} 项

  问题分类统计：
  {% set ns = namespace() %}
  {% set ns.types = {} %}
  {% for issue in issues %}
    {% if issue.issue_type not in ns.types %}
      {% set _ = ns.types.update({issue.issue_type: 0}) %}
    {% endif %}
    {% set _ = ns.types.update({issue.issue_type: ns.types[issue.issue_type] + 1}) %}
  {% endfor %}
  {% for t, c in ns.types.items() %}
    • {{ t }}：{{ c }} 项
  {% endfor %}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

三、问题详细清单

  {% for issue in issues %}
  问题 #{{ loop.index }}
  ────────────────────────────────────────────────────
  节点编号：{{ issue.node_code }}
  问题类型：{{ issue.issue_type }}
  严重程度：{{ issue.severity }}
  问题描述：{{ issue.description }}
  发现时间：{{ issue.detected_at[:10] }}
  当前状态：{{ issue.status }}

  【整改要求】
  请在收到本通知后2个工作日内完成整改并提交复核。

  {% endfor %}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

四、联系方式

  如有疑问，请及时与我方项目管理部联系

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  特此通知

  （签章处）

  日期：{{ today }}

══════════════════════════════════════════════════════════════
'''

    def _final_report_template(self) -> str:
        return '''
╔══════════════════════════════════════════════════════════════╗
║                  会展搭建尾款结算最终报告                    ║
╚══════════════════════════════════════════════════════════════╝

报告日期：{{ today }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

一、项目概况

  项目编号：{{ project.project_code }}
  项目名称：{{ project.project_name }}
  客户单位：{{ project.client_name }}
  承建单位：{{ project.contractor }}
  合同金额：￥{{ "{:,.2f}".format(project.contract_amount) }}
  项目周期：{{ project.start_date }} 至 {{ project.end_date }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

二、节点执行情况

  {% for node in nodes %}
  节点 {{ node.node_code }}：{{ node.node_name }}
    计划日期：{{ node.planned_date }}
    实际日期：{{ node.actual_date or '未完成' }}
    节点状态：{{ node.status }}
    付款比例：{{ node.payment_ratio }}%
    付款金额：￥{{ "{:,.2f}".format(node.payment_amount) }}
    付款状态：{{ node.payment_status }}
    照片提交：{{ '已提交' if node.photos_submitted else '未提交' }} ({{ node.photos_count }}张)
    变更审批：{{ '已审批' if node.change_approved else ('存在未批变更' if node.design_change else '无变更') }}

  {% endfor %}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

三、问题记录汇总

  累计发现问题：{{ issues|length }} 项

  {% for issue in issues %}
  • [{{ issue.status }}] {{ issue.issue_type }} - {{ issue.node_code }}
    {{ issue.description }}
    (发现于 {{ issue.detected_at[:10] }})
  {% endfor %}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

四、审核日志（最近20条）

  {% for log in audit_logs %}
  • {{ log.timestamp[:19] }} | {{ log.action }} | {{ log.operator }}
  {% endfor %}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

五、结论建议

  请根据以上报告内容，结合项目实际情况完成尾款结算工作。

══════════════════════════════════════════════════════════════
'''
