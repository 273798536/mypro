import { useStore } from "@/store/useStore";
import {
  generateMockLoadCurve,
  generateMockTempData,
  MOCK_EQUIPMENT_PARAMS,
  MOCK_LOAD_CSV,
  MOCK_TEMP_JSON,
  parseCSV,
  parseTempJSON,
} from "@/utils/mockData";
import { FileUp, Database, Thermometer, Play, AlertTriangle, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useState } from "react";

export default function Workbench() {
  const {
    loadCurve,
    ambientTemp,
    equipmentParams,
    isCalculated,
    totalRecords,
    validRecords,
    gapCount,
    anomalyCount,
    successRate,
    setLoadCurve,
    setAmbientTemp,
    setEquipmentParams,
    runCalculation,
  } = useStore();

  const [loadCSVText, setLoadCSVText] = useState("");
  const [tempJSONText, setTempJSONText] = useState("");

  const handleLoadCSV = () => {
    const text = loadCSVText.trim() || MOCK_LOAD_CSV;
    const records = parseCSV(text);
    if (records.length > 0) {
      setLoadCurve(records);
    }
  };

  const handleTempJSON = () => {
    const text = tempJSONText.trim() || MOCK_TEMP_JSON;
    const records = parseTempJSON(text);
    if (records.length > 0) {
      setAmbientTemp(records);
    }
  };

  const handleLoadSample = () => {
    setLoadCurve(generateMockLoadCurve());
    setAmbientTemp(generateMockTempData());
    setEquipmentParams(MOCK_EQUIPMENT_PARAMS);
  };

  const stats = [
    {
      label: "总记录数",
      value: totalRecords,
      icon: Database,
      color: "var(--color-cyan)",
    },
    {
      label: "有效记录",
      value: validRecords,
      icon: CheckCircle2,
      color: "var(--color-green)",
    },
    {
      label: "缺测数",
      value: gapCount,
      icon: AlertTriangle,
      color: "var(--color-amber)",
    },
    {
      label: "异常数",
      value: anomalyCount,
      icon: XCircle,
      color: "var(--color-red)",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            核算工作台
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            导入负载曲线、环境温度和设备参数，一键启动损耗核算
          </p>
        </div>
        <button onClick={handleLoadSample} className="btn-secondary flex items-center gap-2">
          <Database size={14} />
          加载样例数据
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <FileUp size={16} style={{ color: "var(--color-amber)" }} />
            <span className="text-sm font-medium">负载曲线 (CSV)</span>
            {loadCurve.length > 0 && (
              <span className="badge badge-ok ml-auto">{loadCurve.length} 条</span>
            )}
          </div>
          <textarea
            className="textarea-dark h-32"
            placeholder={`粘贴 CSV 数据，或留空使用默认样例\ntimestamp,loadKW,remark\n2026-05-01T00:00:00,28.5,`}
            value={loadCSVText}
            onChange={(e) => setLoadCSVText(e.target.value)}
          />
          <button onClick={handleLoadCSV} className="btn-secondary mt-3 w-full">
            解析并导入
          </button>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer size={16} style={{ color: "var(--color-cyan)" }} />
            <span className="text-sm font-medium">环境温度 (JSON)</span>
            {ambientTemp.length > 0 && (
              <span className="badge badge-ok ml-auto">{ambientTemp.length} 条</span>
            )}
          </div>
          <textarea
            className="textarea-dark h-32"
            placeholder={`粘贴 JSON 数组，或留空使用默认样例\n[{"timestamp":"...","tempC":25.3}]`}
            value={tempJSONText}
            onChange={(e) => setTempJSONText(e.target.value)}
          />
          <button onClick={handleTempJSON} className="btn-secondary mt-3 w-full">
            解析并导入
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} style={{ color: "var(--color-amber)" }} />
          <span className="text-sm font-medium">设备参数</span>
          {equipmentParams && (
            <span className="badge badge-ok ml-auto">已设定</span>
          )}
        </div>
        {equipmentParams ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "额定容量", value: `${equipmentParams.ratedCapacityKVA} kVA` },
              { label: "额定电压", value: `${equipmentParams.ratedVoltageKV} kV` },
              { label: "空载损耗", value: `${equipmentParams.noLoadLossKW} kW` },
              { label: "负载损耗", value: `${equipmentParams.loadLossKW} kW` },
              { label: "参数日期", value: equipmentParams.paramDate },
            ].map((item) => (
              <div key={item.label} className="bg-[var(--color-bg-primary)] rounded-lg p-3">
                <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                  {item.label}
                </p>
                <p className="font-mono text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            点击"加载样例数据"自动填入，或手动输入
          </p>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={runCalculation}
          disabled={loadCurve.length === 0 || !equipmentParams}
          className="btn-primary flex items-center gap-2 text-base px-8 py-3"
        >
          <Play size={18} />
          启动核算
        </button>
      </div>

      {isCalculated && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
          {stats.map((stat) => (
            <div key={stat.label} className="card text-center">
              <stat.icon size={20} className="mx-auto mb-2" style={{ color: stat.color }} />
              <p className="stat-value" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                {stat.label}
              </p>
            </div>
          ))}
          <div className="card text-center">
            <CheckCircle2 size={20} className="mx-auto mb-2" style={{ color: "var(--color-cyan)" }} />
            <p className="stat-value" style={{ color: "var(--color-cyan)" }}>
              {successRate}%
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
              计算成功率
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
