import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Checkbox, Button, App, Descriptions, Tag, Space, Alert } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import type { Sample, QualityStatus } from '../types';
import { submitReview, qualityLabels, qualityColors } from '../api';

const { TextArea } = Input;
const { Option } = Select;

interface Props {
  open: boolean;
  sample: Sample | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({ open, sample, onClose, onSuccess }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && sample) {
      form.setFieldsValue({
        hasMissingTimePoint: sample.hasMissingTimePoint,
        hasDuplicateBarcode: sample.hasDuplicateBarcode,
        qualityStatus: sample.qualityStatus,
        qualityNotes: sample.qualityNotes,
      });
    }
  }, [open, sample, form]);

  async function handleSubmit() {
    if (!sample) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      await submitReview(sample.id, values);
      message.success('复核提交成功');
      onSuccess();
    } catch (e: any) {
      message.error('提交失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!sample) return null;

  return (
    <Modal
      title="📝 异常复核"
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          提交复核
        </Button>,
      ]}
    >
      <Alert
        message="复核须知"
        description={
          <div>
            <p>1. 请仔细核对样本信息，确认质量问题是否已处理</p>
            <p>2. 时间点缺失或条码重复需在复核意见中说明原因</p>
            <p>3. 复核通过后，系统将记录完整审计轨迹，包括修改人、时间和原因</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="样本条码">
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sample.barcode}</span>
          </Descriptions.Item>
          <Descriptions.Item label="样本名称">{sample.sampleName}</Descriptions.Item>
          <Descriptions.Item label="细菌名称">{sample.bacteriaName}</Descriptions.Item>
          <Descriptions.Item label="当前质量状态">
            <Tag color={qualityColors[sample.qualityStatus]}>
              {qualityLabels[sample.qualityStatus]}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </div>

      <Form form={form} layout="vertical">
        {sample.hasMissingTimePoint && (
          <div style={{ 
            padding: 12, 
            background: '#e6f7ff', 
            borderRadius: 6, 
            marginBottom: 16,
            border: '1px solid #91d5ff'
          }}>
            <Space>
              <ExclamationCircleOutlined style={{ color: '#1890ff', fontSize: 18 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>时间点缺失确认</div>
                <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                  采集时间：{sample.collectionTime || <Tag color="default">缺失</Tag>}　
                  检测时间：{sample.testTime || <Tag color="default">缺失</Tag>}
                </div>
                <Form.Item 
                  name="hasMissingTimePoint" 
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>
                    我已确认时间点状态，标记为
                    <span style={{ color: '#52c41a', fontWeight: 500 }}>已处理</span>
                    （系统将记录此操作的完整审计轨迹）
                  </Checkbox>
                </Form.Item>
              </div>
            </Space>
          </div>
        )}

        {sample.hasDuplicateBarcode && (
          <div style={{ 
            padding: 12, 
            background: '#fff7e6', 
            borderRadius: 6, 
            marginBottom: 16,
            border: '1px solid #ffd591'
          }}>
            <Space>
              <ExclamationCircleOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>条码重复确认</div>
                <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                  该条码「{sample.barcode}」在系统中存在多条记录
                </div>
                <Form.Item 
                  name="hasDuplicateBarcode" 
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>
                    我已确认条码重复情况，标记为
                    <span style={{ color: '#52c41a', fontWeight: 500 }}>已核查</span>
                    （系统将记录此操作的完整审计轨迹）
                  </Checkbox>
                </Form.Item>
              </div>
            </Space>
          </div>
        )}

        <Form.Item
          name="qualityStatus"
          label="复核后质量状态"
          rules={[{ required: true, message: '请选择质量状态' }]}
        >
          <Select>
            <Option value="pass">合格</Option>
            <Option value="warning">有异常（需注意）</Option>
            <Option value="fail">不合格</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="qualityNotes"
          label="质量备注"
        >
          <Input placeholder="简要描述质量情况，如：时间点已补充，已与LIS系统核对" />
        </Form.Item>

        <Form.Item
          name="reviewComment"
          label={
            <Space>
              <span>复核意见</span>
              <span style={{ color: '#ff4d4f', fontSize: 12 }}>
                （时间点缺失/条码重复被复核通过时必须填写原因）
              </span>
            </Space>
          }
          rules={[
            { 
              validator: (_, value) => {
                const values = form.getFieldsValue();
                if ((sample.hasMissingTimePoint && !values.hasMissingTimePoint) ||
                    (sample.hasDuplicateBarcode && !values.hasDuplicateBarcode)) {
                  if (!value || value.trim().length === 0) {
                    return Promise.reject(new Error('修正异常后必须填写复核意见，说明原因'));
                  }
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <TextArea 
            rows={4} 
            placeholder="请详细说明复核意见，包括：修改原因、处理方式、依据来源等。此内容将被永久记录用于审计追溯。"
          />
        </Form.Item>

        <div style={{ 
          padding: 12, 
          background: '#f6ffed', 
          borderRadius: 6,
          border: '1px solid #b7eb8f'
        }}>
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            <div>
              <div style={{ fontWeight: 500, color: '#389e0d' }}>提交后将记录以下审计信息</div>
              <div style={{ fontSize: 12, color: '#52c41a' }}>
                <UserOutlined /> 操作人：当前用户　
                <span style={{ margin: '0 8px' }}>|</span>
                时间：{new Date().toLocaleString('zh-CN')}　
                <span style={{ margin: '0 8px' }}>|</span>
                原因：以上复核意见
              </div>
            </div>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
