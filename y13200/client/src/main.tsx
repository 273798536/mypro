import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1677ff',
          colorBgBase: '#141414',
          colorBgContainer: '#1f1f1f',
          colorBgElevated: '#2a2a2a',
          colorBgLayout: '#141414',
          colorBorder: '#424242',
          colorBorderSecondary: '#303030',
          colorText: 'rgba(255, 255, 255, 0.85)',
          colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
          colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
          colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',
          borderRadius: 8,
          fontSize: 14,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
        },
        components: {
          Layout: {
            headerBg: '#1f1f1f',
            siderBg: '#1f1f1f',
          },
          Menu: {
            darkItemBg: '#1f1f1f',
            darkSubMenuItemBg: '#141414',
          },
          Table: {
            headerBg: '#2a2a2a',
            rowHoverBg: 'rgba(255, 255, 255, 0.04)',
            borderColor: '#303030',
          },
          Card: {
            headerBg: '#2a2a2a',
          },
          Modal: {
            headerBg: '#2a2a2a',
            contentBg: '#1f1f1f',
          },
          Drawer: {
            colorBgElevated: '#1f1f1f',
          },
          Form: {
            labelColor: 'rgba(255, 255, 255, 0.85)',
          },
          Input: {
            colorBgContainer: '#1f1f1f',
          },
          Select: {
            colorBgContainer: '#1f1f1f',
          },
          DatePicker: {
            colorBgContainer: '#1f1f1f',
          },
          Upload: {
            colorBgContainer: '#1f1f1f',
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
