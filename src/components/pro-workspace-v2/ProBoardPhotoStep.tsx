import { Camera, ClipboardPaste, FolderOpen, RotateCcw, RotateCw, Trash2 } from 'lucide-react';

import type { ProBoardFlowActions, ProBoardFlowModel } from './boardFlowTypes';

interface ProBoardPhotoStepProps {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
}

export function ProBoardPhotoStep({ model, actions }: ProBoardPhotoStepProps) {
  return (
    <div className="pro-v2-board-step pro-v2-board-photo-step" data-evidence="board-photo-step">
      <section className="pro-v2-photo-import-panel">
        <div>
          <h3>사진을 먼저 준비하세요</h3>
          <p>사진을 추가한 뒤 사용할 사진을 선택하거나 체크하고, 방향을 확인하세요.</p>
        </div>
        <div className="pro-v2-photo-import-actions">
          <button type="button" className="pro-v2-action primary pro-v2-board-primary" data-evidence="board-add-photos" onClick={actions.onAddPhotos}>
            <Camera size={16} aria-hidden /> 사진 불러오기
          </button>
          <button type="button" className="pro-v2-action secondary" data-evidence="board-add-folder" onClick={actions.onAddPhotoFolder}>
            <FolderOpen size={16} aria-hidden /> 폴더 불러오기
          </button>
          <button type="button" className="pro-v2-action secondary" data-evidence="board-paste-photo" onClick={actions.onPastePhoto}>
            <ClipboardPaste size={16} aria-hidden /> 클립보드 붙여넣기
          </button>
        </div>
      </section>

      <section className="pro-v2-photo-selection-panel">
        <div className="pro-v2-board-section-heading">
          <div>
            <h3>사진 목록</h3>
            <p>큰 사진 목록은 사진 준비 단계에서만 표시됩니다.</p>
          </div>
          <div className="pro-v2-photo-batch-actions">
            <button type="button" className="pro-v2-action secondary" data-evidence="board-check-all" onClick={actions.onSelectAllPhotos}>
              전체 체크
            </button>
            <button type="button" className="pro-v2-action secondary" onClick={actions.onClearPhotoChecks}>
              체크 해제
            </button>
            <button type="button" className="pro-v2-action secondary" onClick={actions.onInvertPhotoChecks}>
              체크 반전
            </button>
          </div>
        </div>

        {model.photos.length === 0 ? (
          <div className="pro-v2-board-empty">
            아직 사진이 없습니다. 사진을 불러오면 선택, 체크, 회전 상태를 이 화면에서 바로 확인할 수 있습니다.
          </div>
        ) : (
          <div className="pro-v2-board-photo-list">
            {model.photos.map((photo, index) => {
              const selected = photo.path === model.selectedPhotoPath;
              return (
                <div
                  key={photo.path}
                  className={selected ? 'pro-v2-board-photo-row selected' : 'pro-v2-board-photo-row'}
                  data-evidence={selected ? 'board-photo-selected' : undefined}
                >
                  <input
                    type="checkbox"
                    aria-label={`${photo.name} 처리 대상 체크`}
                    checked={photo.selectedForProcessing}
                    onChange={() => actions.onTogglePhotoChecked(photo.path)}
                  />
                  <button
                    type="button"
                    className="pro-v2-photo-name-button"
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => actions.onSelectPhoto(photo.path)}
                  >
                    <span className="pro-v2-photo-order">{index + 1}</span>
                    <span>{photo.name}</span>
                    <em>{photo.rotation ?? 0}도</em>
                    {selected ? <span className="pro-v2-selected-label">선택됨</span> : null}
                  </button>
                  <button
                    type="button"
                    className="pro-v2-row-delete"
                    aria-label={`${photo.name} 제거`}
                    onClick={() => actions.onRemovePhoto(photo.path)}
                  >
                    <Trash2 size={16} aria-hidden /> 제거
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="pro-v2-rotation-panel" data-evidence="board-photo-rotation">
        <div>
          <h3>사진 방향</h3>
          <p>{model.hasSelectedPhoto ? `${model.selectedPhotoName} · 현재 ${model.selectedPhotoRotation}도` : '회전할 사진을 선택하세요.'}</p>
        </div>
        <div className="pro-v2-rotation-actions">
          <button type="button" className="pro-v2-action secondary" data-evidence="board-rotate-left" disabled={!model.hasSelectedPhoto} onClick={() => actions.onRotateSelected(-1)}>
            <RotateCcw size={16} aria-hidden /> 왼쪽 90도
          </button>
          <button type="button" className="pro-v2-action secondary" data-evidence="board-rotate-right" disabled={!model.hasSelectedPhoto} onClick={() => actions.onRotateSelected(1)}>
            <RotateCw size={16} aria-hidden /> 오른쪽 90도
          </button>
        </div>
      </section>
    </div>
  );
}
