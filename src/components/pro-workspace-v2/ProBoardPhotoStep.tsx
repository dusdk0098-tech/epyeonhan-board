import { useEffect, useRef } from 'react';
import { Camera, Check, CheckCircle2, ClipboardPaste, FolderOpen, RotateCcw, RotateCw, X } from 'lucide-react';

import type { ProBoardFlowActions, ProBoardFlowModel } from './boardFlowTypes';

interface ProBoardPhotoStepProps {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
}

function formatRotation(rotation?: number) {
  const value = ((rotation ?? 0) + 360) % 360;
  return value === 0 ? '정방향' : `${value}°`;
}

export function ProBoardPhotoStep({ model, actions }: ProBoardPhotoStepProps) {
  const selectedRowRef = useRef<HTMLDivElement | null>(null);
  const selectedOrdinal = model.hasSelectedPhoto && model.selectedPhotoIndex >= 0 ? model.selectedPhotoIndex + 1 : null;
  const hasPhotos = model.photoCount > 0;

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [model.selectedPhotoPath, model.photos.length]);

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

      <div className="pro-v2-photo-workbench" data-evidence="board-photo-workbench">
        <section className="pro-v2-photo-selection-panel pro-v2-photo-list-pane">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>사진 목록</h3>
              <p>전체 {model.photoCount}장 / 출력 선택 {model.checkedCount}장</p>
            </div>
            <div className="pro-v2-photo-batch-actions">
              <button type="button" className="pro-v2-action secondary" data-evidence="board-check-all" disabled={!hasPhotos} onClick={actions.onSelectAllPhotos}>
                전체 체크
              </button>
              <button type="button" className="pro-v2-action secondary" disabled={!hasPhotos} onClick={actions.onClearPhotoChecks}>
                체크 해제
              </button>
              <button type="button" className="pro-v2-action secondary" disabled={!hasPhotos} onClick={actions.onInvertPhotoChecks}>
                체크 반전
              </button>
            </div>
          </div>

          {model.photos.length === 0 ? (
            <div className="pro-v2-board-empty">
              아직 사진이 없습니다. 사진을 불러오면 선택, 체크, 회전 상태를 이 화면에서 바로 확인할 수 있습니다.
            </div>
          ) : (
            <div className="pro-v2-board-photo-list pro-v2-photo-list-scroll" data-evidence="board-photo-list">
              {model.photos.map((photo, index) => {
                const selected = photo.path === model.selectedPhotoPath;
                return (
                  <div
                    key={photo.path}
                    ref={selected ? selectedRowRef : undefined}
                    className={selected ? 'pro-v2-board-photo-row selected' : 'pro-v2-board-photo-row'}
                    data-evidence={selected ? 'board-photo-selected' : undefined}
                  >
                    <button
                      type="button"
                      className={photo.selectedForProcessing ? 'pro-v2-photo-check checked' : 'pro-v2-photo-check'}
                      aria-pressed={photo.selectedForProcessing}
                      aria-label={`${photo.name} 처리 대상 ${photo.selectedForProcessing ? '해제' : '체크'}`}
                      onClick={() => actions.onTogglePhotoChecked(photo.path)}
                    >
                      <Check size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="pro-v2-photo-name-button"
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => actions.onSelectPhoto(photo.path)}
                    >
                      <span className="pro-v2-photo-order">{index + 1}</span>
                      <span>{photo.name}</span>
                      <em className={photo.rotation ? 'pro-v2-photo-rotation-chip rotated' : 'pro-v2-photo-rotation-chip'}>
                        <RotateCw size={13} aria-hidden />
                        {formatRotation(photo.rotation)}
                      </em>
                      {selected ? (
                        <span className="pro-v2-selected-label">
                          <CheckCircle2 size={13} aria-hidden />
                          선택
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="pro-v2-row-delete pro-v2-icon-danger"
                      aria-label={`${photo.name} 제거`}
                      onClick={() => actions.onRemovePhoto(photo.path)}
                      title="제거"
                    >
                      <X size={17} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {hasPhotos ? (
          <aside className="pro-v2-photo-side-panel" data-evidence="board-photo-side-controls">
          <section className="pro-v2-photo-summary-card">
            <span>선택 사진</span>
            <strong>{model.hasSelectedPhoto ? model.selectedPhotoName : '사진을 선택하세요'}</strong>
            <small>
              {selectedOrdinal ? `${selectedOrdinal} / ${model.photoCount} · 회전 ${model.selectedPhotoRotation}도` : `전체 ${model.photoCount}장 · 출력 선택 ${model.checkedCount}장`}
            </small>
          </section>
          <section className="pro-v2-rotation-panel" data-evidence="board-photo-rotation">
            <div>
              <h3>사진 방향</h3>
              <p>{model.hasSelectedPhoto ? '선택한 사진의 방향을 확인하고 조정합니다.' : '회전할 사진을 선택하세요.'}</p>
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
          </aside>
        ) : null}
      </div>
    </div>
  );
}
