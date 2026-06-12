import React, { useState, useEffect } from 'react';
import { 
  Tabs, Descriptions, Tag, Button, Space, Input, message, 
  Timeline, Upload, Modal, List, Image, Divider, Popconfirm 
} from 'antd';
import { 
  UploadOutlined, CheckOutlined, CloseOutlined, 
  FileTextOutlined, CameraOutlined, EditOutlined,
  HistoryOutlined, FileImageOutlined
} from '@ant-design/icons';
import type { 
  InspectionRecord, MaterialVersion, ManualNote, 
  HistoryChange, RouteCorridor 
} from '@shared/types';
import { recordApi, exportApi } from '../api';
import { 
  RECORD_TYPE_LABELS, STATUS_LABELS, MATERIAL_TYPE_LABELS, 
  CHANGE_TYPE_LABELS 
} from '@shared/constants';
import { formatDate } from '@shared/utils';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { TabPane } = Tabs;

interface DetailPanelProps {
  recordId: string | null;
  corridors: RouteCorridor[];
  onRecordUpdate: () => void;
  filterCriteria: any;
  onScreenshotSaved: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ 
  recordId, 
  corridors, 
  onRecordUpdate,
  filterCriteria,
  onScreenshotSaved
}) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<{
    record: InspectionRecord;
    materials: MaterialVersion[];
    notes: ManualNote[];
    history: HistoryChange[];
  } | null>(null);
  const [newNote, setNewNote] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type: 'confirm' | 'reject';
    remark: string;
  }>({ visible: false, type: 'confirm', remark: '' });
  const [screenshotAnnotation, setScreenshotAnnotation] = useState('');
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  useEffect(() => {
    if (recordId) {
      loadDetails(recordId);
    } else {
      setDetails(null);
    }
  }, [recordId]);

  const loadDetails = async (id: string) => {
    setLoading(true);
    try {
      const response = await recordApi.getDetails(id);
      if (response.data.success) {
        setDetails(response.data.data);
      }
    } catch (error: any) {
      message.error('加载详情失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!recordId) return;
    
    try {
      const response = await recordApi.confirm(recordId, confirmModal.remark);
      if (response.data.success) {
        message.success('确认成功');
        setConfirmModal({ visible: false, type: 'confirm', remark: '' });
        loadDetails(recordId);
        onRecordUpdate();
      }
    } catch (error: any) {
      message.error('确认失败：' + error.message);
    }
  };

  const handleReject = async () => {
    if (!recordId) return;
    
    try {
      const response = await recordApi.reject(recordId, confirmModal.remark);
      if (response.data.success) {
        message.success('驳回成功');
        setConfirmModal({ visible: false, type: 'confirm', remark: '' });
        loadDetails(recordId);
        onRecordUpdate();
      }
    } catch (error: any) {
      message.error('驳回失败：' + error.message);
    }
  };

  const handleAddNote = async () => {
    if (!recordId || !newNote.trim()) return;
    
    try {
      const response = await recordApi.addNote(recordId, {
        recordId,
        content: newNote.trim(),
        createdBy: '小赵'
      });
      if (response.data.success) {
        message.success('备注添加成功');
        setNewNote('');
        loadDetails(recordId);
        onRecordUpdate();
      }
    } catch (error: any) {
      message.error('添加备注失败：' + error.message);
    }
  };

  const handleUploadMaterial = async (file: File, materialType: MaterialVersion['materialType']) => {
    if (!recordId) return false;
    
    const isCaliberModified = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '口径修改确认',
        content: '该材料是否修改过口径？',
        okText: '是，已修改',
        cancelText: '否，未修改',
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    let modifiedDescription = '';
    if (isCaliberModified) {
      modifiedDescription = await new Promise<string>((resolve) => {
        let desc = '';
        Modal.confirm({
          title: '请输入口径修改说明',
          content: (
            <TextArea
              rows={4}
              placeholder="请详细说明口径修改内容..."
              onChange={(e) => desc = e.target.value}
              autoFocus
            />
          ),
          onOk: () => resolve(desc)
        });
      });
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await recordApi.addMaterial(recordId, {
        recordId,
        materialType,
        fileName: file.name,
        fileUrl: `/uploads/${Date.now()}_${file.name}`,
        fileSize: file.size,
        remark: '',
        isCaliberModified,
        modifiedDescription,
        createdBy: '小赵'
      });
      
      if (response.data.success) {
        message.success('材料上传成功');
        loadDetails(recordId);
        onRecordUpdate();
      }
    } catch (error: any) {
      message.error('上传失败：' + error.message);
    }
    
    return false;
  };

  const handleExportPDF = () => {
    if (!recordId) return;
    exportApi.exportPDF(recordId, screenshotAnnotation);
  };

  const corridorName = details?.record ? 
    corridors.find(c => c.id === details.record.corridorId)?.name : '';

  const getStatusColor = (status: InspectionRecord['status']) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'modified': return 'processing';
      default: return 'default';
    }
  };

  const getTypeColor = (type: InspectionRecord['recordType']) => {
    switch (type) {
      case 'normal': return 'green';
      case 'abnormal': return 'red';
      case 'temporary': return 'blue';
      default: return 'default';
    }
  };

  if (!recordId) {
    return (
      <div className="detail-panel" style={{ padding: 24, textAlign: 'center', color: '#999' }}>
        <FileTextOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
        <p>请选择一条记录查看详情</p>
      </div>
    );
  }

  if (loading && !details) {
    return (
      <div className="detail-panel" style={{ padding: 24, textAlign: 'center' }}>
        <p>加载中...</p>
      </div>
    );
  }

  if (!details) return null;

  const { record, materials, notes, history } = details;

  return (
    <div className="detail-panel">
      <div style={{ padding: 16, borderBottom: '1px solid #e8e8e8' }}>
        <Space style={{ marginBottom: 12 }}>
          <Tag color={getTypeColor(record.recordType)}>
            {RECORD_TYPE_LABELS[record.recordType]}
          </Tag>
          <Tag color={getStatusColor(record.status)}>
            {STATUS_LABELS[record.status]}
          </Tag>
          {record.isOverlapping && (
            <Tag color="red">对象重叠</Tag>
          )}
        </Space>
        <h3 style={{ margin: 0, marginBottom: 8 }}>{record.title}</h3>
        <div style={{ fontSize: 13, color: '#888' }}>
          {corridorName} · {formatDate(record.recordDate, 'YYYY-MM-DD')}
        </div>
      </div>

      {record.status === 'pending' && (
        <div style={{ padding: 12, background: '#fffbe6', borderBottom: '1px solid #ffe58f' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<CheckOutlined />} 
              onClick={() => setConfirmModal({ visible: true, type: 'confirm', remark: '' })}
            >
              确认通过
            </Button>
            <Button 
              danger 
              icon={<CloseOutlined />} 
              onClick={() => setConfirmModal({ visible: true, type: 'reject', remark: '' })}
            >
              驳回
            </Button>
          </Space>
        </div>
      )}

      <Tabs defaultActiveKey="info" size="small">
        <TabPane tab="基本信息" key="info">
          <div className="tab-section" style={{ padding: '0 16px' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="记录编号">{record.id}</Descriptions.Item>
              <Descriptions.Item label="记录日期">
                {formatDate(record.recordDate, 'YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDate(record.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {formatDate(record.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">{record.createdBy}</Descriptions.Item>
              {record.confirmedBy && (
                <Descriptions.Item label="确认人">
                  {record.confirmedBy} · {formatDate(record.confirmedAt!)}
                </Descriptions.Item>
              )}
            </Descriptions>
            
            <Divider style={{ margin: '16px 0' }} />
            
            <h4 style={{ marginBottom: 8 }}>详细描述</h4>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#333' }}>
              {record.description}
            </p>
          </div>
        </TabPane>

        <TabPane tab={`材料版本 (${materials.length})`} key="materials">
          <div className="tab-section" style={{ padding: '0 16px' }}>
            <Space style={{ marginBottom: 12 }}>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => handleUploadMaterial(file, 'photo')}
              >
                <Button size="small" icon={<CameraOutlined />}>上传照片</Button>
              </Upload>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => handleUploadMaterial(file, 'document')}
              >
                <Button size="small" icon={<FileTextOutlined />}>上传文档</Button>
              </Upload>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => handleUploadMaterial(file, 'screenshot')}
              >
                <Button size="small" icon={<FileImageOutlined />}>上传截图</Button>
              </Upload>
            </Space>

            {materials.some(m => m.isCaliberModified) && (
              <div style={{ 
                padding: 8, 
                background: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: 4,
                marginBottom: 12,
                fontSize: 12 
              }}>
                ⚠️ 部分材料已修改口径，请注意核对
              </div>
            )}

            <List
              size="small"
              dataSource={materials}
              renderItem={(item) => (
                <div 
                  className={`material-item ${item.isCaliberModified ? 'caliber-modified' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>v{item.version}</strong>
                      <Tag color={item.isCaliberModified ? 'red' : 'default'} style={{ marginLeft: 8 }}>
                        {MATERIAL_TYPE_LABELS[item.materialType]}
                      </Tag>
                      {item.isCaliberModified && (
                        <Tag color="red">口径已改</Tag>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {formatDate(item.createdAt, 'MM-DD HH:mm')}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>{item.fileName}</div>
                  {item.isCaliberModified && item.modifiedDescription && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#d4380d' }}>
                      修改说明：{item.modifiedDescription}
                    </div>
                  )}
                  {item.remark && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                      备注：{item.remark}
                    </div>
                  )}
                  <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                    上传人：{item.createdBy}
                  </div>
                </div>
              )}
            />
          </div>
        </TabPane>

        <TabPane tab={`人工备注 (${notes.length})`} key="notes">
          <div className="tab-section" style={{ padding: '0 16px' }}>
            <div style={{ marginBottom: 12 }}>
              <TextArea
                rows={3}
                placeholder="输入人工备注..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <Button 
                type="primary" 
                size="small" 
                icon={<EditOutlined />}
                onClick={handleAddNote}
                disabled={!newNote.trim()}
              >
                添加备注
              </Button>
            </div>

            <List
              size="small"
              dataSource={notes}
              renderItem={(item) => (
                <div style={{ 
                  padding: 12, 
                  background: '#f9f9f9', 
                  borderRadius: 4,
                  marginBottom: 8 
                }}>
                  <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                    {item.content}
                  </p>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#999', textAlign: 'right' }}>
                    {item.createdBy} · {formatDate(item.createdAt)}
                  </div>
                </div>
              )}
            />
          </div>
        </TabPane>

        <TabPane tab={`变更历史 (${history.length})`} key="history">
          <div className="tab-section" style={{ padding: '0 16px' }}>
            <Timeline className="history-timeline">
              {history.map((item) => (
                <Timeline.Item key={item.id}>
                  <div>
                    <strong>{CHANGE_TYPE_LABELS[item.changeType]}</strong>
                    <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                      {formatDate(item.changedAt, 'MM-DD HH:mm')}
                    </span>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {item.remark || `${item.fieldName} 字段变更`}
                  </div>
                  {item.oldValue && item.newValue && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      <span style={{ textDecoration: 'line-through', color: '#999' }}>
                        {item.oldValue}
                      </span>
                      <span style={{ margin: '0 8px' }}>→</span>
                      <span style={{ color: '#52c41a' }}>{item.newValue}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    操作人：{item.changedBy}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        </TabPane>

        <TabPane tab="导出" key="export">
          <div className="tab-section" style={{ padding: '0 16px' }}>
            <h4 style={{ marginBottom: 12 }}>导出PDF报告</h4>
            <div style={{ marginBottom: 12 }}>
              <TextArea
                rows={2}
                placeholder="输入标注说明（可选）..."
                value={screenshotAnnotation}
                onChange={(e) => setScreenshotAnnotation(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <Button 
                type="primary" 
                icon={<FileTextOutlined />}
                onClick={handleExportPDF}
              >
                导出PDF
              </Button>
            </div>

            <Divider />

            <h4 style={{ marginBottom: 12 }}>保存截图说明</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              截图将包含当前筛选条件和页面状态
            </p>
            <Button 
              icon={<FileImageOutlined />}
              onClick={() => setShowScreenshotModal(true)}
            >
              保存当前截图
            </Button>
          </div>
        </TabPane>
      </Tabs>

      <Modal
        title={confirmModal.type === 'confirm' ? '确认通过' : '驳回记录'}
        open={confirmModal.visible}
        onOk={confirmModal.type === 'confirm' ? handleConfirm : handleReject}
        onCancel={() => setConfirmModal({ visible: false, type: 'confirm', remark: '' })}
        okText={confirmModal.type === 'confirm' ? '确认通过' : '确认驳回'}
        okButtonProps={{ danger: confirmModal.type === 'reject' }}
      >
        <p style={{ marginBottom: 12 }}>
          {confirmModal.type === 'confirm' 
            ? '确认该记录审核通过？' 
            : '确认驳回该记录？'}
        </p>
        <TextArea
          rows={3}
          placeholder="输入备注说明（可选）..."
          value={confirmModal.remark}
          onChange={(e) => setConfirmModal({ ...confirmModal, remark: e.target.value })}
        />
      </Modal>

      <Modal
        title="保存截图说明"
        open={showScreenshotModal}
        onCancel={() => setShowScreenshotModal(false)}
        footer={null}
      >
        <p style={{ marginBottom: 12 }}>
          当前筛选条件将一同保存，刷新页面后可恢复此视图
        </p>
        <TextArea
          rows={3}
          placeholder="输入截图标注说明..."
          value={screenshotAnnotation}
          onChange={(e) => setScreenshotAnnotation(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Button 
          type="primary" 
          onClick={() => {
            onScreenshotSaved();
            setShowScreenshotModal(false);
            message.success('截图已保存');
          }}
          disabled={!screenshotAnnotation.trim()}
        >
          保存截图
        </Button>
      </Modal>
    </div>
  );
};

export default DetailPanel;
