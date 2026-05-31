from typing import Dict, Optional
from app.models import DataStatus, NextVerifier


STATUS_TRANSITIONS: Dict[DataStatus, Dict[DataStatus, Dict]] = {
    DataStatus.PENDING_CONFIRM: {
        DataStatus.NORMAL: {
            "allowed": True,
            "required_verifier": NextVerifier.DATA_COLLECTOR,
            "description": "数据采集员确认到时无误"
        },
        DataStatus.MISSING_ARRIVAL: {
            "allowed": True,
            "required_verifier": NextVerifier.DATA_COLLECTOR,
            "description": "到时缺失，走待确认分支"
        },
        DataStatus.WRONG_VELOCITY: {
            "allowed": True,
            "required_verifier": NextVerifier.VELOCITY_EXPERT,
            "description": "波速版本错误，需波速专家核对"
        },
        DataStatus.DUPLICATE_STATION: {
            "allowed": True,
            "required_verifier": NextVerifier.STATION_MANAGER,
            "description": "台站重复，需台站管理员核对"
        },
    },
    DataStatus.MISSING_ARRIVAL: {
        DataStatus.NORMAL: {
            "allowed": True,
            "required_verifier": NextVerifier.DATA_COLLECTOR,
            "description": "到时补录完成，数据采集员确认"
        },
        DataStatus.REJECTED: {
            "allowed": True,
            "required_verifier": NextVerifier.TEACHER,
            "description": "到时无法补录，教师确认剔除"
        },
    },
    DataStatus.WRONG_VELOCITY: {
        DataStatus.NORMAL: {
            "allowed": True,
            "required_verifier": NextVerifier.VELOCITY_EXPERT,
            "description": "波速版本修正完成，波速专家确认"
        },
    },
    DataStatus.DUPLICATE_STATION: {
        DataStatus.NORMAL: {
            "allowed": True,
            "required_verifier": NextVerifier.STATION_MANAGER,
            "description": "台站去重完成，台站管理员确认"
        },
        DataStatus.REJECTED: {
            "allowed": True,
            "required_verifier": NextVerifier.STATION_MANAGER,
            "description": "重复台站已剔除"
        },
    },
    DataStatus.NORMAL: {
        DataStatus.CONFIRMED: {
            "allowed": True,
            "required_verifier": NextVerifier.TEACHER,
            "description": "教师审核通过，最终确认"
        },
        DataStatus.REJECTED: {
            "allowed": True,
            "required_verifier": NextVerifier.TEACHER,
            "description": "残差过大或其他原因剔除"
        },
    },
    DataStatus.REJECTED: {
        DataStatus.NORMAL: {
            "allowed": True,
            "required_verifier": NextVerifier.TEACHER,
            "description": "数据修正后重新启用"
        },
    },
}


def check_transition(from_status: DataStatus, to_status: DataStatus) -> Dict:
    transitions = STATUS_TRANSITIONS.get(from_status, {})
    result = transitions.get(to_status, {
        "allowed": False,
        "required_verifier": None,
        "description": f"不允许从 {from_status.value} 转换到 {to_status.value}"
    })
    return {
        "from_status": from_status,
        "to_status": to_status,
        **result
    }


def get_allowed_transitions(current_status: DataStatus) -> list:
    transitions = STATUS_TRANSITIONS.get(current_status, {})
    return [
        {
            "to_status": to_status,
            "required_verifier": info["required_verifier"],
            "description": info["description"]
        }
        for to_status, info in transitions.items()
    ]


def get_status_display(status: DataStatus) -> str:
    display_map = {
        DataStatus.PENDING_CONFIRM: "待确认",
        DataStatus.NORMAL: "正常",
        DataStatus.WRONG_VELOCITY: "波速版本错",
        DataStatus.DUPLICATE_STATION: "台站重复",
        DataStatus.MISSING_ARRIVAL: "到时缺失",
        DataStatus.REJECTED: "已剔除",
        DataStatus.CONFIRMED: "已确认",
    }
    return display_map.get(status, status.value)


def get_verifier_display(verifier: NextVerifier) -> str:
    display_map = {
        NextVerifier.DATA_COLLECTOR: "数据采集员",
        NextVerifier.VELOCITY_EXPERT: "波速专家",
        NextVerifier.STATION_MANAGER: "台站管理员",
        NextVerifier.TEACHER: "教师",
    }
    return display_map.get(verifier, verifier.value)
