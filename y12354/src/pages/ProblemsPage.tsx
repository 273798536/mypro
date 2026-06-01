import { useState } from 'react';
import { Card, Tag, Button, List, Collapse, Badge, Divider, Modal, Empty } from 'antd';
import { AlertTriangle, FileQuestion, CheckCircle, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { detectProblems, generateId } from '../utils/diagnosis';
import type { Problem } from '../types';

const { Panel } = Collapse;

const problemTypeColors: Record<string, string> = {
  temperatureNotCorrected: 'orange',
  shadingMisjudgment: 'blue',
  serialNumberConfusion: 'purple',
};

const problemTypeNames: Record<string, string> = {
  temperatureNotCorrected: '温度未修正',
  shadingMisjudgment: '遮挡误判',
  serialNumberConfusion: '串号混淆',
};

export default function ProblemsPage() {
  const { problems, addProblem, updateProblem, diagnoses, curves, selectedProblem, setSelectedProblem } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);

  const handleDetectProblems = () => {
    diagnoses.forEach((diag) => {
      const curve = curves.find((c) => c.id === diag.curveId);
      if (curve) {
        const detected = detectProblems(diag, curve);
        detected.forEach((p) => {
          const existing = problems.find(
            (prob) => prob.diagnosisId === diag.id && prob.type === p.type
          );
          if (!existing) {
            const problem: Problem = {
              id: generateId(),
              type: p.type as Problem['type'],
              typeName: p.typeName,
              triggerSource: p.triggerSource,
              stuckPoint: p.stuckPoint,
              nextStep: p.nextStep,
              status: 'pending',
              diagnosisId: diag.id,
              createdAt: Date.now(),
            };
            addProblem(problem);
          }
        });
      }
    });
  };

  const handleResolve = (id: string) => {
    updateProblem(id, { status: 'resolved' });
  };

  const pendingCount = problems.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">问题追踪系统</h1>
        <Button type="primary" onClick={handleDetectProblems}>
          <AlertTriangle size={16} className="inline mr-2" />
          检测问题
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500">{pendingCount}</div>
            <div className="text-gray-500 mt-1">待处理问题</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">
              {problems.filter((p) => p.status === 'resolved').length}
            </div>
            <div className="text-gray-500 mt-1">已解决问题</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500">{problems.length}</div>
            <div className="text-gray-500 mt-1">问题总数</div>
          </div>
        </Card>
      </div>

      <Card title="问题列表">
        {problems.length === 0 ? (
          <Empty description="暂无问题，点击右上角按钮检测问题" />
        ) : (
          <List
            dataSource={problems}
            renderItem={(problem) => (
              <List.Item
                key={problem.id}
                onClick={() => {
                  setSelectedProblem(problem);
                  setModalOpen(true);
                }}
                className="cursor-pointer hover:bg-gray-50 rounded-lg px-4 mb-2 border"
              >
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge status={problem.status === 'pending' ? 'warning' : 'success'} />
                      <span className="font-medium">{problem.typeName}</span>
                      <Tag color={problemTypeColors[problem.type]}>
                        {problemTypeNames[problem.type]}
                      </Tag>
                    </div>
                    {problem.status === 'pending' ? (
                      <Button size="small" type="primary" onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(problem.id);
                      }}>
                        标记解决
                      </Button>
                    ) : (
                      <Tag color="green">已解决</Tag>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-2 ml-6">
                    <div className="flex items-center gap-2">
                      <FileQuestion size={14} className="text-gray-400" />
                      <span>触发源: {problem.triggerSource}</span>
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="问题详情"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={700}
        footer={
          selectedProblem?.status === 'pending' ? (
            <Button type="primary" onClick={() => {
              if (selectedProblem) {
                handleResolve(selectedProblem.id);
              }
              setModalOpen(false);
            }}>
              标记已解决
            </Button>
          ) : null
        }
      >
        {selectedProblem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {selectedProblem.status === 'pending' ? (
                <AlertTriangle size={24} className="text-orange-500" />
              ) : (
                <CheckCircle size={24} className="text-green-500" />
              )}
              <span className="text-xl font-semibold">{selectedProblem.typeName}</span>
              <Tag color={problemTypeColors[selectedProblem.type]}>
                {problemTypeNames[selectedProblem.type]}
              </Tag>
            </div>

            <Divider />

            <Collapse defaultActiveKey={['1', '2', '3']}>
              <Panel header="触发源" key="1">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-xs">1</span>
                  </div>
                  <div>
                    <div className="font-medium">哪份材料触发的？</div>
                    <div className="text-gray-600 mt-1">{selectedProblem.triggerSource}</div>
                  </div>
                </div>
              </Panel>
              <Panel header="卡点位置" key="2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-600 font-bold text-xs">2</span>
                  </div>
                  <div>
                    <div className="font-medium">卡在哪里？</div>
                    <div className="text-gray-600 mt-1">{selectedProblem.stuckPoint}</div>
                  </div>
                </div>
              </Panel>
              <Panel header="下一步" key="3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 font-bold text-xs">3</span>
                  </div>
                  <div>
                    <div className="font-medium">该补什么？</div>
                    <div className="text-gray-600 mt-1">{selectedProblem.nextStep}</div>
                  </div>
                </div>
              </Panel>
            </Collapse>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700">
                <div className="font-medium mb-2">问题处理流程:</div>
                <div className="flex items-center gap-2">
                  <span>检测到问题</span>
                  <ArrowRight size={16} className="text-blue-400" />
                  <span>查看卡点</span>
                  <ArrowRight size={16} className="text-blue-400" />
                  <span>补充材料</span>
                  <ArrowRight size={16} className="text-blue-400" />
                  <span>重新诊断</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
