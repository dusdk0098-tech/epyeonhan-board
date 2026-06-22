import { useMemo, useState } from 'react';

import type { ProPdfFlowController, ProPdfFlowStep } from './pdfFlowTypes';
import { ProPdfCompactPhotoStatus } from './ProPdfCompactPhotoStatus';
import { ProPdfDetailsStep } from './ProPdfDetailsStep';
import { ProPdfGenerateStep } from './ProPdfGenerateStep';
import { ProPdfPhotoStep } from './ProPdfPhotoStep';
import { ProPdfReadinessSummary } from './ProPdfReadinessSummary';
import { ProPdfResultStep } from './ProPdfResultStep';
import { ProWorkspaceShell } from './ProWorkspaceShell';

interface ProPdfFlowProps extends ProPdfFlowController {
  onChangeJob: () => void;
}

const pdfStepMeta: Record<ProPdfFlowStep, {
  stepNumber: number;
  totalSteps: 4;
  title: string;
  eyebrow: string;
  description: string;
  canvasTitle: string;
}> = {
  photo: {
    stepNumber: 1,
    totalSteps: 4,
    title: '사진 준비',
    eyebrow: '사진대지 PDF 만들기',
    description: 'PDF에 넣을 사진을 추가하고, 순서와 회전 방향을 확인합니다.',
    canvasTitle: '1단계 사진 준비'
  },
  details: {
    stepNumber: 2,
    totalSteps: 4,
    title: 'PDF 정보와 강조',
    eyebrow: '사진대지 PDF 만들기',
    description: '문서 제목, 사진별 하단정보, 강조 효과와 PDF 미리보기를 확인합니다.',
    canvasTitle: '문서 설정'
  },
  generate: {
    stepNumber: 3,
    totalSteps: 4,
    title: 'PDF 생성 준비',
    eyebrow: '사진대지 PDF 만들기',
    description: '사진, 문서 정보, 저장 폴더, 미리보기가 준비됐는지 마지막으로 확인합니다.',
    canvasTitle: '저장 폴더와 PDF 미리보기'
  },
  result: {
    stepNumber: 4,
    totalSteps: 4,
    title: '완료 또는 문제 해결',
    eyebrow: '사진대지 PDF 만들기',
    description: 'PDF 생성 결과를 확인하고, 필요하면 설정으로 돌아가 다시 시도합니다.',
    canvasTitle: '4단계 결과 확인'
  }
};

const pdfStepOrder: ProPdfFlowStep[] = ['photo', 'details', 'generate', 'result'];

