import { useState } from 'react';
import { ArrowDown, ArrowUp, CheckSquare, FileText, ListChecks } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ProPdfFlowActions, ProPdfFlowModel } from './pdfFlowTypes';

interface ProPdfDetailsStepProps {
  model: ProPdfFlowModel;
  actions: ProPdfFlowActions;
}

type ProPdfDetailsPanel = 'document' | 'ledger';

const detailsPanels: Array<{
  id: ProPdfDetailsPanel;
  label: string;
  description: string;
  icon: LucideIcon;
  evidence: string;
}> = [
  {
    id: 'document',
    label: '문서와 순서',
    description: '제목, 날짜 기준, 사진 순서',
    icon: FileText,
    evidence: 'pdf-details-tab-document'
  },
  {
    id: 'ledger',
    label: '사진별 하단정보',
    description: '위치, 내용, 촬영일자',
    icon: ListChecks,
    evidence: 'pdf-details-tab-ledger'
  }
];

export function ProPdfDetailsStep({ model, actions }: ProPdfDetailsStepProps) {
  const [activePanel, setActivePanel] = useState<ProPdfDetailsPanel>('document');
  const manualLedgerDisabled = !model.hasSelectedPhoto;
  const dateLedgerDisabled = manualLedgerDisabled || model.usePhotoDate;
  const pdfTitleInputId = 'pro-v2-pdf-title';
  const usePhotoDateInputId = 'pro-v2-pdf-use-photo-date';
  const ledgerLocationInputId = 'pro-v2-pdf-ledger-location';
  const ledgerContentInputId = 'pro-v2-pdf-ledger-content';
  const ledgerDateInputId = 'pro-v2-pdf-ledger-date';

  function renderDocumentPanel() {
    return (
      <section className="pro-v2-pdf-control-card" data-evidence="pdf-document-settings">
        <div className="pro-v2-board-section-heading">
          <div>
            <h3>PDF 문서 정보</h3>
            <p>문서 제목과 촬영일자 기준, 사진 순서를 한곳에서 정리합니다.</p>
          </div>
        </div>
        <div className="settings-form board-pdf-form pro-v2-pdf-form">
          <label htmlFor={pdfTitleInputId}>문서 제목</label>
          <input id={pdfTitleInputId} value={model.pdfTitle} onChange={(event) => actions.onUpdatePdfTitle(event.target.value)} />
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
        <div className="pro-v2-pdf-layout-note">
          <FileText size={18} aria-hidden />
          <div>
            <strong>A4 세로 사진대지</strong>
            <span>PDF 모드에서는 사진, 하단정보, 강조 효과만 정리합니다.</span>
          </div>
        </div>
        <div className="pro-v2-pdf-inline-tool" data-evidence="pdf-order-controls">
          <div>
            <span>사진 순서</span>
            <strong>{model.hasSelectedPhoto ? `${model.selectedPhotoIndex + 1} / ${model.photoCount}` : '사진을 선택하세요'}</strong>
          </div>
          <div className="pro-v2-pdf-inline-actions">
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
        </div>
      </section>
    );
  }

  function renderLedgerPanel() {
    return (
      <section className="pro-v2-pdf-control-card" data-evidence="pdf-ledger-metadata">
        <div className="pro-v2-board-section-heading">
          <div>
            <h3>사진별 하단정보</h3>
            <p>선택한 사진의 위치, 내용, 촬영일자를 직접 확인합니다.</p>
          </div>
        </div>
        {model.hasSelectedPhoto ? (
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
              <button type="button" className="pro-v2-action secondary" onClick={actions.onApplySelectedLedgerToCheckedPhotos}>
                <CheckSquare size={16} aria-hidden /> 체크 사진에 적용
              </button>
            </div>
          </>
        ) : (
          <div className="pro-v2-board-empty">사진을 선택하면 사진별 하단정보를 입력할 수 있습니다.</div>
        )}
      </section>
    );
  }

  function renderActivePanel() {
    return activePanel === 'ledger' ? renderLedgerPanel() : renderDocumentPanel();
  }

  return (
    <div className="pro-v2-pdf-step pro-v2-pdf-details-step" data-evidence="pdf-details-step">
      <div className="pro-v2-pdf-workbench" data-evidence="pdf-details-workbench">
        <div className="pro-v2-pdf-workbench-nav" role="tablist" aria-label="PDF 정보 설정">
          {detailsPanels.map((panel) => {
            const Icon = panel.icon;
            const active = activePanel === panel.id;
            return (
              <button
                key={panel.id}
                id={`pro-v2-pdf-${panel.id}-tab`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`pro-v2-pdf-${panel.id}-panel`}
                className={`pro-v2-pdf-workbench-tab${active ? ' active' : ''}`}
                data-evidence={panel.evidence}
                onClick={() => setActivePanel(panel.id)}
              >
                <Icon size={18} aria-hidden />
                <span>
                  <strong>{panel.label}</strong>
                  <small>{panel.description}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div
          id={`pro-v2-pdf-${activePanel}-panel`}
          className="pro-v2-pdf-workbench-panel"
          role="tabpanel"
          aria-labelledby={`pro-v2-pdf-${activePanel}-tab`}
        >
          {renderActivePanel()}
        </div>
      </div>
    </div>
  );
}
