import React, { useState } from 'react'
import { Modal, Form, Input, Select, Button, Space, message, Alert, Upload, Typography, Row, Col } from 'antd'
import { UploadOutlined, InboxOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { importBatch } from '../api.js'

const { TextArea } = Input
const { Option } = Select
const { Dragger } = Upload
const { Paragraph } = Typography

const ENTRY_POINTS = [
  { value: 'slow_query', label: '慢查询归因（日常）', desc: 'SRE 值班日常排查慢查询时入口' },
  { value: 'backup_check', label: '备份校验（月底/课前）', desc: '月底或课前排查备份校验异常' },
  { value: 'manual', label: '手工导入', desc: '任意场景手工导入' },
]

export default function ImportModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [schemas, setSchemas] = useState([])
  const [jsonPreview, setJsonPreview] = useState('')

  const handleFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result)
        let list = []
        if (Array.isArray(obj)) list = obj
        else if (Array.isArray(obj.schemas)) list = obj.schemas
        else if (obj && typeof obj === 'object') list = [obj]
        else {
          message.error('JSON 格式无法解析，应为数组或含 schemas 字段的对象')
          return
        }
        setSchemas(list)
        setJsonPreview(JSON.stringify(list.slice(0, 2), null, 2) + (list.length > 2 ? `\n...共 ${list.length} 条` : ''))
        message.success(`已加载 ${list.length} 条表结构快照`)
      } catch (err) {
        message.error('JSON 解析失败：' + err.message)
      }
    }
    reader.readAsText(file)
    return false
  }

  const fillSample = () => {
    const sample = [
      {
        table_name: 't_order_2026_01',
        schema_json: { columns: [{ name: 'id', type: 'bigint' }, { name: 'amount', type: 'decimal(18,2)' }, { name: 'tenant_id', type: 'varchar(64)' }], primary_key: ['id'] },
        partition_info: { strategy: 'by_month', key: 'create_time', tenant_column: 'tenant_id', account_set_column: 'account_set' },
        tenant_id: 'T001',
        account_set: 'ACCT001',
        row_count: 1280000,
        data_size: 256000000,
      },
      {
        table_name: 't_order_item_2026_01',
        schema_json: { columns: [{ name: 'id', type: 'bigint' }, { name: 'order_id', type: 'bigint' }, { name: 'product_id', type: 'bigint' }], primary_key: ['id'] },
        partition_info: { strategy: 'by_month', key: 'create_time', tenant_column: 'tenant_id' },
        tenant_id: 'T001',
        account_set: 'ACCT001',
        row_count: 5200000,
        data_size: 512000000,
      },
    ]
    setSchemas(sample)
    setJsonPreview(JSON.stringify(sample, null, 2))
    form.setFieldsValue({ source: 'test_sample', remark: '测试数据：重复导入场景' })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!schemas || schemas.length === 0) {
        message.error('请至少包含一条表结构快照')
        return
      }
      setLoading(true)
      const result = await importBatch({
        ...values,
        schemas,
      })
      setLoading(false)
      if (result.action === 'created') {
        message.success(`导入成功！批次号 ${result.batch_no}，共 ${result.table_count} 张表`)
      } else if (result.action === 'skipped') {
        message.warning(`检测到相同数据已存在（data_hash 去重），自动返回已有批次 ${result.batch_no}`)
      }
      onSuccess(result.batch_id, result.action)
      form.resetFields()
      setSchemas([])
      setJsonPreview('')
    } catch (err) {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="导入表结构快照批次"
      open={open}
      onCancel={onClose}
      width={760}
      footer={null}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="去重机制说明"
        description="系统会对所有表结构快照（含租户/账套/表名/分区信息）做 SHA-256 哈希计算。同一批数据第二次导入时，不会产生新批次，自动返回已有批次，避免结论互相打架。"
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" initialValues={{ entry_point: 'slow_query', import_user: 'sre_duty' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="import_user" label="导入人" rules={[{ required: true }]}>
              <Input placeholder="值班 SRE 姓名/工号" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="source" label="数据来源" rules={[{ required: true }]}>
              <Select placeholder="选择数据来源">
                <Option value="slow_query_log">慢查询日志抽取</Option>
                <Option value="backup_verify">备份校验工具</Option>
                <Option value="db_dump">数据库字典导出</Option>
                <Option value="test_sample">测试样例</Option>
                <Option value="manual">人工整理</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="entry_point" label="导入入口" rules={[{ required: true }]}>
          <Select>
            {ENTRY_POINTS.map(ep => (
              <Option key={ep.value} value={ep.value}>{ep.label} — {ep.desc}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <TextArea rows={2} placeholder="如：V2.3 数据字典更新后复核 / 2026 春季课前备份校验" />
        </Form.Item>

        <Form.Item label="表结构快照（schemas）" required>
          <Dragger
            accept=".json,application/json"
            beforeUpload={handleFile}
            showUploadList={false}
            style={{ marginBottom: 12 }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽 JSON 文件到此处</p>
            <p className="ant-upload-hint">
              格式：数组形式的表结构对象。每个对象包含 table_name, schema_json, partition_info, tenant_id, account_set 等字段
            </p>
          </Dragger>
          <Space>
            <Button size="small" onClick={fillSample}>填充测试样例（验证重复导入场景）</Button>
            <span style={{ color: '#888' }}>已加载 <b>{schemas.length}</b> 条快照</span>
          </Space>
          {jsonPreview && (
            <pre style={{
              marginTop: 12, padding: 12, background: '#f5f5f5',
              borderRadius: 4, maxHeight: 180, overflow: 'auto', fontSize: 12,
            }}>{jsonPreview}</pre>
          )}
        </Form.Item>
      </Form>
      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>提交导入</Button>
        </Space>
      </div>
    </Modal>
  )
}
