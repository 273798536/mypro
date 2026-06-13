import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileSpreadsheet,
  MessageSquare,
  PlayCircle,
  FileText,
  Sparkles,
  GitCompareArrows,
  FileOutput,
  ClipboardList,
  HardHat,
  ShieldCheck,
  Rocket,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useRecordsStore } from "@/store";
import { parseFile, parseVerbalNotes } from "@/utils/fileParser";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    number: 1,
    title: "上传材料",
    desc: "拖拽上传传感器记录CSV/Excel，支持口头备注补充",
    icon: Upload,
    color: "from-deepsea-500 to-deepsea-600",
    badge: "bg-deepsea-100 text-deepsea-700",
  },
  {
    number: 2,
    title: "自动清洗",
    desc: "智能识别旧版/撤回/口头记录，自动分流打标",
    icon: Sparkles,
    color: "from-warnorange-500 to-warnorange-600",
    badge: "bg-warnorange-100 text-warnorange-700",
  },
  {
    number: 3,
    title: "方案比选",
    desc: "三方案多维度对比，风险/造价/容量综合评分",
    icon: GitCompareArrows,
    color: "from-alertyellow-500 to-alertyellow-600",
    badge: "bg-alertyellow-100 text-alertyellow-700",
  },
  {
    number: 4,
    title: "输出报告",
    desc: "统计表+明细表+Markdown报告，结论溯源脚注",
    icon: FileOutput,
    color: "from-passgreen-500 to-passgreen-600",
    badge: "bg-passgreen-100 text-passgreen-700",
  },
];

