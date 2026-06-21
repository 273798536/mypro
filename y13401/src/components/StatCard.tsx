import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
  color?: "default" | "empty" | "zero" | "duplicate" | "review" | "approved";
}

const colorStyles = {
  default: "text-ink-600 bg-ink-50",
  empty: "text-ink-500 bg-empty-50",
  zero: "text-amber-600 bg-zero-50",
  duplicate: "text-purple-600 bg-duplicate-50",
  review: "text-orange-600 bg-review-50",
  approved: "text-emerald-600 bg-approved-50",
};

export function StatCard({ icon, value, label, color = "default" }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-card border border-parchment-100 p-4 card-hover">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${colorStyles[color]}`}>
          {icon}
        </div>
        <div>
          <div className="font-serif-title text-2xl font-semibold text-ink-800">
            {value}
          </div>
          <div className="text-sm text-ink-500 mt-0.5">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
