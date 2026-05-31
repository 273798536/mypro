import { FileText } from 'lucide-react';
import type { StudentOrder } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface OrderCardProps {
  order: StudentOrder;
}

export default function OrderCard({ order }: OrderCardProps) {
  const fields = [
    { label: '订单编号', value: order.id },
    { label: '学员姓名', value: order.studentName },
    { label: '课程名称', value: order.courseName },
    { label: '订单金额', value: formatCurrency(order.orderAmount), isAmount: true },
    { label: '实付金额', value: formatCurrency(order.paidAmount), isAmount: true },
    { label: '支付方式', value: order.payMethod },
    { label: '下单日期', value: order.orderDate },
  ];

  return (
    <div className="rounded-lg shadow-sm bg-white border-l-4 border-l-[#d4943a]">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <FileText size={18} className="text-[#d4943a]" />
        <h3 className="text-base font-semibold text-[#1a2332]">订单信息</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 p-5">
        {fields.map((field) => (
          <div key={field.label}>
            <span className="text-xs text-gray-400">{field.label}</span>
            <p className={`text-sm mt-0.5 ${field.isAmount ? 'font-medium text-[#1a2332]' : 'text-[#1a2332]'}`}>
              {field.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
