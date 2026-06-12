import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Space, Dropdown, Upload, message, Badge } from 'antd';
import { 
  FileTextOutlined, HistoryOutlined, UploadOutlined, 
  FileExcelOutlined, FileImageOutlined, DownloadOutlined,
  MenuUnfoldOutlined, MenuFoldOutlined
} from '@ant-design/icons';
import MainPage from './pages/MainPage';
import ReviewPage from './pages/ReviewPage';
import { exportApi } from './api';
import type { FilterCriteria } from '@shared/types';
import { useFilterPersistence } from './hooks/useFilterPersistence';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { filter } = useFilterPersistence();

  const handleImportExcel = async (file: File) => {
    try {
      const response = await exportApi.importExcel(file);
      if (response.data.success) {
        const result = response.data.data;
        message.success(`导入成功：${result.success}条，失败：${result.failed}条`);
        if (result.errors.length > 0) {
          message.error(`导入错误：${result.errors.join('; ')}`);
        }
      }
    } catch (error: any) {
      message.error('导入失败：' + error.message);
    }
    return false;
  };

  const handleExportExcel = () => {
    exportApi.exportExcel(filter);
  };

  const handleExportCSV = () => {
    exportApi.exportCSV(filter);
  };

  const menuItems = [
    {
      key: '/',
      icon: <FileTextOutlined />,
      label: <Link to="/">低空航线走廊剖面讲解</Link>
    },
    {
      key: '/review',
      icon: <HistoryOutlined />,
      label: <Link to="/review">周复盘</Link>
    }
  ];

  const exportMenuItems = [
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: '导出Excel',
      onClick: handleExportExcel
    },
    {
      key: 'csv',
      icon: <FileTextOutlined />,
      label: '导出CSV',
      onClick: handleExportCSV
    }
  ];

  const importMenuItems = [
    {
      key: 'excel',
      label: (
        <Upload
          accept=".xlsx,.xls"
          showUploadList={false}
          beforeUpload={handleImportExcel}
        >
          <span><FileExcelOutlined /> 导入Excel</span>
        </Upload>
      )
    },
    {
      key: 'csv',
      label: (
        <Upload
          accept=".csv"
          showUploadList={false}
          beforeUpload={(file) => handleImportExcel(file)}
        >
          <span><FileTextOutlined /> 导入CSV</span>
        </Upload>
      )
    }
  ];

  return (
    <div className="app-container">
      <Layout style={{ minHeight: '100vh' }}>
        <Header 
          style={{ 
            background: '#001529', 
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', color: '#fff', marginRight: 16 }}
            />
            <h1 style={{ color: '#fff', margin: 0, fontSize: 18 }}>
              低空航线走廊剖面讲解系统
            </h1>
          </div>
          
          <Space>
            <Dropdown menu={{ items: importMenuItems }} placement="bottomRight">
              <Button icon={<UploadOutlined />}>导入数据</Button>
            </Dropdown>
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
              <Button icon={<DownloadOutlined />}>导出数据</Button>
            </Dropdown>
          </Space>
        </Header>

        <Layout>
          <Sider 
            width={200} 
            collapsed={collapsed}
            style={{ background: '#fff' }}
            theme="light"
          >
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              style={{ height: '100%', borderRight: 0 }}
            />
          </Sider>

          <Layout style={{ background: '#f5f5f5' }}>
            <Content style={{ margin: 0, overflow: 'hidden' }}>
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/review" element={<ReviewPage />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </div>
  );
};

export default App;
