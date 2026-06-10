import { CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { StudentSampleView } from '@/types';
import { cn } from '@/lib/utils';

interface StudentStatusCardProps {
  view: StudentSampleView;
}

const iconMap: Record<string, React.ReactNode> = {
  check: <CheckCircle2 className="h-12 w-12" />,
  clock: <Clock className="h-12 w-12" />,
  alert: <AlertCircle className="h-12 w-12" />,
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  green: {
    bg: 'bg-quality-green/10',
    text: 'text-quality-green',
    border: 'border-quality-green/30',
  },
  yellow: {
    bg: 'bg-quality-yellow/10',
    text: 'text-quality-yellow',
    border: 'border-quality-yellow/30',
  },
  red: {
    bg: 'bg-quality-red/10',
    text: 'text-quality-red',
    border: 'border-quality-red/30',
  },
};

const stepIcon = {
  completed: <CheckCircle2 className="h-5 w-5 text-quality-green" />,
  current: <Clock className="h-5 w-5 text-quality-yellow animate-pulse" />,
  pending: <div className="h-5 w-5 rounded-full border-2 border-gray-300" />,
};

export default function StudentStatusCard({ view }: StudentStatusCardProps) {
  const colors = colorMap[view.statusInfo.color] || colorMap.green;
  const statusIcon = iconMap[view.statusInfo.icon] || iconMap.check;

  return (
    <div className={cn('rounded-2xl border p-6', colors.bg, colors.border)}>
      <div className="flex items-start gap-4">
        <div className={cn('flex h-20 w-20 items-center justify-center rounded-xl bg-white', colors.text)}>
          {statusIcon}
        </div>
        <div className="flex-1">
          <h3 className={cn('text-xl font-bold', colors.text)}>{view.statusInfo.title}</h3>
          <p className="mt-1 text-gray-600">{view.statusInfo.description}</p>
          <div className="mt-3 flex items-center gap-3">
            {view.canUseDirectly && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-quality-green">
                可直接使用
              </span>
            )}
            {view.needsReview && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-quality-yellow">
                需要审核
              </span>
            )}
          </div>
        </div>
      </div>

      {view.reviewNotes.length > 0 && (
        <div className="mt-5 rounded-xl bg-white p-4">
          <h4 className="text-sm font-medium text-gray-700">审核备注：</h4>
          <ul className="mt-2 space-y-1">
            {view.reviewNotes.map((note, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.learningPath.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-medium text-gray-700">学习路径：</h4>
          <div className="mt-3 space-y-3">
            {view.learningPath.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl p-3',
                  step.status === 'current' ? 'bg-white shadow-sm' : 'bg-white/50'
                )}
              >
                {stepIcon[step.status]}
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      step.status === 'completed'
                        ? 'text-gray-500'
                        : step.status === 'current'
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {step.status === 'current' && (
                  <ChevronRight className="h-5 w-5 text-primary-500" />
                )}
                {index < view.learningPath.length - 1 && (
                  <div className="absolute left-8 top-10 h-4 w-0.5 bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
