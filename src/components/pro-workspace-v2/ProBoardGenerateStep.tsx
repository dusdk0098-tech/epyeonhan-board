import { FolderOpen, Save } from 'lucide-react';

import type { ProBoardFlowActions, ProBoardFlowModel } from './boardFlowTypes';
import { ProBoardReadinessSummary } from './ProBoardReadinessSummary';

interface ProBoardGenerateStepProps {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
}

export function ProBoardGenerateStep({ model, actions }: ProBoardGenerateStepProps) {
  const blocked = [];
  if (model.photoCount === 0 || !model.hasSelectedPhoto) blocked.push('사용할 사진 선택');
  if (!model.saveFolderReady) blocked.push('저장 폴더 지정');
  if (!model.previewReady) blocked.push('미리보기 확인');

  return (
    <div className="pro-v2-board-step pro-v2-board-generate-step" data-evidence="board-generate-ready">
      <ProBoardReadinessSummary model={model} />
      <section className="pro-v2-generate-folder-panel">
        <div>
          <h3>저장 폴더</h3>
          <p>{model.saveFolderReady ? '저장 폴더가 준비되었습니다. 경로는 화면에 노출하지 않습니다.' : '결과를 저장할 폴더를 먼저 지정하세요.'}</p>
        </div>
        <div className="pro-v2-generate-folder-actions">
          <button type="button" className="pro-v2-action secondary" data-evidence="board-select-save-folder" onClick={actions.onSelectSaveFolder}>
            <Save size={16} aria-hidden /> 저장 폴더 선택
          </button>
          <button type="button" className="pro-v2-action secondary" disabled={!model.saveFolderReady} onClick={actions.onOpenSaveFolder}>
            <FolderOpen size={16} aria-hidden /> 저장 폴더 열기
          </button>
        </div>
      </section>
      {blocked.length > 0 ? (
        <section className="pro-v2-generate-blockers" aria-live="polite">
          <h3>생성 전에 필요한 작업</h3>
          <ul>
            {blocked.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : (
        <section className="pro-v2-generate-ready-note" aria-live="polite">
          <h3>생성 준비 완료</h3>
          <p>사진 방향, 보드판 내용, 저장 폴더를 확인했습니다. 아래 버튼으로 보드판 이미지를 생성하세요.</p>
        </section>
      )}
    </div>
  );
}
