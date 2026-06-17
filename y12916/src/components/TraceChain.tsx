import React from 'react';
import { TraceStep } from '../types';

const iconMap: Record<string, string> = {
  info: 'ℹ',
  warning: '⚠',
  danger: '✕',
  success: '✓',
};

interface Props {
  steps: TraceStep[];
  title?: string;
}

const TraceChain: React.FC<Props> = ({ steps, title = '样本溯源链路' }) => {
  return (
    <div className="trace-chain">
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--accent-blue)' }}>🔗</span>
        {title}
      </div>
      <div className="trace-steps">
        {steps.map((step) => (
          <div className="trace-step" key={step.stepNo}>
            <div className={`trace-step-icon ${step.type}`}>{iconMap[step.type]}</div>
            <div className="trace-step-content">
              <div className="trace-step-title">
                Step {step.stepNo}. {step.title}
              </div>
              <div className="trace-step-desc">{step.description}</div>
              {step.meta && step.meta.length > 0 && (
                <div className="trace-step-meta">
                  {step.meta.map((m, idx) => (
                    <span className="meta-tag" key={idx}>
                      <span style={{ color: 'var(--text-muted)' }}>{m.key}：</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{m.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TraceChain;
