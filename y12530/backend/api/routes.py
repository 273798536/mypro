from flask import Blueprint, request, jsonify, send_from_directory, current_app
from datetime import datetime
import os
import json
import traceback

from backend.core import PKSolver, DosingPlan
from backend.utils import (
    ParameterValidator, OperationTracker, OperationType, OperationStatus,
    DataManager, DataSource, DataCategory, ReportExporter
)

api_bp = Blueprint('api', __name__)


def get_solver() -> PKSolver:
    return current_app.config['PK_SOLVER']


def get_validator() -> ParameterValidator:
    return current_app.config['PARAMETER_VALIDATOR']


def get_tracker() -> OperationTracker:
    return current_app.config['OPERATION_TRACKER']


def get_data_manager() -> DataManager:
    return current_app.config['DATA_MANAGER']


def get_exporter() -> ReportExporter:
    return current_app.config['REPORT_EXPORTER']


@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })


@api_bp.route('/simulate', methods=['POST'])
def run_simulation():
    tracker = get_tracker()
    validator = get_validator()
    solver = get_solver()
    data_manager = get_data_manager()

    op_id = tracker.start_operation(
        OperationType.SIMULATION,
        triggered_by=request.headers.get('X-User', 'unknown'),
        input_data=request.json,
        notes="执行药代动力学模拟"
    )

    try:
        data = request.json or {}
        params = data.get('parameters', {})
        dosing_plan = data.get('dosing_plan', {})
        model_type = data.get('model_type', 'one_compartment')
        time_step = float(data.get('time_step', 0.1))
        use_analytical = data.get('use_analytical', True)
        sampling_points = data.get('sampling_points', [])
        triggered_by = request.headers.get('X-User', 'unknown')

        op_validation_id = tracker.start_operation(
            OperationType.VALIDATION,
            triggered_by=triggered_by,
            input_data={"params": params, "dosing_plan": dosing_plan, "time_step": time_step},
            notes="参数校验"
        )
        tracker.create_operation_link(op_id, op_validation_id, "depends_on")

        validation_result = validator.validate_all(
            params, dosing_plan, time_step, triggered_by=triggered_by
        )

        if not validation_result.is_valid:
            tracker.fail_operation(
                op_validation_id,
                error_message="参数校验失败",
                blocked_step="参数校验",
                next_action="请根据校验错误信息修正参数",
                error_type=OperationStatus.VALIDATION_ERROR
            )
            tracker.fail_operation(
                op_id,
                error_message="参数校验失败，无法进行模拟",
                blocked_step="参数校验",
                next_action="请根据校验错误信息修正参数"
            )
            return jsonify({
                "success": False,
                "operation_id": op_id,
                "validation_result": validation_result.to_dict(),
                "message": "参数校验失败"
            }), 400

        tracker.complete_operation(op_validation_id, output_data=validation_result.to_dict())

        params_data_id = data_manager.import_data(
            category=DataCategory.DRUG_PARAMETERS,
            content=params,
            source=DataSource.USER_INPUT,
            source_info={"import_method": "api"},
            triggered_by=triggered_by,
            is_original=True
        )

        dosing_data_id = data_manager.import_data(
            category=DataCategory.DOSING_PLAN,
            content=dosing_plan,
            source=DataSource.USER_INPUT,
            source_info={"import_method": "api"},
            triggered_by=triggered_by,
            is_original=True
        )

        result = solver.solve(
            params=params,
            dosing_plan=dosing_plan,
            model_type=model_type,
            time_step=time_step,
            use_analytical=use_analytical,
            sampling_points=sampling_points
        )

        result_dict = result.to_dict()
        pk_params = solver.calculate_pk_parameters(result)
        result_dict["pk_parameters"] = pk_params

        if not result.success:
            tracker.fail_operation(
                op_id,
                error_message=result.error_message or "ODE求解失败",
                blocked_step="微分方程求解",
                next_action="请检查求解方法或调整参数",
                error_type=OperationStatus.ODE_ERROR
            )
            return jsonify({
                "success": False,
                "operation_id": op_id,
                "result": result_dict,
                "validation_result": validation_result.to_dict(),
                "message": "模拟求解失败"
            }), 422

        result_data_id = data_manager.create_derived_data(
            category=DataCategory.SIMULATION_RESULT,
            content=result_dict,
            parent_ids=[params_data_id, dosing_data_id],
            source_info={"method": f"{result.solver_method}_{result.model_type}"},
            triggered_by=triggered_by
        )

        tracker.complete_operation(
            op_id,
            output_data={
                "result_data_id": result_data_id,
                "computation_hash": result.computation_hash,
                "pk_parameters": pk_params
            }
        )

        return jsonify({
            "success": True,
            "operation_id": op_id,
            "result": result_dict,
            "validation_result": validation_result.to_dict(),
            "data_ids": {
                "parameters": params_data_id,
                "dosing_plan": dosing_data_id,
                "simulation_result": result_data_id
            }
        })

    except Exception as e:
        tracker.fail_operation(
            op_id,
            error_message=f"系统错误: {str(e)}",
            blocked_step="系统处理",
            next_action="请联系系统管理员或查看日志"
        )
        return jsonify({
            "success": False,
            "operation_id": op_id,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@api_bp.route('/validate', methods=['POST'])
def validate_parameters():
    tracker = get_tracker()
    validator = get_validator()

    data = request.json or {}
    params = data.get('parameters', {})
    dosing_plan = data.get('dosing_plan', {})
    time_step = float(data.get('time_step', 0.1))
    triggered_by = request.headers.get('X-User', 'unknown')

    op_id = tracker.start_operation(
        OperationType.VALIDATION,
        triggered_by=triggered_by,
        input_data=data,
        notes="单独参数校验"
    )

    try:
        validation_result = validator.validate_all(
            params, dosing_plan, time_step, triggered_by=triggered_by
        )

        tracker.complete_operation(
            op_id,
            output_data={"is_valid": validation_result.is_valid}
        )

        return jsonify({
            "success": True,
            "operation_id": op_id,
            "validation_result": validation_result.to_dict()
        })

    except Exception as e:
        tracker.fail_operation(
            op_id,
            error_message=str(e),
            blocked_step="参数校验处理"
        )
        return jsonify({
            "success": False,
            "operation_id": op_id,
            "error": str(e)
        }), 500


@api_bp.route('/operations', methods=['GET'])
def get_operations():
    tracker = get_tracker()
    limit = request.args.get('limit', 20, type=int)
    status_filter = request.args.get('status')
    type_filter = request.args.get('type')

    status_list = None
    if status_filter:
        try:
            status_list = [OperationStatus(s) for s in status_filter.split(',')]
        except ValueError:
            pass

    type_list = None
    if type_filter:
        try:
            type_list = [OperationType(t) for t in type_filter.split(',')]
        except ValueError:
            pass

    history = tracker.get_operation_history(
        limit=limit,
        status_filter=status_list,
        type_filter=type_list
    )

    return jsonify({
        "success": True,
        "operations": history,
        "statistics": tracker.get_statistics()
    })


@api_bp.route('/operations/<operation_id>', methods=['GET'])
def get_operation(operation_id):
    tracker = get_tracker()
    record = tracker.get_operation(operation_id)

    if not record:
        return jsonify({
            "success": False,
            "error": "Operation not found"
        }), 404

    return jsonify({
        "success": True,
        "operation": record.to_dict(),
        "error_trace": tracker.get_error_trace(operation_id),
        "data_origin": tracker.trace_data_origin(operation_id)
    })


@api_bp.route('/export/pdf', methods=['POST'])
def export_pdf():
    tracker = get_tracker()
    exporter = get_exporter()
    data_manager = get_data_manager()

    data = request.json or {}
    simulation_result = data.get('simulation_result', {})
    validation_result = data.get('validation_result')
    pk_parameters = data.get('pk_parameters')
    sampling_points = data.get('sampling_points', [])
    filename = data.get('filename')
    triggered_by = request.headers.get('X-User', 'unknown')

    op_id = tracker.start_operation(
        OperationType.REPORT_EXPORT,
        triggered_by=triggered_by,
        input_data={"format": "pdf", "filename": filename},
        notes="导出PDF报告"
    )

    try:
        operation_history = tracker.get_operation_history(limit=10)
        data_lineage = None

        if 'data_ids' in data and 'simulation_result' in data['data_ids']:
            data_lineage = data_manager.get_data_lineage(data['data_ids']['simulation_result'])

        filepath = exporter.export_to_pdf(
            simulation_result=simulation_result,
            validation_result=validation_result,
            pk_parameters=pk_parameters,
            sampling_points=sampling_points,
            operation_history=operation_history,
            data_lineage=data_lineage,
            filename=filename
        )

        export_data_id = data_manager.create_derived_data(
            category=DataCategory.EXPORTED_REPORT,
            content={
                "format": "pdf",
                "filepath": filepath,
                "filename": os.path.basename(filepath)
            },
            parent_ids=[],
            source_info={"method": "pdf_export"},
            triggered_by=triggered_by
        )

        tracker.complete_operation(
            op_id,
            output_data={"filepath": filepath, "export_data_id": export_data_id}
        )

        return jsonify({
            "success": True,
            "operation_id": op_id,
            "filepath": filepath,
            "filename": os.path.basename(filepath),
            "download_url": f"/api/download/{os.path.basename(filepath)}"
        })

    except Exception as e:
        tracker.fail_operation(
            op_id,
            error_message=str(e),
            blocked_step="PDF导出"
        )
        return jsonify({
            "success": False,
            "operation_id": op_id,
            "error": str(e)
        }), 500


@api_bp.route('/export/excel', methods=['POST'])
def export_excel():
    tracker = get_tracker()
    exporter = get_exporter()

    data = request.json or {}
    simulation_result = data.get('simulation_result', {})
    pk_parameters = data.get('pk_parameters')
    filename = data.get('filename')
    triggered_by = request.headers.get('X-User', 'unknown')

    op_id = tracker.start_operation(
        OperationType.REPORT_EXPORT,
        triggered_by=triggered_by,
        input_data={"format": "excel", "filename": filename},
        notes="导出Excel报告"
    )

    try:
        filepath = exporter.export_to_excel(
            simulation_result=simulation_result,
            pk_parameters=pk_parameters,
            filename=filename
        )

        tracker.complete_operation(
            op_id,
            output_data={"filepath": filepath}
        )

        return jsonify({
            "success": True,
            "operation_id": op_id,
            "filepath": filepath,
            "filename": os.path.basename(filepath),
            "download_url": f"/api/download/{os.path.basename(filepath)}"
        })

    except Exception as e:
        tracker.fail_operation(
            op_id,
            error_message=str(e),
            blocked_step="Excel导出"
        )
        return jsonify({
            "success": False,
            "operation_id": op_id,
            "error": str(e)
        }), 500


@api_bp.route('/export/json', methods=['POST'])
def export_json():
    tracker = get_tracker()
    exporter = get_exporter()

    data = request.json or {}
    simulation_result = data.get('simulation_result', {})
    validation_result = data.get('validation_result')
    pk_parameters = data.get('pk_parameters')
    sampling_impact = data.get('sampling_impact')
    filename = data.get('filename')
    triggered_by = request.headers.get('X-User', 'unknown')

    op_id = tracker.start_operation(
        OperationType.REPORT_EXPORT,
        triggered_by=triggered_by,
        input_data={"format": "json", "filename": filename},
        notes="导出JSON数据"
    )

    try:
        filepath = exporter.export_to_json(
            simulation_result=simulation_result,
            validation_result=validation_result,
            pk_parameters=pk_parameters,
            sampling_impact=sampling_impact,
            filename=filename
        )

        tracker.complete_operation(
            op_id,
            output_data={"filepath": filepath}
        )

        return jsonify({
            "success": True,
            "operation_id": op_id,
            "filepath": filepath,
            "filename": os.path.basename(filepath),
            "download_url": f"/api/download/{os.path.basename(filepath)}"
        })

    except Exception as e:
        tracker.fail_operation(
            op_id,
            error_message=str(e),
            blocked_step="JSON导出"
        )
        return jsonify({
            "success": False,
            "operation_id": op_id,
            "error": str(e)
        }), 500


@api_bp.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    exporter = get_exporter()
    return send_from_directory(
        exporter.output_dir,
        filename,
        as_attachment=True
    )


@api_bp.route('/data/sources', methods=['GET'])
def list_data_sources():
    data_manager = get_data_manager()
    return jsonify({
        "success": True,
        "original_sources": data_manager.list_original_data_sources(),
        "processed_results": data_manager.list_processed_results(),
        "statistics": data_manager.get_data_statistics()
    })


@api_bp.route('/data/<data_id>', methods=['GET'])
def get_data(data_id):
    data_manager = get_data_manager()
    record = data_manager.get_data(data_id)

    if not record:
        return jsonify({
            "success": False,
            "error": "Data not found"
        }), 404

    return jsonify({
        "success": True,
        "data": record.to_dict(),
        "lineage": data_manager.get_data_lineage(data_id)
    })


@api_bp.route('/data/import', methods=['POST'])
def import_data():
    tracker = get_tracker()
    data_manager = get_data_manager()

    data = request.json or {}
    category_str = data.get('category', 'drug_parameters')
    content = data.get('content', {})
    source_str = data.get('source', 'user_input')
    source_info = data.get('source_info', {})
    triggered_by = request.headers.get('X-User', 'unknown')

    try:
        category = DataCategory(category_str)
        source = DataSource(source_str)
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": f"Invalid category or source: {str(e)}"
        }), 400

    op_id = tracker.start_operation(
        OperationType.DATA_IMPORT,
        triggered_by=triggered_by,
        input_data={"category": category_str, "source": source_str},
        notes="导入数据"
    )

    try:
        data_id = data_manager.import_data(
            category=category,
            content=content,
            source=source,
            source_info=source_info,
            triggered_by=triggered_by,
            is_original=True
        )

        tracker.complete_operation(
            op_id,
            output_data={"data_id": data_id}
        )

        return jsonify({
            "success": True,
            "operation_id": op_id,
            "data_id": data_id
        })

    except Exception as e:
        tracker.fail_operation(
            op_id,
            error_message=str(e),
            blocked_step="数据导入"
        )
        return jsonify({
            "success": False,
            "operation_id": op_id,
            "error": str(e)
        }), 500


