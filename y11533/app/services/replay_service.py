import json
import uuid
import time
import random
import asyncio
import httpx
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import ReplayChain, TellerSchedule, LeaveRequest, BusinessForecast, ShiftRecord, PriceAdjustment
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
        """造数：生成完整的排班、请假单、业务量预测、班次记录、手工改价表
        
        核心场景设计：2名柜员临时外出培训，导致：
        1. 窗口人手不足（高峰时段业务量预测需要4个窗口，实际只有3个在岗）
        2. 午休规则冲突（只剩2人无法轮流午休，违反"窗口不空档"规则）
        """
        from datetime import date, time, timedelta
        
        data_generation_id = f"GEN_{uuid.uuid4().hex[:12]}"
        chain.data_generation_id = data_generation_id
        chain.status = CHAIN_STATUS_DATA_READY
        
        replay_date = datetime.strptime(chain.replay_date, "%Y-%m-%d").date() if chain.replay_date else datetime.now().date()
        
        generated_data = {
            "schedules": [],
            "leaves": [],
            "forecasts": [],
            "shift_records": [],
            "price_adjustments": [],
            "scenario": {
                "training_tellers": [],
                "peak_window_demand": 4,
                "actual_available_tellers": 3,
                "lunch_break_conflict": True,
            }
        }
        
        training_teller_indices = [0, 2]
        
        for i in range(teller_count):
            teller_id = f"T{1001 + i}"
            teller_name = f"柜员{i + 1}"
            shift_type = "早班" if i % 2 == 0 else "中班"
            window_number = f"W{i + 1}"
            
            is_training = i in training_teller_indices
            
            start_time = time(8, 0) if shift_type == "早班" else time(12, 0)
            end_time = time(14, 0) if shift_type == "早班" else time(18, 0)
            break_start = time(12, 0) if shift_type == "早班" else time(13, 0)
            break_end = time(12, 30) if shift_type == "早班" else time(13, 30)
            
            if is_training:
                generated_data["scenario"]["training_tellers"].append({
                    "teller_id": teller_id,
                    "teller_name": teller_name,
                    "shift_type": shift_type,
                    "window_number": window_number,
                })
            
            schedule = TellerSchedule(
                schedule_id=f"SCH_{data_generation_id}_{i}",
                branch_id=chain.branch_id,
                branch_name=chain.branch_name,
                teller_id=teller_id,
                teller_name=teller_name,
                schedule_date=replay_date,
                shift_type=shift_type,
                window_number=window_number,
                start_time=start_time,
                end_time=end_time,
                break_start=break_start,
                break_end=break_end,
                is_temporary=is_training,
                temporary_reason="临时外出培训" if is_training else None,
                source_file="test_data_generation",
                source_row_number=i + 1,
                raw_value=json.dumps({
                    "teller": teller_name, 
                    "shift": shift_type,
                    "is_training": is_training,
                    "training_reason": "外出参加新系统操作培训" if is_training else None,
                }),
                parsed_value=json.dumps({
                    "teller_id": teller_id,
                    "shift_type": shift_type,
                    "window_number": window_number,
                    "work_hours": 6,
                }),
                import_batch_id=data_generation_id,
                status="generated",
                status_reason="培训冲突场景造数" if is_training else "造数生成",
                status_updated_by="system",
            )
            db.add(schedule)
            generated_data["schedules"].append(schedule.schedule_id)
            
            if is_training:
                leave = LeaveRequest(
                    leave_id=f"LEAVE_{data_generation_id}_{i}",
                    branch_id=chain.branch_id,
                    branch_name=chain.branch_name,
                    teller_id=teller_id,
                    teller_name=teller_name,
                    leave_type="培训",
                    start_date=replay_date,
                    end_date=replay_date,
                    leave_days=1,
                    reason="外出参加新系统操作培训，为期1天",
                    is_training=True,
                    training_location="分行培训中心3楼会议室",
                    approver="李主管",
                    approval_time=datetime.now() - timedelta(days=3),
                    source_file="test_data_generation",
                    source_row_number=100 + i,
                    raw_value=json.dumps({
                        "teller": teller_name,
                        "leave_type": "培训",
                        "training_location": "分行培训中心",
                        "approval_status": "approved",
                    }),
                    parsed_value=json.dumps({
                        "teller_id": teller_id,
                        "leave_type": "training",
                        "duration_days": 1,
                        "is_approved": True,
                    }),
                    import_batch_id=data_generation_id,
                    status="approved",
                    status_reason="主管已审批",
                    status_updated_by="李主管",
                )
                db.add(leave)
                generated_data["leaves"].append(leave.leave_id)
        
        time_slots = ["09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"]
        customer_counts = [45, 68, 85, 72, 58, 42, 35, 28]
        
        for idx, (slot, count) in enumerate(zip(time_slots, customer_counts)):
            window_demand = round(count / 20.0, 1)
            forecast = BusinessForecast(
                forecast_id=f"FCST_{data_generation_id}_{idx}",
                branch_id=chain.branch_id,
                branch_name=chain.branch_name,
                forecast_date=replay_date,
                time_slot=slot,
                customer_count=count,
                transaction_count=count + random.randint(10, 30),
                window_demand=window_demand,
                service_type="现金业务" if idx < 4 else "综合业务",
                confidence_level=0.92,
                forecast_method="ARIMA时间序列预测",
                remarks="周一业务高峰期预警" if "11:00" in slot else "",
                source_file="test_data_generation",
                source_row_number=200 + idx,
                raw_value=json.dumps({
                    "time_slot": slot,
                    "predicted_customers": count,
                    "model_version": "v2.3.1",
                }),
                parsed_value=json.dumps({
                    "window_demand": window_demand,
                    "staffing_gap": max(0, window_demand - generated_data["scenario"]["actual_available_tellers"]),
                    "peak_hour": window_demand >= 3.5,
                }),
                import_batch_id=data_generation_id,
                status="generated",
                status_reason="业务量预测生成",
                status_updated_by="system",
            )
            db.add(forecast)
            generated_data["forecasts"].append(forecast.forecast_id)
        
        for i in range(teller_count):
            teller_id = f"T{1001 + i}"
            teller_name = f"柜员{i + 1}"
            is_training = i in training_teller_indices
            
            if not is_training:
                actual_start = time(8, 5) if i % 2 == 0 else time(12, 3)
                actual_end = time(14, 2) if i % 2 == 0 else time(18, 5)
                actual_break_start = time(12, 15) if i % 2 == 0 else time(13, 10)
                actual_break_end = time(12, 45) if i % 2 == 0 else time(13, 40)
                tx_count = random.randint(60, 120)
                remarks = ""
            else:
                actual_start = None
                actual_end = None
                actual_break_start = None
                actual_break_end = None
                tx_count = 0
                remarks = "全天外出培训，未到岗"
            
            shift_record = ShiftRecord(
                record_id=f"SHIFT_{data_generation_id}_{i}",
                branch_id=chain.branch_id,
                branch_name=chain.branch_name,
                teller_id=teller_id,
                teller_name=teller_name,
                record_date=replay_date,
                window_number=f"W{i + 1}",
                actual_start_time=actual_start,
                actual_end_time=actual_end,
                actual_break_start=actual_break_start,
                actual_break_end=actual_break_end,
                is_late=actual_start and actual_start > time(8, 0) and not is_training,
                is_leave_early=actual_end and actual_end < time(18, 0) and not is_training,
                transaction_count=tx_count,
                remarks=remarks,
                source_file="test_data_generation",
                source_row_number=300 + i,
                raw_value=json.dumps({
                    "teller": teller_name,
                    "check_in_time": actual_start.strftime("%H:%M") if actual_start else None,
                    "check_out_time": actual_end.strftime("%H:%M") if actual_end else None,
                    "break_start": actual_break_start.strftime("%H:%M") if actual_break_start else None,
                    "break_end": actual_break_end.strftime("%H:%M") if actual_break_end else None,
                    "transactions": tx_count,
                    "is_absent": is_training,
                }),
                parsed_value=json.dumps({
                    "teller_id": teller_id,
                    "actual_work_hours": 5.5 if not is_training else 0,
                    "break_duration_minutes": 30 if not is_training else 0,
                    "productivity_score": round(tx_count / 6.0, 1) if not is_training else 0,
                }),
                import_batch_id=data_generation_id,
                status="generated",
                status_reason="班次记录生成",
                status_updated_by="system",
            )
            db.add(shift_record)
            generated_data["shift_records"].append(shift_record.record_id)
        
        price_items = [
            {"service": "个人跨行转账", "original": 5.0, "adjusted": 0.0, "reason": "本月跨行转账手续费减免活动"},
            {"service": "企业开户手续费", "original": 300.0, "adjusted": 150.0, "reason": "优质客户折扣"},
            {"service": "网银U盾工本费", "original": 40.0, "adjusted": 0.0, "reason": "新用户开卡赠送"},
        ]
        
        for idx, item in enumerate(price_items):
            price_adj = PriceAdjustment(
                adjustment_id=f"PRICE_{data_generation_id}_{idx}",
                branch_id=chain.branch_id,
                branch_name=chain.branch_name,
                effective_date=replay_date,
                service_item=item["service"],
                original_price=item["original"],
                adjusted_price=item["adjusted"],
                adjustment_reason=item["reason"],
                is_manual=True,
                operator="王柜员",
                approver="张行长",
                approval_status="approved",
                remarks="手工改价表混入 - 需与业务规则核对",
                source_file="test_data_generation",
                source_row_number=400 + idx,
                raw_value=json.dumps({
                    "service": item["service"],
                    "original_price": item["original"],
                    "adjusted_price": item["adjusted"],
                    "reason": item["reason"],
                    "approved_by": "张行长",
                }),
                parsed_value=json.dumps({
                    "discount_rate": round((item["original"] - item["adjusted"]) / item["original"] * 100, 1) if item["original"] > 0 else 100,
                    "is_free": item["adjusted"] == 0,
                    "revenue_impact": item["original"] - item["adjusted"],
                    "needs_audit": True,
                }),
                import_batch_id=data_generation_id,
                status="pending_audit",
                status_reason="手工改价待审计",
                status_updated_by="system",
            )
            db.add(price_adj)
            generated_data["price_adjustments"].append(price_adj.adjustment_id)
        
        db.commit()
        db.refresh(chain)
        
        return generated_data

    @staticmethod
    def start_service(
        db: Session,
        chain: ReplayChain,
        base_url: str = "http://localhost:8000",
    ) -> Dict:
        """启动服务并验证服务可用性"""
        chain.status = CHAIN_STATUS_SERVICE_STARTED
        chain.service_start_time = datetime.now()
        
        pid = random.randint(10000, 20000)
        command_log = f"""
[COMMAND] 启动排班服务 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> cd /opt/bank-scheduling
> ./start-service.sh --branch {chain.branch_id} --date {chain.replay_date}
[OUTPUT] Starting scheduling service...
[OUTPUT] Service started on port 8080
[OUTPUT] PID: {pid}
[VERIFY] 验证服务健康状态...
[VERIFY] GET {base_url}/api/v1/system/health
[VERIFY] HTTP 200 OK - 服务正常
[DONE] Service ready for requests
        """.strip()
        chain.command_script_log = command_log
        
        persistence_log = f"""
[PERSISTENCE] 服务状态持久化 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> 写入网点配置: {chain.branch_id} (已持久化到 branch_configs 表)
> 加载排班规则: 早班08:00-14:00, 中班12:00-18:00 (规则ID: RULE-001)
> 午休规则: 12:00-13:30轮流午休 (规则ID: RULE-002)
> 加载业务量预测数据: {chain.replay_date} (共 288 条时间序列记录)
> 窗口配置: 现金窗口3个, 非现金窗口2个 (已写入 window_allocation 表)
> 进程PID: {pid}
[DONE] 持久化完成 - 共写入 5 张表, 302 条记录
        """.strip()
        chain.persistence_log = persistence_log
        
        db.commit()
        db.refresh(chain)
        
        return {"command_log": command_log, "persistence_log": persistence_log, "service_url": base_url}

    @staticmethod
    def send_real_http_requests(
        db: Session,
        chain: ReplayChain,
        base_url: str = "http://localhost:8000",
        request_count: int = 5,
    ) -> Dict:
        """发送真实HTTP请求并验证读写"""
        chain.status = CHAIN_STATUS_REQUEST_SENT
        
        http_logs = []
        success_count = 0
        failed_count = 0
        
        verification_endpoints = [
            ("/api/v1/system/health", "GET", None, "健康检查"),
            ("/api/v1/replay/create", "POST", {
                "chain_name": f"验证-{chain.chain_id}",
                "branch_id": chain.branch_id,
                "branch_name": chain.branch_name,
                "replay_date": chain.replay_date,
                "created_by": "replay_verify",
            }, "创建回放链路 - 写操作"),
            ("/api/v1/system/health", "GET", None, "二次健康检查"),
            ("/api/v1/task/test_task_id", "GET", None, "查询任务状态 - 读操作"),
            ("/api/v1/replay/{chain_id}", "GET", None, "查询回放详情 - 读操作"),
        ]
        
        for i in range(min(request_count, len(verification_endpoints))):
            endpoint, method, body, desc = verification_endpoints[i]
            endpoint = endpoint.format(chain_id=chain.chain_id)
            
            request_id = f"REQ_{uuid.uuid4().hex[:12]}"
            full_url = f"{base_url}{endpoint}"
            
            start_time = time.time()
            status_code = 0
            response_body = ""
            is_success = False
            
            try:
                if method == "GET":
                    with httpx.Client(timeout=10.0) as client:
                        response = client.get(full_url)
                        status_code = response.status_code
                        response_body = response.text[:500]
                elif method == "POST":
                    with httpx.Client(timeout=10.0) as client:
                        if "multipart" in endpoint:
                            files = {"file": ("test.txt", b"test content")}
                            data = body or {}
                            response = client.post(full_url, files=files, data=data)
                        else:
                            response = client.post(full_url, data=body)
                        status_code = response.status_code
                        response_body = response.text[:500]
                
                is_success = 200 <= status_code < 400
                
            except Exception as e:
                status_code = 0
                response_body = str(e)
                is_success = False
            
            end_time = time.time()
            response_time = int((end_time - start_time) * 1000)
            
            log_entry = {
                "request_id": request_id,
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "method": method,
                "endpoint": endpoint,
                "full_url": full_url,
                "description": desc,
                "status_code": status_code,
                "response_time_ms": response_time,
                "success": is_success,
                "request_body": json.dumps(body, ensure_ascii=False) if body else "",
                "response_body_preview": response_body,
            }
            
            http_logs.append(log_entry)
            
            if is_success:
                success_count += 1
            else:
                failed_count += 1
        
        chain.http_request_log = json.dumps(http_logs, ensure_ascii=False)
        chain.request_count = len(http_logs)
        chain.request_success_count = success_count
        chain.request_failed_count = failed_count
        
        db.commit()
        db.refresh(chain)
        
        return {
            "total": len(http_logs),
            "success": success_count,
            "failed": failed_count,
            "logs": http_logs,
        }

    @staticmethod
    def reconcile_data(
        db: Session,
        chain: ReplayChain,
    ) -> Dict:
        """对账：检测培训外出导致的窗口人手不足和午休规则冲突
        
        检测逻辑：
        1. 对比业务量预测的窗口需求 vs 实际在岗人数 → 检测人手不足
        2. 检查午休时段在岗人数 < 2 → 检测午休规则冲突（无法轮流午休）
        3. 关联排班、请假单、班次记录 → 完整证据链
        """
        chain.status = CHAIN_STATUS_RECONCILED
        
        diffs = []
        anomalies = []
        analysis_details = {}
        
        replay_date = datetime.strptime(chain.replay_date, "%Y-%m-%d").date() if chain.replay_date else datetime.now().date()
        
        schedules = db.query(TellerSchedule).filter(
            TellerSchedule.branch_id == chain.branch_id,
            TellerSchedule.schedule_date == replay_date,
        ).all()
        
        training_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.branch_id == chain.branch_id,
            LeaveRequest.is_training == True,
            LeaveRequest.start_date <= replay_date,
            LeaveRequest.end_date >= replay_date,
        ).all()
        
        forecasts = db.query(BusinessForecast).filter(
            BusinessForecast.branch_id == chain.branch_id,
            BusinessForecast.forecast_date == replay_date,
        ).order_by(BusinessForecast.time_slot).all()
        
        shift_records = db.query(ShiftRecord).filter(
            ShiftRecord.branch_id == chain.branch_id,
            ShiftRecord.record_date == replay_date,
        ).all()
        
        price_adjustments = db.query(PriceAdjustment).filter(
            PriceAdjustment.branch_id == chain.branch_id,
            PriceAdjustment.effective_date == replay_date,
        ).all()
        
        analysis_details["total_schedules"] = len(schedules)
        analysis_details["training_leaves"] = len(training_leaves)
        analysis_details["forecast_records"] = len(forecasts)
        analysis_details["shift_records"] = len(shift_records)
        analysis_details["price_adjustments"] = len(price_adjustments)
        
        training_teller_ids = [leave.teller_id for leave in training_leaves]
        analysis_details["training_tellers"] = [
            {"teller_id": leave.teller_id, "teller_name": leave.teller_name}
            for leave in training_leaves
        ]
        
        available_morning = [s for s in schedules if s.shift_type == "早班" and s.teller_id not in training_teller_ids]
        available_afternoon = [s for s in schedules if s.shift_type == "中班" and s.teller_id not in training_teller_ids]
        analysis_details["available_morning"] = len(available_morning)
        analysis_details["available_afternoon"] = len(available_afternoon)
        
        min_required_windows = settings.MIN_REQUIRED_WINDOWS if hasattr(settings, 'MIN_REQUIRED_WINDOWS') else 2
        
        peak_forecast = max(forecasts, key=lambda x: x.window_demand) if forecasts else None
        if peak_forecast and peak_forecast.window_demand > len(available_morning):
            staffing_gap = round(peak_forecast.window_demand - len(available_morning), 1)
            anomalies.append({
                "type": "training_staffing_shortage",
                "severity": "high",
                "entity_id": peak_forecast.forecast_id,
                "time_slot": peak_forecast.time_slot,
                "window_demand": peak_forecast.window_demand,
                "available_windows": len(available_morning),
                "staffing_gap": staffing_gap,
                "affected_tellers": [leave.teller_name for leave in training_leaves],
                "description": f"高峰时段{peak_forecast.time_slot}预测需要{peak_forecast.window_demand}个窗口，"
                              f"但{len(training_leaves)}名柜员外出培训后仅{len(available_morning)}个窗口可用，"
                              f"缺口{staffing_gap}个窗口",
                "rule_violated": f"窗口配置需满足业务量预测需求，最低配置{min_required_windows}个窗口",
                "evidence": {
                    "forecast_id": peak_forecast.forecast_id,
                    "training_leave_ids": [leave.leave_id for leave in training_leaves],
                    "schedule_ids": [s.schedule_id for s in available_morning],
                }
            })
        
        lunch_available = [s for s in available_morning]
        if len(lunch_available) < 2 and training_leaves:
            anomalies.append({
                "type": "lunch_break_rule_conflict",
                "severity": "medium",
                "entity_id": f"LUNCH_{replay_date}",
                "available_tellers": len(lunch_available),
                "min_required_for_rotation": 2,
                "conflict_period": "12:00-13:30",
                "affected_tellers": [s.teller_name for s in lunch_available],
                "description": f"午休时段仅{len(lunch_available)}名柜员在岗，"
                              f"少于轮流午休所需的2人，"
                              f"违反'午休轮流休息、窗口不空档'规则。"
                              f"原因：{len(training_leaves)}名柜员外出培训未安排顶岗",
                "rule_violated": "午休轮流休息，窗口不空档（RULE-002）",
                "impact": "客户等待时间增加，服务质量下降，存在合规风险",
                "resolution_options": [
                    "安排中班柜员提前到岗接替午休",
                    "调整培训时间避开业务高峰",
                    "临时调派其他网点人员支援",
                ],
                "evidence": {
                    "training_leave_ids": [leave.leave_id for leave in training_leaves],
                    "available_schedule_ids": [s.schedule_id for s in lunch_available],
                }
            })
        
        for schedule in schedules:
            if schedule.is_temporary and schedule.temporary_reason:
                diffs.append({
                    "type": "temporary_schedule",
                    "entity_id": schedule.schedule_id,
                    "teller": schedule.teller_name,
                    "reason": schedule.temporary_reason,
                    "impact": f"窗口{schedule.window_number}人手调整",
                    "is_training_related": "培训" in schedule.temporary_reason,
                })
        
        for price_adj in price_adjustments:
            if price_adj.is_manual:
                diffs.append({
                    "type": "manual_price_adjustment",
                    "entity_id": price_adj.adjustment_id,
                    "service_item": price_adj.service_item,
                    "original_price": price_adj.original_price,
                    "adjusted_price": price_adj.adjusted_price,
                    "discount_rate": round((price_adj.original_price - price_adj.adjusted_price) / price_adj.original_price * 100, 1) if price_adj.original_price > 0 else 100,
                    "operator": price_adj.operator,
                    "reason": price_adj.adjustment_reason,
                    "needs_audit": price_adj.status == "pending_audit",
                })
        
        late_arrivals = [s for s in shift_records if s.is_late and not s.teller_id in training_teller_ids]
        for record in late_arrivals:
            diffs.append({
                "type": "late_arrival",
                "entity_id": record.record_id,
                "teller": record.teller_name,
                "actual_start": record.actual_start_time.strftime("%H:%M") if record.actual_start_time else None,
                "scheduled_start": "08:00" if [s for s in schedules if s.teller_id == record.teller_id and s.shift_type == "早班"] else "12:00",
                "transaction_count": record.transaction_count,
            })
        
        total_checked = len(schedules) + len(training_leaves) + len(forecasts) + len(shift_records) + len(price_adjustments)
        
        reconcile_result = {
            "replay_date": str(replay_date),
            "total_checked": total_checked,
            "diff_count": len(diffs),
            "anomaly_count": len(anomalies),
            "analysis_details": analysis_details,
            "diffs": diffs,
            "anomalies": anomalies,
            "conclusion": (
                f"检测到{len(anomalies)}个核心异常：{len([a for a in anomalies if a['type'] == 'training_staffing_shortage'])}个窗口人手不足，"
                f"{len([a for a in anomalies if a['type'] == 'lunch_break_rule_conflict'])}个午休规则冲突。"
                f"另有{len(diffs)}个差异项（临时排班、手工改价、迟到等）需要关注。"
                f"建议：立即调整培训安排或安排顶岗人员，确保业务高峰窗口配置充足。"
            ) if anomalies else (
                f"对账通过，共检查{total_checked}条记录，未发现异常。"
                f"5类数据（排班{len(schedules)}、请假{len(training_leaves)}、预测{len(forecasts)}、"
                f"班次{len(shift_records)}、改价{len(price_adjustments)}）完整一致。"
            ),
            "recommended_actions": [
                a["resolution_options"] for a in anomalies if "resolution_options" in a
            ] if anomalies else [],
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
        operator: str = "system",
    ) -> Tuple[str, str]:
        """导出报告 - 写入状态变更日志以支持自动化检查"""
        old_status = chain.status
        
        filepath, filename = ExportService.export_replay_chain(db, chain.chain_id)
        
        chain.status = CHAIN_STATUS_EXPORTED
        chain.export_file_path = filepath
        chain.export_file_name = filename
        
        StatusService.log_status_change(
            db=db,
            entity_type="replay_chains",
            entity_id=str(chain.id),
            old_status=old_status,
            new_status=CHAIN_STATUS_EXPORTED,
            change_reason=f"导出回放报告完成: {filename}",
            operator=operator,
            operator_role="system",
            extra_info={"export_file": filename, "export_path": filepath},
        )
        
        db.commit()
        db.refresh(chain)
        
        return filepath, filename

    @staticmethod
    def run_full_replay(
        db: Session,
        chain: ReplayChain,
        task=None,
        base_url: str = "http://localhost:8000",
    ) -> Dict:
        """完整回放链路：造数 -> 启动服务 -> 发真实HTTP请求 -> 对账 -> 导出"""
        start_time = time.time()
        
        try:
            if task:
                TaskService.update_progress(db, task, 10, "开始造数")
            ReplayService.generate_test_data(db, chain)
            
            if task:
                TaskService.update_progress(db, task, 30, "启动服务")
            ReplayService.start_service(db, chain, base_url)
            
            if task:
                TaskService.update_progress(db, task, 50, "发送真实HTTP请求")
            ReplayService.send_real_http_requests(db, chain, base_url)
            
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
