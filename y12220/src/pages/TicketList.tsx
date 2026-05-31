import { useEffect, useState, useMemo, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils/calculator';
import dayjs from 'dayjs';
import {
  Search,
  Plus,
  Calendar,
  User,
  FileText,
  Trash2,
  Edit,
  RefreshCw,
  X,
  Check,
  Plane,
  MoreHorizontal,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import Loading, { TableLoadingSkeleton } from '@/components/Loading';
import Empty from '@/components/Empty';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import type { TicketOrder, Segment } from '@/types';

interface TicketForm {
  orderNo: string;
  passengerName: string;
  passengerId: string;
  contactPhone: string;
  mileageUsed: string;
  segments: Omit<Segment, 'id' | 'ticketId'>[];
}

const initialForm: TicketForm = {
  orderNo: '',
  passengerName: '',
  passengerId: '',
  contactPhone: '',
  mileageUsed: '0',
  segments: [
    {
      flightNo: '',
      departureAirport: '',
      arrivalAirport: '',
      departureTime: '',
      arrivalTime: '',
      cabinClass: 'economy',
      cabinCode: 'Y',
      baseFare: 0,
      taxes: [],
      country: 'CN',
    },
  ],
};

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function TicketList() {
  const {
    tickets,
    isLoading,
    initialize,
    loadTickets,
    addTicket,
    updateTicket,
    deleteTicket,
    currentUser,
  } = useStore();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [searchPassenger, setSearchPassenger] = useState('');
  const [form, setForm] = useState<TicketForm>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      await initialize();
      await loadTickets();
      setTimeout(() => setIsPageLoading(false), 500);
    };
    init();
  }, [initialize, loadTickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (
        searchOrderNo &&
        !ticket.orderNo.toLowerCase().includes(searchOrderNo.toLowerCase())
      ) {
        return false;
      }
      if (
        searchPassenger &&
        !ticket.passengerName.toLowerCase().includes(searchPassenger.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tickets, searchOrderNo, searchPassenger]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTickets.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((prevId) => prevId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 条客票记录吗？`)) return;

    for (const id of selectedIds) {
      await deleteTicket(id);
    }
    setSelectedIds([]);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.orderNo.trim()) errors.orderNo = '请输入订单号';
    if (!form.passengerName.trim()) errors.passengerName = '请输入乘客姓名';
    if (!form.passengerId.trim()) errors.passengerId = '请输入证件号';
    if (!form.contactPhone.trim()) errors.contactPhone = '请输入联系电话';

    form.segments.forEach((seg, idx) => {
      if (!seg.flightNo.trim()) errors[`flightNo_${idx}`] = '请输入航班号';
      if (!seg.departureAirport.trim())
        errors[`departureAirport_${idx}`] = '请输入出发机场';
      if (!seg.arrivalAirport.trim())
        errors[`arrivalAirport_${idx}`] = '请输入到达机场';
      if (!seg.departureTime)
        errors[`departureTime_${idx}`] = '请输入出发时间';
      if (!seg.arrivalTime) errors[`arrivalTime_${idx}`] = '请输入到达时间';
      if (seg.baseFare <= 0) errors[`baseFare_${idx}`] = '请输入有效票价';
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSegment = () => {
    setForm((prev) => ({
      ...prev,
      segments: [
        ...prev.segments,
        {
          flightNo: '',
          departureAirport: '',
          arrivalAirport: '',
          departureTime: '',
          arrivalTime: '',
          cabinClass: 'economy',
          cabinCode: 'Y',
          baseFare: 0,
          taxes: [],
          country: 'CN',
        },
      ],
    }));
  };

  const handleRemoveSegment = (index: number) => {
    if (form.segments.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index),
    }));
  };

  const handleOpenEdit = (ticket: TicketOrder) => {
    setEditingTicket(ticket);
    setForm({
      orderNo: ticket.orderNo,
      passengerName: ticket.passengerName,
      passengerId: ticket.passengerId,
      contactPhone: ticket.contactPhone,
      mileageUsed: ticket.mileageUsed.toString(),
      segments: ticket.originalSegments.map((seg) => ({
        flightNo: seg.flightNo,
        departureAirport: seg.departureAirport,
        arrivalAirport: seg.arrivalAirport,
        departureTime: dayjs(seg.departureTime).format('YYYY-MM-DDTHH:mm'),
        arrivalTime: dayjs(seg.arrivalTime).format('YYYY-MM-DDTHH:mm'),
        cabinClass: seg.cabinClass,
        cabinCode: seg.cabinCode,
        baseFare: seg.baseFare,
        taxes: seg.taxes,
        country: seg.country,
      })),
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleSubmitAdd = async () => {
    if (!validateForm()) return;

    const totalFare = form.segments.reduce((sum, s) => sum + s.baseFare, 0);
    const totalTax = form.segments.reduce(
      (sum, s) => sum + s.taxes.reduce((ts, t) => ts + t.amount, 0),
      0
    );

    const segmentsWithId = form.segments.map((seg) => ({
      ...seg,
      id: crypto.randomUUID(),
      departureTime: dayjs(seg.departureTime).toISOString(),
      arrivalTime: dayjs(seg.arrivalTime).toISOString(),
    }));

    try {
      await addTicket({
        orderNo: form.orderNo.trim(),
        passengerName: form.passengerName.trim(),
        passengerId: form.passengerId.trim(),
        contactPhone: form.contactPhone.trim(),
        originalSegments: segmentsWithId as Segment[],
        mileageUsed: parseInt(form.mileageUsed) || 0,
        totalOriginalAmount: totalFare + totalTax,
        dataSource: {
          source: '手动录入',
          importedAt: new Date().toISOString(),
          importedBy: currentUser?.name || 'system',
        },
      });
      setShowAddModal(false);
      setForm(initialForm);
      setFormErrors({});
    } catch (error) {
      console.error('Failed to add ticket:', error);
    }
  };

  const handleSubmitEdit = async () => {
    if (!editingTicket || !validateForm()) return;

    const totalFare = form.segments.reduce((sum, s) => sum + s.baseFare, 0);
    const totalTax = form.segments.reduce(
      (sum, s) => sum + s.taxes.reduce((ts, t) => ts + t.amount, 0),
      0
    );

    const segmentsWithId = form.segments.map((seg, idx) => ({
      ...seg,
      id: editingTicket.originalSegments[idx]?.id || crypto.randomUUID(),
      departureTime: dayjs(seg.departureTime).toISOString(),
      arrivalTime: dayjs(seg.arrivalTime).toISOString(),
    }));

    try {
      await updateTicket(editingTicket.id, {
        orderNo: form.orderNo.trim(),
        passengerName: form.passengerName.trim(),
        passengerId: form.passengerId.trim(),
        contactPhone: form.contactPhone.trim(),
        originalSegments: segmentsWithId as Segment[],
        mileageUsed: parseInt(form.mileageUsed) || 0,
        totalOriginalAmount: totalFare + totalTax,
      });
      setShowEditModal(false);
      setEditingTicket(null);
      setForm(initialForm);
      setFormErrors({});
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('文件内容为空或格式不正确');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const success: string[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        try {
          const orderNo = values[headers.indexOf('订单号')] || values[0];
          const passengerName = values[headers.indexOf('乘客姓名')] || values[1];
          const passengerId = values[headers.indexOf('证件号')] || values[2];
          const contactPhone = values[headers.indexOf('联系电话')] || values[3];
          const flightNo = values[headers.indexOf('航班号')] || values[4];
          const departureAirport = values[headers.indexOf('出发机场')] || values[5];
          const arrivalAirport = values[headers.indexOf('到达机场')] || values[6];
          const baseFare = parseFloat(values[headers.indexOf('票价')] || values[7] || '0');

          if (!orderNo || !passengerName) {
            throw new Error(`第 ${i + 1} 行：订单号和乘客姓名不能为空`);
          }

          const segment: Segment = {
            id: crypto.randomUUID(),
            flightNo,
            departureAirport,
            arrivalAirport,
            departureTime: dayjs().toISOString(),
            arrivalTime: dayjs().add(2, 'hour').toISOString(),
            cabinClass: 'economy',
            cabinCode: 'Y',
            baseFare,
            taxes: [],
            country: 'CN',
          };

          await addTicket({
            orderNo,
            passengerName,
            passengerId: passengerId || '',
            contactPhone: contactPhone || '',
            originalSegments: [segment],
            mileageUsed: 0,
            totalOriginalAmount: baseFare,
            dataSource: {
              source: '批量导入',
              file: file.name,
              importedAt: new Date().toISOString(),
              importedBy: currentUser?.name || 'system',
            },
          });

          success.push(orderNo);
        } catch (err: any) {
          errors.push(err.message || `第 ${i + 1} 行：导入失败`);
        }
      }

      setImportResult({
        success: success.length,
        failed: errors.length,
        errors,
      });
    } catch (error: any) {
      setImportResult({
        success: 0,
        failed: 1,
        errors: [error.message || '导入失败，请检查文件格式'],
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const headers = ['订单号', '乘客姓名', '证件号', '联系电话', '航班号', '出发机场', '到达机场', '票价'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '客票导入模板.csv';
    link.click();
  };

  const resetFilters = () => {
    setSearchOrderNo('');
    setSearchPassenger('');
  };

  const resetForm = () => {
    setForm(initialForm);
    setFormErrors({});
    setEditingTicket(null);
  };

  if (isPageLoading || isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary-800">客票列表</h1>
        </div>
        <TableLoadingSkeleton rows={8} columns={5} />
      </div>
    );
  }

  const renderFormModal = (
    isOpen: boolean,
    onClose: () => void,
    title: string,
    onSubmit: () => void
  ) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">
              订单号 <span className="text-accent-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.orderNo}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, orderNo: e.target.value }))
              }
              placeholder="请输入订单号"
              className={cn(
                'w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                formErrors.orderNo
                  ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500 focus:border-accent-red-500'
                  : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
              )}
            />
            {formErrors.orderNo && (
              <p className="mt-1 text-xs text-accent-red-500">
                {formErrors.orderNo}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">
              联系电话 <span className="text-accent-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contactPhone: e.target.value,
                }))
              }
              placeholder="请输入联系电话"
              className={cn(
                'w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                formErrors.contactPhone
                  ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500 focus:border-accent-red-500'
                  : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
              )}
            />
            {formErrors.contactPhone && (
              <p className="mt-1 text-xs text-accent-red-500">
                {formErrors.contactPhone}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">
              乘客姓名 <span className="text-accent-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.passengerName}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  passengerName: e.target.value,
                }))
              }
              placeholder="请输入乘客姓名"
              className={cn(
                'w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                formErrors.passengerName
                  ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500 focus:border-accent-red-500'
                  : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
              )}
            />
            {formErrors.passengerName && (
              <p className="mt-1 text-xs text-accent-red-500">
                {formErrors.passengerName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">
              证件号 <span className="text-accent-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.passengerId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  passengerId: e.target.value,
                }))
              }
              placeholder="请输入证件号"
              className={cn(
                'w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                formErrors.passengerId
                  ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500 focus:border-accent-red-500'
                  : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
              )}
            />
            {formErrors.passengerId && (
              <p className="mt-1 text-xs text-accent-red-500">
                {formErrors.passengerId}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">
              使用里程
            </label>
            <input
              type="number"
              value={form.mileageUsed}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  mileageUsed: e.target.value,
                }))
              }
              placeholder="0"
              className="w-full px-3 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="border-t border-primary-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary-800">
              航段信息
            </h3>
            <button
              onClick={handleAddSegment}
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加航段
            </button>
          </div>

          <div className="space-y-4">
            {form.segments.map((segment, segIndex) => (
              <div
                key={segIndex}
                className="p-4 bg-primary-50 rounded-xl border border-primary-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-primary-700">
                    第 {segIndex + 1} 航段
                  </span>
                  {form.segments.length > 1 && (
                    <button
                      onClick={() => handleRemoveSegment(segIndex)}
                      className="text-xs text-accent-red-500 hover:text-accent-red-700 transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      航班号 <span className="text-accent-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={segment.flightNo}
                      onChange={(e) => {
                        const newSegments = [...form.segments];
                        newSegments[segIndex].flightNo = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          segments: newSegments,
                        }));
                      }}
                      placeholder="如：CA1234"
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm',
                        formErrors[`flightNo_${segIndex}`]
                          ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                          : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      出发机场 <span className="text-accent-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={segment.departureAirport}
                      onChange={(e) => {
                        const newSegments = [...form.segments];
                        newSegments[segIndex].departureAirport = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          segments: newSegments,
                        }));
                      }}
                      placeholder="如：PEK"
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm',
                        formErrors[`departureAirport_${segIndex}`]
                          ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                          : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      到达机场 <span className="text-accent-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={segment.arrivalAirport}
                      onChange={(e) => {
                        const newSegments = [...form.segments];
                        newSegments[segIndex].arrivalAirport = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          segments: newSegments,
                        }));
                      }}
                      placeholder="如：SHA"
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm',
                        formErrors[`arrivalAirport_${segIndex}`]
                          ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                          : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      出发时间 <span className="text-accent-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={segment.departureTime}
                      onChange={(e) => {
                        const newSegments = [...form.segments];
                        newSegments[segIndex].departureTime = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          segments: newSegments,
                        }));
                      }}
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm',
                        formErrors[`departureTime_${segIndex}`]
                          ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                          : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      到达时间 <span className="text-accent-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={segment.arrivalTime}
                      onChange={(e) => {
                        const newSegments = [...form.segments];
                        newSegments[segIndex].arrivalTime = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          segments: newSegments,
                        }));
                      }}
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm',
                        formErrors[`arrivalTime_${segIndex}`]
                          ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                          : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      舱位等级
                    </label>
                    <select
                      value={segment.cabinClass}
                      onChange={(e) => {
                        const newSegments = [...form.segments];
                        newSegments[segIndex].cabinClass = e.target.value as any;
                        setForm((prev) => ({
                          ...prev,
                          segments: newSegments,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                    >
                      <option value="economy">经济舱</option>
                      <option value="premium_economy">超级经济舱</option>
                      <option value="business">商务舱</option>
                      <option value="first">头等舱</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      票面价格 <span className="text-accent-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={segment.baseFare}
                      onChange={(e) => {
                        const newSegments = [...form.segments];
                        newSegments[segIndex].baseFare = parseFloat(
                          e.target.value || '0'
                        );
                        setForm((prev) => ({
                          ...prev,
                          segments: newSegments,
                        }));
                      }}
                      placeholder="0.00"
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm',
                        formErrors[`baseFare_${segIndex}`]
                          ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                          : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      国家
                    </label>
                    <select
                      value={segment.country}
                      onChange={(e) => {
                        const newSegments = [...form.segments];
                        newSegments[segIndex].country = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          segments: newSegments,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                    >
                      <option value="CN">中国 (CN)</option>
                      <option value="JP">日本 (JP)</option>
                      <option value="US">美国 (US)</option>
                      <option value="SG">新加坡 (SG)</option>
                      <option value="HK">香港 (HK)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary-100 bg-primary-50">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-medium text-primary-600 hover:bg-white rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={onSubmit}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
        >
          <Check className="w-4 h-4" />
          确认保存
        </button>
      </div>
    </Modal>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">客票列表</h1>
          <p className="text-sm text-primary-500 mt-1">
            管理所有客票订单信息
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            下载模板
          </button>
          <button
            onClick={() => {
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm"
          >
            <Upload className="w-4 h-4" />
            批量导入
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium text-sm"
          >
            <Plus className="w-5 h-5" />
            新增客票
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-primary-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
            <input
              type="text"
              placeholder="订单号"
              value={searchOrderNo}
              onChange={(e) => setSearchOrderNo(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
            <input
              type="text"
              placeholder="乘客姓名"
              value={searchPassenger}
              onChange={(e) => setSearchPassenger(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
            >
              <RefreshCw className="w-4 h-4" />
              重置筛选
            </button>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <span className="text-sm text-primary-700">
            已选择 <span className="font-semibold">{selectedIds.length}</span> 项
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm text-primary-600 hover:bg-white rounded-md transition-colors"
            >
              取消选择
            </button>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-red-600 hover:bg-accent-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
        {filteredTickets.length === 0 ? (
          <Empty
            title="暂无客票记录"
            description="当前没有符合条件的客票数据，点击右上角按钮新增客票"
            icon={<FileText className="w-12 h-12" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-50 border-b border-primary-100">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === filteredTickets.length &&
                        filteredTickets.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-primary-300 rounded focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    订单号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    乘客信息
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    航线
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    航段数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    票面金额
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={cn(
                      'hover:bg-primary-50 transition-colors',
                      selectedIds.includes(ticket.id) && 'bg-primary-50'
                    )}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ticket.id)}
                        onChange={(e) =>
                          handleSelect(ticket.id, e.target.checked)
                        }
                        className="w-4 h-4 text-primary-600 border-primary-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-primary-800">
                        {ticket.orderNo}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-primary-800 font-medium">
                          {ticket.passengerName}
                        </p>
                        <p className="text-xs text-primary-500">
                          {ticket.passengerId}
                        </p>
                        <p className="text-xs text-primary-400">
                          {ticket.contactPhone}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-sm text-primary-700">
                        {ticket.originalSegments[0]?.departureAirport}
                        <Plane className="w-3 h-3 text-primary-400" />
                        {ticket.originalSegments[ticket.originalSegments.length - 1]?.arrivalAirport}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        {ticket.originalSegments.length} 段
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-primary-800">
                        {formatCurrency(ticket.totalOriginalAmount)}
                      </span>
                      {ticket.mileageUsed > 0 && (
                        <p className="text-xs text-accent-amber-600">
                          含里程 {ticket.mileageUsed.toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-primary-600">
                      {dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(ticket)}
                          className="p-1.5 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定要删除该客票吗？')) {
                              deleteTicket(ticket.id);
                            }
                          }}
                          className="p-1.5 text-accent-red-500 hover:text-accent-red-700 hover:bg-accent-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {renderFormModal(
        showAddModal,
        () => {
          setShowAddModal(false);
          resetForm();
        },
        '新增客票',
        handleSubmitAdd
      )}

      {renderFormModal(
        showEditModal,
        () => {
          setShowEditModal(false);
          resetForm();
        },
        '编辑客票',
        handleSubmitEdit
      )}

      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportResult(null);
        }}
        title="批量导入客票"
        size="lg"
      >
        <div className="p-6">
          {!importResult ? (
            <>
              <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary-800 mb-1">
                      导入说明
                    </p>
                    <ul className="text-xs text-primary-600 space-y-1">
                      <li>• 请先下载模板，按照模板格式填写客票信息</li>
                      <li>• 支持 CSV 格式文件</li>
                      <li>• 订单号和乘客姓名为必填项</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                  isImporting
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-primary-200 hover:border-primary-400 hover:bg-primary-50'
                )}
                onClick={() => !isImporting && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {isImporting ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-primary-600">正在导入...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-primary-600" />
                    </div>
                    <p className="text-sm font-medium text-primary-800 mb-1">
                      点击上传或拖拽文件到此处
                    </p>
                    <p className="text-xs text-primary-500">
                      支持 CSV 格式
                    </p>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div
                className={cn(
                  'w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center',
                  importResult.failed === 0
                    ? 'bg-accent-green-100'
                    : 'bg-accent-amber-100'
                )}
              >
                {importResult.failed === 0 ? (
                  <Check className="w-10 h-10 text-accent-green-600" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-accent-amber-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-primary-800 mb-2">
                导入完成
              </h3>
              <div className="flex justify-center gap-8 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-green-600">
                    {importResult.success}
                  </p>
                  <p className="text-xs text-primary-500">成功</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-red-600">
                    {importResult.failed}
                  </p>
                  <p className="text-xs text-primary-500">失败</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-4 p-4 bg-accent-red-50 rounded-lg text-left max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-accent-red-700 mb-2">
                    错误详情：
                  </p>
                  <ul className="text-xs text-accent-red-600 space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary-100 bg-primary-50">
          {importResult ? (
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportResult(null);
              }}
              className="px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
            >
              完成
            </button>
          ) : (
            <>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-white transition-colors font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                下载模板
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-primary-600 hover:bg-white rounded-lg transition-colors"
              >
                取消
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
