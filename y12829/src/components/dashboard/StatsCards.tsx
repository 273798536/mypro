import { Beaker, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useSampleStore } from "@/store/useSampleStore";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { SampleStatus } from "@/types";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  valueColor: string;
  pendingBadge?: number;
  delay?: number;
}

function StatCard({
  title,
  value,
  icon,
  gradientFrom,
  gradientTo,
  iconBg,
  valueColor,
  pendingBadge,
  delay = 0,
}: StatCardProps) {
  const animated = useAnimatedNumber(value, 800);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300",
        "hover:shadow-card-hover hover:-translate-y-1 animate-fade-in-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn("h-1.5 w-full bg-gradient-to-r", gradientFrom, gradientTo)}
      />
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={cn(
                  "text-4xl font-bold tabular-nums tracking-tight animate-count-up",
                  valueColor
                )}
              >
                {Math.round(animated)}
              </span>
              {pendingBadge !== undefined && pendingBadge > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  <Clock className="h-3 w-3" />
                  待复核 {pendingBadge}
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              iconBg
            )}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

const StatsCards = () => {
  const samples = useSampleStore((s) => s.samples);

  const stats = useMemo(() => {
    const total = samples.length;
    const normal = samples.filter((s) => s.status === SampleStatus.NORMAL).length;
    const borderline = samples.filter((s) => s.status === SampleStatus.BORDERLINE).length;
    const abnormal = samples.filter((s) => s.status === SampleStatus.ABNORMAL).length;
    const pendingReview = samples.filter((s) => s.reviews.length === 0 || s.status === SampleStatus.BORDERLINE).length;
    return { total, normal, borderline, abnormal, pendingReview };
  }, [samples]);

  const cards: StatCardProps[] = [
    {
      title: "样本总数",
      value: stats.total,
      icon: <Beaker className="h-6 w-6 text-primary-600" />,
      gradientFrom: "from-primary-400",
      gradientTo: "to-primary-700",
      iconBg: "bg-primary-50",
      valueColor: "text-primary-900",
      delay: 0,
    },
    {
      title: "正常样本",
      value: stats.normal,
      icon: <CheckCircle2 className="h-6 w-6 text-lab-teal" />,
      gradientFrom: "from-teal-400",
      gradientTo: "to-teal-600",
      iconBg: "bg-teal-50",
      valueColor: "text-teal-700",
      delay: 80,
    },
    {
      title: "边界样本",
      value: stats.borderline,
      icon: <AlertTriangle className="h-6 w-6 text-lab-amber" />,
      gradientFrom: "from-amber-400",
      gradientTo: "to-amber-600",
      iconBg: "bg-amber-50",
      valueColor: "text-amber-700",
      pendingBadge: stats.pendingReview,
      delay: 160,
    },
    {
      title: "异常样本",
      value: stats.abnormal,
      icon: <XCircle className="h-6 w-6 text-lab-danger" />,
      gradientFrom: "from-red-400",
      gradientTo: "to-red-600",
      iconBg: "bg-red-50",
      valueColor: "text-red-700",
      delay: 240,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <StatCard key={i} {...c} />
      ))}
    </div>
  );
};

export default StatsCards;
