import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CheckSquare,
  CircleDot,
  Clock3,
  FileSpreadsheet,
  LayoutGrid,
  ListChecks,
  Loader2,
  MapPin,
  Play,
  Rows3,
  Sparkles
} from 'lucide-react';
import type { BoardLayoutMode, BoardPosition, TimeMode } from '../../shared/types';
import { OutputProgressStatus } from './OutputProgressStatus';
import { ProWorkflowOptionCard } from './ProWorkflowOptionCard';
import { ProWorkflowStep } from './ProWorkflowStep';
import { ProWorkflowStepper } from './ProWorkflowStepper';
import { ProWorkflowSummary, type ProWorkflowSummaryItem } from './ProWorkflowSummary';

export type ProWorkflowMode = 'ledger' | 'board';
export type ProWorkflowStepId =
  | 'task'
  | 'ledger-detail'
  | 'board-fields'
  | 'lower-band'
  | 'capture-time'
  | 'item-cells'
  | 'position'
  | 'highlight'
  | 'output';
export type ProDetailTab = 'fields' | 'datetime' | 'layout' | 'typography' | 'highlight' | 'ledger';
export type ProOutputFeedbackState = 'idle' | 'generating' | 'success' | 'error';

export interface ProOutputFeedback {
  state: ProOutputFeedbackState;
  title: string;
  message: string;
}

export interface ProWorkflowStepItem {
  id: ProWorkflowStepId;
  title: string;
  shortTitle: string;
  description: string;
}

interface ProGuidedWorkflowProps {
  currentStepId: ProWorkflowStepId;
  workflowMode: ProWorkflowMode;
  boardLayoutMode: BoardLayoutMode;
  timeMode: TimeMode;
  bottomStripShowLabels: boolean;
  position: BoardPosition;
  positionLabels: Record<BoardPosition, string>;
  highlightEnabled: boolean;
  highlightDisabled: boolean;
  photosCount: number;
  checkedCount: number;
  hasSelectedPhoto: boolean;
  hasSaveDir: boolean;
  isProcessing: boolean;
  outputFeedback: ProOutputFeedback;
  onCurrentStepChange: (stepId: ProWorkflowStepId) => void;
  onWorkflowModeChange: (mode: ProWorkflowMode) => void;
  onBoardLayoutModeChange: (mode: BoardLayoutMode) => void;
  onTimeModeChange: (mode: TimeMode) => void;
  onBottomStripShowLabelsChange: (value: boolean) => void;
  onPositionChange: (position: BoardPosition) => void;
  onHighlightEnabledChange: (enabled: boolean) => void;
  onOpenDetailTab: (tab: ProDetailTab) => void;
  onPreviewLedger: () => void;
  onCreateLedger: () => void;
  onRunSelected: () => void;
  onRunChecked: () => void;
  ledgerSettings: ReactNode;
  boardFieldsSettings: ReactNode;
  boardLayoutSettings: ReactNode;
  dateTimeSettings: ReactNode;
  highlightSettings: ReactNode;
}

const timeModeCopy: Record<TimeMode, { title: string; description: string }> = {
  manual: {
    title: '보드판 입력값 직접 사용',
    description: '현재 보드 내용의 날짜와 촬영시간을 그대로 사용합니다.'
  },
  exif: {
    title: '사진 촬영정보 자동 사용',
    description: '사진 파일의 촬영정보가 있으면 자동으로 반영합니다.'
  },
  sequence: {
    title: '시작시간 + 간격 자동 입력',
    description: '첫 시간과 간격으로 사진별 촬영시간을 순서대로 채웁니다.'
  },
  sheet: {
    title: '사진별 표 파일 직접 입력',
    description: 'CSV/XLSX 표의 사진별 날짜와 시간을 사용합니다.'
  }
};

