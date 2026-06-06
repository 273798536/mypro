import { useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { Ruler, X } from "lucide-react";

export function ScalePanel() {
  const { record, updateScale } = useAnnotationStore();
  const [isOpen, setIsOpen] = useState(true);
  const [scaleValue, setScaleValue] = useState(record.scale.value.toString());
  const [scaleUnit, setScaleUnit] = useState(record.scale.unit);

  const handleApply = () => {
    const v = parseFloat(scaleValue);
    if (!isNaN(v) && v > 0) {
      updateScale({ value: v, unit: scaleUnit });
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="panel p-2 flex items-center justify-center gap-1.5 text-xs text-neutral-600 hover:text-medical-600 transition"
      >
        <Ruler className="w-4 h-4" />
        比例尺配置
      </button>
    );
  }

  return (
    <div className="panel p-3 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-700 px-1 flex items-center gap-1.5">
          <Ruler className="w-4 h-4" />
          比例尺配置
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-neutral-100 text-neutral-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-neutral-500 block mb-1">
            像素数 / 实际单位
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={scaleValue}
              onChange={(e) => setScaleValue(e.target.value)}
              className="input-field text-xs flex-1"
              placeholder="例如: 3.2"
              step="0.1"
              min="0.01"
            />
            <span className="text-xs text-neutral-500 self-center">px /</span>
            <select
              value={scaleUnit}
              onChange={(e) => setScaleUnit(e.target.value)}
              className="input-field text-xs w-20"
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="um">μm</option>
            </select>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            例如 3.2 px/mm 表示 3.2 像素对应 1 毫米
          </p>
        </div>
        <button
          onClick={handleApply}
          className="w-full btn-primary text-xs py-1.5"
        >
          应用比例尺
        </button>
        {record.scale.value > 0 && (
          <div className="bg-medical-50 rounded-lg p-2.5 text-[11px] text-medical-700">
            <div className="font-medium mb-1">当前比例</div>
            <div>
              {record.scale.value} px = 1 {record.scale.unit}
            </div>
            <div className="text-medical-600 mt-1">
              1 px ≈ {(1 / record.scale.value).toFixed(3)} {record.scale.unit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
