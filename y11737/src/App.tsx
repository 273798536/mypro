import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Home from "@/pages/Home";
import BillDetail from "@/pages/BillDetail";

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bill/:id" element={<BillDetail />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
