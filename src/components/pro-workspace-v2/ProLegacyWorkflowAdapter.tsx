import type { ProLegacyAdapterContent, ProWorkspaceJob, ProWorkspaceSummary } from './types';

interface ProLegacyWorkflowAdapterProps {
  job: ProWorkspaceJob;
  summary: ProWorkspaceSummary;
  content: ProLegacyAdapterContent;
}

const jobLabels: Record<ProWorkspaceJob, string> = {
  'board-image': '사진 보드판 만들기',
  'photo-ledger-pdf': '사진대지 PDF 만들기'
};

const jobDescriptions: Record<ProWorkspaceJob, string> = {
  'board-image': '사진 목록, 보드 내용, 크기·위치, 강조 설정을 기존 PRO 기능으로 조정합니다.',
  'photo-ledger-pdf': '사진 순서와 PDF 하단 정보를 기존 PRO 기능으로 확인하고 생성합니다.'
};

// Temporary migration layer: existing App-owned PRO state, handlers, and output payloads stay authoritative.
export function ProLegacyWorkflowAdapter({ job, summary, content }: ProLegacyWorkflowAdapterProps) {
  return (
    <div className="pro-v2-legacy-adapter" data-pro-v2-legacy-adapter data-pro-v2-job={job}>
      <div className="pro-v2-adapter-intro">
        <div>
          <span className="pro-v2-adapter-kicker">현재 작업</span>
          <h2>{jobLabels[job]}</h2>
          <p>{jobDescriptions[job]}</p>
        </div>
        <div className="pro-v2-adapter-stats" aria-label="현재 PRO 작업 상태">
          <span>사진 {summary.photoCount}장</span>
          <span>체크 {summary.checkedCount}장</span>
          <span>{summary.saveFolderReady ? '저장 폴더 준비됨' : '저장 폴더 필요'}</span>
        </div>
      </div>
      <div className="pro-v2-legacy-main">
        <div className="pro-v2-legacy-photo">{content.photoPanel}</div>
        <div className="pro-v2-legacy-settings">{content.settingsPanel}</div>
      </div>
    </div>
  );
}
