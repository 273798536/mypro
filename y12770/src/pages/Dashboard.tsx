import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Clock, FileCheck, Upload, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { mockApi, type DashboardStats, type Record } from "@/utils/mock";

const statCards = [
  { key: "todayAnalysis", label: "今日分析数", icon: Activity, color: "text-lab-primary", bgColor: "bg-lab-primary/10" },
  { key: "anomalies", label: "异常数", icon: AlertTriangle, color: "text-lab-danger", bgColor: "bg-lab-danger/10" },
  { key: "pendingReview", label: "待复核数", icon: Clock, color: "text-lab-warning", bgColor: "bg-lab-warning/15" },
  { key: "reports", label: "已出报告数", icon: FileCheck, color: "text-lab-success", bgColor: "bg-lab-success/10" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [s, r] = await Promise.all([mockApi.getDashboardStats(), mockApi.getRecords()]);
      setStats(s);
      setRecords(r);
      setLoading(false);
    };
    fetchData();
  }, []);

  const successRecords = records.filter((r) => r.status === "success");
  const warningRecords = records.filter((r) => r.status === "warning");
  const dangerRecords = records.filter((r) => r.status === "danger");

  const StatusIcon = { success: CheckCircle, warning: AlertCircle, danger: XCircle };
  const statusStyles = {
    success: { border: "border-l-lab-success", icon: "text-lab-success" },
    warning: { border: "border-l-lab-warning", icon: "text-lab-warning" },
    danger: { border: "border-l-lab-danger", icon: "text-lab-danger" },
  };

  const RecordCard = ({ record }: { record: Record }) => {
    const Icon = StatusIcon[record.status];
    return (
      <div className={`glass-card p-4 border-l-4 ${statusStyles[record.status].border} hover:shadow-cardHover transition-shadow`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 ${statusStyles[record.status].icon} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-lab-text truncate">{record.title}</h4>
            <p className="text-xs text-lab-textLight mt-1 line-clamp-2">{record.description}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs font-mono text-lab-textLight">{record.batchNo}</span>
              <span className="text-xs text-lab-textLight">{record.time}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-lab-textLight">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-lab-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl text-lab-primary">工作台</h1>
          <p className="text-sm text-lab-textLight mt-1">反应热安全预警分析系统</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map(({ key, label, icon: Icon, color, bgColor }) => (
            <div key={key} className="glass-card p-5 hover:shadow-cardHover transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-lab-textLight">{label}</p>
                  <p className="text-3xl font-bold text-lab-text mt-1">{stats?.[key as keyof DashboardStats]}</p>
                </div>
                <div className={`${bgColor} p-3 rounded-xl`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-lab-success" />
                <h3 className="font-semibold text-lab-success">顺利记录</h3>
                <span className="text-xs text-lab-textLight">({successRecords.length})</span>
              </div>
              {successRecords.map((r) => <RecordCard key={r.id} record={r} />)}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-lab-warning" />
                <h3 className="font-semibold text-lab-warning">待确认</h3>
                <span className="text-xs text-lab-textLight">({warningRecords.length})</span>
              </div>
              {warningRecords.map((r) => <RecordCard key={r.id} record={r} />)}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-lab-danger" />
                <h3 className="font-semibold text-lab-danger">异常</h3>
                <span className="text-xs text-lab-textLight">({dangerRecords.length})</span>
              </div>
              {dangerRecords.map((r) => <RecordCard key={r.id} record={r} />)}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-lab-text mb-4">快速操作</h3>
            <button
              onClick={() => navigate("/weighing")}
              className="w-full border-2 border-dashed border-lab-border rounded-xl p-6 hover:border-lab-primary hover:bg-lab-primary/5 transition-all flex flex-col items-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-lab-primary/10 flex items-center justify-center group-hover:bg-lab-primary/20 transition-colors">
                <Upload className="w-6 h-6 text-lab-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-lab-text">导入称量单</p>
                <p className="text-xs text-lab-textLight mt-1">支持 CSV / Excel 格式</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
