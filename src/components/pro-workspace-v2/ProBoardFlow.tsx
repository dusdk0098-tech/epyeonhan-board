import { useMemo, useState } from 'react';

import type { ProBoardFlowController, ProBoardFlowStep, ProBoardGenerateMode } from './boardFlowTypes';
import { ProBoardAdjustStep } from './ProBoardAdjustStep';
import { ProBoardContentStep } from './ProBoardContentStep';
import { ProBoardGenerateStep } from './ProBoardGenerateStep';
import { ProBoardPhotoStep } from './ProBoardPhotoStep';
import { ProBoardPreviewContext } from './ProBoardPreviewContext';
import { ProBoardResultStep } from './ProBoardResultStep';
import { ProCompactPhotoStatus } from './ProCompactPhotoStatus';
import { ProWorkspaceShell } from './ProWorkspaceShell';

interface ProBoardFlowProps extends ProBoardFlowController {
  onChangeJob: () => void;
}

const boardStepMeta: Record<ProBoardFlowStep, {
  stepNumber: number;
  totalSteps: 5;
  title: string;
  eyebrow: string;
  description: string;
  canvasTitle: string;
}> = {
  photo: {
    stepNumber: 1,
    totalSteps: 5,
    title: '사진 준비',
    eyebrow: '사진 보드판 만들기',
    description: '사진을 추가하고, 사용할 사진을 선택한 뒤 방향을 확인합니다.',
    canvasTitle: '1단계 사진 준비'
  },
  content: {
    stepNumber: 2,
    totalSteps: 5,
    title: '보드판 내용',
    eyebrow: '사진 보드판 만들기',
    description: '보드판에 들어갈 항목명과 내용을 입력합니다.',
    canvasTitle: '2단계 보드판 내용'
  },
  adjust: {
    stepNumber: 3,
    totalSteps: 5,
    title: '보드 크기·위치·하부띠',
    eyebrow: '사진 보드판 만들기',
    description: '미리보기를 보며 크기, 위치, 하부띠와 강조 표시를 조정합니다.',
    canvasTitle: '3단계 보드 조정'
  },
  generate: {
    stepNumber: 4,
    totalSteps: 5,
    title: '생성 준비',
    eyebrow: '사진 보드판 만들기',
    description: '사진, 미리보기, 저장 폴더가 준비되었는지 마지막으로 확인합니다.',
    canvasTitle: '4단계 생성 준비'
  },
  result: {
    stepNumber: 5,
    totalSteps: 5,
    title: '완료 또는 문제 해결',
    eyebrow: '사진 보드판 만들기',
    description: '생성 결과를 확인하고, 필요하면 설정으로 돌아가 다시 시도합니다.',
    canvasTitle: '5단계 결과 확인'
  }
};

const boardStepOrder: ProBoardFlowStep[] = ['photo', 'content', 'adjust', 'generate', 'result'];

