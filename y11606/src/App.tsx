import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Sidebar from "@/components/Sidebar";
import Home from "@/pages/Home";
import LoanInfo from "@/pages/LoanInfo";
import Calculator from "@/pages/Calculator";
import Compare from "@/pages/Compare";
import History from "@/pages/History";
import Export from "@/pages/Export";

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1e40af' } }}>
      <AntdApp>
        <Router>
          <div className="flex min-h-screen bg-slate-100">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/loan-info" element={<LoanInfo />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/history" element={<History />} />
                <Route path="/export" element={<Export />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}
