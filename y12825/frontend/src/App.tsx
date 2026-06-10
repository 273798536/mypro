import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Activity, AlertTriangle, BarChart3, ClipboardList, Upload } from "lucide-react";
import styles from "./App.module.css";
import LineagePanel from "./components/LineagePanel";
import AnomalyPanel from "./components/AnomalyPanel";
import QCDashboard from "./components/QCDashboard";
import CorrectionHistory from "./components/CorrectionHistory";
import ImportPanel from "./components/ImportPanel";
import TimelineView from "./components/TimelineView";

function App() {
  return (
    <BrowserRouter>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.logo}>病毒载量时间线</div>
          <nav className={styles.nav}>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <Activity size={18} />
              谱系追踪
            </NavLink>
            <NavLink
              to="/anomalies"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <AlertTriangle size={18} />
              异常复核
            </NavLink>
            <NavLink
              to="/qc"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <BarChart3 size={18} />
              质控看板
            </NavLink>
            <NavLink
              to="/corrections"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <ClipboardList size={18} />
              修正历史
            </NavLink>
            <NavLink
              to="/import"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <Upload size={18} />
              数据导入
            </NavLink>
          </nav>
        </aside>
        <main className={styles.content}>
          <Routes>
            <Route path="/" element={<LineagePanel />} />
            <Route path="/lineage/:lineageId" element={<TimelineView />} />
            <Route path="/anomalies" element={<AnomalyPanel />} />
            <Route path="/qc" element={<QCDashboard />} />
            <Route path="/corrections" element={<CorrectionHistory />} />
            <Route path="/import" element={<ImportPanel />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
