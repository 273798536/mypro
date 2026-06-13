import React, { useRef } from 'react';
import { Button, Space, Upload, message, Tooltip } from 'antd';
import { PlayCircleOutlined, ImportOutlined, FileTextOutlined, InfoCircleOutlined, ExportOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useAppContext } from '../context/AppContext';
import { generateMockData, importFromJson } from '../utils/dataImport';

const DataImportPanel: React.FC = () => {
  const { dispatch } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadSampleData = () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    setTimeout(() => {
      const mockData = generateMockData(50);
      dispatch({ type: 'SET_RECORDS', payload: mockData });
      message.success(`成功加载 ${mockData.length} 条示例数据`);
    }, 300);
  };

  const handleImportJson: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'done') {
      const file = info.file.originFileObj;
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const records = importFromJson(content);
            dispatch({ type: 'SET_RECORDS', payload: records });
            message.success(`成功导入 ${records.length} 条数据`);
          } catch (error) {
            message.error((error as Error).message);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  const handleShowGuide = () => {
    dispatch({ type: 'TOGGLE_GUIDE_MODAL', payload: true });
  };

  const handleShowExport = () => {
    dispatch({ type: 'TOGGLE_EXPORT_MODAL', payload: true });
  };

  const dummyRequest = () => {
    return { abort: () => {} };
  };

  return (
    <div style={{
      padding: '12px 16px',
      background: '#f5f5f5',
      borderRadius: 8,
      marginBottom: 16
    }}>
      <Space wrap>
        <Tooltip title="加载示例数据用于测试">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleLoadSampleData}
          >
            加载示例数据
          </Button>
        </Tooltip>

        <Upload
          accept=".json"
          showUploadList={false}
          customRequest={dummyRequest}
          onChange={handleImportJson}
        >
          <Tooltip title="导入JSON格式的扭矩数据">
            <Button icon={<ImportOutlined />}>
              导入JSON
            </Button>
          </Tooltip>
        </Upload>

        <div style={{ flex: 1 }} />

        <Tooltip title="查看详细使用说明">
          <Button
            icon={<InfoCircleOutlined />}
            onClick={handleShowGuide}
          >
            使用说明
          </Button>
        </Tooltip>

        <Tooltip title="导出当前筛选结果">
          <Button
            type="default"
            icon={<ExportOutlined />}
            onClick={handleShowExport}
          >
            导出
          </Button>
        </Tooltip>
      </Space>

      <div style={{ marginTop: 8, fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileTextOutlined style={{ color: '#1890ff' }} />
        <span>
          数据处理规则：导入时自动标记异常值、重复设备、脏数据，
          <strong style={{ color: '#faad14' }}>原始数据保持不变</strong>，
          仅添加标记字段便于识别
        </span>
      </div>
    </div>
  );
};

export default DataImportPanel;
