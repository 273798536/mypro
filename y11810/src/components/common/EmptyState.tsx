import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = <Inbox className="h-12 w-12 text-gray-300" />,
  title = "暂无数据",
  description = "当前没有任何数据，请添加数据后重试",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <p className="mb-1 text-[16px] font-medium text-gray-700">{title}</p>
      <p className="mb-4 text-[13px] text-gray-500">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
