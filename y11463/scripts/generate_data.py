#!/usr/bin/env python3
import json
import random
from datetime import datetime, timedelta

def generate_batch_data(batch_no="BATCH-001", clinic_code="CLINIC-A", num_implants=3):
    implant_models = ["Straumann-SLA-10mm", "Nobel-Active-13mm", "Dentsply-Sirona-11.5mm"]
    patient_names = ["张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十"]
    doctor_names = ["王医生", "李医生", "张医生", "陈医生"]
    
    implants = []
    appointments = []
    
    for i in range(num_implants):
        implant_id = f"IMP-{batch_no}-{i+1:03d}"
        implants.append({
            "implant_id": implant_id,
            "batch_no": f"LOT-2024-{random.randint(1000, 9999)}",
            "implant_model": random.choice(implant_models),
            "quantity": 1,
            "unit": "pcs",
            "is_model_changed": False,
            "inventory_deducted": True
        })
        
        apt_date = datetime.now() + timedelta(days=random.randint(-7, 7))
        appointments.append({
            "appointment_no": f"APT-{batch_no}-{i+1:03d}",
            "patient_name": random.choice(patient_names),
            "patient_id": f"P{random.randint(10000, 99999)}",
            "doctor_name": random.choice(doctor_names),
            "appointment_date": apt_date.isoformat(),
            "surgery_type": "种植手术",
            "implant_used": implant_id,
            "medical_record_updated": True
        })
    
    invoices = [{
        "invoice_no": f"INV-{batch_no}-001",
        "supplier_name": "牙科设备供应商A",
        "invoice_date": (datetime.now() - timedelta(days=3)).isoformat(),
        "total_amount": round(random.uniform(5000, 20000), 2),
        "currency": "CNY"
    }]
    
    handover_papers = [{
        "handover_no": f"HAND-{batch_no}-001",
        "from_department": "仓库",
        "to_department": "门诊手术室",
        "handover_date": (datetime.now() - timedelta(days=1)).isoformat(),
        "handover_person": "仓管员A",
        "receiver": "护士B",
        "item_list": f"种植体{num_implants}套，手术工具1套"
    }]
    
    return {
        "batch_no": batch_no,
        "clinic_code": clinic_code,
        "remark": "常规种植手术材料验收",
        "customer_service_note": None,
        "replay_strategy": "ignore",
        "implants": implants,
        "appointments": appointments,
        "invoices": invoices,
        "handover_papers": handover_papers
    }

def generate_model_change_data(base_batch):
    modified = json.loads(json.dumps(base_batch))
    modified["remark"] = "型号变更后重新提交"
    modified["replay_strategy"] = "overwrite"
    
    if modified["implants"]:
        modified["implants"][0]["is_model_changed"] = True
        modified["implants"][0]["original_model"] = modified["implants"][0]["implant_model"]
        modified["implants"][0]["implant_model"] = "Straumann-SLA-13mm"
        modified["implants"][0]["model_change_reason"] = "患者骨量不足，更换长型号"
    
    return modified

def generate_abnormal_data():
    abnormal = generate_batch_data("BATCH-ERR-001", "CLINIC-B", 3)
    abnormal["remark"] = "术中临时换型号，病历和库存未同步"
    
    old_model = abnormal["implants"][0]["implant_model"]
    abnormal["implants"][0]["is_model_changed"] = True
    abnormal["implants"][0]["original_model"] = old_model
    abnormal["implants"][0]["implant_model"] = "Straumann-SLA-13mm"
    abnormal["implants"][0]["model_change_reason"] = "术中发现骨量不足，临时换长型号"
    abnormal["implants"][0]["inventory_deducted"] = False
    
    abnormal["appointments"][0]["medical_record_updated"] = False
    
    return abnormal

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "normal":
            data = generate_batch_data("BATCH-001")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        elif cmd == "model_change":
            base = generate_batch_data("BATCH-002")
            data = generate_model_change_data(base)
            print(json.dumps(data, indent=2, ensure_ascii=False))
        elif cmd == "abnormal":
            data = generate_abnormal_data()
            print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print("用法: python generate_data.py [normal|model_change|abnormal]")
        print()
        print("normal:      生成正常批次数据（对账全部通过）")
        print("model_change: 生成型号变更数据")
        print("abnormal:    生成异常数据（换型号后病历/库存未同步）")
