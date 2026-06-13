import React from 'react';
import { Modal, Descriptions, Tag, Space, Alert, Divider } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import { convertToNm } from '../utils/dataAnalysis';
import dayjs from 'dayjs';

const DetailModal: React.FC = () => {
  const { state, dispatch, pageSummary } = useAppContext();
  const { showDetailModal, selectedRecordId, allRecords } = state;

  const selectedRecord = React.useMemo(() => {
    return allRecords.find(r => r.id === selectedRecordId);
  }, [allRecords, selectedRecordId]);

  const jumpEvent = React.useMemo(() => {
    return pageSummary.jump_events.find(e => e.record_id === selectedRecordId);
  }, [pageSummary.jump_events, selectedRecordId]);

  const handleCancel = () => {
    dispatch({ type: 'TOGGLE_DETAIL_MODAL', payload: false });
    dispatch({ type: 'SELECT_RECORD', payload: null });
  };

  if (!selectedRecord) return null;

  const torqueNm = convertToNm(selectedRecord.torque_value, selectedRecord.torque_unit);

  return (
    <Modal
      title="数据详情"
      open={showDetailModal}
      onCancel={handleCancel}
      footer={null}
      width={700}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        {selectedRecord.is_outlier && (
          <Tag color="orange" icon={<WarningOutlined />}>
            异常值 - {selectedRecord.outlier_reason === 'extreme_high' ? '偏高' : '偏低'}
          </Tag>
        )}
        {selectedRecord.is_device_duplicate && (
          <Tag color="red" icon={<ExclamationCircleOutlined />}>
            设备编号重复
          </Tag>
        )}
        {selectedRecord.is_data_dirty && (
          <Tag color="magenta" icon={<FileTextOutlined />}>
            脏数据（保留原始）
          </Tag>
        )}
        {jumpEvent && (
          <Tag color="green" icon={<ThunderboltOutlined />}>
            跳变点
          </Tag>
        )}
        {selectedRecord.tags?.map(tag => (
          <Tag key={tag} color="blue">{tag}</Tag>
        ))}
      </Space>

      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="记录ID" span={2}>
          {selectedRecord.id}
        </Descriptions.Item>
        <Descriptions.Item label="时间戳">
          {dayjs(selectedRecord.timestamp).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="设备编号" span={2}>
          <Space>
            <span style={{ fontWeight: 'bold' }}>{selectedRecord.device_id}</span>
            {selectedRecord.is_device_duplicate && selectedRecord.duplicate_device_ids && (
              <Tag color="red">
                重复记录: {selectedRecord.duplicate_device_ids.join(', ')}
              </Tag>
            )}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="设备名称" span={2}>
          {selectedRecord.device_name}
        </Descriptions.Item>
        <Descriptions.Item label="扭矩值">
          <span style={{
            color: selectedRecord.is_outlier ? '#faad14' : 'inherit',
            fontWeight: selectedRecord.is_outlier ? 'bold' : 'normal'
          }}>
            {selectedRecord.torque_value} {selectedRecord.torque_unit}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="换算值 (N·m)">
          {torqueNm.toFixed(4)} N·m
        </Descriptions.Item>
        <Descriptions.Item label="额定扭矩">
          {selectedRecord.rated_torque} N·m
        </Descriptions.Item>
        <Descriptions.Item label="负载率">
          {((torqueNm / selectedRecord.rated_torque) * 100).toFixed(1)}%
        </Descriptions.Item>
        <Descriptions.Item label="转速">
          {selectedRecord.speed} rpm
        </Descriptions.Item>
        <Descriptions.Item label="电流">
          {selectedRecord.current} A
        </Descriptions.Item>
        <Descriptions.Item label="温度">
          {selectedRecord.temperature} °C
        </Descriptions.Item>
        <Descriptions.Item label="数据来源">
          {selectedRecord.data_source === 'auto_import' ? '自动导入' :
           selectedRecord.data_source === 'api' ? 'API同步' : '手动录入'}
        </Descriptions.Item>
        <Descriptions.Item label="维修备注（原始）" span={2}>
          <div style={{
            padding: '8px 12px',
            background: selectedRecord.is_data_dirty ? '#fff1f0' : '#f6ffed',
            borderRadius: 4,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {selectedRecord.maintenance_note_raw || '(空)'}
          </div>
        </Descriptions.Item>
        {selectedRecord.is_data_dirty && selectedRecord.maintenance_note_cleaned && (
          <Descriptions.Item label="维修备注（清洗后参考）" span={2}>
            <div style={{
              padding: '8px 12px',
              background: '#e6f7ff',
              borderRadius: 4,
              fontStyle: 'italic',
              color: '#666'
            }}>
              {selectedRecord.maintenance_note_cleaned}
              <span style={{ marginLeft: 8, fontSize: 11, color: '#999' }}>
                （仅作参考，原始数据已保留）
              </span>
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>

      {jumpEvent && (
        <>
          <Divider orientation="left">跳变诊断信息</Divider>
          <Alert
            type="warning"
            showIcon
            message={`跳变 ${jumpEvent.jump_value.toFixed(2)} N·m (${jumpEvent.jump_percentage.toFixed(1)}%)`}
            description={jumpEvent.cause_detail}
          />
        </>
      )}

      {selectedRecord.is_data_dirty && (
        <div style={{ marginTop: 16 }}>
          <Alert
            type="info"
            showIcon
            message="数据完整性说明"
            description="本系统保留原始数据，不自动修改脏数据。清洗后内容仅作参考，导出时原始数据与清洗后数据会分别保存。"
          />
        </div>
      )}
    </Modal>
  );
};

export default DetailModal;
