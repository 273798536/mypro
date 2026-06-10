import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, XCircle, ArrowRight, RefreshCw } from "lucide-react";
import { mockApi, type Reagent } from "@/utils/mock";

export default function WeighingImport() {
  const navigate = useNavigate();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisId] = useState(() => Math.random().toString(36).slice(2, 10));

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setLoading(true);
    setFileName(file.name);
    mockApi.parseWeighingFile(file).then(({ reagents }) => {
      setReagents(reagents.slice(0, 20));
      setLoading(false);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const resetUpload = () => {
    setReagents([]);
    setFileName("");
  };

  const hasErrors = reagents.some((r) => r.missingFields && r.missingFields.length > 0);
  const errorCount = reagents.filter((r) => r.missingFields && r.missingFields.length > 0).length;

  return (
    <div className="min-h-screen bg-lab-bg p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl text-lab-primary">称量单管理</h1>
          <p className="text-sm text-lab-textLight mt-1">导入 CSV 或 Excel 格式的称量单数据</p>
        </div>

        {reagents.length === 0 ? (
          <div
            {...getRootProps()}
            className={`glass-card p-16 cursor-pointer transition-all border-2 border-dashed ${
              isDragActive ? "border-lab-primary bg-lab-primary/5" : "border-lab-border hover:border-lab-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDragActive ? "bg-lab-primary/15" : "bg-lab-primary/10"}`}>
                <Upload className={`w-10 h-10 ${isDragActive ? "text-lab-primary" : "text-lab-primary/70"}`} />
              </div>
              <p className="text-lg font-medium text-lab-text">
                {isDragActive ? "释放文件以上传" : "拖拽文件到此处，或点击选择"}
              </p>
              <p className="text-sm text-lab-textLight mt-2">支持 CSV、Excel (.xlsx, .xls) 格式</p>
              <div className="flex items-center gap-2 mt-4">
                <FileSpreadsheet className="w-4 h-4 text-lab-textLight" />
                <span className="text-xs text-lab-textLight">字段要求：试剂名称、批次号、浓度、重量、纯度</span>
              </div>
              {loading && <p className="text-sm text-lab-primary mt-4">正在解析文件...</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="glass-card p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-lab-primary" />
                <div>
                  <p className="font-medium text-lab-text">{fileName}</p>
                  <p className="text-xs text-lab-textLight">共 {reagents.length} 条记录预览</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasErrors ? (
                  <div className="flex items-center gap-1.5 status-danger">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{errorCount} 条数据不完整</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 status-success">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>数据校验通过</span>
                  </div>
                )}
                <button onClick={resetUpload} className="btn-secondary flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4" />
                  <span>重新上传</span>
                </button>
                <button
                  onClick={() => navigate(`/analysis/${analysisId}`)}
                  disabled={hasErrors}
                  className={`btn-primary flex items-center gap-1.5 ${hasErrors ? "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none" : ""}`}
                >
                  <span>开始分析</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-lab-bg">
                      <th className="table-cell text-left font-semibold text-lab-text">#</th>
                      <th className="table-cell text-left font-semibold text-lab-text">试剂名称</th>
                      <th className="table-cell text-left font-semibold text-lab-text">批次号</th>
                      <th className="table-cell text-left font-semibold text-lab-text">浓度 (mol/L)</th>
                      <th className="table-cell text-left font-semibold text-lab-text">重量 (g)</th>
                      <th className="table-cell text-left font-semibold text-lab-text">纯度 (%)</th>
                      <th className="table-cell text-left font-semibold text-lab-text">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reagents.map((r, idx) => {
                      const hasMissing = r.missingFields && r.missingFields.length > 0;
                      return (
                        <tr key={r.id} className={hasMissing ? "bg-lab-danger/5" : "hover:bg-lab-bg/50"}>
                          <td className="table-cell text-lab-textLight">{idx + 1}</td>
                          <td className={`table-cell ${!r.name ? "text-lab-danger font-medium" : "text-lab-text"}`}>{r.name || "—"}</td>
                          <td className={`table-cell font-mono ${!r.batchNo ? "text-lab-danger font-medium bg-lab-danger/10" : "text-lab-text"}`}>
                            {r.batchNo || "—"}
                          </td>
                          <td className={`table-cell font-mono ${r.missingFields?.includes("浓度") ? "text-lab-danger bg-lab-danger/10" : "text-lab-text"}`}>
                            {r.concentration?.toFixed(2) || "—"}
                          </td>
                          <td className={`table-cell font-mono ${r.missingFields?.includes("重量") ? "text-lab-danger bg-lab-danger/10" : "text-lab-text"}`}>
                            {r.weight?.toFixed(2) || "—"}
                          </td>
                          <td className={`table-cell font-mono ${r.missingFields?.includes("纯度") ? "text-lab-danger bg-lab-danger/10" : "text-lab-text"}`}>
                            {r.purity?.toFixed(1) || "—"}
                          </td>
                          <td className="table-cell">
                            {hasMissing ? (
                              <div className="flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 text-lab-danger" />
                                <span className="text-xs text-lab-danger">缺少: {r.missingFields?.join(", ")}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-lab-success" />
                                <span className="text-xs text-lab-success">完整</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {hasErrors && (
              <div className="error-callout mt-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-lab-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-lab-text">数据完整性校验未通过</p>
                  <p className="text-sm text-lab-textLight mt-1">
                    共 {errorCount} 条记录存在缺失字段，请检查原始称量单后重新导入，或补全缺失数据。
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