export function ProGuidedWorkflow({
  currentStepId,
  workflowMode,
  boardLayoutMode,
  timeMode,
  bottomStripShowLabels,
  position,
  positionLabels,
  highlightEnabled,
  highlightDisabled,
  photosCount,
  checkedCount,
  hasSelectedPhoto,
  hasSaveDir,
  isProcessing,
  outputFeedback,
  onCurrentStepChange,
  onWorkflowModeChange,
  onBoardLayoutModeChange,
  onTimeModeChange,
  onBottomStripShowLabelsChange,
  onPositionChange,
  onHighlightEnabledChange,
  onOpenDetailTab,
  onPreviewLedger,
  onCreateLedger,
  onRunSelected,
  onRunChecked,
  ledgerSettings,
  boardFieldsSettings,
  boardLayoutSettings,
  dateTimeSettings,
  highlightSettings
}: ProGuidedWorkflowProps) {
  const [recentlyCompletedStepId, setRecentlyCompletedStepId] = useState<ProWorkflowStepId | null>(null);
  const currentStepRef = useRef<HTMLElement | null>(null);
  const shouldGuideFocusRef = useRef(false);
  const isBoardWorkflow = workflowMode === 'board';
  const usesBottomStrip = boardLayoutMode === 'bottom-strip';

  const steps = useMemo<ProWorkflowStepItem[]>(() => {
    const nextSteps: ProWorkflowStepItem[] = [
      {
        id: 'task',
        title: '어떤 결과물을 만들까요?',
        shortTitle: '작업',
        description: '사진대지만 만들지, 보드판 정보를 함께 넣을지 먼저 정합니다.'
      }
    ];

    if (isBoardWorkflow) {
      nextSteps.push({
        id: 'board-fields',
        title: '보드판에 어떤 내용을 넣을까요?',
        shortTitle: '내용',
        description: '보드판에 들어갈 항목명과 내용을 기존 입력칸에서 편집합니다.'
      });
      nextSteps.push({
        id: 'lower-band',
        title: '보드판을 어디에 넣을까요?',
        shortTitle: '보드',
        description: '보드판을 표형으로 넣을지, 사진 아래 하부띠로 넣을지 정합니다.'
      });

      nextSteps.push({
        id: 'capture-time',
        title: '보드판 촬영시간을 어떻게 채울까요?',
        shortTitle: '시간',
        description: '보드판에 들어갈 촬영시간 입력 방식을 선택합니다.'
      });

      if (usesBottomStrip) {
        nextSteps.push({
          id: 'item-cells',
          title: '항목칸을 보여줄까요?',
          shortTitle: '항목칸',
          description: '하부띠에 항목명 칸을 함께 표시할지 정합니다.'
        });
      } else {
        nextSteps.push({
          id: 'position',
          title: '보드판을 어디에 둘까요?',
          shortTitle: '위치',
          description: '기존 위치 옵션 중 사진을 덜 가리는 위치를 선택합니다.'
        });
      }
    } else {
      nextSteps.push({
        id: 'ledger-detail',
        title: '사진대지 내용을 입력하세요',
        shortTitle: '사진대지',
        description: '사진대지 문서 제목, 하단정보, 출력 순서를 기존 입력칸에서 편집합니다.'
      });
    }

    nextSteps.push(
      {
        id: 'highlight',
        title: '원형강조를 사용할까요?',
        shortTitle: '강조',
        description: '선택한 사진에서 강조 표시가 필요한지 정합니다.'
      },
      {
        id: 'output',
        title: '이제 무엇을 생성할까요?',
        shortTitle: '생성',
        description: '사진 방향과 순서를 확인한 뒤 결과물을 만듭니다.'
      }
    );

    return nextSteps;
  }, [isBoardWorkflow, usesBottomStrip]);

  useEffect(() => {
    if (!steps.some((step) => step.id === currentStepId)) {
      onCurrentStepChange(steps[Math.max(0, steps.length - 1)]?.id ?? 'task');
    }
  }, [currentStepId, onCurrentStepChange, steps]);

  useEffect(() => {
    if (!recentlyCompletedStepId) return;

    const clearTimer = window.setTimeout(() => {
      setRecentlyCompletedStepId(null);
    }, 460);

    return () => window.clearTimeout(clearTimer);
  }, [recentlyCompletedStepId]);

  useEffect(() => {
    if (!shouldGuideFocusRef.current) return;

    shouldGuideFocusRef.current = false;
    const focusTarget = currentStepRef.current;
    if (!focusTarget) return;

    window.requestAnimationFrame(() => {
      focusTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      focusTarget.focus({ preventScroll: true });
    });
  }, [currentStepId]);

  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));
  const currentStep = steps[currentIndex] ?? steps[0];
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < steps.length - 1;
  const canRunAny = photosCount > 0 && hasSaveDir && !isProcessing;
  const canRunSelected = canRunAny && hasSelectedPhoto;
  const nextStepAfterCaptureTime: ProWorkflowStepId = isBoardWorkflow
    ? usesBottomStrip
      ? 'item-cells'
      : 'position'
    : 'highlight';
  const outputHint = photosCount === 0
    ? '먼저 사진을 추가해야 결과물을 만들 수 있습니다.'
    : hasSaveDir
      ? '사진 방향과 출력 순서를 확인한 뒤 생성하세요.'
      : '먼저 저장 경로를 지정해야 결과물을 만들 수 있습니다.';

  const summaryItems: ProWorkflowSummaryItem[] = [
    {
      id: 'task',
      label: '작업 유형',
      value: workflowMode === 'board' ? '보드판 삽입하기' : '사진대지 만들기',
      stepId: 'task'
    },
    ...(isBoardWorkflow
      ? [
          {
            id: 'board',
            label: '보드판',
            value: '삽입',
            stepId: 'board-fields'
          },
          {
            id: 'lower-band',
            label: '하부띠',
            value: usesBottomStrip ? '삽입' : '하부띠 없이 진행',
            stepId: 'lower-band'
          },
          {
            id: 'capture-time',
            label: '촬영시간',
            value: timeModeCopy[timeMode].title,
            stepId: 'capture-time'
          },
          {
            id: 'item-cells',
            label: '항목칸',
            value: usesBottomStrip ? (bottomStripShowLabels ? '표시' : '표시 안 함') : '해당 없음',
            stepId: usesBottomStrip ? 'item-cells' : 'lower-band'
          },
          {
            id: 'position',
            label: '위치',
            value: usesBottomStrip ? '하부띠 고정' : positionLabels[position],
            stepId: usesBottomStrip ? 'lower-band' : 'position'
          }
        ]
      : [
          {
            id: 'ledger-detail',
            label: '사진대지',
            value: '수동 하단정보',
            stepId: 'ledger-detail'
          }
        ]),
    {
      id: 'highlight',
      label: '원형강조',
      value: highlightEnabled ? '사용' : '사용 안 함',
      stepId: 'highlight'
    }
  ];

  function moveToStep(stepId: ProWorkflowStepId) {
    shouldGuideFocusRef.current = true;
    onCurrentStepChange(stepId);
  }

  function goToStep(stepId: string) {
    const step = steps.find((item) => item.id === stepId);
    if (step) moveToStep(step.id);
  }

  function selectAndAdvance(completedStepId: ProWorkflowStepId, nextStepId: ProWorkflowStepId, onSelect: () => void) {
    onSelect();
    setRecentlyCompletedStepId(completedStepId);
    moveToStep(nextStepId);
  }

  function renderCurrentStep() {
    switch (currentStep.id) {
      case 'task':
        return (
          <div className="pro-workflow-options">
            <ProWorkflowOptionCard
              title="사진대지 만들기"
              description="여러 사진을 정리해 PDF 또는 출력용 대지로 만듭니다."
              selected={workflowMode === 'ledger'}
              nextHint="선택하면 사진대지 내용 단계로 이어집니다."
              icon={<FileSpreadsheet size={18} />}
              onClick={() => {
                selectAndAdvance('task', 'ledger-detail', () => {
                  onWorkflowModeChange('ledger');
                  onOpenDetailTab('ledger');
                });
              }}
            />
            <ProWorkflowOptionCard
              title="보드판 삽입하기"
              description="사진대지에 보드판 형식의 정보를 함께 표시합니다."
              selected={workflowMode === 'board'}
              nextHint="선택하면 보드 내용 단계로 이어집니다."
              icon={<LayoutGrid size={18} />}
              onClick={() => {
                selectAndAdvance('task', 'board-fields', () => {
                  onWorkflowModeChange('board');
                  onOpenDetailTab('fields');
                });
              }}
            />
          </div>
        );
      case 'ledger-detail':
        return (
          <div className="pro-workflow-step-detail">
            {ledgerSettings}
          </div>
        );
      case 'board-fields':
        return (
          <div className="pro-workflow-step-detail">
            {boardFieldsSettings}
          </div>
        );
      case 'lower-band':
        return (
          <div className="pro-workflow-step-stack">
            <div className="pro-workflow-options">
              <ProWorkflowOptionCard
                title="하부띠 삽입"
                description="사진 아래에 보드 내용을 띠 형태로 붙입니다."
                selected={usesBottomStrip}
                nextHint="선택하면 촬영시간 단계로 이어집니다."
                icon={<Rows3 size={18} />}
                onClick={() => {
                  selectAndAdvance('lower-band', 'capture-time', () => {
                    onBoardLayoutModeChange('bottom-strip');
                    onOpenDetailTab('layout');
                  });
                }}
              />
              <ProWorkflowOptionCard
                title="하부띠 없이 진행"
                description="기존 표형 보드판을 선택한 위치에 배치합니다."
                selected={!usesBottomStrip}
                nextHint="선택하면 촬영시간 단계로 이어집니다."
                icon={<LayoutGrid size={18} />}
                onClick={() => {
                  selectAndAdvance('lower-band', 'capture-time', () => {
                    onBoardLayoutModeChange('table');
                    onOpenDetailTab('layout');
                  });
                }}
              />
            </div>
            <div className="pro-workflow-step-detail compact">
              {boardLayoutSettings}
            </div>
          </div>
        );
      case 'capture-time':
        return (
          <div className="pro-workflow-step-stack">
            <div className="pro-workflow-options">
              {(Object.keys(timeModeCopy) as TimeMode[]).map((mode) => (
                <ProWorkflowOptionCard
                  key={mode}
                  title={timeModeCopy[mode].title}
                  description={timeModeCopy[mode].description}
                  selected={timeMode === mode}
                  nextHint="선택하면 다음 설정 단계로 이어집니다."
                  icon={<Clock3 size={18} />}
                  onClick={() => {
                    selectAndAdvance('capture-time', nextStepAfterCaptureTime, () => {
                      onTimeModeChange(mode);
                      onOpenDetailTab('datetime');
                    });
                  }}
                />
              ))}
            </div>
            <div className="pro-workflow-step-detail compact">
              {dateTimeSettings}
            </div>
          </div>
        );
      case 'item-cells':
        return (
          <div className="pro-workflow-options">
            <ProWorkflowOptionCard
              title="항목칸 표시"
              description="하부띠에 항목명과 내용을 구분해서 보여줍니다."
              selected={bottomStripShowLabels}
              nextHint="선택하면 원형강조 단계로 이어집니다."
              icon={<ListChecks size={18} />}
              onClick={() => {
                selectAndAdvance('item-cells', 'highlight', () => {
                  onBottomStripShowLabelsChange(true);
                  onOpenDetailTab('layout');
                });
              }}
            />
            <ProWorkflowOptionCard
              title="항목칸 표시 안 함"
              description="내용 중심으로 하부띠를 더 간결하게 표시합니다."
              selected={!bottomStripShowLabels}
              nextHint="선택하면 원형강조 단계로 이어집니다."
              icon={<Rows3 size={18} />}
              onClick={() => {
                selectAndAdvance('item-cells', 'highlight', () => {
                  onBottomStripShowLabelsChange(false);
                  onOpenDetailTab('layout');
                });
              }}
            />
          </div>
        );
      case 'position':
        return (
          <div className="pro-workflow-position-grid">
            {(Object.keys(positionLabels) as BoardPosition[]).map((nextPosition) => (
              <ProWorkflowOptionCard
                key={nextPosition}
                title={positionLabels[nextPosition]}
                description="기존 보드판 위치 옵션입니다."
                selected={position === nextPosition}
                nextHint="선택하면 원형강조 단계로 이어집니다."
                icon={<MapPin size={18} />}
                onClick={() => {
                  selectAndAdvance('position', 'highlight', () => {
                    onPositionChange(nextPosition);
                    onOpenDetailTab('layout');
                  });
                }}
              />
            ))}
          </div>
        );
      case 'highlight':
        return (
          <div className="pro-workflow-step-stack">
            <div className="pro-workflow-options">
              <ProWorkflowOptionCard
                title="원형강조 사용 안 함"
                description="사진을 그대로 보여줍니다."
                selected={!highlightEnabled}
                nextHint="선택 후 다음 단계로 진행하세요."
                icon={<CircleDot size={18} />}
                onClick={() => {
                  onHighlightEnabledChange(false);
                  onOpenDetailTab('highlight');
                }}
              />
              <ProWorkflowOptionCard
                title="원형강조 사용"
                description={highlightDisabled ? '사진을 선택하면 원형강조를 켤 수 있습니다.' : '선택 사진의 중요한 위치를 원으로 강조합니다.'}
                selected={highlightEnabled}
                disabled={highlightDisabled}
                nextHint="사용하면 아래 세부 옵션을 고를 수 있습니다."
                icon={<Sparkles size={18} />}
                onClick={() => {
                  onHighlightEnabledChange(true);
                  onOpenDetailTab('highlight');
                }}
              />
            </div>
            <div className="pro-workflow-step-detail compact">
              {highlightSettings}
            </div>
          </div>
        );
      case 'output':
      default:
        return (
          <div className="pro-workflow-output-actions">
            <OutputProgressStatus feedback={outputFeedback} />
            <div className="pro-workflow-primary-action">
              <button className="btn primary wide" type="button" disabled={!canRunAny} onClick={onCreateLedger}>
                {isProcessing ? <Loader2 className="pro-workflow-button-spinner" size={15} aria-hidden /> : <FileSpreadsheet size={15} />}
                {isProcessing ? 'PDF 생성 중...' : '사진대지 만들기'}
              </button>
              <p className="pro-workflow-output-hint">{outputHint}</p>
            </div>
            <details className="pro-workflow-secondary-actions">
              <summary>보조 작업 열기</summary>
              <div className="pro-workflow-action-grid">
                <button className="small-btn outline" type="button" disabled={photosCount === 0} onClick={onPreviewLedger}>
                  <FileSpreadsheet size={15} /> 문서 미리보기
                </button>
                <button className="small-btn blue" type="button" disabled={!canRunSelected} onClick={onRunSelected}>
                  {isProcessing ? <Loader2 className="pro-workflow-button-spinner" size={15} aria-hidden /> : <Play size={15} />}
                  {isProcessing ? '작업 중...' : '선택 사진 작업'}
                </button>
                <button className="small-btn outline" type="button" disabled={checkedCount === 0 || !hasSaveDir || isProcessing} onClick={onRunChecked}>
                  {isProcessing ? <Loader2 className="pro-workflow-button-spinner" size={15} aria-hidden /> : <CheckSquare size={15} />}
                  {isProcessing ? '작업 중...' : '체크 사진 작업'}
                </button>
              </div>
            </details>
          </div>
        );
    }
  }

  return (
    <section className="pro-guided-workflow" aria-label="PRO 단계별 작업 안내">
      <div className="pro-guided-head">
        <div>
          <span className="pro-guided-eyebrow">PRO Task Flow</span>
          <h3>현재 단계만 집중해서 설정하세요</h3>
          <p>필요한 설정만 보여주고, 세부 조정은 접힌 상세 설정 탭에서 계속 할 수 있습니다.</p>
        </div>
      </div>

      <ProWorkflowStepper
        steps={steps}
        currentStepId={currentStep.id}
        recentlyCompletedStepId={recentlyCompletedStepId}
      />

      <div className="pro-workflow-slide-panel" aria-live="polite">
        <ProWorkflowStep
          key={currentStep.id}
          focusRef={currentStepRef}
          stepNumber={currentIndex + 1}
          title={currentStep.title}
          description={currentStep.description}
          current
          completed={false}
          className={[
            `step-${currentStep.id}`,
            recentlyCompletedStepId ? 'revealed-after-selection' : ''
          ].filter(Boolean).join(' ')}
        >
          {renderCurrentStep()}
        </ProWorkflowStep>
      </div>

      <div className="pro-workflow-nav">
        <button type="button" className="small-btn outline" disabled={!canGoBack} onClick={() => moveToStep(steps[currentIndex - 1].id)}>
          이전 단계
        </button>
        <span>{currentIndex + 1} / {steps.length}</span>
        <button type="button" className="small-btn primary" disabled={!canGoNext} onClick={() => moveToStep(steps[currentIndex + 1].id)}>
          다음 단계
        </button>
      </div>

      <ProWorkflowSummary items={summaryItems} onEdit={goToStep} />
    </section>
  );
}
