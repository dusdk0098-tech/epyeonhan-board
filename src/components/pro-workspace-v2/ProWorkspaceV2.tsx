import { useMemo, useState } from 'react';

import { ProBoardFlow } from './ProBoardFlow';
import { ProPdfFlow } from './ProPdfFlow';
import { ProTaskChoiceScreen } from './ProTaskChoiceScreen';
import { ProWorkspaceShell } from './ProWorkspaceShell';
import type { ProBoardFlowController } from './boardFlowTypes';
import type { ProPdfFlowController } from './pdfFlowTypes';
import type { ProTaskChoiceOption, ProWorkspaceJob, ProWorkspaceSummary } from './types';

interface ProWorkspaceV2Props {
  summary: ProWorkspaceSummary;
  boardFlow: ProBoardFlowController;
  pdfFlow: ProPdfFlowController;
  onPrepareJob: (job: ProWorkspaceJob) => void;
}

const taskOptions: ProTaskChoiceOption[] = [
  {
    job: 'board-image',
    title: '사진 보드판 만들기',
    resultLabel: '선택한 사진으로 보드판 이미지 생성',
    description: '사진에 보드 내용, 위치, 하부띠, 강조 표시를 확인하고 이미지로 저장합니다.',
    primaryActionLabel: '보드판 작업 시작',
    bullets: ['보드 내용 입력', '크기와 위치 확인', '이미지 저장']
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

export function ProWorkspaceV2({ summary, boardFlow, pdfFlow, onPrepareJob }: ProWorkspaceV2Props) {
  const [pendingJob, setPendingJob] = useState<ProWorkspaceJob | null>(null);
  const [activeJob, setActiveJob] = useState<ProWorkspaceJob | null>(null);

  const selectedOption = useMemo(
    () => taskOptions.find((option) => option.job === pendingJob) ?? null,
    [pendingJob]
  );

  function startSelectedJob() {
    if (!pendingJob) return;
    onPrepareJob(pendingJob);
    setActiveJob(pendingJob);
  }

  if (!activeJob) {
    return (
      <main className="page-shell output-shell pro-v2-page">
        <ProWorkspaceShell
          title="PRO 작업 유형 선택"
          eyebrow="시작"
          description="먼저 만들 결과를 선택하세요. 선택한 작업에 맞는 설정 순서가 이어집니다."
          statusSlot={<StatusSummary summary={summary} />}
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
            <p className="pro-v2-action-note">작업을 선택하면 필요한 설정 순서가 열립니다.</p>
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

  return (
    <main className="page-shell output-shell pro-v2-page">
      <ProPdfFlow
        model={pdfFlow.model}
        actions={pdfFlow.actions}
        slots={pdfFlow.slots}
        onChangeJob={() => setActiveJob(null)}
      />
    </main>
  );
}

function StatusSummary({ summary, compact = false }: { summary: ProWorkspaceSummary; compact?: boolean }) {
  return (
    <dl className={compact ? 'pro-v2-status compact' : 'pro-v2-status'} aria-label="PRO 작업 준비 상태">
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
