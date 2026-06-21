import { Eye, FolderOpen, Save } from 'lucide-react';

import type { ProPdfFlowActions, ProPdfFlowModel, ProPdfFlowSlots } from './pdfFlowTypes';
import { ProPdfCompactPhotoStatus } from './ProPdfCompactPhotoStatus';
import { ProPdfReadinessSummary } from './ProPdfReadinessSummary';

interface ProPdfGenerateStepProps {
  model: ProPdfFlowModel;
  actions: ProPdfFlowActions;
  slots: ProPdfFlowSlots;
  onGoToPhotoStep: () => void;
}

export function ProPdfGenerateStep({ model, actions, slots, onGoToPhotoStep }: ProPdfGenerateStepProps) {
  const blocked = [];
  if (model.checkedCount === 0) blocked.push('PDF에 넣을 사진 체크');
  if (!model.pdfTitle.trim()) blocked.push('문서 제목 입력');
  if (!model.saveFolderReady) blocked.push('저장 폴더 지정');
  if (!model.previewReady) blocked.push('PDF 미리보기 확인');

  return (
    <div className="pro-v2-pdf-step pro-v2-pdf-generate-step" data-evidence="pdf-generate-ready">
      <ProPdfCompactPhotoStatus model={model} onGoToPhotoStep={onGoToPhotoStep} />
      <ProPdfReadinessSummary model={model} />

      <section className="pro-v2-generate-folder-panel">
        <div>
          <h3>저장 폴더</h3>
          <p>{model.saveFolderReady ? '저장 폴더가 준비되었습니다. 경로는 화면에 노출하지 않습니다.' : 'PDF를 저장할 폴더를 먼저 지정하세요.'}</p>
        </div>
        <div className="pro-v2-generate-folder-actions">
          <button type="button" className="pro-v2-action secondary" data-evidence="pdf-select-save-folder" onClick={actions.onSelectSaveFolder}>
            <Save size={16} aria-hidden /> 저장 폴더 선택
          </button>
          <button type="button" className="pro-v2-action secondary" disabled={!model.saveFolderReady} onClick={actions.onOpenSaveFolder}>
            <FolderOpen size={16} aria-hidden /> 저장 폴더 열기
          </button>
          <button type="button" className="pro-v2-action secondary" disabled={model.photoCount === 0} onClick={actions.onOpenPreview}>
            <Eye size={16} aria-hidden /> PDF 크게 보기
          </button>
        </div>
      </section>

      <section className="pro-v2-pdf-generate-preview" data-evidence="pdf-generate-preview">
        {slots.previewPanel}
      </section>

      {blocked.length > 0 ? (
        <section id="pro-v2-pdf-generate-blockers" className="pro-v2-generate-blockers" role="alert" aria-live="assertive">
          <h3>PDF 생성 전에 필요한 작업</h3>
          <ul>
            {blocked.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : (
        <section id="pro-v2-pdf-generate-ready" className="pro-v2-generate-ready-note" aria-live="polite" role="status">
          <h3>PDF 생성 준비 완료</h3>
          <p>사진 순서, 하단정보, 저장 폴더를 확인했습니다. 아래 버튼으로 사진대지 PDF를 생성하세요.</p>
        </section>
      )}
    </div>
  );
}