@api_bp.route('/sampling/analyze', methods=['POST'])
def analyze_sampling_points():
    tracker = get_tracker()
    exporter = get_exporter()

    data = request.json or {}
    simulation_result = data.get('simulation_result', {})
    sampling_points = data.get('sampling_points', [])
    triggered_by = request.headers.get('X-User', 'unknown')

    op_id = tracker.start_operation(
        OperationType.SAMPLING_POINT_ADD,
        triggered_by=triggered_by,
        input_data={"sampling_points": sampling_points},
        notes="采样点影响分析"
    )

    try:
        impact_analysis = exporter._analyze_sampling_impact(simulation_result, sampling_points)

        tracker.complete_operation(
            op_id,
            output_data={"impact_analysis": impact_analysis}
        )

        return jsonify({
            "success": True,
            "operation_id": op_id,
            "impact_analysis": impact_analysis
        })

    except Exception as e:
        tracker.fail_operation(
            op_id,
            error_message=str(e),
            blocked_step="采样点分析"
        )
        return jsonify({
            "success": False,
            "operation_id": op_id,
            "error": str(e)
        }), 500


@api_bp.route('/dose/check', methods=['POST'])
def check_dose_bounds():
    validator = get_validator()

    data = request.json or {}
    dose = data.get('dose', 0)
    weight = data.get('weight', 70)
    drug_name = data.get('drug_name')

    result = validator.check_dose_bounds(dose, weight, drug_name)

    return jsonify({
        "success": True,
        "dose_check": result
    })


@api_bp.route('/models', methods=['GET'])
def get_models_info():
    return jsonify({
        "success": True,
        "models": [
            {
                "id": "one_compartment",
                "name": "一室模型",
                "description": "适用于药物快速分布的情况",
                "required_parameters": ["half_life", "vd", "weight"],
                "optional_parameters": ["ka", "f"]
            },
            {
                "id": "two_compartment",
                "name": "二室模型",
                "description": "适用于药物分布有中央室和周边室的情况",
                "required_parameters": ["half_life_alpha", "half_life_beta", "v1", "k12", "k21", "weight"],
                "optional_parameters": ["ka", "f"]
            }
        ],
        "routes": [
            {"id": "iv_bolus", "name": "静脉推注"},
            {"id": "iv_infusion", "name": "静脉滴注"},
            {"id": "oral", "name": "口服"},
            {"id": "sc", "name": "皮下注射"},
            {"id": "im", "name": "肌肉注射"}
        ],
        "units": {
            "time": ["hours", "minutes", "days"],
            "dose": ["mg", "g", "μg", "mg/kg"]
        }
    })
