import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: { colorPrimary: '#1677ff', borderRadius: 6 },
        components: {
          Layout: { headerBg: '#001529', headerHeight: 56, bodyBg: '#f5f7fa' },
          Menu: { darkItemBg: '#001529', darkSubMenuItemBg: '#000c17' }
        }
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