export function ProPdfFlow({ model, actions, slots, onChangeJob }: ProPdfFlowProps) {
  const [step, setStep] = useState<ProPdfFlowStep>('photo');
  const [generating, setGenerating] = useState(false);
  const [resultStatus, setResultStatus] = useState<{ kind: 'success' | 'error' | 'info'; text?: string } | null>(null);
  const meta = pdfStepMeta[step];

  const generateReady = model.checkedCount > 0
    && model.saveFolderReady
    && model.previewReady
    && model.pdfTitle.trim().length > 0
    && !model.isProcessing;

  const nextStep = useMemo(() => {
    const index = pdfStepOrder.indexOf(step);
    return pdfStepOrder[Math.min(index + 1, pdfStepOrder.length - 1)];
  }, [step]);

  const previousStep = useMemo(() => {
    const index = pdfStepOrder.indexOf(step);
    return index > 0 ? pdfStepOrder[index - 1] : null;
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

  async function runGenerate() {
    if (!generateReady) return;
    setGenerating(true);
    try {
      const result = await actions.onGeneratePdf();
      if (result && typeof result === 'object' && 'ok' in result) {
        setResultStatus({ kind: result.ok ? 'success' : 'error', text: result.message });
      } else {
        setResultStatus({ kind: model.statusKind ?? 'info', text: model.statusText });
      }
      setStep('result');
    } finally {
      setGenerating(false);
    }
  }

  function renderCanvas() {
    switch (step) {
      case 'photo':
        return <ProPdfPhotoStep model={model} actions={actions} />;
      case 'details':
        return <ProPdfDetailsStep model={model} actions={actions} />;
      case 'generate':
        return <ProPdfGenerateStep model={model} actions={actions} />;
      case 'result':
        const resultModel = resultStatus
          ? { ...model, statusKind: resultStatus.kind, statusText: resultStatus.text }
          : model;
        return (
          <ProPdfResultStep
            model={resultModel}
            actions={actions}
            onEditSettings={() => setStep('details')}
            onRetry={() => void runGenerate()}
            onStartNew={() => {
              setResultStatus(null);
              setStep('photo');
            }}
          />
        );
    }
  }

  function renderContext() {
    if (step === 'photo' && model.photoCount === 0) return null;

    if (step === 'photo') {
      return (
        <div className="pro-v2-pdf-preview-context" data-evidence="pdf-photo-preview-context">
          {slots.previewPanel}
        </div>
      );
    }

    if (step === 'result') {
      return (
        <div className="pro-v2-context-stack">
          <ProPdfCompactPhotoStatus model={model} onGoToPhotoStep={goToPhotoStep} />
          {slots.previewPanel}
        </div>
      );
    }

    if (step === 'details') {
      return (
        <div className="pro-v2-context-stack pro-v2-pdf-details-context" data-evidence="pdf-details-preview-context">
          {slots.previewPanel}
          <section className="pro-v2-pdf-highlight-card" data-evidence="pdf-highlight-controls">
            <div className="pro-v2-board-section-heading">
              <div>
                <h3>미리보기에서 강조 조정</h3>
                <p>원형 강조를 켠 뒤 미리보기에서 클릭하거나 드래그해 위치와 크기를 맞춥니다.</p>
              </div>
            </div>
            {slots.highlightControls}
          </section>
        </div>
      );
    }

    if (step === 'generate') {
      return (
        <div className="pro-v2-context-stack pro-v2-pdf-generate-context" data-evidence="pdf-generate-preview-context">
          {slots.previewPanel}
        </div>
      );
    }

    return (
      <div className="pro-v2-context-stack">
        <ProPdfReadinessSummary model={model} />
        {slots.previewPanel}
      </div>
    );
  }

  function renderPrimaryAction() {
    if (step === 'generate') {
      const describedBy = generateReady ? 'pro-v2-pdf-generate-ready' : 'pro-v2-pdf-generate-blockers';
      return (
        <button
          type="button"
          className="pro-v2-action primary pro-v2-pdf-primary"
          data-evidence="pdf-generate-cta"
          disabled={!generateReady || model.isProcessing}
          aria-describedby={describedBy}
          onClick={() => void runGenerate()}
        >
          {generating || model.isProcessing ? 'PDF 생성 중...' : '사진대지 PDF 생성'}
        </button>
      );
    }

    if (step === 'result') {
      return (
        <button type="button" className="pro-v2-action primary pro-v2-pdf-primary" onClick={() => setStep('photo')}>
          새 PDF 작업
        </button>
      );
    }

    const disabled = step === 'photo' ? model.photoCount === 0 : model.photoCount === 0;
    return (
      <button
        type="button"
        className="pro-v2-action primary pro-v2-pdf-primary"
        data-evidence={`pdf-${step}-next`}
        disabled={disabled}
        onClick={goNext}
      >
        {step === 'photo' ? 'PDF 정보 설정' : 'PDF 생성 준비 확인'}
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
      focusKey={`pdf-${step}`}
      isBusy={model.isProcessing || generating}
      canvasTitle={meta.canvasTitle}
      canvas={(
        <div className="pro-v2-pdf-flow" data-evidence="pdf-flow">
          {renderCanvas()}
        </div>
      )}
      contextTitle={step === 'details' || step === 'generate' || step === 'photo' ? 'PDF 미리보기' : '준비 상태와 미리보기'}
      context={renderContext()}
      primaryAction={renderPrimaryAction()}
      secondaryAction={renderSecondaryAction()}
    />
  );
}
