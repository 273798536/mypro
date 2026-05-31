DRG差额补偿预警 API 说明
========================

启动方式
--------
1. 安装依赖:
   cd drg_warning_api
   pip install -r requirements.txt

2. 启动服务:
   python main.py
   服务监听 http://0.0.0.0:8900

3. 也可以用 uvicorn 直接启动:
   uvicorn main:app --host 0.0.0.0 --port 8900 --reload

4. 启动后访问 http://localhost:8900/docs 可看到交互式文档(Swagger UI)。

样例数据位置
-----------
sample_data.py 中预置了 5 条出院病例和 5 个 DRG 分组。

病例说明:
  CASE-001  正常病例，心内科，DRG-A01
  CASE-002  缺字段(手术记录、麻醉方式) + 成本缺项(护理费为None)，心外科，DRG-B12
  CASE-003  晚补(出院诊断延迟7天)，备注改过2次，普外科，DRG-C03
  CASE-004  病组错分(从DRG-C03重算为DRG-D08) + 成本缺项(材料费为None) + 备注改过3次，普外科
  CASE-005  缺字段(报销金额) + 成本缺项(材料费为None)，神经内科，DRG-E15

DRG分组:
  DRG-A01  肺炎伴合并症与伴随病      标准费用 18500
  DRG-B12  冠脉搭桥术伴合并症        标准费用 62000
  DRG-C03  胆囊切除术不伴合并症      标准费用 12800
  DRG-D08  急性阑尾炎伴合并症        标准费用  9500
  DRG-E15  脑梗死伴合并症与伴随病    标准费用 21000

服务启动时自动根据病例数据生成预警报告。


病组错分的触发办法
-----------------
方法1: 用 API 触发病组重算(推荐)

  curl -X POST http://localhost:8900/cases/CASE-001/reclassify \
    -H "Content-Type: application/json" \
    -d '{"case_id":"CASE-001","new_group_code":"DRG-D08","reason":"主要诊断编码修正"}'

  这会把 CASE-001 从 DRG-A01 重算为 DRG-D08。
  重算后:
  - 该病例的 original_drg_group_code 记录为 DRG-A01
  - 旧预警自动删除，按新分组重新生成预警
  - 科室汇总中该病例的差额按新分组计算
  - 返回结果中包含科室汇总变化

方法2: 通过 Swagger UI 操作
  启动服务后访问 http://localhost:8900/docs，找到 POST /cases/{case_id}/reclassify 端点，
  填入 case_id 和请求体即可触发。

方法3: 新建病例时指定已有分组
  用 POST /cases 创建新病例，再调用 reclassify 改变分组。


主要端点
--------
GET  /                                服务概况
GET  /cases                           出院病例列表(支持 dept_code/status/drg_group 筛选)
GET  /cases/{case_id}                 病例详情(含差额、科室串码影响说明、关联预警)
POST /cases                           新建病例
GET  /groups                          DRG分组列表
GET  /groups/{group_code}             分组详情(含当前病例、错分转出病例、预警)
GET  /warnings                        预警列表(支持 dept_code/warning_type/status/is_group_changed 筛选)
GET  /warnings/{report_id}            预警详情(含科室串码影响说明、病例快照)
PUT  /warnings/{report_id}/note       修改预警备注(记录变更历史)
PUT  /warnings/{report_id}/status     修改预警状态
POST /cases/{case_id}/reclassify      病组重算(触发差额重算、预警重建、科室汇总更新)
POST /refresh                         全量刷新预警
GET  /departments/summary             科室汇总(含错分重算病例数、成本缺项病例数)
GET  /export/warnings.csv             导出预警CSV(含科室编码影响说明列)


关于科室串码
-----------
科室编码(dept_code)如果格式异常或病例经历过病组错分重算，会在以下位置明确说明:
1. 病例详情 GET /cases/{case_id}  的 dept_code_impact 字段
2. 预警详情 GET /warnings/{report_id} 的 dept_code_impact 字段
3. CSV导出 GET /export/warnings.csv 的"科室编码影响说明"列
不会只在日志中体现。


关于差额计算
-----------
差额 = DRG标准费用 - 实际报销金额
差额不是一次性判断。当病组归因变化时:
1. 该病例的差额按新分组标准费用重新计算
2. 相关预警自动删除并重建
3. 科室汇总中的 total_diff_amount 按新值更新
4. 异常追踪(预警列表)中 is_group_changed=True 的记录随重算联动

示例curl命令:
  curl http://localhost:8900/cases
  curl http://localhost:8900/warnings
  curl http://localhost:8900/departments/summary
  curl http://localhost:8900/cases/CASE-004
  curl http://localhost:8900/export/warnings.csv
