import { ArrowDown, ArrowUp, CheckSquare, Eye, FileText, ListChecks } from 'lucide-react';

import type { ProPdfFlowActions, ProPdfFlowModel, ProPdfFlowSlots } from './pdfFlowTypes';
import { ProPdfCompactPhotoStatus } from './ProPdfCompactPhotoStatus';

interface ProPdfDetailsStepProps {
  model: ProPdfFlowModel;
  actions: ProPdfFlowActions;
  slots: ProPdfFlowSlots;
  onGoToPhotoStep: () => void;
}

export function ProPdfDetailsStep({ model, actions, slots, onGoToPhotoStep }: ProPdfDetailsStepProps) {
  const manualLedgerDisabled = model.useBoardFields || !model.hasSelectedPhoto;
  const dateLedgerDisabled = manualLedgerDisabled || model.usePhotoDate;
  const pdfTitleInputId = 'pro-v2-pdf-title';
  const showBoardInputId = 'pro-v2-pdf-show-board';
  const useBoardFieldsInputId = 'pro-v2-pdf-use-board-fields';
  const usePhotoDateInputId = 'pro-v2-pdf-use-photo-date';
  const ledgerLocationInputId = 'pro-v2-pdf-ledger-location';
  const ledgerContentInputId = 'pro-v2-pdf-ledger-content';
  const ledgerDateInputId = 'pro-v2-pdf-ledger-date';

  return (
    <div className="pro-v2-pdf-step pro-v2-pdf-details-step" data-evidence="pdf-details-step">
      <ProPdfCompactPhotoStatus model={model} onGoToPhotoStep={onGoToPhotoStep} />

      <div className="pro-v2-pdf-control-grid">
        <section className="pro-v2-pdf-control-card" data-evidence="pdf-document-settings">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>PDF 문서 정보</h3>
              <p>문서 제목과 사진대지 하단정보를 정리합니다.</p>
            </div>
          </div>
          <div className="settings-form board-pdf-form pro-v2-pdf-form">
            <label htmlFor={pdfTitleInputId}>문서 제목</label>
            <input id={pdfTitleInputId} value={model.pdfTitle} onChange={(event) => actions.onUpdatePdfTitle(event.target.value)} />
            <label>사진 합성</label>
            <label className="check-label compact-check pro-v2-pdf-option-check" htmlFor={showBoardInputId}>
              <input
                id={showBoardInputId}
                type="checkbox"
                aria-describedby="pro-v2-pdf-show-board-help"
                checked={model.showBoard}
                onChange={(event) => actions.onToggleShowBoard(event.target.checked)}
              />
              <span>
                <strong>사진에 보드판 삽입</strong>
                <small id="pro-v2-pdf-show-board-help">선택한 사진 위에 현재 보드판을 합성해 사진대지를 만듭니다.</small>
              </span>
            </label>
            <label>하단정보 적용</label>
            <label className="check-label compact-check pro-v2-pdf-option-check" htmlFor={useBoardFieldsInputId}>
              <input
                id={useBoardFieldsInputId}
                type="checkbox"
                aria-describedby="pro-v2-pdf-board-fields-help"
                checked={model.useBoardFields}
                onChange={(event) => actions.onToggleUseBoardFields(event.target.checked)}
              />
              <span>
                <strong>보드판 입력값 자동 적용</strong>
                <small id="pro-v2-pdf-board-fields-help">보드판 항목 값을 PDF 하단정보로 사용합니다. 사진 합성 여부와는 별도입니다.</small>
              </span>
            </label>
            <label>촬영일자</label>
            <label className="check-label compact-check pro-v2-pdf-option-check" htmlFor={usePhotoDateInputId}>
              <input
                id={usePhotoDateInputId}
                type="checkbox"
                checked={model.usePhotoDate}
                onChange={(event) => actions.onToggleUsePhotoDate(event.target.checked)}
              />
              <span>
                <strong>사진정보 촬영일자 사용</strong>
                <small>사진 파일에서 읽은 촬영일자를 하단정보 날짜로 표시합니다.</small>
              </span>
            </label>
          </div>
        </section>

        <section className="pro-v2-pdf-control-card" data-evidence="pdf-order-controls">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>사진 순서</h3>
              <p>현재 목록 순서대로 한 페이지에 두 장씩 들어갑니다.</p>
            </div>
          </div>
          <div className="pro-v2-pdf-order-panel">
            <span>선택 사진</span>
            <strong>{model.hasSelectedPhoto ? `${model.selectedPhotoIndex + 1} / ${model.photoCount}` : '사진을 선택하세요'}</strong>
            <button
              type="button"
              className="pro-v2-action secondary"
              disabled={!model.hasSelectedPhoto || model.selectedPhotoIndex <= 0}
              onClick={() => actions.onMoveSelectedPhotoOrder(-1)}
            >
              <ArrowUp size={16} aria-hidden /> 위로
            </button>
            <button
              type="button"
              className="pro-v2-action secondary"
              disabled={!model.hasSelectedPhoto || model.selectedPhotoIndex < 0 || model.selectedPhotoIndex >= model.photoCount - 1}
              onClick={() => actions.onMoveSelectedPhotoOrder(1)}
            >
              <ArrowDown size={16} aria-hidden /> 아래로
            </button>
          </div>
          <div className="pro-v2-pdf-layout-note">
            <FileText size={18} aria-hidden />
            <div>
              <strong>A4 세로 사진대지</strong>
              <span>기존 PDF 엔진의 검증된 2장 배치, 여백, 정보 표 레이아웃을 그대로 사용합니다.</span>
            </div>
          </div>
        </section>

        <section className="pro-v2-pdf-control-card" data-evidence="pdf-ledger-metadata">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>사진별 하단정보</h3>
              <p>선택한 사진의 위치, 사진내용, 촬영일자를 확인합니다.</p>
            </div>
          </div>
          {model.useBoardFields ? (
            <div className="ledger-auto-note">
              <ListChecks size={16} aria-hidden />
              <span>보드판 입력값을 PDF 하단정보로 자동 적용합니다.</span>
            </div>
          ) : model.hasSelectedPhoto ? (
            <>
              <div className="settings-form board-pdf-form pro-v2-pdf-form">
                <label htmlFor={ledgerLocationInputId}>위치</label>
                <input
                  id={ledgerLocationInputId}
                  value={model.selectedPhotoLedger.location}
                  disabled={manualLedgerDisabled}
                  onChange={(event) => actions.onUpdateSelectedLedger({ location: event.target.value })}
                />
                <label htmlFor={ledgerContentInputId}>사진내용</label>
                <input
                  id={ledgerContentInputId}
                  value={model.selectedPhotoLedger.content}
                  disabled={manualLedgerDisabled}
                  onChange={(event) => actions.onUpdateSelectedLedger({ content: event.target.value })}
                />
                <label htmlFor={ledgerDateInputId}>촬영일자</label>
                <input
                  id={ledgerDateInputId}
                  value={model.usePhotoDate ? model.selectedPhotoDate || '사진정보 없음' : model.selectedPhotoLedger.date}
                  disabled={dateLedgerDisabled}
                  onChange={(event) => actions.onUpdateSelectedLedger({ date: event.target.value })}
                />
              </div>
              <div className="pro-v2-pdf-helper-actions">
                <button type="button" className="pro-v2-action secondary" onClick={actions.onApplyBoardFieldsToSelectedLedger}>
                  <ListChecks size={16} aria-hidden /> 보드 내용 불러오기
                </button>
                <button type="button" className="pro-v2-action secondary" onClick={actions.onApplySelectedLedgerToCheckedPhotos}>
                  <CheckSquare size={16} aria-hidden /> 체크 사진에 적용
                </button>
              </div>
            </>
          ) : (
            <div className="pro-v2-board-empty">사진을 선택하면 사진별 하단정보를 입력할 수 있습니다.</div>
          )}
        </section>

        <section className="pro-v2-pdf-control-card pro-v2-pdf-preview-card" data-evidence="pdf-preview-near-settings">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>PDF 미리보기</h3>
              <p>현재 페이지의 사진 배치와 하단정보를 같은 화면에서 확인합니다.</p>
            </div>
            <button type="button" className="pro-v2-action secondary" disabled={model.photoCount === 0} onClick={actions.onOpenPreview}>
              <Eye size={16} aria-hidden /> 크게 보기
            </button>
          </div>
          {slots.previewPanel}
        </section>
      </div>
    </div>
  );
}
