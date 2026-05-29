import { useState } from "react";
import { X } from "lucide-react";
import type { Entry } from "../../shared/types";

interface EntryEditModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (entry: Partial<Entry>) => Promise<void>;
}

export default function EntryEditModal({
  open,
  onClose,
  onSubmit,
}: EntryEditModalProps) {
  const [form, setForm] = useState({
    cardNo: "",
    scenicSpotId: "",
    scenicSpotName: "",
    entryTime: "",
    swipeSerialNo: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.cardNo.trim()) e.cardNo = "请输入年卡号";
    if (!form.scenicSpotId.trim()) e.scenicSpotId = "请输入景点ID";
    if (!form.scenicSpotName.trim()) e.scenicSpotName = "请输入景点名称";
    if (!form.entryTime.trim()) e.entryTime = "请输入入园时间";
    if (!form.swipeSerialNo.trim()) e.swipeSerialNo = "请输入刷卡流水号";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({
        cardNo: "",
        scenicSpotId: "",
        scenicSpotName: "",
        entryTime: "",
        swipeSerialNo: "",
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[480px] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-medium text-primary">新增入园记录</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {[
            { key: "cardNo", label: "年卡号" },
            { key: "scenicSpotId", label: "景点ID" },
            { key: "scenicSpotName", label: "景点名称" },
            { key: "entryTime", label: "入园时间" },
            { key: "swipeSerialNo", label: "刷卡流水号" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input
                type={key === "entryTime" ? "datetime-local" : "text"}
                value={form[key as keyof typeof form]}
                onChange={(e) =>
                  setForm({ ...form, [key]: e.target.value })
                }
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                  errors[key] ? "border-danger" : "border-gray-300"
                }`}
              />
              {errors[key] && (
                <p className="text-xs text-danger mt-1">{errors[key]}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "提交中..." : "提交"}
          </button>
        </div>
      </div>
    </div>
  );
}
