import { useEffect } from "react";
import ImportPanel from "@/components/ImportPanel";
import MaterialPanel from "@/components/MaterialPanel";
import { useMaterialStore } from "@/store/materialStore";

export default function MaterialsPage() {
  const ensureSeed = useMaterialStore((s) => s.ensureSeed);
  useEffect(() => {
    ensureSeed();
  }, [ensureSeed]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-100">材料与来源</h2>
        <p className="mt-1 text-sm text-slate-400">
          导入钢卷、吊具、轨道、作业区与任务。每次导入都会保留来源、合并策略与历次修正痕迹，不会悄悄覆盖而不留痕迹。
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ImportPanel />
        </div>
        <div className="lg:col-span-3">
          <MaterialPanel />
        </div>
      </div>
    </div>
  );
}
