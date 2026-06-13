import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Pagination, Spin, Empty, message, Space, Badge, Button, Modal, Input } from 'antd';
import { WarningOutlined, FileImageOutlined, PlusOutlined } from '@ant-design/icons';
import FilterPanel from '../components/FilterPanel';
import RecordCard from '../components/RecordCard';
import DetailPanel from '../components/DetailPanel';
import { corridorApi, recordApi, exportApi } from '../api';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useScreenshot } from '../hooks/useScreenshot';
import type { RouteCorridor, InspectionRecord, FilterCriteria } from '@shared/types';
import { DEFAULT_PAGE_SIZE } from '@shared/constants';

const { TextArea } = Input;

const MainPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [corridors, setCorridors] = useState<RouteCorridor[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [overlappingRecords, setOverlappingRecords] = useState<InspectionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [overlappingTotal, setOverlappingTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    corridorId: '',
    recordDate: '',
    recordType: 'normal' as const,
    title: '',
    description: ''
  });

  const { filter, updateFilter, resetFilter } = useFilterPersistence();
  const { targetRef, takeScreenshot, downloadScreenshot } = useScreenshot();

  const loadCorridors = useCallback(async () => {
    try {
      const response = await corridorApi.getAll();
      if (response.data.success && response.data.data) {
        setCorridors(response.data.data);
      }
    } catch (error: any) {
      message.error('加载航线走廊失败：' + error.message);
    }
  }, []);

  const loadRecords = useCallback(async (currentPage: number, currentFilter: FilterCriteria) => {
    setLoading(true);
    try {
      const response = await recordApi.getList(currentFilter, currentPage, DEFAULT_PAGE_SIZE);
      if (response.data.success && response.data.data) {
        setRecords(response.data.data.data);
        setTotal(response.data.data.total);
      }
    } catch (error: any) {
      message.error('加载记录失败：' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOverlappingRecords = useCallback(async (currentPage: number, currentFilter: FilterCriteria) => {
    try {
      const response = await recordApi.getOverlapping(currentFilter, currentPage, DEFAULT_PAGE_SIZE);
      if (response.data.success && response.data.data) {
        setOverlappingRecords(response.data.data.data);
        setOverlappingTotal(response.data.data.total);
      }
    } catch (error: any) {
      message.error('加载重叠记录失败：' + error.message);
    }
  }, []);

  useEffect(() => {
    loadCorridors();
  }, [loadCorridors]);

  useEffect(() => {
    loadRecords(page, filter);
    loadOverlappingRecords(1, filter);
  }, [page, filter, loadRecords, loadOverlappingRecords]);

  const handleSearch = () => {
    setPage(1);
    loadRecords(1, filter);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRecordSelect = (recordId: string) => {
    setSelectedRecordId(recordId);
  };

  const handleRecordUpdate = () => {
    loadRecords(page, filter);
    loadOverlappingRecords(1, filter);
  };

  const handleScreenshotSaved = async () => {
    const imageUrl = await takeScreenshot(filter, selectedRecordId || undefined);
    if (imageUrl) {
      downloadScreenshot(imageUrl, `route_corridor_${Date.now()}.png`);
    }
  };

  const handleCreateRecord = async () => {
    if (!newRecord.corridorId || !newRecord.recordDate || !newRecord.title) {
      message.error('请填写必要字段');
      return;
    }

    try {
      const response = await recordApi.create({
        ...newRecord,
        status: 'pending',
        createdBy: '小赵'
      });
      if (response.data.success) {
        message.success('记录创建成功');
        setShowCreateModal(false);
        setNewRecord({
          corridorId: '',
          recordDate: '',
          recordType: 'normal',
          title: '',
          description: ''
        });
        handleRecordUpdate();
      }
    } catch (error: any) {
      message.error('创建失败：' + error.message);
    }
  };

  const getCorridorName = (corridorId: string) => {
    return corridors.find(c => c.id === corridorId)?.name || corridorId;
  };

  const currentRecords = activeTab === 'overlapping' ? overlappingRecords : records;
  const currentTotal = activeTab === 'overlapping' ? overlappingTotal : total;

  return (
    <div className="main-layout">
      <FilterPanel
        corridors={corridors}
        filter={filter}
        onFilterChange={updateFilter}
        onReset={resetFilter}
        onSearch={handleSearch}
      />

      <div className="content-area">
        <div style={{ 
          padding: '12px 16px', 
          background: '#fff', 
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            size="small"
            items={[
              {
                key: 'all',
                label: (
                  <span>
                    全部记录
                    <Badge count={total} style={{ marginLeft: 8, backgroundColor: '#1890ff' }} size="small" />
                  </span>
                )
              },
              {
                key: 'overlapping',
                label: (
                  <span>
                    <WarningOutlined style={{ color: '#ff4d4f' }} /> 对象重叠
                    <Badge count={overlappingTotal} style={{ marginLeft: 8, backgroundColor: '#ff4d4f' }} size="small" />
                  </span>
                )
              }
            ]}
          />
          
          <Space>
            <Button 
              icon={<PlusOutlined />} 
              type="primary"
              onClick={() => setShowCreateModal(true)}
            >
              新建记录
            </Button>
            <Button 
              icon={<FileImageOutlined />}
              onClick={handleScreenshotSaved}
            >
              截图保存
            </Button>
          </Space>
        </div>

        <div className="record-list" ref={targetRef}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
            </div>
          ) : currentRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Empty description="暂无记录" />
            </div>
          ) : (
            <>
              {currentRecords.map(record => (
                <RecordCard
                  key={record.id}
                  record={record}
                  selected={selectedRecordId === record.id}
                  onClick={() => handleRecordSelect(record.id)}
                  corridorName={getCorridorName(record.corridorId)}
                />
              ))}
              
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Pagination
                  current={page}
                  total={currentTotal}
                  pageSize={DEFAULT_PAGE_SIZE}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <DetailPanel
        recordId={selectedRecordId}
        corridors={corridors}
        onRecordUpdate={handleRecordUpdate}
        filterCriteria={filter}
        onScreenshotSaved={handleScreenshotSaved}
      />

      <Modal
        title="新建巡检记录"
        open={showCreateModal}
        onOk={handleCreateRecord}
        onCancel={() => setShowCreateModal(false)}
        okText="创建"
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>航线走廊 *</label>
            <select
              value={newRecord.corridorId}
              onChange={(e) => setNewRecord({ ...newRecord, corridorId: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}
            >
              <option value="">请选择航线走廊</option>
              {corridors.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>记录日期 *</label>
            <input
              type="date"
              value={newRecord.recordDate}
              onChange={(e) => setNewRecord({ ...newRecord, recordDate: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>记录类型</label>
            <select
              value={newRecord.recordType}
              onChange={(e) => setNewRecord({ ...newRecord, recordType: e.target.value as any })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}
            >
              <option value="normal">正常记录</option>
              <option value="abnormal">异常记录</option>
              <option value="temporary">临时说明</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>标题 *</label>
            <input
              type="text"
              value={newRecord.title}
              onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
              placeholder="请输入记录标题"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>详细描述</label>
            <TextArea
              rows={4}
              value={newRecord.description}
              onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
              placeholder="请输入详细描述..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MainPage;
