import { BookOpen, CheckCircle, AlertTriangle, Tag, FileText } from 'lucide-react';
import type { SpeciesSynonymCheck } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

/**
 * 物种名同义解释卡片属性接口
 */
interface SpeciesSynonymCardProps {
  /** 物种同义校验数据 */
  check: SpeciesSynonymCheck;
  /** 解决/确认回调 */
  onResolve: (id: string) => void;
}

/**
 * 物种名同义解释卡片组件
 * 学术感设计：标准名大号衬线字体、别名标签列表、引用块样式说明
 */
export function SpeciesSynonymCard({ check, onResolve }: SpeciesSynonymCardProps) {
  return (
    <Card className={`overflow-hidden ${check.resolved ? 'opacity-75' : ''}`}>
      <div className="p-5 space-y-4">
        {/* 头部：标准名 + 状态 */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-life-green/10 rounded-lg flex-shrink-0">
              <BookOpen size={20} className="text-life-green" />
            </div>
            <div>
              {/* 标准名：大号衬线字体 */}
              <h3 className="font-serif font-bold text-deep-ocean text-2xl tracking-wide">
                {check.standard_name}
              </h3>
              {/* 词典版本号 */}
              <div className="flex items-center gap-2 mt-1">
                <Tag size={12} className="text-deep-ocean/40" />
                <span className="text-xs text-deep-ocean/50 font-mono">
                  词典版本 {check.dictionary_version}
                </span>
              </div>
            </div>
          </div>

          {/* 状态徽章 */}
          {check.resolved ? (
            <Badge variant="success">
              <span className="flex items-center gap-1">
                <CheckCircle size={12} />
                已确认
              </span>
            </Badge>
          ) : (
            <Badge variant="warn">
              <span className="flex items-center gap-1">
                <AlertTriangle size={12} />
                待确认
              </span>
            </Badge>
          )}
        </div>

        {/* 输入别名标签列表 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-deep-ocean/60">
            <FileText size={12} />
            输入名称 / 别名
          </div>
          <div className="flex flex-wrap gap-2">
            {/* 用户输入的原始名称（高亮） */}
            <Badge variant="danger" className="px-3 py-1">
              {check.input_name}
            </Badge>
            {/* 该标准名对应的所有别名 */}
            {check.synonyms
              .filter((s) => s !== check.input_name)
              .slice(0, 6)
              .map((synonym) => (
                <Badge
                  key={synonym}
                  variant="neutral"
                  className="px-3 py-1"
                >
                  {synonym}
                </Badge>
              ))}
            {check.synonyms.filter((s) => s !== check.input_name).length > 6 && (
              <Badge variant="neutral" className="px-3 py-1">
                +{check.synonyms.filter((s) => s !== check.input_name).length - 6}
              </Badge>
            )}
          </div>
        </div>

        {/* 拦截原因：引用块样式（左边框深色） */}
        {check.reason_blocked && (
          <div className="border-l-4 border-deep-ocean pl-4 py-2 bg-paper-dark/50 rounded-r-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="text-deep-ocean mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-xs font-semibold text-deep-ocean mb-1">
                  质控组关注说明
                </p>
                <p className="text-sm text-deep-ocean/70 leading-relaxed font-serif italic">
                  "{check.reason_blocked}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {!check.resolved && (
          <div className="flex items-center justify-end pt-2 border-t border-deep-ocean/5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onResolve(check.id)}
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} />
                确认标准名
              </span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
