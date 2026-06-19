import React from 'react';
import type { CallChainNode } from '@/types';
import { Section } from '@/components/ui/Section';
import { Tag } from '@/components/ui/Tag';
import { ChevronRight, Globe, Server, Database, Cpu, Radio, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
  formatDateTime,
  formatDuration,
} from '@/utils/format';

const serviceIconMap = {
  gateway: <Globe className="w-4 h-4" />,
  api: <Server className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  cache: <Cpu className="w-4 h-4" />,
  mq: <Radio className="w-4 h-4" />,
};

const serviceToneMap = {
  gateway: 'primary',
  api: 'violet',
  database: 'amber',
  cache: 'emerald',
  mq: 'sky',
};

const statusIconMap = {
  success: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
  error: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
  timeout: <Clock className="w-3.5 h-3.5 text-amber-600" />,
};

interface CodeBlockProps {
  title: string;
  code: string;
  lang?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ title, code, lang = 'json' }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-medium text-gray-700 font-mono">{title}</span>
          <Tag tone="gray">{lang}</Tag>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">{code.length.toLocaleString()} chars</span>
      </button>
      {open && (
        <div className="code-block rounded-none">
          <pre>
            <code className={`language-${lang}`}>
              {code}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

interface SourceTracePanelProps {
  nodes: CallChainNode[];
  eventId: string;
  eventTime: string;
}

export const SourceTracePanel: React.FC<SourceTracePanelProps> = ({ nodes, eventId, eventTime }) => {
  const totalDuration = nodes.reduce((acc, n) => acc + n.durationMs, 0);

  return (
    <Section
      tone="default"
      title={
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary-600" />
          <span>来源追溯 · 调用链路</span>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-mono">Event ID: {eventId}</span>
          <span>·</span>
          <span>{formatDateTime(eventTime)}</span>
          <span>·</span>
          <span>{nodes.length} 个节点</span>
          <span>·</span>
          <span className="font-mono">总耗时 {formatDuration(totalDuration)}</span>
        </div>
      }
    >
      <div className="space-y-3">
        {nodes.map((node, idx) => (
          <div key={node.id} className="relative pl-8 timeline-node">
            <div
              className={[
                'absolute left-0 top-1 w-6 h-6 flex items-center justify-center border-2 rounded-none',
                node.status === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-600'
                  : node.status === 'timeout'
                  ? 'bg-amber-50 border-amber-300 text-amber-600'
                  : 'bg-white border-gray-300 text-gray-700',
              ].join(' ')}
            >
              {serviceIconMap[node.serviceType]}
            </div>

            <div className="border border-gray-200 hover:border-primary-300 transition-colors">
              <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50/60">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Tag tone={serviceToneMap[node.serviceType] as any}>
                    <span className="uppercase text-[10px] mr-1 font-mono">
                      {node.serviceType}
                    </span>
                  </Tag>
                  <span className="text-sm font-semibold text-gray-800 font-mono">
                    {node.serviceName}
                  </span>
                  <span className="text-gray-300">#{idx + 1}</span>
                  {statusIconMap[node.status]}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-[11px] font-mono">
                  <span className="text-gray-500">
                    {formatDateTime(node.timestamp).split(' ')[1]}
                  </span>
                  <span
                    className={[
                      'font-bold',
                      node.durationMs > 1000
                        ? 'text-rose-600'
                        : node.durationMs > 300
                        ? 'text-amber-600'
                        : 'text-gray-700',
                    ].join(' ')}
                  >
                    {formatDuration(node.durationMs)}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {node.requestBody && (
                  <CodeBlock title="Request Body" code={node.requestBody} lang={node.serviceType === 'database' ? 'sql' : 'json'} />
                )}
                {node.responseBody && (
                  <CodeBlock title="Response Body" code={node.responseBody} lang="json" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};