const ROLES = [
  {
    title: "评审助理",
    subtitle: "阿乔的工作台",
    desc: "上传记录、配置筛选、生成全套输出",
    icon: ClipboardList,
    color: "border-deepsea-300 bg-deepsea-50 hover:bg-deepsea-100",
    iconBg: "bg-deepsea-500",
    arrow: "text-deepsea-500",
    path: "/workbench",
  },
  {
    title: "现场同事",
    subtitle: "空间可视化",
    desc: "查看3D场景与时间轴联动，理解空间关系",
    icon: HardHat,
    color: "border-warnorange-300 bg-warnorange-50 hover:bg-warnorange-100",
    iconBg: "bg-warnorange-500",
    arrow: "text-warnorange-500",
    path: "/scenario",
  },
  {
    title: "复核人",
    subtitle: "证据追踪",
    desc: "标记已处理/待补证据，导出复核清单",
    icon: ShieldCheck,
    color: "border-passgreen-300 bg-passgreen-50 hover:bg-passgreen-100",
    iconBg: "bg-passgreen-500",
    arrow: "text-passgreen-500",
    path: "/review",
  },
  {
    title: "试用者",
    subtitle: "快速上手",
    desc: "引导式浏览，异常出口提示，快速理解全貌",
    icon: Rocket,
    color: "border-alertyellow-300 bg-alertyellow-50 hover:bg-alertyellow-100",
    iconBg: "bg-alertyellow-500",
    arrow: "text-alertyellow-500",
    path: "/output",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const loadMock = useRecordsStore((s) => s.loadMock);
  const appendRecords = useRecordsStore((s) => s.appendRecords);
  const records = useRecordsStore((s) => s.records);

  const [dragActive, setDragActive] = useState(false);
  const [verbalNote, setVerbalNote] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setPendingFile(e.dataTransfer.files[0]);
      setFileName(e.dataTransfer.files[0].name);
      setParseError(null);
      setParsedCount(null);
    }
  }, []);

  const handleZoneClick = (e: React.MouseEvent) => {
    if (fileName) return;
    e.stopPropagation();
    if (fileInputRef.current && e.target === dropZoneRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPendingFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
      setParseError(null);
      setParsedCount(null);
    }
  };

  const handleClearFile = () => {
    setPendingFile(null);
    setFileName(null);
    setParseError(null);
    setParsedCount(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setParsing(true);
    setParseError(null);
    try {
      let totalNew = 0;
      if (pendingFile) {
        const fileRecords = await parseFile(pendingFile);
        if (fileRecords.length > 0) {
          appendRecords(fileRecords);
          totalNew += fileRecords.length;
        }
      }
      if (verbalNote.trim()) {
        const verbalRecords = parseVerbalNotes(verbalNote);
        if (verbalRecords.length > 0) {
          appendRecords(verbalRecords);
          totalNew += verbalRecords.length;
        }
      }
      setParsedCount(totalNew);
      if (totalNew > 0) {
        navigate("/workbench");
      }
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const handleUseDemoData = () => {
    loadMock();
    navigate("/workbench");
  };

  const hasInput = !!pendingFile || verbalNote.trim().length > 0;

  return (
    <div className="space-y-16 pb-12">
      <section className="relative overflow-hidden rounded-2xl border border-deepsea-100 bg-gradient-to-br from-deepsea-900 via-deepsea-800 to-deepsea-700">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-warnorange-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-passgreen-500/10 blur-3xl" />

        <div className="relative px-10 py-20 md:py-28 md:px-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-passgreen-400 animate-pulse" />
              码头危险品库方案比选评审系统 v1.0
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
              一套输入，
              <span className="bg-gradient-to-r from-warnorange-400 to-alertyellow-400 bg-clip-text text-transparent">
                四份输出
              </span>
              <br />
              让评审结论有据可依
            </h1>
            <p className="text-lg md:text-xl text-deepsea-100/80 leading-relaxed mb-10 max-w-2xl">
              从杂乱的传感器原始记录出发，自动清洗分流旧版/撤回/口头备注，
              配合时间轴与3D空间可视化，输出统计表、明细表与可溯源的Markdown评审报告。
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleUseDemoData}
                className="eng-btn bg-warnorange-500 text-white hover:bg-warnorange-600 px-6 py-3 text-base shadow-lg shadow-warnorange-500/30"
              >
                <PlayCircle className="w-5 h-5" />
                使用内置演示数据快速体验
              </button>
              <button
                onClick={() => dropZoneRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="eng-btn bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 px-6 py-3 text-base"
              >
                <Upload className="w-5 h-5" />
                上传我的材料
              </button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-xl">
              {[
                { label: "记录自动识别率", value: "98%" },
                { label: "结论溯源覆盖", value: "100%" },
                { label: "比选指标维度", value: "7项" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-deepsea-200/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-md bg-deepsea-100 text-deepsea-700 text-sm font-medium mb-4">
            核心流程
          </span>
          <h2 className="text-3xl font-bold text-deepsea-900 mb-3">
            四步走完评审全链路
          </h2>
          <p className="text-deepsea-500 max-w-2xl mx-auto">
            从原始材料上传到最终报告输出，每一步都有明确的异常出口与回退机制
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          <div className="absolute top-1/2 left-1/4 w-1/2 h-0.5 bg-gradient-to-r from-deepsea-200 via-warnorange-300 to-passgreen-300 hidden md:block -translate-y-1/2" />

          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isEven = idx % 2 === 0;
            return (
              <div
                key={step.number}
                className={cn(
                  "eng-card p-6 md:p-8 relative group",
                  "hover:-translate-y-2 hover:shadow-xl hover:shadow-deepsea-100/50 transition-all duration-300",
                  isEven ? "md:translate-y-0" : "md:translate-y-10",
                )}
              >
                <div
                  className={cn(
                    "absolute -top-4 -left-4 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg bg-gradient-to-br",
                    step.color,
                  )}
                >
                  {step.number}
                </div>

                <div className="flex items-start gap-4 mb-4 md:ml-12">
                  <div className={cn("p-3 rounded-xl", step.badge)}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                <div className="md:ml-12">
                  <h3 className="text-xl font-bold text-deepsea-900 mb-2 group-hover:text-deepsea-700 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-deepsea-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {idx < STEPS.length - 1 && (
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-deepsea-300 group-hover:text-deepsea-500 transition-colors hidden md:block" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="eng-card p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
          <div>
            <span className="inline-block px-3 py-1 rounded-md bg-warnorange-100 text-warnorange-700 text-sm font-medium mb-3">
              材料上传
            </span>
            <h2 className="text-3xl font-bold text-deepsea-900 mb-2">
              准备你的评审材料
            </h2>
            <p className="text-deepsea-500 max-w-xl">
              支持CSV/Excel格式的传感器记录导出表，可同时补充口头备注作为非结构化证据
            </p>
          </div>
          <button
            onClick={handleUseDemoData}
            className="eng-btn-success shrink-0 px-5 py-2.5"
          >
            <PlayCircle className="w-4 h-4" />
            使用内置演示数据
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div
              ref={dropZoneRef}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleZoneClick}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-10 md:p-14 text-center transition-all duration-200",
                dragActive
                  ? "border-deepsea-500 bg-deepsea-50/80"
                  : fileName
                    ? "border-passgreen-400 bg-passgreen-50/50 cursor-default"
                    : "border-deepsea-200 bg-deepsea-50/30 hover:border-deepsea-400 hover:bg-deepsea-50 cursor-pointer",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
              />
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center transition-colors",
                  dragActive
                    ? "bg-deepsea-500 text-white"
                    : fileName
                      ? "bg-passgreen-500 text-white"
                      : "bg-deepsea-100 text-deepsea-500",
                )}
              >
                {parsing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : fileName ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>

              {parsing ? (
                <>
                  <p className="text-lg font-semibold text-deepsea-700 mb-1">正在解析文件…</p>
                  <p className="text-sm text-deepsea-500">请稍候</p>
                </>
              ) : fileName ? (
                <>
                  <p className="text-lg font-semibold text-passgreen-700 mb-1">已选择文件</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-passgreen-200 mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-passgreen-600" />
                    <span className="text-deepsea-700 font-medium text-sm">{fileName}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClearFile(); }}
                      className="p-0.5 rounded hover:bg-deepsea-100 text-deepsea-400 hover:text-deepsea-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-deepsea-400">点击 × 移除后可重新选择</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-deepsea-800 mb-2">拖拽文件到此处，或点击选择</p>
                  <p className="text-sm text-deepsea-500">支持 .csv / .xlsx / .xls 格式，单文件建议不超过 10MB</p>
                </>
              )}
            </div>

            {parseError && (
              <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-warnorange-50 border border-warnorange-200 text-sm">
                <AlertCircle className="w-4 h-4 text-warnorange-500 shrink-0 mt-0.5" />
                <span className="text-warnorange-700">{parseError}</span>
              </div>
            )}

            {parsedCount !== null && !parseError && (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-passgreen-50 border border-passgreen-200 text-sm">
                <CheckCircle2 className="w-4 h-4 text-passgreen-500 shrink-0" />
                <span className="text-passgreen-700">成功解析 <span className="font-bold">{parsedCount}</span> 条记录，已添加到数据集</span>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-deepsea-100 text-sm text-deepsea-600">
                <FileSpreadsheet className="w-4 h-4 text-deepsea-400" />
                <span>CSV示例：传感器编号,时间戳,温湿度,区域,描述</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-deepsea-100 text-sm text-deepsea-600">
                <FileText className="w-4 h-4 text-deepsea-400" />
                <span>Excel示例：多Sheet支持，首行为表头</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-warnorange-500" />
              <h3 className="font-semibold text-deepsea-800">
                补充口头备注（可选）
              </h3>
            </div>
            <textarea
              value={verbalNote}
              onChange={(e) => setVerbalNote(e.target.value)}
              placeholder={`例如：\n• 现场老李反映A区夜间常有车辆违停靠近库房\n• 安监站王工口头提醒消防通道需预留4米宽\n• 设计院陈工电话建议防雷接地电阻≤4Ω\n\n每条备注单独一行，系统将自动识别为"口头备注"类型记录`}
              className="w-full h-44 resize-none rounded-xl border border-deepsea-200 bg-white px-4 py-3 text-sm text-deepsea-800 placeholder-deepsea-400 focus:border-deepsea-500 focus:ring-2 focus:ring-deepsea-500/20 focus:outline-none transition-all"
            />

            <button
              onClick={handleSubmit}
              disabled={!hasInput || parsing}
              className={cn(
                "w-full eng-btn mt-4 py-3",
                hasInput && !parsing
                  ? "eng-btn bg-passgreen-500 border-passgreen-500 hover:bg-passgreen-600 hover:border-passgreen-600"
                  : "opacity-50 cursor-not-allowed",
              )}
            >
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在解析…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  解析并导入数据
                </>
              )}
            </button>

            {verbalNote.trim() && !pendingFile && (
              <p className="text-xs text-deepsea-400 mt-2">
                口头备注按行拆分，每行自动生成一条 verbal 类型记录
              </p>
            )}

            {records.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-passgreen-50 border border-passgreen-200 text-sm">
                <span className="w-2 h-2 rounded-full bg-passgreen-500 animate-pulse" />
                <span className="text-passgreen-700">
                  数据已就绪：当前有{" "}
                  <span className="font-bold">{records.length}</span> 条记录
                </span>
                <button
                  onClick={() => navigate("/workbench")}
                  className="ml-auto eng-btn-ghost px-3 py-1 text-xs bg-white border border-passgreen-200 text-passgreen-700"
                >
                  进入工作台
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-md bg-passgreen-100 text-passgreen-700 text-sm font-medium mb-4">
            角色入口
          </span>
          <h2 className="text-3xl font-bold text-deepsea-900 mb-3">
            选择你的角色，快速进入
          </h2>
          <p className="text-deepsea-500 max-w-2xl mx-auto">
            不同角色对应不同的核心工作流与权限配置
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.title}
                onClick={() => navigate(role.path)}
                className={cn(
                  "eng-card p-6 text-left group border-2 hover:-translate-y-1 transition-all duration-200",
                  role.color,
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-md group-hover:scale-110 transition-transform",
                    role.iconBg,
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="mb-1">
                  <span className="text-xs font-medium text-deepsea-500">
                    {role.subtitle}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-deepsea-900 mb-2 flex items-center gap-2">
                  {role.title}
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all",
                      role.arrow,
                    )}
                  />
                </h3>
                <p className="text-sm text-deepsea-600 leading-relaxed">
                  {role.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
