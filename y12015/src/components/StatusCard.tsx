import { TrendingUp, TrendingDown } from "lucide-react";

interface StatusCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down";
  trendValue?: string;
}

export default function StatusCard({
  label,
  value,
  icon,
  trend,
  trendValue,
}: StatusCardProps) {
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm flex items-start gap-4">
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-display text-2xl text-primary font-bold truncate">
          {value}
        </p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 mt-1 text-xs ${
              trend === "up" ? "text-green-600" : "text-danger"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
