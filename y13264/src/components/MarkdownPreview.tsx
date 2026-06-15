import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={cn(
      'prose prose-slate max-w-none',
      'prose-headings:font-semibold',
      'prose-h1:text-2xl prose-h1:text-slate-800 prose-h1:border-b prose-h1:pb-3',
      'prose-h2:text-xl prose-h2:text-slate-700 prose-h2:mt-8',
      'prose-h3:text-lg prose-h3:text-slate-700',
      'prose-h4:text-base prose-h4:text-slate-600',
      'prose-p:text-slate-600 prose-p:leading-relaxed',
      'prose-table:w-full prose-table:border-collapse',
      'prose-th:bg-slate-100 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:text-sm prose-th:text-slate-600 prose-th:border prose-th:border-slate-200',
      'prose-td:px-4 prose-td:py-2 prose-td:text-sm prose-td:text-slate-600 prose-td:border prose-td:border-slate-200',
      'prose-ul:text-slate-600 prose-ul:space-y-1',
      'prose-li:text-slate-600',
      'prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg',
      'prose-blockquote:text-slate-600',
      'prose-hr:border-slate-200 prose-hr:my-6',
      className
    )}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
