import { useState } from "react";
import { ChevronDown, ChevronRight, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  userName?: string;
  className?: string;
}

const months = [
  "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06",
  "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12",
];

export const Header: React.FC<HeaderProps> = ({
  breadcrumbs = [],
  selectedMonth = "2024-05",
  onMonthChange,
  userName = "管理员",
  className,
}) => {
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  const handleMonthSelect = (month: string) => {
    onMonthChange?.(month);
    setMonthDropdownOpen(false);
  };

  const formatMonthDisplay = (month: string) => {
    const [year, m] = month.split("-");
    return `${year}年${parseInt(m)}月`;
  };

  return (
    <header
      className={cn(
        "h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {breadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight size={14} className="text-neutral-400" />
            )}
            <span
              className={cn(
                "text-sm",
                index === breadcrumbs.length - 1
                  ? "text-neutral-900 font-medium"
                  : "text-neutral-500 hover:text-neutral-700 cursor-pointer"
              )}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
          >
            <Calendar size={16} className="text-neutral-500" />
            <span className="text-sm text-neutral-700">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <ChevronDown
              size={16}
              className={cn(
                "text-neutral-400 transition-transform",
                monthDropdownOpen && "rotate-180"
              )}
            />
          </button>

          {monthDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-card z-50 max-h-64 overflow-y-auto">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(month)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 transition-colors",
                    month === selectedMonth
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-700"
                  )}
                >
                  {formatMonthDisplay(month)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-4 border-l border-neutral-200">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <User size={16} className="text-primary-600" />
          </div>
          <span className="text-sm text-neutral-700">{userName}</span>
        </div>
      </div>
    </header>
  );
};
