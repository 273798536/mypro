import React from 'react';
import { Modal, Form, Checkbox, Radio, Button, Space, Alert } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import { exportToExcel } from '../utils/export';
import type { ExportConfig } from '../types';

const ExportModal: React.FC = () => {
  const { state, dispatch, filteredRecords, pageSummary } = useAppContext();
  const { showExportModal, exportConfig } = state;

  const [form] = Form.useForm<ExportConfig>();

  const handleOk = () => {
    form.validateFields().then(values => {
      exportToExcel(filteredRecords, pageSummary, values);
      dispatch({ type: 'TOGGLE_EXPORT_MODAL', payload: false });
    });
  };

  const handleCancel = () => {
    dispatch({ type: 'TOGGLE_EXPORT_MODAL', payload: false });
  };

  const handleValuesChange = (_: any, allValues: ExportConfig) => {
    dispatch({ type: 'SET_EXPORT_CONFIG', payload: allValues });
  };

  return (
    <Modal
      title={
        <span>
          <ExportOutlined style={{ marginRight: 8 }} />
          导出配置
        </span>
      }
      open={showExportModal}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="开始导出"
      width={500}
    >
      <Alert
        type="info"
        showIcon
        message="数据一致性保证"
        description="导出的筛选口径、页面摘要与当前页面完全一致，不会单独修改数据。导出内容严格对应当前筛选结果。"
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={exportConfig}
        onValuesChange={handleValuesChange}
      >
        <Form.Item label="导出内容" name="include_summary" valuePropName="checked">
          <Checkbox>包含页面摘要（统计数据、异常计数）</Checkbox>
        </Form.Item>

        <Form.Item name="include_filter_criteria" valuePropName="checked">
          <Checkbox>包含筛选口径（与页面顶部筛选条件一致）</Checkbox>
        </Form.Item>

        <Form.Item name="include_diagnosis" valuePropName="checked">
          <Checkbox>包含跳变诊断结果（跳变原因、前后对比）</Checkbox>
        </Form.Item>

        <Form.Item name="include_raw_data" valuePropName="checked">
          <Checkbox>包含原始数据明细</Checkbox>
        </Form.Item>

        <Form.Item name="include_outlier_markers" valuePropName="checked">
          <Checkbox>导出标记列（异常值、重复设备、脏数据标记）</Checkbox>
        </Form.Item>

        <Form.Item label="导出格式" name="format">
          <Radio.Group>
            <Radio.Button value="xlsx">Excel (.xlsx)</Radio.Button>
            <Radio.Button value="csv">CSV (.csv)</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
        <Space direction="vertical" size={2}>
          <div>• 文件名自动包含导出时间戳</div>
          <div>• 共导出 {filteredRecords.length} 条记录</div>
          <div>• 页面摘要与屏幕显示数值完全一致</div>
        </Space>
      </div>
    </Modal>
  );
};

export default ExportModal;
