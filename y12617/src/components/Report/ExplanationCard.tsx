import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { MessageSquare, Copy, Check, FileText } from 'lucide-react';
import { copyToClipboard } from '../../utils/export';

interface ExplanationCardProps {
  explanation: string;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({ explanation }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(explanation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  };

  return (
    <Card className="border-l-4 border-l-primary-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary-50 p-2 rounded-lg">
            <MessageSquare className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-neutral-800">普通话解释</h3>
            <p className="text-sm text-neutral-500">可直接复制发给同事</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制文本
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div className="text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {explanation}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
