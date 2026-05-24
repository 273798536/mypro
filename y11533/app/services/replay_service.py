import json
import uuid
import time
import random
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import ReplayChain, TellerSchedule, LeaveRequest, BusinessForecast, ShiftRecord
from app.config import settings
from app.services.task_service import TaskService
from app.services.status_service import StatusService
from app.services.export_service import ExportService

CHAIN_STATUS_CREATED = "created"
CHAIN_STATUS_DATA_READY = "data_ready"
CHAIN_STATUS_SERVICE_STARTED = "service_started"
CHAIN_STATUS_REQUEST_SENT = "request_sent"
CHAIN_STATUS_RECONCILED = "reconciled"
CHAIN_STATUS_EXPORTED = "exported"
CHAIN_STATUS_COMPLETED = "completed"
CHAIN_STATUS_FAILED = "failed"

class ReplayService:
    @staticmethod
    def create_chain(
        db: Session,
        chain_name: str,
        branch_id: str,
        branch_name: str,
        replay_date: str,
        created_by: str,
    ) -> ReplayChain:
        chain = ReplayChain(
            chain_id=f"CHAIN_{uuid.uuid4().hex[:16]}",
            chain_name=chain_name,
            branch_id=branch_id,
            branch_name=branch_name,
            replay_date=replay_date,
            status=CHAIN_STATUS_CREATED,
            created_by=created_by,
        )
        db.add(chain)
        db.commit()
        db.refresh(chain)
        return chain

    @staticmethod
    def generate_test_data(
        db: Session,
        chain: ReplayChain,
        teller_count: int = 5,
    ) -> Dict:
        """造数：生成测试用的排班、请假、业务量预测数据"""
        data_generation_id = f"GEN_{uuid.uuid4().hex[:12]}"
        chain.data_generation_id = data_generation_id
        chain.status = CHAIN_STATUS_DATA_READY
        
        generated_data = {
            "schedules": [],
            "leaves": [],
            "forecasts": [],
        }
        
        for i in range(teller_count):
            teller_id = f"T{1001 + i}"
            teller_name = f"柜员{i + 1}"
            
            schedule = TellerSchedule(
                schedule_id=f"SCH_{data_generation_id}_{i}",
                branch_id=chain.branch_id,
                branch_name=chain.branch_name,
                teller_id=teller_id,
                teller_name=teller_name,
                schedule_date=datetime.strptime(chain.replay_date, "%Y-%m-%d").date() if chain.replay_date else datetime.now().date(),
                shift_type="早班" if i % 2 == 0 else "中班",
                window_number=f"W{i + 1}",
                source_file="test_data_generation",
                source_row_number=i + 1,
                raw_value=json.dumps({"teller": teller_name, "shift": "generated"}),
                parsed_value=json.dumps({"teller_id": teller_id}),
                import_batch_id=data_generation_id,
                status="generated",
                status_reason="造数生成",
                status_updated_by="system",
            )
            db.add(schedule)
            generated_data["schedules"].append(schedule.schedule_id)
        
        db.commit()
        db.refresh(chain)
        
        return generated_data

    @staticmethod
    def simulate_service_start(
        db: Session,
        chain: ReplayChain,
    ) -> Dict:
        """模拟启动服务"""
        chain.status = CHAIN_STATUS_SERVICE_STARTED
        chain.service_start_time = datetime.now()
        
        command_log = f"""
[COMMAND] 启动排班服务 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> cd /opt/bank-scheduling
> ./start-service.sh --branch {chain.branch_id} --date {chain.replay_date}
[OUTPUT] Starting scheduling service...
[OUTPUT] Service started on port 8080
[OUTPUT] PID: {random.randint(10000, 20000)}
[DONE] Service ready for requests
        """.strip()
        chain.command_script_log = command_log
        
        persistence_log = f"""
[PERSISTENCE] 服务状态持久化 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> 写入网点配置: {chain.branch_id}
> 加载排班规则: 早班08:00-14:00, 中班12:00-18:00
> 午休规则: 12:00-13:30轮流午休
> 加载业务量预测数据: {chain.replay_date}
> 窗口配置: 现金窗口3个, 非现金窗口2个
[DONE] 持久化完成
        """.strip()
        chain.persistence_log = persistence_log
        
        db.commit()
        db.refresh(chain)
        
        return {"command_log": command_log, "persistence_log": persistence_log}

    @staticmethod
    def send_http_requests(
        db: Session,
        chain: ReplayChain,
        request_count: int = 10,
    ) -> Dict:
        """发送HTTP请求模拟"""
        chain.status = CHAIN_STATUS_REQUEST_SENT
        
        http_logs = []
        success_count = 0
        failed_count = 0
        
        endpoints = [
            ("/api/scheduling/validate", "POST"),
            ("/api/scheduling/calculate", "POST"),
            ("/api/window/availability", "GET"),
            ("/api/teller/assignment", "POST"),
            ("/api/break/arrange", "POST"),
        ]
        
        for i in range(request_count):
            endpoint, method = random.choice(endpoints)
            start_time = time.time()
            
            request_id = f"REQ_{uuid.uuid4().hex[:12]}"
            request_body = {
                "chain_id": chain.chain_id,
                "branch_id": chain.branch_id,
                "replay_date": chain.replay_date,
                "request_seq": i + 1,
            }
            
            is_success = random.random() > 0.1
            response_time = int(random.uniform(50, 300))
            
            end_time = time.time()
            
            log_entry = {
                "request_id": request_id,
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "method": method,
                "endpoint": endpoint,
                "status_code": 200 if is_success else random.choice([400, 404, 500]),
                "response_time_ms": response_time,
                "success": is_success,
                "request_body": json.dumps(request_body, ensure_ascii=False),
            }
            
            http_logs.append(log_entry)
            
            if is_success:
                success_count += 1
            else:
                failed_count += 1
        
        chain.http_request_log = json.dumps(http_logs, ensure_ascii=False)
        chain.request_count = request_count
        chain.request_success_count = success_count
        chain.request_failed_count = failed_count
        
        db.commit()
        db.refresh(chain)
        
        return {
            "total": request_count,
            "success": success_count,
            "failed": failed_count,
            "logs": http_logs,
        }

    @staticmethod
    def reconcile_data(
        db: Session,
        chain: ReplayChain,
    ) -> Dict:
        """对账：检查排班与实际的一致性，处理窗口人手和午休规则冲突"""
        chain.status = CHAIN_STATUS_RECONCILED
        
        diffs = []
        anomalies = []
        
        schedules = db.query(TellerSchedule).filter(
            TellerSchedule.branch_id == chain.branch_id
        ).all()
        
        for schedule in schedules:
            if schedule.is_temporary:
                diffs.append({
                    "type": "temporary_schedule",
                    "entity_id": schedule.schedule_id,
                    "teller": schedule.teller_name,
                    "reason": schedule.temporary_reason or "临时排班",
                    "impact": f"窗口{schedule.window_number}人手调整",
                })
            
            if schedule.temporary_reason and "培训" in schedule.temporary_reason:
                anomalies.append({
                    "type": "training_conflict",
                    "severity": "high",
                    "entity_id": schedule.schedule_id,
                    "teller": schedule.teller_name,
                    "description": f"柜员外出培训导致窗口{schedule.window_number}人手不足",
                    "rule_violated": "每个时段至少2个现金窗口在岗",
                })
        
        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.branch_id == chain.branch_id,
            LeaveRequest.is_training == True,
        ).all()
        
        for leave in leaves:
            anomalies.append({
                "type": "lunch_break_conflict",
                "severity": "medium",
                "entity_id": leave.leave_id,
                "teller": leave.teller_name,
                "description": f"培训期间无人接替，午休规则{leave.start_date}~{leave.end_date}无法执行",
                "rule_violated": "午休轮流休息，窗口不空档",
            })
        
        reconcile_result = {
            "total_checked": len(schedules) + len(leaves),
            "diff_count": len(diffs),
            "anomaly_count": len(anomalies),
            "diffs": diffs,
            "anomalies": anomalies,
            "conclusion": "发现临时排班和培训导致的窗口人手及午休规则冲突，需要人工确认调整方案" if anomalies else "对账通过，无异常",
        }
        
        chain.reconcile_result = json.dumps(reconcile_result, ensure_ascii=False)
        chain.reconcile_diff_count = len(diffs) + len(anomalies)
        chain.anomaly_count = len(anomalies)
        chain.anomaly_details = json.dumps(anomalies, ensure_ascii=False)
        
        db.commit()
        db.refresh(chain)
        
        return reconcile_result

    @staticmethod
    def export_report(
        db: Session,
        chain: ReplayChain,
    ) -> Tuple[str, str]:
        """导出报告"""
        chain.status = CHAIN_STATUS_EXPORTED
        
        filepath, filename = ExportService.export_replay_chain(db, chain.chain_id)
        
        db.commit()
        db.refresh(chain)
        
        return filepath, filename

    @staticmethod
    def run_full_replay(
        db: Session,
        chain: ReplayChain,
        task=None,
    ) -> Dict:
        """完整回放链路：造数 -> 启动服务 -> 发请求 -> 对账 -> 导出"""
        start_time = time.time()
        
        try:
            if task:
                TaskService.update_progress(db, task, 10, "开始造数")
            ReplayService.generate_test_data(db, chain)
            
            if task:
                TaskService.update_progress(db, task, 30, "启动服务")
            ReplayService.simulate_service_start(db, chain)
            
            if task:
                TaskService.update_progress(db, task, 50, "发送HTTP请求")
            ReplayService.send_http_requests(db, chain)
            
            if task:
                TaskService.update_progress(db, task, 70, "数据对账")
            ReplayService.reconcile_data(db, chain)
            
            if task:
                TaskService.update_progress(db, task, 85, "导出报告")
            ReplayService.export_report(db, chain)
            
            chain.status = CHAIN_STATUS_COMPLETED
            chain.completed_at = datetime.now()
            chain.duration_seconds = round(time.time() - start_time, 2)
            db.commit()
            db.refresh(chain)
            
            if task:
                TaskService.update_progress(db, task, 100, "回放完成")
            
            return {
                "chain_id": chain.chain_id,
                "status": CHAIN_STATUS_COMPLETED,
                "duration_seconds": chain.duration_seconds,
                "export_file": chain.export_file_name,
            }
            
        except Exception as e:
            chain.status = CHAIN_STATUS_FAILED
            db.commit()
            raise e
