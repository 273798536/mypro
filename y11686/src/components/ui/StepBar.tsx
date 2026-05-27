import { Plus, Play, Save, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store';

export function StepBar() {
  const { currentScenario, activeStepId, loadStep, addStep, updateStep, removeStep, saveCurrentSceneToStep } = useStore();
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  if (!currentScenario) return null;

  const handleAddStep = () => {
    const stepNumber = currentScenario.steps.length + 1;
    addStep({
      stepNumber,
      title: `步骤 ${stepNumber}`,
      description: '',
      sceneSnapshot: JSON.parse(JSON.stringify(currentScenario.scene)),
      isActive: false,
    });
  };

  const handleStartEdit = (step: any) => {
    setEditingStepId(step.id);
    setEditTitle(step.title);
    setEditDescription(step.description);
  };

  const handleSaveEdit = (stepId: string) => {
    updateStep(stepId, {
      title: editTitle,
      description: editDescription,
    });
    setEditingStepId(null);
  };

  const handleCancelEdit = () => {
    setEditingStepId(null);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-4xl">
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>题目步骤 ({currentScenario.steps.length})</span>
          <button
            className="btn btn-primary text-xs flex items-center gap-1"
            onClick={handleAddStep}
          >
            <Plus size={14} /> 添加步骤
          </button>
        </div>
        <div className="panel-content">
          {currentScenario.steps.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-4">
              还没有步骤，点击上方按钮添加第一个步骤
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {currentScenario.steps.map((step) => (
                <div
                  key={step.id}
                  className={`step-card flex-shrink-0 w-48 ${
                    activeStepId === step.id ? 'active' : ''
                  }`}
                >
                  {editingStepId === step.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        className="input-number text-sm"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="步骤标题"
                      />
                      <textarea
                        className="input-number text-sm h-16 resize-none"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="步骤说明"
                      />
                      <div className="flex gap-1">
                        <button
                          className="btn btn-primary text-xs flex-1 flex items-center justify-center gap-1"
                          onClick={() => handleSaveEdit(step.id)}
                        >
                          <Check size={12} /> 保存
                        </button>
                        <button
                          className="btn btn-secondary text-xs flex items-center justify-center"
                          onClick={handleCancelEdit}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium bg-primary-600 px-2 py-0.5 rounded">
                          步骤 {step.stepNumber}
                        </span>
                        <div className="flex gap-1">
                          <button
                            className="p-1 hover:bg-white/10 rounded"
                            onClick={() => loadStep(step.id)}
                            title="加载此步骤"
                          >
                            <Play size={12} />
                          </button>
                          <button
                            className="p-1 hover:bg-white/10 rounded"
                            onClick={() => saveCurrentSceneToStep(step.id)}
                            title="保存当前场景到此步骤"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            className="p-1 hover:bg-white/10 rounded"
                            onClick={() => handleStartEdit(step)}
                            title="编辑步骤"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="p-1 hover:bg-red-500/30 rounded text-red-400"
                            onClick={() => removeStep(step.id)}
                            title="删除步骤"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-sm font-medium mb-1">{step.title}</h4>
                      {step.description && (
                        <p className="text-xs text-white/60 line-clamp-2">
                          {step.description}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
