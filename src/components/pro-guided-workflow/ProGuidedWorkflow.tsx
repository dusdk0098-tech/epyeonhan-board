import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  CircleDot,
  Clock3,
  FileSpreadsheet,
  LayoutGrid,
  ListChecks,
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
export type ProWorkflowStepId = 'task' | 'lower-band' | 'capture-time' | 'item-cells' | 'position' | 'highlight' | 'output';
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
  onRunChecked
}: ProGuidedWorkflowProps) {
  const [currentStepId, setCurrentStepId] = useState<ProWorkflowStepId>('task');
  const isBoardWorkflow = workflowMode === 'board';
  const usesBottomStrip = boardLayoutMode === 'bottom-strip';

  const steps = useMemo<ProWorkflowStepItem[]>(() => {
    const nextSteps: ProWorkflowStepItem[] = [
      {
        id: 'task',
        title: '작업 유형 선택',
        shortTitle: '작업',
        description: '사진대지만 만들지, 보드판 정보를 함께 넣을지 먼저 정합니다.'
      }
    ];

    if (isBoardWorkflow) {
      nextSteps.push({
        id: 'lower-band',
        title: '보드판과 하부띠',
        shortTitle: '보드',
        description: '보드판을 표형으로 넣을지, 사진 아래 하부띠로 넣을지 정합니다.'
      });
    }

    nextSteps.push({
      id: 'capture-time',
      title: '촬영시간 입력',
      shortTitle: '시간',
      description: '기존 촬영시간 옵션 중 현장에 맞는 입력 방식을 선택합니다.'
    });

    if (isBoardWorkflow && usesBottomStrip) {
      nextSteps.push({
        id: 'item-cells',
        title: '항목칸 표시',
        shortTitle: '항목칸',
        description: '하부띠에 항목명 칸을 함께 표시할지 정합니다.'
      });
    }

    if (isBoardWorkflow && !usesBottomStrip) {
      nextSteps.push({
        id: 'position',
        title: '보드판 위치',
        shortTitle: '위치',
        description: '기존 위치 옵션 중 사진을 덜 가리는 위치를 선택합니다.'
      });
    }

    nextSteps.push(
      {
        id: 'highlight',
        title: '원형강조',
        shortTitle: '강조',
        description: '선택한 사진에서 강조 표시가 필요한지 정합니다.'
      },
      {
        id: 'output',
        title: '미리보기와 생성',
        shortTitle: '생성',
        description: '사진 방향과 순서를 확인한 뒤 결과물을 만듭니다.'
      }
    );

    return nextSteps;
  }, [isBoardWorkflow, usesBottomStrip]);

  useEffect(() => {
    if (!steps.some((step) => step.id === currentStepId)) {
      setCurrentStepId(steps[Math.max(0, steps.length - 1)]?.id ?? 'task');
    }
  }, [currentStepId, steps]);

  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));
  const currentStep = steps[currentIndex] ?? steps[0];
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < steps.length - 1;
  const canRunAny = photosCount > 0 && hasSaveDir && !isProcessing;
  const canRunSelected = canRunAny && hasSelectedPhoto;
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
    {
      id: 'board',
      label: '보드판',
      value: workflowMode === 'board' ? '삽입' : '접힘',
      stepId: 'task'
    },
    {
      id: 'lower-band',
      label: '하부띠',
      value: !isBoardWorkflow ? '사용 안 함' : usesBottomStrip ? '삽입' : '하부띠 없이 진행',
      stepId: isBoardWorkflow ? 'lower-band' : 'task'
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
    },
    {
      id: 'highlight',
      label: '원형강조',
      value: highlightEnabled ? '사용' : '사용 안 함',
      stepId: 'highlight'
    }
  ];

  function goToStep(stepId: string) {
    const step = steps.find((item) => item.id === stepId);
    if (step) setCurrentStepId(step.id);
  }

  function openDetail(tab: ProDetailTab, stepId: ProWorkflowStepId) {
    onOpenDetailTab(tab);
    setCurrentStepId(stepId);
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
              icon={<FileSpreadsheet size={18} />}
              onClick={() => {
                onWorkflowModeChange('ledger');
                onOpenDetailTab('ledger');
              }}
            />
            <ProWorkflowOptionCard
              title="보드판 삽입하기"
              description="사진대지에 보드판 형식의 정보를 함께 표시합니다."
              selected={workflowMode === 'board'}
              icon={<LayoutGrid size={18} />}
              onClick={() => {
                onWorkflowModeChange('board');
                onOpenDetailTab('fields');
              }}
            />
          </div>
        );
      case 'lower-band':
        return (
          <div className="pro-workflow-options">
            <ProWorkflowOptionCard
              title="하부띠 삽입"
              description="사진 아래에 보드 내용을 띠 형태로 붙입니다."
              selected={usesBottomStrip}
              icon={<Rows3 size={18} />}
              onClick={() => {
                onBoardLayoutModeChange('bottom-strip');
                onOpenDetailTab('layout');
              }}
            />
            <ProWorkflowOptionCard
              title="하부띠 없이 진행"
              description="기존 표형 보드판을 선택한 위치에 배치합니다."
              selected={!usesBottomStrip}
              icon={<LayoutGrid size={18} />}
              onClick={() => {
                onBoardLayoutModeChange('table');
                onOpenDetailTab('layout');
              }}
            />
          </div>
        );
      case 'capture-time':
        return (
          <div className="pro-workflow-options">
            {(Object.keys(timeModeCopy) as TimeMode[]).map((mode) => (
              <ProWorkflowOptionCard
                key={mode}
                title={timeModeCopy[mode].title}
                description={timeModeCopy[mode].description}
                selected={timeMode === mode}
                icon={<Clock3 size={18} />}
                onClick={() => {
                  onTimeModeChange(mode);
                  onOpenDetailTab('datetime');
                }}
              />
            ))}
          </div>
        );
      case 'item-cells':
        return (
          <div className="pro-workflow-options">
            <ProWorkflowOptionCard
              title="항목칸 표시"
              description="하부띠에 항목명과 내용을 구분해서 보여줍니다."
              selected={bottomStripShowLabels}
              icon={<ListChecks size={18} />}
              onClick={() => {
                onBottomStripShowLabelsChange(true);
                onOpenDetailTab('layout');
              }}
            />
            <ProWorkflowOptionCard
              title="항목칸 표시 안 함"
              description="내용 중심으로 하부띠를 더 간결하게 표시합니다."
              selected={!bottomStripShowLabels}
              icon={<Rows3 size={18} />}
              onClick={() => {
                onBottomStripShowLabelsChange(false);
                onOpenDetailTab('layout');
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
                icon={<MapPin size={18} />}
                onClick={() => {
                  onPositionChange(nextPosition);
                  onOpenDetailTab('layout');
                }}
              />
            ))}
          </div>
        );
      case 'highlight':
        return (
          <div className="pro-workflow-options">
            <ProWorkflowOptionCard
              title="원형강조 사용 안 함"
              description="사진을 그대로 보여줍니다."
              selected={!highlightEnabled}
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
              icon={<Sparkles size={18} />}
              onClick={() => {
                onHighlightEnabledChange(true);
                onOpenDetailTab('highlight');
              }}
            />
          </div>
        );
      case 'output':
      default:
        return (
          <div className="pro-workflow-output-actions">
            <OutputProgressStatus feedback={outputFeedback} />
            <div className="pro-workflow-action-grid">
              <button className="small-btn outline" type="button" disabled={photosCount === 0} onClick={onPreviewLedger}>
                <FileSpreadsheet size={15} /> 문서 미리보기
              </button>
              <button className="small-btn primary" type="button" disabled={!canRunAny} onClick={onCreateLedger}>
                <FileSpreadsheet size={15} /> {isProcessing ? 'PDF 생성 중...' : '사진대지 만들기'}
              </button>
              <button className="small-btn blue" type="button" disabled={!canRunSelected} onClick={onRunSelected}>
                <Play size={15} /> {isProcessing ? '작업 중...' : '선택 사진 작업'}
              </button>
              <button className="small-btn outline" type="button" disabled={checkedCount === 0 || !hasSaveDir || isProcessing} onClick={onRunChecked}>
                <CheckSquare size={15} /> 체크 사진 작업
              </button>
            </div>
            <p className="pro-workflow-output-hint">{outputHint}</p>
          </div>
        );
    }
  }

  return (
    <section className="pro-guided-workflow" aria-label="PRO 단계별 작업 안내">
      <div className="pro-guided-head">
        <div>
          <span className="pro-guided-eyebrow">PRO Guided Workflow</span>
          <h3>순서대로 설정하고 생성하세요</h3>
          <p>필요한 설정만 단계별로 보여주고, 자세한 조정은 기존 탭에서 계속 할 수 있습니다.</p>
        </div>
      </div>

      <ProWorkflowStepper steps={steps} currentStepId={currentStep.id} onStepSelect={goToStep} />

      <ProWorkflowStep
        stepNumber={currentIndex + 1}
        title={currentStep.title}
        description={currentStep.description}
        current
        completed={false}
      >
        {renderCurrentStep()}
      </ProWorkflowStep>

      <ProWorkflowSummary items={summaryItems} onEdit={goToStep} />

      <div className="pro-workflow-detail-links" aria-label="기존 상세 설정으로 이동">
        <button type="button" onClick={() => openDetail('fields', 'task')}>보드 내용</button>
        <button type="button" onClick={() => openDetail('datetime', 'capture-time')}>촬영시간</button>
        <button type="button" onClick={() => openDetail('layout', isBoardWorkflow ? 'lower-band' : 'task')}>크기/배치</button>
        <button type="button" onClick={() => openDetail('highlight', 'highlight')}>강조/실행</button>
        <button type="button" onClick={() => openDetail('ledger', 'output')}>사진대지</button>
      </div>

      <div className="pro-workflow-nav">
        <button type="button" className="small-btn outline" disabled={!canGoBack} onClick={() => setCurrentStepId(steps[currentIndex - 1].id)}>
          이전 단계
        </button>
        <span>{currentIndex + 1} / {steps.length}</span>
        <button type="button" className="small-btn primary" disabled={!canGoNext} onClick={() => setCurrentStepId(steps[currentIndex + 1].id)}>
          다음 단계
        </button>
      </div>
    </section>
  );
}
