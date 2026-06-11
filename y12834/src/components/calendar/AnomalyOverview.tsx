import { useNavigate } from 'react-router-dom';
import { PackageAlert, Ruler, FileSearch } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

/**
 * 异常概览统计数据接口
 */
interface AnomalySummary {
  /** 待补材料数量 */
  missingMaterial: number;
  /** 待改口径数量 */
  incorrectSpec: number;
  /** 待复核数量 */
  pendingReview: number;
}

/**
 * 异常概览组件属性接口
 */
interface AnomalyOverviewProps {
  /** 异常统计汇总数据 */
  summary: AnomalySummary;
}

/**
 * 异常概览组件
 * 三张并排卡片展示不同类型异常数量，带轻微高度差和悬停上浮效果
 */
export function AnomalyOverview({ summary }: AnomalyOverviewProps) {
  const navigate = useNavigate();

  /** 卡片配置 */
  const cards = [
    {
      key: 'missingMaterial',
      title: '待补材料',
      count: summary.missingMaterial,
      description: '样本材料缺失，需补充上传',
      icon: <PackageAlert size={24} />,
      iconBg: 'bg-amber-warn/15',
      iconColor: 'text-amber-warn',
      buttonText: '查看详情',
      buttonVariant: 'warn' as const,
      offset: 'mt-0',
      onClick: () => navigate('/review?type=missing_material'),
    },
    {
      key: 'incorrectSpec',
      title: '待改口径',
      count: summary.incorrectSpec,
      description: '物种口径不规范，需人工确认',
      icon: <Ruler size={24} />,
      iconBg: 'bg-corral-severe/15',
      iconColor: 'text-corral-severe',
      buttonText: '查看详情',
      buttonVariant: 'danger' as const,
      offset: 'mt-2',
      onClick: () => navigate('/review?type=incorrect_spec'),
    },
    {
      key: 'pendingReview',
      title: '待复核',
      count: summary.pendingReview,
      description: 'AI 标注结果，等待质控复核',
      icon: <FileSearch size={24} />,
      iconBg: 'bg-deep-ocean/15',
      iconColor: 'text-deep-ocean',
      buttonText: '前往复核',
      buttonVariant: 'primary' as const,
      offset: 'mt-1',
      onClick: () => navigate('/review'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.key} className={card.offset}>
          <Card hoverable className="p-5 h-full flex flex-col">
            {/* 图标和数量 */}
            <div className="flex items-start justify-between mb-4">
              <div
                className={`p-3 rounded-xl ${card.iconBg} ${card.iconColor}`}
              >
                {card.icon}
              </div>
              <div className="text-right">
                <div className="text-3xl font-serif font-bold text-deep-ocean">
                  {card.count}
                </div>
                <div className="text-xs text-deep-ocean/50 mt-0.5">条记录</div>
              </div>
            </div>

            {/* 标题和描述 */}
            <div className="flex-1 mb-4">
              <h4 className="font-semibold text-deep-ocean mb-1">{card.title}</h4>
              <p className="text-sm text-deep-ocean/60">{card.description}</p>
            </div>

            {/* 操作按钮 */}
            <Button
              variant={card.buttonVariant}
              size="sm"
              onClick={card.onClick}
              className="w-full justify-center"
            >
              {card.buttonText}
            </Button>
          </Card>
        </div>
      ))}
    </div>
  );
}
