import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Edit3 } from 'lucide-react';
import { useValuationStore } from '@/store/valuationStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { dataSourceLabels } from '@/data/mockData';
import { Link } from 'react-router-dom';
import type { Valuation } from '@/types';

interface ValuationTableProps {
  onEdit?: (valuation: Valuation) => void;
}

export default function ValuationTable({ onEdit }: ValuationTableProps) {
  const getFilteredValuations = useValuationStore((state) => state.getFilteredValuations);
  const selectValuation = useValuationStore((state) => state.selectValuation);
  const data = getFilteredValuations();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columnHelper = createColumnHelper<Valuation>();

  const columns = useMemo(() => [
    columnHelper.accessor('projectName', {
      header: '项目名称',
      cell: (info) => (
        <div className="font-medium text-slate-800">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor('fundName', {
      header: '所属基金',
      cell: (info) => (
        <span className="text-slate-600">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('valuationDate', {
      header: '估值日期',
      cell: (info) => (
        <span className="text-slate-600">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('valuationMethod', {
      header: '估值方法',
      cell: (info) => (
        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-md">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('valuationAmount', {
      header: '估值金额',
      cell: (info) => (
        <div className="font-semibold text-primary-700">
          {formatCurrency(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor('sharePrice', {
      header: '每股价格',
      cell: (info) => (
        <span className="text-slate-600">¥{info.getValue()?.toFixed(2)}</span>
      ),
    }),
    columnHelper.accessor('dataSource', {
      header: '数据来源',
      cell: (info) => {
        const source = info.getValue();
        const colorClass = 
          source === 'ledger' ? 'bg-blue-50 text-blue-700' :
          source === 'model' ? 'bg-amber-50 text-amber-700' :
          'bg-purple-50 text-purple-700';
        return (
          <span className={`px-2 py-1 text-xs rounded-md ${colorClass}`}>
            {dataSourceLabels[source]}
          </span>
        );
      },
    }),
    columnHelper.accessor('version', {
      header: '版本',
      cell: (info) => (
        <span className="text-slate-500 text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('isManual', {
      header: '状态',
      cell: (info) => {
        const isManual = info.getValue();
        return isManual ? (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            人工修正
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            原始数据
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '操作',
      cell: (info) => (
        <Link
          to="/compare"
          onClick={() => {
            selectValuation(info.row.original.valuationId);
            onEdit?.(info.row.original);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="text-sm">对比修正</span>
        </Link>
      ),
    }),
  ], [columnHelper, selectValuation, onEdit]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const SortIcon = ({ column }: { column: any }) => {
    if (!column.getIsSorted()) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    return column.getIsSorted() === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
    );
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
        <div className="text-slate-400">
          <p className="text-lg">暂无符合筛选条件的数据</p>
          <p className="text-sm mt-2">请调整筛选条件或导入新数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${
                      header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-slate-100' : ''
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && <SortIcon column={header.column} />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-sm text-slate-500">
          共 <span className="font-medium text-slate-700">{data.length}</span> 条记录
        </p>
      </div>
    </div>
  );
}
