import { Car, HardHat, Store } from "lucide-react";
import { useNoiseStore } from "@/store/useNoiseStore";
import { SOURCE_TYPE_COLORS, SOURCE_TYPE_LABELS } from "@/types";
import type { NoiseSourceType } from "@/types";

const SOURCE_ICONS: Record<NoiseSourceType, React.ReactNode> = {
  road: <Car className="h-4 w-4" />,
  construction: <HardHat className="h-4 w-4" />,
  commercial: <Store className="h-4 w-4" />,
};

const SOURCE_TYPES: NoiseSourceType[] = ["road", "construction", "commercial"];

export default function SourceFilter() {
  const enabledTypes = useNoiseStore((s) => s.enabledTypes);
  const toggleSourceType = useNoiseStore((s) => s.toggleSourceType);

  return (
    <div className="flex items-center gap-2">
      {SOURCE_TYPES.map((type) => {
        const isEnabled = enabledTypes.has(type);
        const color = SOURCE_TYPE_COLORS[type];
        const label = SOURCE_TYPE_LABELS[type];

        return (
          <button
            key={type}
            onClick={() => toggleSourceType(type)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              isEnabled
                ? "text-white"
                : "bg-gray-700/60 text-gray-400 line-through"
            }`}
            style={
              isEnabled
                ? { backgroundColor: `${color}33` }
                : undefined
            }
          >
            {SOURCE_ICONS[type]}
            <span>{label}</span>
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color, opacity: isEnabled ? 1 : 0.3 }}
            />
          </button>
        );
      })}
    </div>
  );
}
