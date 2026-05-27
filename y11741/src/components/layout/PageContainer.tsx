import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageContainerProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  userName?: string;
  className?: string;
  contentClassName?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  breadcrumbs,
  selectedMonth,
  onMonthChange,
  userName,
  className,
  contentClassName,
}) => {
  return (
    <div className={cn("min-h-screen bg-neutral-50", className)}>
      <Sidebar />

      <div className="ml-[240px]">
        <Header
          breadcrumbs={breadcrumbs}
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          userName={userName}
        />

        <main className={cn("p-6", contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
};