export function ProBoardFlow({ model, actions, slots, onChangeJob }: ProBoardFlowProps) {
  const [step, setStep] = useState<ProBoardFlowStep>('photo');
  const [generatingMode, setGeneratingMode] = useState<ProBoardGenerateMode | null>(null);
  const meta = boardStepMeta[step];

  const generateReady = model.photoCount > 0
    && model.saveFolderReady
    && model.previewReady
    && (model.hasSelectedPhoto || model.checkedCount > 0)
    && !model.isProcessing;

  const nextStep = useMemo(() => {
    const index = boardStepOrder.indexOf(step);
    return boardStepOrder[Math.min(index + 1, boardStepOrder.length - 1)];
  }, [step]);

  const previousStep = useMemo(() => {
    const index = boardStepOrder.indexOf(step);
    return index > 0 ? boardStepOrder[index - 1] : null;
  }, [step]);

  function goToPhotoStep() {
    setStep('photo');
  }

  function goNext() {
    setStep(nextStep);
  }

  function goPrevious() {
    if (previousStep) setStep(previousStep);
  }

  async function runGenerate(mode: ProBoardGenerateMode) {
    if (!generateReady) return;
    setGeneratingMode(mode);
    await actions.onGenerate(mode);
    setGeneratingMode(null);
    setStep('result');
  }

  function renderCanvas() {
    switch (step) {
      case 'photo':
        return <ProBoardPhotoStep model={model} actions={actions} />;
      case 'content':
        return <ProBoardContentStep model={model} actions={actions} onGoToPhotoStep={goToPhotoStep} />;
      case 'adjust':
        return <ProBoardAdjustStep model={model} actions={actions} slots={slots} onGoToPhotoStep={goToPhotoStep} />;
      case 'generate':
        return <ProBoardGenerateStep model={model} actions={actions} />;
      case 'result':
        return (
          <ProBoardResultStep
            model={model}
            actions={actions}
            onEditSettings={() => setStep('adjust')}
            onStartNew={() => setStep('photo')}
          />
        );
    }
  }

  function renderContext() {
    if (step === 'content') {
      return (
        <div className="pro-v2-context-stack">
          <ProCompactPhotoStatus model={model} onGoToPhotoStep={goToPhotoStep} />
          {slots.dateTimeControls}
        </div>
      );
    }

    if (step === 'adjust') {
      return (
        <div className="pro-v2-context-stack">
          <ProCompactPhotoStatus model={model} onGoToPhotoStep={goToPhotoStep} />
          <div className="pro-v2-board-adjust-context-note">
            <strong>미리보기는 3단계 작업 영역에 한 번만 표시됩니다.</strong>
            <span>크기·위치 조작과 나란히 확인해 중복 preview 없이 조정합니다.</span>
          </div>
        </div>
      );
    }

    if (step === 'result') {
      return (
        <div className="pro-v2-context-stack">
          <ProCompactPhotoStatus model={model} onGoToPhotoStep={goToPhotoStep} />
          {slots.previewPanel}
        </div>
      );
    }

    return (
      <ProBoardPreviewContext
        model={model}
        previewPanel={slots.previewPanel}
        onGoToPhotoStep={goToPhotoStep}
      />
    );
  }

  function renderPrimaryAction() {
    if (step === 'generate') {
      const mode: ProBoardGenerateMode = model.hasSelectedPhoto ? 'selected' : 'checked';
      const describedBy = generateReady ? 'pro-v2-board-generate-ready' : 'pro-v2-board-generate-blockers';
      return (
        <>
          {model.checkedCount > 0 ? (
            <button
              type="button"
              className="pro-v2-action secondary"
              data-evidence="board-generate-checked"
              disabled={!generateReady || model.isProcessing}
              aria-describedby={describedBy}
              onClick={() => void runGenerate('checked')}
            >
              체크한 사진 생성
            </button>
          ) : null}
          <button
            type="button"
            className="pro-v2-action primary pro-v2-board-primary"
            disabled={!generateReady || model.isProcessing}
            data-evidence="board-generate-cta"
            aria-describedby={describedBy}
            onClick={() => void runGenerate(mode)}
          >
            {generatingMode ? '생성 중...' : '보드판 이미지 생성'}
          </button>
        </>
      );
    }

    if (step === 'result') {
      return (
        <button type="button" className="pro-v2-action primary pro-v2-board-primary" onClick={() => setStep('photo')}>
          새 보드판 작업
        </button>
      );
    }

    const disabled = step === 'photo' && (model.photoCount === 0 || !model.hasSelectedPhoto);
    return (
      <button
        type="button"
        className="pro-v2-action primary pro-v2-board-primary"
        data-evidence={`board-${step}-next`}
        disabled={disabled}
        onClick={goNext}
      >
        {step === 'photo' ? '보드판 내용 입력' : step === 'content' ? '크기와 위치 조정' : '생성 준비 확인'}
      </button>
    );
  }

  function renderSecondaryAction() {
    return (
      <>
        {previousStep ? (
          <button type="button" className="pro-v2-action secondary" onClick={goPrevious}>
            이전
          </button>
        ) : null}
        <button type="button" className="pro-v2-action secondary" onClick={onChangeJob}>
          작업 유형 변경
        </button>
      </>
    );
  }

  return (
    <ProWorkspaceShell
      title={meta.title}
      eyebrow={meta.eyebrow}
      description={meta.description}
      progressLabel={`${meta.stepNumber} / ${meta.totalSteps}`}
      focusKey={`board-${step}`}
      isBusy={model.isProcessing || generatingMode !== null}
      canvasTitle={meta.canvasTitle}
      canvas={<div className="pro-v2-board-flow">{renderCanvas()}</div>}
      contextTitle={step === 'adjust' || step === 'generate' || step === 'result' ? '미리보기와 상태' : '사진 상태와 미리보기'}
      context={renderContext()}
      primaryAction={renderPrimaryAction()}
      secondaryAction={renderSecondaryAction()}
    />
  );
}
