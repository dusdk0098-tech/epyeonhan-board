import { useMemo, useRef, useState } from 'react';

import { ProBoardFlow } from './ProBoardFlow';
import { ProLegacyWorkflowAdapter } from './ProLegacyWorkflowAdapter';
import { ProTaskChoiceScreen } from './ProTaskChoiceScreen';
import { ProWorkspaceShell } from './ProWorkspaceShell';
import type { ProBoardFlowController } from './boardFlowTypes';
import type { ProLegacyAdapterContent, ProTaskChoiceOption, ProWorkspaceJob, ProWorkspaceSummary } from './types';

interface ProWorkspaceV2Props {
  summary: ProWorkspaceSummary;
  boardFlow: ProBoardFlowController;
  renderAdapterContent: (job: ProWorkspaceJob) => ProLegacyAdapterContent;
  onPrepareJob: (job: ProWorkspaceJob) => void;
}

const taskOptions: ProTaskChoiceOption[] = [
  {
    job: 'board-image',
    title: '사진 보드판 만들기',
    resultLabel: '선택한 사진으로 보드판 이미지 생성',
    description: '사진 한 장씩 내용, 위치, 하부띠, 강조 표시를 확인해 이미지로 저장합니다.',
    primaryActionLabel: '보드판 작업 시작',
    bullets: ['보드 내용 입력', '크기·위치 확인', '이미지 저장']
  },
  {
    job: 'photo-ledger-pdf',
    title: '사진대지 PDF 만들기',
    resultLabel: '여러 사진을 사진대지 PDF로 정리',
    description: '사진 순서와 하단 정보를 확인하고 PDF 문서로 만듭니다.',
    primaryActionLabel: 'PDF 작업 시작',
    bullets: ['사진 순서 확인', 'PDF 정보 입력', 'PDF 생성']
  }
];

const jobCopy: Record<ProWorkspaceJob, { title: string; description: string; primary: string }> = {
  'board-image': {
    title: '사진 보드판 만들기',
    description: '사진, 보드 내용, 배치 설정을 한 작업 공간에서 확인합니다.',
    primary: '보드판 설정 확인'
  },
  'photo-ledger-pdf': {
    title: '사진대지 PDF 만들기',
    description: 'PDF 정보, 사진 순서, 저장 상태를 한 작업 공간에서 확인합니다.',
    primary: 'PDF 설정 확인'
  }
};

export function ProWorkspaceV2({ summary, boardFlow, renderAdapterContent, onPrepareJob }: ProWorkspaceV2Props) {
  const [pendingJob, setPendingJob] = useState<ProWorkspaceJob | null>(null);
  const [activeJob, setActiveJob] = useState<ProWorkspaceJob | null>(null);
  const adapterRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => taskOptions.find((option) => option.job === pendingJob) ?? null,
    [pendingJob]
  );

  function startSelectedJob() {
    if (!pendingJob) return;
    onPrepareJob(pendingJob);
    setActiveJob(pendingJob);
  }

  function focusExistingControls() {
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    adapterRef.current?.scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  }

  if (!activeJob) {
    return (
      <main className="page-shell output-shell pro-v2-page">
        <ProWorkspaceShell
          title="PRO 작업 유형 선택"
          eyebrow="시작"
          description="먼저 만들 결과를 선택하세요. 선택 후에는 기존 PRO 기능을 새 작업 공간에서 이어서 사용할 수 있습니다."
          canvasTitle="무엇을 만들까요?"
          canvas={
            <ProTaskChoiceScreen
              selectedJob={pendingJob}
              options={taskOptions}
              onSelectJob={setPendingJob}
            />
          }
          primaryAction={
            <button
              type="button"
              className="pro-v2-action primary"
              disabled={!pendingJob}
              onClick={startSelectedJob}
            >
              {selectedOption?.primaryActionLabel ?? '작업 선택 후 시작'}
            </button>
          }
          secondaryAction={
            <p className="pro-v2-action-note">작업을 선택하면 필요한 설정 순서가 이어집니다.</p>
          }
        />
      </main>
    );
  }

  if (activeJob === 'board-image') {
    return (
      <main className="page-shell output-shell pro-v2-page">
        <ProBoardFlow
          model={boardFlow.model}
          actions={boardFlow.actions}
          slots={boardFlow.slots}
          onChangeJob={() => setActiveJob(null)}
        />
      </main>
    );
  }

  const copy = jobCopy[activeJob];
  const adapterContent = renderAdapterContent(activeJob);

  return (
    <main className="page-shell output-shell pro-v2-page">
      <ProWorkspaceShell
        title={copy.title}
        eyebrow="작업 공간"
        description={copy.description}
        statusSlot={<StatusSummary summary={summary} />}
        canvasTitle="작업 설정"
        canvas={
          <div ref={adapterRef}>
            <ProLegacyWorkflowAdapter job={activeJob} summary={summary} content={adapterContent} />
          </div>
        }
        contextTitle="미리보기와 상태"
        context={
          <div className="pro-v2-context-stack">
            <StatusSummary summary={summary} compact />
            {adapterContent.previewPanel}
          </div>
        }
        primaryAction={
          <button type="button" className="pro-v2-action primary" onClick={focusExistingControls}>
            {copy.primary}
          </button>
        }
        secondaryAction={
          <button type="button" className="pro-v2-action secondary" onClick={() => setActiveJob(null)}>
            작업 유형 변경
          </button>
        }
      />
    </main>
  );
}

function StatusSummary({ summary, compact = false }: { summary: ProWorkspaceSummary; compact?: boolean }) {
  return (
    <dl className={compact ? 'pro-v2-status compact' : 'pro-v2-status'}>
      <div>
        <dt>사진</dt>
        <dd>{summary.photoCount}장</dd>
      </div>
      <div>
        <dt>체크</dt>
        <dd>{summary.checkedCount}장</dd>
      </div>
      <div>
        <dt>선택</dt>
        <dd>{summary.hasSelectedPhoto ? '있음' : '필요'}</dd>
      </div>
      <div>
        <dt>저장</dt>
        <dd>{summary.saveFolderReady ? '준비됨' : '필요'}</dd>
      </div>
      <div>
        <dt>설정</dt>
        <dd>{summary.activeSettingsLabel}</dd>
      </div>
      {summary.statusText ? (
        <div className="wide">
          <dt>{summary.isProcessing ? '진행' : '상태'}</dt>
          <dd>{summary.statusText}</dd>
        </div>
      ) : null}
    </dl>
  );
}
