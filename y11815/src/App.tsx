import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import PatientBills from "@/pages/PatientBills";
import InsuranceSettlements from "@/pages/InsuranceSettlements";
import AdvanceLedger from "@/pages/AdvanceLedger";
import RefundRecords from "@/pages/RefundRecords";
import RecoveryReport from "@/pages/RecoveryReport";

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/patient-bills" element={<PatientBills />} />
            <Route path="/insurance-settlements" element={<InsuranceSettlements />} />
            <Route path="/advance-ledger" element={<AdvanceLedger />} />
            <Route path="/refund-records" element={<RefundRecords />} />
            <Route path="/recovery-report" element={<RecoveryReport />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}
