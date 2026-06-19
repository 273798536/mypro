"""稳定的错误码和提示消息 - 日常脚本依赖这些常量，请勿修改"""

ERR_OK = "E000"
ERR_OK_MSG = "处理完成"

ERR_PARAM_MISSING = "E101"
ERR_PARAM_MISSING_MSG = "缺少必填参数: {field}"

ERR_PARAM_INVALID = "E102"
ERR_PARAM_INVALID_MSG = "参数格式错误: {field}, 期望: {expected}"

ERR_RUN_ID_NOT_FOUND = "E201"
ERR_RUN_ID_NOT_FOUND_MSG = "运行ID不存在: {run_id}"

ERR_MATERIAL_NOT_FOUND = "E202"
ERR_MATERIAL_NOT_FOUND_MSG = "材料不存在: {material_id}"

ERR_SAMPLE_LEAK_DETECTED = "E301"
ERR_SAMPLE_LEAK_DETECTED_MSG = "检测到疑似样本泄漏，计算已暂停，请先确认泄漏原因和影响范围"

ERR_VERSION_CONFLICT = "E302"
ERR_VERSION_CONFLICT_MSG = "材料口径已变更，请确认是否以新版本为准: {material_name}"

ERR_MANUAL_OVERRIDE_EXISTS = "E303"
ERR_MANUAL_OVERRIDE_EXISTS_MSG = "该结果存在人工修正，新结果已保存为待确认状态，请人工审核"

ERR_FILE_READ = "E401"
ERR_FILE_READ_MSG = "文件读取失败: {path}"

ERR_CALCULATION_FAILED = "E500"
ERR_CALCULATION_FAILED_MSG = "指标计算失败: {detail}"
