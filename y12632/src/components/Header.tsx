import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { Stethoscope, Edit3, FileText, Save, RotateCcw } from "lucide-react";
import { saveToLocalStorage } from "@/utils/dataIO";

export function Header() {
  const location = useLocation();
  const { record, updateRecordName, resetRecord } = useAnnotationStore();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(record.name);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveToLocalStorage(record);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNameSubmit = () => {
    if (nameValue.trim()) {
      updateRecordName(nameValue.trim());
    }
    setEditing(false);
  };

  const handleReset = () => {
    if (window.confirm("确定要重置当前轨迹吗？所有标注将被清除。")) {
      resetRecord();
      setNameValue("未命名轨迹");
    }
  };

  return (
    <header className="h-14 bg-white border-b border-neutral-200 flex items-center px-6 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center shadow-md">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-neutral-800 leading-tight">
            医学影像病灶描绘
          </div>
          <div className="text-[10px] text-neutral-400 leading-tight">
            Medical Imaging Annotation
          </div>
        </div>
      </div>

      <nav className="ml-8 flex items-center gap-1">
        <Link
          to="/"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            location.pathname === "/"
              ? "bg-medical-50 text-medical-700"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <Edit3 className="w-4 h-4" />
          描绘工作台
        </Link>
        <Link
          to="/report"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            location.pathname === "/report"
              ? "bg-medical-50 text-medical-700"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <FileText className="w-4 h-4" />
          报告预览
        </Link>
      </nav>

      {location.pathname === "/" && (
        <div className="ml-6 flex items-center gap-2">
          {editing ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              autoFocus
              className="px-2 py-1 text-sm border border-medical-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-200 w-48"
            />
          ) : (
            <button
              onClick={() => {
                setNameValue(record.name);
                setEditing(true);
              }}
              className="text-sm font-medium text-neutral-700 hover:text-medical-600 px-2 py-1 rounded-md hover:bg-neutral-50 max-w-[200px] truncate"
              title="点击编辑轨迹名称"
            >
              📝 {record.name}
            </button>
          )}
          <span className="tag-info">
            {record.annotations.length} 标注
          </span>
          {record.isFlipped && <span className="tag-warning">已翻转</span>}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {location.pathname === "/" && (
          <>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition"
            >
              <Save className="w-4 h-4" />
              {saved ? "已保存" : "保存"}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-neutral-500 hover:bg-red-50 hover:text-red-600 transition"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </>
        )}
      </div>
    </header>
  );
}
