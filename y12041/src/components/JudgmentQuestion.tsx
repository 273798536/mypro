import { Check, X } from 'lucide-react';

interface JudgmentQuestionProps {
  question: string;
  answer: boolean | null;
  onAnswer: (value: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
}

export function JudgmentQuestion({
  question,
  answer,
  onAnswer,
  trueLabel = '正确',
  falseLabel = '错误',
}: JudgmentQuestionProps) {
  return (
    <div>
      <p className="mb-3 font-medium">{question}</p>
      <div className="flex gap-3">
        <button
          onClick={() => onAnswer(true)}
          className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            answer === true
              ? 'bg-green-500 text-white'
              : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
          }`}
        >
          <Check className="w-4 h-4" />
          {trueLabel}
        </button>
        <button
          onClick={() => onAnswer(false)}
          className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            answer === false
              ? 'bg-red-500 text-white'
              : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
          }`}
        >
          <X className="w-4 h-4" />
          {falseLabel}
        </button>
      </div>
    </div>
  );
}
