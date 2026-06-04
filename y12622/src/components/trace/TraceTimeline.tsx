import React, { useState } from 'react';
import { TraceNode, TraceConnector } from './TraceNode';
import { GitBranch } from 'lucide-react';

interface TraceNodeData {
  id: string;
  type: 'equipment' | 'sourceImage' | 'processing' | 'anomaly' | 'opinion' | 'conclusion';
  title: string;
  icon: React.ElementType;
  data: any;
  time?: string;
  active?: boolean;
}

interface TraceTimelineProps {
  nodes: TraceNodeData[];
}

export function TraceTimeline({ nodes }: TraceTimelineProps) {
  const [activeNode, setActiveNode] = useState<string>(
    nodes.find((n) => n.active)?.id || nodes[0]?.id
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 font-serif">全链路追溯</h3>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        从异常标注出发，可反向追溯到处理记录、原始底图、关联设备，以及处理意见和复核结论。点击各节点查看详情。
      </p>

      <div className="flex items-center overflow-x-auto pb-4 scrollbar-thin">
        {nodes.map((node, index) => (
          <React.Fragment key={node.id}>
            <TraceNode
              type={node.type}
              data={node.data}
              isActive={activeNode === node.id}
              onClick={() => setActiveNode(node.id)}
              title={node.title}
              icon={node.icon}
              time={node.time}
            />
            {index < nodes.length - 1 && <TraceConnector />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
