import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ArrowLeft, Send, Link2, Zap, BookOpen, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLevelById, levels } from '@/data/levels';
import { useGameStore } from '@/store/gameStore';
import { useScoreStore } from '@/store/scoreStore';
import { validateConnection, generateConnectionId, getConnectionColor } from '@/engine/connectionLogic';
import { detectCounterexamples } from '@/engine/counterexampleDetector';
import { generateScoreResult } from '@/engine/scoringEngine';
import CardArea from '@/components/game/CardArea';
import ConclusionSlot from '@/components/game/ConclusionSlot';
import RealTimeHint from '@/components/game/RealTimeHint';
import ConditionCard from '@/components/game/ConditionCard';
import LemmaCard from '@/components/game/LemmaCard';
import type { Connection, CardType, ConditionCard as ConditionCardType, LemmaCard as LemmaCardType, ConclusionSlot as ConclusionSlotType } from '@/types/game';
import type { Hint } from '@/components/game/RealTimeHint';

export default function GameBoard() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardType, setSelectedCardType] = useState<CardType | null>(null);
  const [showHints, setShowHints] = useState(true);

  const {
    conditionCards,
    lemmaCards,
    conclusionSlots,
    connections,
    placedCards,
    counterexamples,
    initLevel,
    placeCard,
    removeCard,
    addConnection,
    submitForScoring,
  } = useGameStore();

  const { setScoreResult, setScoring } = useScoreStore();

  const level = useMemo(() => {
    if (!levelId) return undefined;
    return getLevelById(levelId);
  }, [levelId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (level) {
      initLevel(level);
    }
  }, [level, initLevel]);

  const hints = useMemo<Hint[]>(() => {
    if (!level) return [];
    const result: Hint[] = [];

    conclusionSlots.forEach((slot) => {
      const slotPlacedCards = placedCards.filter((pc) => pc.slotId === slot.id);
      const hasAllConditions = slot.requiredConditionIds.every((condId) =>
        slotPlacedCards.some((pc) => pc.cardId === condId && pc.cardType === 'condition')
      );
      if (!hasAllConditions) {
        result.push({
          type: 'missing-condition',
          message: `步骤${slot.stepNumber}缺少必要条件`,
          guide: '请检查是否已放置所有需要的条件卡',
        });
      }
    });

    const unexcluded = detectCounterexamples(placedCards, level);
    unexcluded.forEach((ce) => {
      result.push({
        type: 'counterexample',
        message: `发现未排除反例：${ce.content}`,
        guide: '请添加相应的条件卡来排除此反例',
      });
    });

    if (result.length === 0 && placedCards.length > 0) {
      result.push({
        type: 'success',
        message: '当前推理链逻辑正确',
        guide: '继续完善其他步骤或提交评分',
      });
    }

    return result;
  }, [conclusionSlots, placedCards, level]);

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    const condition = conditionCards.find((c) => c.id === activeId);
    if (condition) return { type: 'condition' as const, card: condition };
    const lemma = lemmaCards.find((l) => l.id === activeId);
    if (lemma) return { type: 'lemma' as const, card: lemma };
    return null;
  }, [activeId, conditionCards, lemmaCards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !level) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'condition' || activeData?.type === 'lemma') {
      if (overData?.type === 'conclusion') {
        placeCard(over.id as string, active.id as string, activeData.type as CardType);
      }
    }
  };

  const handleCardClick = (cardId: string, cardType: CardType | 'conclusion') => {
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
      setSelectedCardType(null);
    } else {
      if (selectedCardId && selectedCardType) {
        const fromCard =
          selectedCardType === 'condition'
            ? conditionCards.find((c) => c.id === selectedCardId)
            : lemmaCards.find((l) => l.id === selectedCardId);

        let toCard: LemmaCardType | ConclusionSlotType | undefined;
        if (cardType === 'lemma') {
          toCard = lemmaCards.find((l) => l.id === cardId);
        } else if (cardType === 'conclusion') {
          toCard = conclusionSlots.find((s) => s.id === cardId);
        }

        if (fromCard && toCard && level) {
          const validation = validateConnection(fromCard, toCard, level);
          const newConnection: Connection = {
            id: generateConnectionId(),
            fromId: selectedCardId,
            toId: cardId,
            fromType: selectedCardType,
            toType: cardType as CardType,
            isCorrect: validation.isCorrect,
            color: getConnectionColor(validation.isCorrect, validation.errorType),
          };
          addConnection(newConnection);
        }
        setSelectedCardId(null);
        setSelectedCardType(null);
      } else {
        if (cardType !== 'conclusion') {
          setSelectedCardId(cardId);
          setSelectedCardType(cardType);
        }
      }
    }
  };

  const handleRemoveCard = (slotId: string, cardId: string) => {
    removeCard(slotId);
  };

  const handleSubmit = () => {
    if (!level) return;
    submitForScoring();
    setScoring(true);

    setTimeout(() => {
      const result = generateScoreResult(level, placedCards, connections, counterexamples);
      setScoreResult(result);
      navigate(`/score/${level.id}`);
    }, 800);
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-slate">关卡不存在</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-neutral-ivory via-white to-primary/5">
        <div className="border-b-2 border-neutral-ivory bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-neutral-ivory hover:border-primary hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回
                </motion.button>
                <div>
                  <h1 className="text-xl font-bold font-serif text-neutral-ink">{level.title}</h1>
                  <span className="text-xs text-neutral-slate">{levels.findIndex(l => l.id === level.id) + 1} / {levels.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/20">
                  <BookOpen className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-accent-amber font-medium mb-1">已知条件</div>
                    <div className="text-sm text-neutral-ink font-serif">{level.knownConditions.join('；')}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-primary font-medium mb-1">待证结论</div>
                    <div className="text-sm text-neutral-ink font-serif">{level.toProve}</div>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
                提交评分
              </motion.button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6" ref={gameAreaRef}>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-violet/10 text-accent-violet text-sm">
              <Link2 className="w-4 h-4" />
              <span>点击卡片建立连线：先选起点，再选终点</span>
            </div>
            {selectedCardId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-emerald/10 text-accent-emerald text-sm"
              >
                <Zap className="w-4 h-4" />
                <span>已选择起点，请点击目标卡片完成连线</span>
              </motion.div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 pointer-events-none z-10">
              <svg className="w-full h-full overflow-visible">
                <defs>
                  <marker
                    id="arrowhead-correct"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
                  </marker>
                  <marker
                    id="arrowhead-wrong"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                  </marker>
                </defs>
                <AnimatePresence>
                  {connections.map((conn, idx) => {
                    const getCardPosition = (cardId: string, cardType: string) => {
                      const colIndex = cardType === 'condition' ? 0 : cardType === 'lemma' ? 1 : 2;
                      const colWidth = 100 / 3;
                      const x = colIndex * colWidth + colWidth / 2;

                      let cardsArray;
                      if (cardType === 'condition') cardsArray = conditionCards;
                      else if (cardType === 'lemma') cardsArray = lemmaCards;
                      else cardsArray = conclusionSlots;

                      const cardIndex = cardsArray.findIndex((c: { id: string }) => c.id === cardId);
                      const y = 100 + cardIndex * 180;

                      return { x: `${x}%`, y };
                    };

                    const fromPos = getCardPosition(conn.fromId, conn.fromType);
                    const toPos = getCardPosition(conn.toId, conn.toType);

                    const startX = fromPos.x;
                    const startY = fromPos.y;
                    const endX = toPos.x;
                    const endY = toPos.y;
                    const midX = `calc(${startX} + calc(${endX} - ${startX}) / 2)`;

                    return (
                      <motion.path
                        key={conn.id}
                        d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke={conn.color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={conn.isCorrect ? '0' : '8 4'}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.7 }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        markerEnd={conn.isCorrect ? 'url(#arrowhead-correct)' : 'url(#arrowhead-wrong)'}
                      />
                    );
                  })}
                </AnimatePresence>
              </svg>
            </div>

            <div className="grid grid-cols-12 gap-6 relative z-0">
              <div className="col-span-4">
                <CardArea
                  title="条件卡区"
                  cards={conditionCards}
                  cardType="condition"
                />
              </div>

              <div className="col-span-4">
                <CardArea
                  title="引理卡区"
                  cards={lemmaCards}
                  cardType="lemma"
                />
              </div>

              <div className="col-span-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="rounded-2xl border-2 border-accent-violet/20 bg-white/50 backdrop-blur-sm shadow-card overflow-hidden"
                >
                  <div className="px-5 py-3 flex items-center justify-between bg-accent-violet">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-white" />
                      <h3 className="font-semibold text-white">结论槽区</h3>
                    </div>
                    <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full font-medium">
                      {conclusionSlots.length} 步
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {conclusionSlots.map((slot) => (
                      <div
                        key={slot.id}
                        onClick={() => handleCardClick(slot.id, 'conclusion')}
                        className={cn(
                          'cursor-pointer transition-all',
                          selectedCardId === slot.id && 'ring-2 ring-accent-violet ring-offset-2 rounded-xl'
                        )}
                      >
                        <ConclusionSlot
                          slot={slot}
                          placedCards={placedCards}
                          onCardDrop={placeCard}
                          onCardRemove={handleRemoveCard}
                          connections={connections}
                          conditionCards={conditionCards}
                          lemmaCards={lemmaCards}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        <RealTimeHint hints={hints} visible={showHints} />

        <DragOverlay>
          {activeCard && activeCard.type === 'condition' && (
            <ConditionCard card={activeCard.card as ConditionCardType} />
          )}
          {activeCard && activeCard.type === 'lemma' && (
            <LemmaCard card={activeCard.card as LemmaCardType} />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
