import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pill, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  User,
  FileText,
  Package,
  Scale,
  Shield,
  Calendar,
  Home,
  HelpCircle
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getLevelById } from '../data/levels';
import { DrugInfo } from '../types';

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { 
    currentSession, 
    selectDrug, 
    confirmUnit, 
    checkContraindication, 
    selectBatch, 
    completeStep,
    endGame 
  } = useGameStore();
  
  const level = levelId ? getLevelById(levelId) : undefined;
  const [timeLeft, setTimeLeft] = useState(level?.timeLimit || 180);
  const [selectedDrug, setSelectedDrug] = useState<DrugInfo | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [checkedContraindications, setCheckedContraindications] = useState<string[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [showError, setShowError] = useState<{ message: string; lineNumber: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = currentSession?.currentStep || 0;
  const currentPrescription = level?.prescriptions[currentStep];
  const totalSteps = level?.prescriptions.length || 0;

  useEffect(() => {
    if (!level) return;
    
    setTimeLeft(level.timeLimit);
    setSelectedDrug(null);
    setSelectedUnit('');
    setCheckedContraindications([]);
    setSelectedBatchId('');
  }, [levelId]);

  useEffect(() => {
    if (currentSession?.status !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          endGame('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentSession?.status]);

  useEffect(() => {
    if (currentSession?.status === 'completed' || currentSession?.status === 'timeout') {
      navigate(`/report/${currentSession.id}`);
    }
  }, [currentSession?.status]);

  const handleDragStart = (e: React.DragEvent, drug: DrugInfo) => {
    e.dataTransfer.setData('drugId', drug.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const drugId = e.dataTransfer.getData('drugId');
    const drug = level?.availableDrugs.find(d => d.id === drugId);
    
    if (drug && currentPrescription) {
      handleDrugSelect(drug);
    }
  };

  const handleDrugSelect = (drug: DrugInfo) => {
    if (!currentPrescription || !level) return;

    const isCorrectDrug = drug.code === currentPrescription.drugCode;
    const hasContraindication = drug.contraindications.some(c => 
      level.patientInfo.allergies.some(a => c.includes(a)) ||
      level.patientInfo.conditions.some(con => c.includes(con))
    );

    if (!isCorrectDrug) {
      setShowError({
        message: `选择的药品"${drug.name}"与处方第${currentPrescription.lineNumber}行"${currentPrescription.drugName}"不匹配`,
        lineNumber: currentPrescription.lineNumber
      });
    } else if (hasContraindication) {
      const contraindication = drug.contraindications.find(c => 
        level.patientInfo.allergies.some(a => c.includes(a)) ||
        level.patientInfo.conditions.some(con => c.includes(con))
      );
      setShowError({
        message: `药品"${drug.name}"与患者${contraindication}存在禁忌`,
        lineNumber: currentPrescription.lineNumber
      });
    }

    setSelectedDrug(drug);
    selectDrug(drug.id);
  };

  const handleUnitSelect = (unit: string) => {
    setSelectedUnit(unit);
    confirmUnit(unit);
  };

  const handleContraindicationCheck = (drugId: string, checked: boolean) => {
    const newChecked = checked 
      ? [...checkedContraindications, drugId]
      : checkedContraindications.filter(id => id !== drugId);
    setCheckedContraindications(newChecked);
    checkContraindication(drugId, checked);
  };

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    selectBatch(batchId);
    
    const batch = selectedDrug?.batchNumbers.find(b => b.id === batchId);
    if (batch?.isExpired) {
      setShowError({
        message: `批号"${batch.number}"已过期（有效期至${batch.expiryDate}）`,
        lineNumber: currentPrescription?.lineNumber || 0
      });
    }
  };

  const handleNextStep = () => {
    if (!selectedDrug || !selectedUnit || !selectedBatchId) {
      return;
    }
    
    setShowError(null);
    setSelectedDrug(null);
    setSelectedUnit('');
    setCheckedContraindications([]);
    setSelectedBatchId('');
    completeStep();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const scorePercentage = currentSession 
    ? Math.max(0, Math.min(100, (currentSession.totalScore / currentSession.maxScore) * 100))
    : 0;

  if (!level || !currentPrescription) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-alert-warning" />
          <p className="text-xl">关卡不存在</p>
          <button onClick={() => navigate('/')} className="mt-4 btn-primary">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg to-dark-card text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card rounded-lg hover:bg-dark-border transition-colors"
          >
            <Home className="w-5 h-5" />
            返回
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold">{level.name}</h1>
            <p className="text-gray-400 text-sm">
              第 {currentStep + 1} / {totalSteps} 步
            </p>
          </div>

          <div className={`flex items-center gap-4 ${timeLeft < 30 ? 'text-alert-danger animate-pulse-danger' : ''}`}>
            <div className="flex items-center gap-2 bg-dark-card px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="text-xl font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>得分: {currentSession?.totalScore || 0} / {currentSession?.maxScore || 0}</span>
            <span>错误: {currentSession?.errors.length || 0}</span>
          </div>
          <div className="h-3 bg-dark-card rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-medical-primary to-medical-light"
              initial={{ width: 0 }}
              animate={{ width: `${scorePercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-medical-light" />
                处方信息
              </h2>

              <div className="bg-white rounded-xl p-4 text-gray-800">
                <div className="border-b pb-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">XX医院处方笺</h3>
                      <p className="text-sm text-gray-500">处方号: RX-{currentSession?.id.slice(-8)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>开具日期: {new Date().toLocaleDateString('zh-CN')}</p>
                      <p>科室: 内科</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-8 mb-4 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">患者:</span>
                    <span>{level.patientInfo.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">年龄:</span>
                    <span> {level.patientInfo.age}岁</span>
                  </div>
                  <div>
                    <span className="font-medium">性别:</span>
                    <span> {level.patientInfo.gender}</span>
                  </div>
                </div>

                {level.patientInfo.conditions.length > 0 && (
                  <div className="mb-2 text-sm">
                    <span className="font-medium text-gray-600">诊断: </span>
                    <span className="text-alert-warning">{level.patientInfo.conditions.join('、')}</span>
                  </div>
                )}

                {level.patientInfo.allergies.length > 0 && (
                  <div className="mb-4 text-sm">
                    <span className="font-medium text-gray-600">过敏史: </span>
                    <span className="text-alert-danger">{level.patientInfo.allergies.join('、')}</span>
                  </div>
                )}

                <div className="border-t pt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left py-2">序号</th>
                        <th className="text-left">药品名称</th>
                        <th className="text-left">规格</th>
                        <th className="text-left">剂量</th>
                        <th className="text-left">用法</th>
                      </tr>
                    </thead>
                    <tbody>
                      {level.prescriptions.map((rx, index) => (
                        <tr 
                          key={rx.id}
                          className={`border-t ${
                            index === currentStep 
                              ? 'bg-medical-primary/10 font-medium' 
                              : index < currentStep 
                                ? 'text-gray-400' 
                                : ''
                          }`}
                        >
                          <td className="py-3">{rx.lineNumber}</td>
                          <td className={index === currentStep ? 'text-medical-primary' : ''}>
                            {rx.drugName}
                            {index < currentStep && (
                              <CheckCircle className="inline w-4 h-4 text-green-500 ml-2" />
                            )}
                          </td>
                          <td>{rx.dosage}</td>
                          <td>{rx.dosage}</td>
                          <td>{rx.frequency} {rx.route}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`bg-dark-card rounded-2xl p-6 transition-all ${
                dragOver ? 'ring-2 ring-medical-primary ring-dashed' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-medical-light" />
                核对操作区
              </h2>

              <AnimatePresence>
                {showError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-4 bg-alert-danger/20 border border-alert-danger/50 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-alert-danger flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-alert-danger font-medium">错误提示</p>
                        <p className="text-sm text-gray-300 mt-1">{showError.message}</p>
                        <p className="text-xs text-gray-400 mt-1">来源: 处方第{showError.lineNumber}行</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                <div className="p-4 bg-dark-bg/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Pill className="w-5 h-5 text-green-500" />
                    <span className="font-medium">1. 选择药品</span>
                  </div>
                  
                  {selectedDrug ? (
                    <div className={`p-3 rounded-lg border-2 ${
                      selectedDrug.code === currentPrescription.drugCode 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-red-500 bg-red-500/10'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedDrug.name}</p>
                          <p className="text-sm text-gray-400">规格: {selectedDrug.specifications}</p>
                        </div>
                        {selectedDrug.code === currentPrescription.drugCode ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDrug(null);
                          setSelectedUnit('');
                          setSelectedBatchId('');
                        }}
                        className="mt-2 text-sm text-medical-light hover:underline"
                      >
                        重新选择
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-600 rounded-lg">
                      <Package className="w-12 h-12 mx-auto text-gray-500 mb-2" />
                      <p className="text-gray-400">将药品拖拽到此处，或点击下方药品卡片</p>
                    </div>
                  )}
                </div>

                {selectedDrug && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-dark-bg/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Scale className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">2. 确认剂量单位</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {['mg', 'g', 'μg'].map(unit => {
                        const isCorrect = unit === currentPrescription.dosageUnit;
                        const isSelected = selectedUnit === unit;
                        
                        return (
                          <button
                            key={unit}
                            onClick={() => handleUnitSelect(unit)}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              isSelected
                                ? isCorrect
                                  ? 'border-green-500 bg-green-500/20'
                                  : 'border-red-500 bg-red-500/20'
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            {unit}
                          </button>
                        );
                      })}
                    </div>
                    
                    {selectedUnit && selectedUnit !== currentPrescription.dosageUnit && (
                      <p className="mt-2 text-sm text-alert-danger">
                        单位错误！处方第{currentPrescription.lineNumber}行要求: {currentPrescription.dosageUnit}
                      </p>
                    )}
                  </motion.div>
                )}

                {selectedDrug && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 bg-dark-bg/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-yellow-500" />
                      <span className="font-medium">3. 检查禁忌</span>
                    </div>

                    {selectedDrug.contraindications.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">该药品有以下禁忌，请确认是否需要拦截：</p>
                        <div className="space-y-2">
                          {selectedDrug.contraindications.map((contra, index) => {
                            const isActualContraindication = 
                              level.patientInfo.allergies.some(a => contra.includes(a)) ||
                              level.patientInfo.conditions.some(con => contra.includes(con));
                            
                            return (
                              <label
                                key={index}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                  isActualContraindication 
                                    ? 'bg-red-500/10 border border-red-500/50' 
                                    : 'bg-dark-bg'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checkedContraindications.includes(`${selectedDrug.id}-${index}`)}
                                  onChange={(e) => handleContraindicationCheck(
                                    `${selectedDrug.id}-${index}`, 
                                    e.target.checked
                                  )}
                                  className="w-5 h-5 rounded"
                                />
                                <span className={isActualContraindication ? 'text-red-400' : ''}>
                                  {contra}
                                </span>
                                {isActualContraindication && (
                                  <span className="text-xs text-alert-danger ml-auto">
                                    ⚠️ 与患者情况相关
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">该药品无明确禁忌，可继续</p>
                    )}
                  </motion.div>
                )}

                {selectedDrug && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 bg-dark-bg/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-purple-500" />
                      <span className="font-medium">4. 核对批号</span>
                    </div>

                    <div className="space-y-2">
                      {selectedDrug.batchNumbers.map(batch => {
                        const isExpired = batch.isExpired;
                        const isSelected = selectedBatchId === batch.id;
                        
                        return (
                          <button
                            key={batch.id}
                            onClick={() => handleBatchSelect(batch.id)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? isExpired
                                  ? 'border-red-500 bg-red-500/20'
                                  : 'border-green-500 bg-green-500/20'
                                : isExpired
                                  ? 'border-red-500/50 hover:border-red-500'
                                  : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-mono font-medium">{batch.number}</p>
                                <p className="text-sm text-gray-400">
                                  有效期至: {batch.expiryDate}
                                </p>
                              </div>
                              {isExpired ? (
                                <span className="px-2 py-1 bg-red-500/30 text-red-400 text-xs rounded">
                                  已过期
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-500/30 text-green-400 text-xs rounded">
                                  有效
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {selectedDrug && selectedUnit && selectedBatchId && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleNextStep}
                    className="w-full py-4 bg-gradient-to-r from-medical-primary to-medical-secondary rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-medical-dark hover:to-medical-primary transition-all"
                  >
                    {currentStep < totalSteps - 1 ? '完成本步，继续下一步' : '完成所有核对'}
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-dark-card rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Pill className="w-5 h-5 text-medical-light" />
                可选药品
              </h2>
              <p className="text-sm text-gray-400 mb-4">拖拽或点击选择药品</p>

              <div className="space-y-3">
                {level.availableDrugs.map(drug => (
                  <motion.div
                    key={drug.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, drug)}
                    onClick={() => handleDrugSelect(drug)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all ${
                      selectedDrug?.id === drug.id
                        ? 'bg-medical-primary/30 border-2 border-medical-primary'
                        : 'bg-dark-bg/50 hover:bg-dark-bg border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{drug.name}</p>
                        <p className="text-sm text-gray-400">{drug.specifications}</p>
                        <p className="text-xs text-gray-500 mt-1">编码: {drug.code}</p>
                      </div>
                      <Pill className="w-5 h-5 text-medical-light" />
                    </div>
                    
                    {drug.contraindications.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-xs text-yellow-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          禁忌: {drug.contraindications.length}项
                        </p>
                      </div>
                    )}
                    
                    {drug.batchNumbers.some(b => b.isExpired) && (
                      <p className="text-xs text-red-400 mt-1">
                        ⚠️ 存在过期批号
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-card rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-medical-light" />
                操作提示
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-500 text-xs">1</span>
                  </span>
                  <p className="text-gray-400">仔细阅读处方，确认药品名称、剂量、用法</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-500 text-xs">2</span>
                  </span>
                  <p className="text-gray-400">选择正确的药品，注意药品编码匹配</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-yellow-500 text-xs">3</span>
                  </span>
                  <p className="text-gray-400">确认剂量单位，必要时进行换算（mg ↔ g）</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-500 text-xs">4</span>
                  </span>
                  <p className="text-gray-400">检查禁忌，对比患者过敏史和病情</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-500 text-xs">5</span>
                  </span>
                  <p className="text-gray-400">核对批号有效期，避免使用过期药品</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
